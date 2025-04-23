import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { generateContestantHashcode } from '@/lib/hashcode';

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
      }
    });
    
    if (!managedContingent) {
      return NextResponse.json(
        { error: "You don't manage any contingents. Please create or join a contingent first." },
        { status: 400 }
      );
    }
    
    const contingentId = managedContingent.contingentId;
    
    // No need to verify the contingent exists since we got it directly from the database
    // and the foreign key constraint ensures it exists
    
    // No need to check permissions since we're getting the contingent directly from
    // the contingentManager table, which already confirms the user is a manager

    if (!dataJson) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    // Parse the JSON data
    const records = JSON.parse(dataJson) as any[];

    // Process each record
    const results = {
      success: 0,
      errors: [] as Array<{ row: number; message: string }>,
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 1; // Just use the array index + 1 since these are already validated
      
      try {
        // Generate unique hash for contestant
        const hashcode = generateContestantHashcode(record.name, record.ic);

        // Create contestant data object
        const createData: any = {
          name: record.name,
          ic: record.ic,
          gender: record.gender,
          age: parseInt(record.age.toString()),
          edu_level: record.edu_level,
          class_name: record.class_name || null,
          class_grade: record.class_grade || null,
          hashcode,
          contingentId: contingentId,
          status: "ACTIVE",
          updatedBy: session.user.name || session.user.email
        };

        // Add optional fields if provided
        if (record.email) createData.email = record.email;
        if (record.phoneNumber) createData.phoneNumber = record.phoneNumber;

        // Double-check if contestant with same IC already exists
        // This is a safety check in case someone else created a contestant with this IC
        // between validation and saving
        const existingContestant = await prisma.contestant.findUnique({
          where: { ic: record.ic },
        });

        if (existingContestant) {
          results.errors.push({
            row: rowNumber,
            message: `Contestant with IC ${record.ic} already exists`
          });
          continue;
        }

        // Create contestant
        await prisma.contestant.create({
          data: createData,
        });

        results.success++;
      } catch (error: any) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.errors.push({
          row: rowNumber,
          message: error.message || "Unknown error occurred"
        });
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error in bulk upload API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process upload" },
      { status: 500 }
    );
  }
}
