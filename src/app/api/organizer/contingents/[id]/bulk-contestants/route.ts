import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { prismaExecute } from "@/lib/prisma";
import { generateContestantHashcode } from '@/lib/hashcode';
import { Prisma } from '@prisma/client';

/**
 * Bulk Upload API for Contestants (Organizer Admin)
 * 
 * This endpoint allows organizer admins to bulk upload contestant records via CSV
 * for a specific contingent.
 * Features:
 * - Authentication and admin permission checks
 * - Transaction support for all-or-nothing uploads
 * - Detailed error reporting
 * - Duplicate IC detection
 * - Primary manager ID for created/updated by fields
 * - Option to set is_ppki status
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }
    
    // Parse contingent ID from URL parameter
    const contingentId = parseInt(params.id);
    if (isNaN(contingentId)) {
      return NextResponse.json({ error: "Invalid contingent ID" }, { status: 400 });
    }

    // Get request data
    const formData = await req.formData();
    const dataJson = formData.get('data') as string;
    const isPpkiValue = formData.get('is_ppki');
    
    if (!dataJson) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }
    
    // Get contingent info and primary manager
    const contingent = await prismaExecute(prisma => prisma.contingent.findUnique({
      where: {
        id: contingentId
      },
      include: {
        managers: {
          where: {
            isOwner: true
          },
          include: {
            participant: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        school: {
          select: {
            name: true
          }
        },
        higherInstitution: {
          select: {
            name: true
          }
        }
      }
    }));
    
    if (!contingent) {
      return NextResponse.json({ error: "Contingent not found" }, { status: 404 });
    }

    // Get primary manager ID or use admin ID as fallback
    const primaryManager = contingent.managers.find(m => m.isOwner);
    const createdById = primaryManager?.participantId || parseInt(session.user.id as string);
    const creatorName = primaryManager?.participant?.name || session.user.name || "Admin";
    
    // Get contingent name
    const contingentName = contingent.name || "Unknown Contingent";
    
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
    const existingICs = await prismaExecute(prisma => prisma.contestant.findMany({
      where: {
        ic: {
          in: icsToCheck
        }
      },
      select: {
        ic: true
      }
    }));
    
    // Create a Set for faster lookups
    const existingICSet = new Set<string>(existingICs.map(c => c.ic).filter((ic): ic is string => ic !== null));
    
    // Use a transaction for all-or-nothing upload if requested
    const useTransaction = formData.get('allOrNothing') === 'true';
    
    if (useTransaction) {
      // Use transaction for all-or-nothing approach
      await prismaExecute(prisma => prisma.$transaction(async (tx) => {
        for (let i = 0; i < records.length; i++) {
          await processRecord(records[i], i + 1, existingICSet, results, contingentId, createdById, isPpkiValue, tx);
        }
        
        // If we have errors and we're in transaction mode, throw to rollback
        if (results.errors.length > 0) {
          throw new Error(`${results.errors.length} records had errors, transaction rolled back`);
        }
      }, {
        maxWait: 10000, // 10s maximum wait time
        timeout: 60000  // 60s maximum transaction time
      }));
    } else {
      // Process records individually (continue on error)
      for (let i = 0; i < records.length; i++) {
        await processRecord(records[i], i + 1, existingICSet, results, contingentId, createdById, isPpkiValue);
      }
    }

    console.log(`Bulk upload by admin completed: ${results.success} successful, ${results.errors.length} failed`);
    
    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error in organizer bulk upload API:", error);
    
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
 */
async function processRecord(
  record: any, 
  rowNumber: number, 
  existingICSet: Set<string>, 
  results: { success: number, errors: Array<{ row: number; message: string }> },
  contingentId: number,
  createdById: number,
  isPpkiValue: FormDataEntryValue | null,
  tx?: any // Optional transaction client
) {
  // Use transaction client if provided
  const prismaClient = tx || null;
  
  // Function to execute Prisma queries either with the transaction client or with prismaExecute
  async function executeQuery(query: (client: any) => Promise<any>) {
    if (prismaClient) {
      return query(prismaClient);
    } else {
      return prismaExecute(query);
    }
  }
  
  try {
    // Check for existing IC first (using the pre-queried set)
    if (record.ic && existingICSet.has(record.ic)) {
      results.errors.push({
        row: rowNumber,
        message: `Contestant with IC ${record.ic} already exists in the database`
      });
      return;
    }
    
    // Validate required fields
    if (!record.name || !record.gender || !record.edu_level) {
      results.errors.push({
        row: rowNumber,
        message: 'Missing required fields (name, gender, or education level)'
      });
      return;
    }
    
    // Validate IC format if provided (should be 12 digits)
    if (record.ic && !/^\d{12}$/.test(record.ic)) {
      results.errors.push({
        row: rowNumber,
        message: `Invalid IC format: ${record.ic}. IC should be 12 digits.`
      });
      return;
    }
    
    // Set is_ppki value
    const is_ppki = record.is_ppki !== undefined ? !!record.is_ppki : isPpkiValue === '1';
    
    // Generate unique hash for contestant
    const hashcode = record.ic ? 
      generateContestantHashcode(record.name, record.ic) : 
      generateContestantHashcode(record.name, rowNumber.toString() + Date.now());

    // Create contestant data object
    const createData: Prisma.contestantCreateInput = {
      name: record.name,
      ic: record.ic || null,
      gender: record.gender,
      age: record.age ? parseInt(record.age.toString()) : null,
      edu_level: record.edu_level,
      class_name: record.class_name || null,
      class_grade: record.class_grade || null,
      hashcode,
      status: "ACTIVE",
      is_ppki: is_ppki,
      contingent: {
        connect: { id: contingentId }
      },
      // Add optional fields if provided
      ...(record.email ? { email: record.email } : {}),
      ...(record.phoneNumber ? { phoneNumber: record.phoneNumber } : {}),
      birthdate: record.birthdate || null,
      // Track who created this record
      createdById,
      updatedById: createdById
    };

    // Create contestant
    const createdContestant = await executeQuery(prisma => prisma.contestant.create({
      data: createData,
    }));

    // Log for monitoring purposes
    console.log(`Contestant ${createdContestant.id} (${record.name}) created successfully by organizer admin`);

    // Add to set to prevent duplicates within the same batch
    if (record.ic) {
      existingICSet.add(record.ic as string);
    }
    
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
    if (prismaClient) throw error;
  }
}
