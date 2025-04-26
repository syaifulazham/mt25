import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { parse } from "papaparse";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Define the expected CSV structure
type TargetGroupCsvRow = {
  code: string;
  name: string;
  ageGroup: string;
  minAge?: string;
  maxAge?: string;
  schoolLevel: string;
};

// POST /api/target-groups/upload - Upload target groups from CSV
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and OPERATOR can upload target groups
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file type
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "Only CSV files are allowed" }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();

    // Parse CSV
    const { data, errors } = parse<TargetGroupCsvRow>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Error parsing CSV", details: errors },
        { status: 400 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty or has no valid rows" },
        { status: 400 }
      );
    }

    // Validate required headers
    const requiredHeaders = ["code", "name", "agegroup", "schoollevel"];
    const missingHeaders = requiredHeaders.filter(
      (header) => !Object.keys(data[0]).includes(header)
    );

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: "CSV is missing required headers",
          details: missingHeaders,
        },
        { status: 400 }
      );
    }

    // Process each row
    const results = {
      total: data.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; code: string; error: string }[],
    };

    // Process in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (row, index) => {
          const rowIndex = i + index + 2; // +2 because of 0-indexing and header row
          
          try {
            // Validate required fields
            if (!row.code || !row.name || !row.ageGroup || !row.schoolLevel) {
              results.skipped++;
              results.errors.push({
                row: rowIndex,
                code: row.code || "unknown",
                error: "Missing required fields",
              });
              return;
            }

            // Parse minAge and maxAge if provided
            let minAge = 0;
            let maxAge = 0;

            if (row.minAge) {
              const parsedMinAge = parseInt(row.minAge);
              if (!isNaN(parsedMinAge) && parsedMinAge >= 0) {
                minAge = parsedMinAge;
              }
            }

            if (row.maxAge) {
              const parsedMaxAge = parseInt(row.maxAge);
              if (!isNaN(parsedMaxAge) && parsedMaxAge >= 0) {
                maxAge = parsedMaxAge;
              }
            }

            // Check if target group already exists
            const existingTargetGroup = await prisma.targetgroup.findFirst({
              where: { code: row.code },
            });

            if (existingTargetGroup) {
              // Update existing target group
              await prisma.targetgroup.update({
                where: { id: existingTargetGroup.id },
                data: {
                  name: row.name.trim(),
                  ageGroup: row.ageGroup.trim(),
                  minAge,
                  maxAge,
                  schoolLevel: row.schoolLevel.trim(),
                },
              });
              results.updated++;
            } else {
              // Create new target group
              await prisma.targetgroup.create({
                data: {
                  code: row.code.trim(),
                  name: row.name.trim(),
                  ageGroup: row.ageGroup.trim(),
                  minAge,
                  maxAge,
                  schoolLevel: row.schoolLevel.trim(),
                },
              });
              results.created++;
            }
          } catch (error: any) {
            console.error(`Error processing row ${rowIndex}:`, error);
            results.skipped++;
            results.errors.push({
              row: rowIndex,
              code: row.code || "unknown",
              error: error.message || "Unknown error",
            });
          }
        })
      );
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error uploading target groups:", error);
    return NextResponse.json(
      { error: "Failed to process CSV file" },
      { status: 500 }
    );
  }
}
