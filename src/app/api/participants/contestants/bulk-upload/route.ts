import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";
import { generateContestantHashcode } from '@/lib/hashcode';
import { Prisma } from '@prisma/client';

/**
 * Bulk Upload API for Contestants
 * 
 * This endpoint allows contingent managers to bulk upload contestant records via CSV.
 * Features:
 * - Authentication and permission checks
 * - Transaction support for all-or-nothing uploads
 * - Detailed error reporting
 * - Duplicate IC detection
 * - Automatic contingent assignment
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get the request form data
    const formData = await req.formData();
    const dataJson = formData.get('data') as string;
    
    if (!dataJson) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }
    
    // Get the participant ID from the session
    const participantId = parseInt(session.user.id as string);
    
    // Get the user's contingent ID directly from the contingentManager table
    const managedContingent = await prisma.contingentManager.findFirst({
      where: {
        participantId: participantId
      },
      include: {
        contingent: {
          select: {
            name: true
          }
        }
      }
    });
    
    if (!managedContingent) {
      return NextResponse.json(
        { error: "You don't manage any contingents. Please create or join a contingent first." },
        { status: 400 }
      );
    }
    
    const contingentId = managedContingent.contingentId;
    const contingentName = managedContingent.contingent?.name || "Unknown Contingent";
    
    // Parse the JSON data
    const records = JSON.parse(dataJson) as any[];

    // Validate we have records to process
    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "No valid records found in the uploaded data" },
        { status: 400 }
      );
    }

    // Prepare results object
    const results = {
      success: 0,
      errors: [] as Array<{ row: number; message: string }>,
      contingent: contingentName
    };

    // First pass - check for duplicate ICs in the database
    // Collect all ICs to check in a batch query
    const icsToCheck = records.map(record => record.ic).filter(Boolean) as string[];
    
    // Get existing ICs in a single query for better performance
    const existingICs = await prisma.contestant.findMany({
      where: {
        ic: {
          in: icsToCheck // Already filtered above
        }
      },
      select: {
        ic: true
      }
    });
    
    // Create a Set for faster lookups - ensure all elements are strings and filter out nulls
    const existingICSet = new Set<string>(existingICs.map(c => c.ic).filter((ic): ic is string => ic !== null));
    
    // Use a transaction for all-or-nothing upload if requested
    // This makes sure either all records succeed or none do
    // The allOrNothing flag could be passed as part of the request
    const useTransaction = formData.get('allOrNothing') === 'true';
    
    if (useTransaction) {
      // Use transaction for all-or-nothing approach
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < records.length; i++) {
          await processRecord(records[i], i + 1, existingICSet, results, contingentId, participantId, session, tx);
        }
        
        // If we have errors and we're in transaction mode, throw to rollback
        if (results.errors.length > 0) {
          throw new Error(`${results.errors.length} records had errors, transaction rolled back`);
        }
      }, {
        maxWait: 10000, // 10s maximum wait time
        timeout: 60000  // 60s maximum transaction time
      });
    } else {
      // Process records individually (continue on error)
      for (let i = 0; i < records.length; i++) {
        await processRecord(records[i], i + 1, existingICSet, results, contingentId, participantId, session);
      }
    }

    // Log summary for audit purposes
    console.log(`Bulk upload completed: ${results.success} successful, ${results.errors.length} failed`);
    
    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error in bulk upload API:", error);
    
    // Determine if this is a transaction rollback error
    if (error.message?.includes('transaction rolled back')) {
      return NextResponse.json(
        { 
          error: "All-or-nothing upload failed due to errors in some records", 
          details: error.message 
        },
        { status: 422 } // Unprocessable Entity
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to process upload" },
      { status: 500 }
    );
  }
}

/**
 * Process an individual contestant record
 * This helper function processes a single contestant record, either with 
 * the main prisma client or within a transaction
 */
async function processRecord(
  record: any, 
  rowNumber: number, 
  existingICSet: Set<string>, 
  results: { success: number, errors: Array<{ row: number; message: string }> },
  contingentId: number,
  participantId: number,
  session: any,
  tx?: any // Optional transaction client
) {
  const prismaClient = tx || prisma; // Use transaction client if provided
  
  try {
    // Check for existing IC first (using the pre-queried set)
    if (existingICSet.has(record.ic)) {
      results.errors.push({
        row: rowNumber,
        message: `Contestant with IC ${record.ic} already exists in the database`
      });
      return;
    }
    
    // Validate required fields
    if (!record.name || !record.ic || !record.gender || !record.edu_level) {
      results.errors.push({
        row: rowNumber,
        message: 'Missing required fields (name, IC, gender, or education level)'
      });
      return;
    }
    
    // Validate IC format (should be 12 digits)
    if (!/^\d{12}$/.test(record.ic)) {
      results.errors.push({
        row: rowNumber,
        message: `Invalid IC format: ${record.ic}. IC should be 12 digits.`
      });
      return;
    }
    
    // Generate unique hash for contestant
    const hashcode = generateContestantHashcode(record.name, record.ic);

    // Create contestant data object
    const createData: Prisma.contestantCreateInput = {
      name: record.name,
      ic: record.ic,
      gender: record.gender,
      age: parseInt(record.age?.toString() || '0'),
      edu_level: record.edu_level,
      class_name: record.class_name || null,
      class_grade: record.class_grade || null,
      hashcode,
      status: "ACTIVE",
      contingent: {
        connect: { id: contingentId }
      },
      // Add optional fields if provided
      ...(record.email ? { email: record.email } : {}),
      ...(record.phoneNumber ? { phoneNumber: record.phoneNumber } : {}),
      birthdate: record.birthdate || null,
      // Track who created this record - use IDs instead of names
      createdById: participantId,
      updatedById: participantId
    };

    // Create contestant using the appropriate client (transaction or main)
    await prismaClient.contestant.create({
      data: createData,
    });

    // Add to set to prevent duplicates within the same batch
    existingICSet.add(record.ic as string);
    
    results.success++;
  } catch (error: any) {
    console.error(`Error processing row ${rowNumber}:`, error);
    
    // Provide more specific error messages for common errors
    let message = "Unknown error occurred";
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        message = `Unique constraint violation: ${error.meta?.target || 'A field'} already exists`;
      } else if (error.code === 'P2003') {
        message = 'Foreign key constraint failed: Referenced record does not exist';
      } else {
        message = `Database error: ${error.code} - ${error.message}`;
      }
    } else if (error.message) {
      message = error.message;
    }
    
    results.errors.push({
      row: rowNumber,
      message
    });
    
    // If we're in a transaction, this will be caught by the caller and will trigger a rollback
    if (tx) throw error;
  }
}
