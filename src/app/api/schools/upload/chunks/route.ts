import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Define the expected CSV structure for schools
type SchoolRecord = {
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

// POST /api/schools/upload/chunks - Upload schools from chunked JSON data
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

    // Parse the JSON payload
    const payload = await request.json();
    
    // Validate the payload structure
    if (!payload.records || !Array.isArray(payload.records) || payload.records.length === 0) {
      return NextResponse.json({ error: "Invalid chunk data structure" }, { status: 400 });
    }

    // Extract chunk data
    const { records, chunkNumber, totalChunks, isLastChunk } = payload;
    
    console.log(`Processing chunk ${chunkNumber}/${totalChunks} with ${records.length} records`);

    // Get all states for mapping
    const states = await prisma.state.findMany();
    const stateMap = new Map(states.map((state) => [state.name.toLowerCase(), state.id]));

    // Process each row
    const results = {
      total: records.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; code: string; error: string }[],
    };

    // Process in batches of 25 to avoid overwhelming the database
    const batchSize = 25;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (row: SchoolRecord, index: number) => {
          const rowIndex = i + index + 1; // +1 for 1-indexing
          
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

            if (row.latitude && !isNaN(parseFloat(row.latitude))) {
              latitude = parseFloat(row.latitude);
            }

            if (row.longitude && !isNaN(parseFloat(row.longitude))) {
              longitude = parseFloat(row.longitude);
            }

            // Check if school with this code already exists
            const existingSchool = await prisma.school.findFirst({
              where: { code: row.code.trim() },
            });

            if (existingSchool) {
              // Update existing school
              await prisma.school.update({
                where: { id: existingSchool.id },
                data: {
                  name: row.name.trim(),
                  level: row.level.trim(),
                  category: row.category.trim(),
                  ppd: row.ppd ? row.ppd.trim() : null,
                  address: row.address ? row.address.trim() : null,
                  city: row.city ? row.city.trim() : null,
                  postcode: row.postcode ? row.postcode.trim() : null,
                  stateId,
                  latitude,
                  longitude,
                  // Prisma may auto-update the updatedAt field if it's configured in the schema
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
                  ppd: row.ppd ? row.ppd.trim() : null,
                  address: row.address ? row.address.trim() : null,
                  city: row.city ? row.city.trim() : null,
                  postcode: row.postcode ? row.postcode.trim() : null,
                  stateId,
                  latitude,
                  longitude,
                  // Prisma will automatically set createdAt/updatedAt if they're defined in the schema
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
              error: error.message,
            });
          }
        })
      );
    }

    // Return the results
    return NextResponse.json({
      ...results,
      chunkNumber,
      totalChunks,
      isLastChunk,
    });
  } catch (error: any) {
    console.error("Error processing chunk:", error);
    return NextResponse.json(
      { error: error.message || "Error processing chunk" },
      { status: 500 }
    );
  }
}
