import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { parse } from "papaparse";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Define the expected CSV structure
type SchoolCsvRow = {
  code: string;
  name: string;
  level: string;
  category: string;
  ppd?: string;
  address?: string;
  city?: string;
  postcode?: string;
  state: string;
  latitude?: string;
  longitude?: string;
};

// POST /api/schools/upload - Upload schools from CSV
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and OPERATOR can upload schools
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
    const { data, errors } = parse<SchoolCsvRow>(fileContent, {
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
    const requiredHeaders = ["code", "name", "level", "category", "state"];
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

    // Get all states for mapping
    const states = await prisma.state.findMany();
    const stateMap = new Map(states.map((state) => [state.name.toLowerCase(), state.id]));

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
            if (!row.code || !row.name || !row.level || !row.category || !row.state) {
              results.skipped++;
              results.errors.push({
                row: rowIndex,
                code: row.code || "unknown",
                error: "Missing required fields",
              });
              return;
            }

            // Find state ID
            const stateName = row.state.trim().toLowerCase();
            const stateId = stateMap.get(stateName);

            if (!stateId) {
              results.skipped++;
              results.errors.push({
                row: rowIndex,
                code: row.code,
                error: `State '${row.state}' not found`,
              });
              return;
            }

            // Parse latitude and longitude if provided
            let latitude: number | null = null;
            let longitude: number | null = null;

            if (row.latitude) {
              const parsedLat = parseFloat(row.latitude);
              if (!isNaN(parsedLat)) {
                latitude = parsedLat;
              }
            }

            if (row.longitude) {
              const parsedLong = parseFloat(row.longitude);
              if (!isNaN(parsedLong)) {
                longitude = parsedLong;
              }
            }

            // Check if school already exists
            const existingSchool = await prisma.school.findFirst({
              where: { code: row.code },
            });

            if (existingSchool) {
              // Update existing school
              await prisma.school.update({
                where: { id: existingSchool.id },
                data: {
                  name: row.name.trim(),
                  level: row.level.trim(),
                  category: row.category.trim(),
                  ppd: row.ppd?.trim() || null,
                  address: row.address?.trim() || null,
                  city: row.city?.trim() || null,
                  postcode: row.postcode?.trim() || null,
                  stateId,
                  latitude,
                  longitude,
                },
              });
              results.updated++;
            } else {
              // Create new school
              await prisma.school.create({
                data: {
                  code: row.code.trim(),
                  name: row.name.trim(),
                  level: row.level.trim(),
                  category: row.category.trim(),
                  ppd: row.ppd?.trim() || null,
                  address: row.address?.trim() || null,
                  city: row.city?.trim() || null,
                  postcode: row.postcode?.trim() || null,
                  stateId,
                  latitude,
                  longitude,
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
    console.error("Error uploading schools:", error);
    return NextResponse.json(
      { error: "Failed to process CSV file" },
      { status: 500 }
    );
  }
}
