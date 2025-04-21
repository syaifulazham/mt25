import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { parse } from 'csv-parse/sync';
import { validateContestantRecord } from '@/lib/utils/contestant-validation';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Handle file upload
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file content as text
    const fileContent = await file.text();
    
    // Parse CSV data
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true
    }) as any[];

    // Validate each record
    const validatedRecords = records.map((record, index) => {
      const validation = validateContestantRecord(record);
      return {
        rowNumber: index + 2, // +2 for header row and 0-indexing
        originalData: record,
        validatedData: validation.data,
        isValid: validation.isValid,
        errors: validation.validationErrors
      };
    });

    // Check for duplicate ICs in the file
    const icMap = new Map<string, number[]>();
    validatedRecords.forEach((record, index) => {
      const ic = record.validatedData.ic;
      if (ic) {
        if (!icMap.has(ic)) {
          icMap.set(ic, []);
        }
        icMap.get(ic)?.push(index);
      }
    });

    // Mark duplicates as invalid
    icMap.forEach((indices, ic) => {
      if (indices.length > 1) {
        indices.forEach(index => {
          validatedRecords[index].isValid = false;
          validatedRecords[index].errors.ic = `Duplicate IC found in rows: ${indices.map(i => i + 2).join(', ')}`;
        });
      }
    });

    // Check for existing ICs in the database if there are any ICs to check
    const icsToCheck = Array.from(icMap.keys()).filter(ic => ic && ic.length === 12);
    
    if (icsToCheck.length > 0) {
      const existingICs = await prisma.contestant.findMany({
        where: {
          ic: {
            in: icsToCheck
          }
        },
        select: {
          ic: true
        }
      });

      // Mark existing ICs as invalid
      const existingICSet = new Set(existingICs.map(c => c.ic));
      validatedRecords.forEach(record => {
        if (record.validatedData.ic && existingICSet.has(record.validatedData.ic)) {
          record.isValid = false;
          record.errors.ic = `IC already exists in the database`;
        }
      });
    }

    // Return validation results
    return NextResponse.json({
      records: validatedRecords,
      totalRecords: validatedRecords.length,
      validRecords: validatedRecords.filter(r => r.isValid).length,
      invalidRecords: validatedRecords.filter(r => !r.isValid).length
    });
  } catch (error: any) {
    console.error("Error in validation API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate contestants" },
      { status: 500 }
    );
  }
}
