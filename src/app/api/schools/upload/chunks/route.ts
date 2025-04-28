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
    let { records, headers, chunkNumber, totalChunks, isLastChunk } = payload;
    
    // Log received headers for debugging
    console.log(`Received headers: ${headers ? JSON.stringify(headers) : 'none'}`);
    
    // Validate headers if provided
    if (headers && Array.isArray(headers)) {
      console.log(`Using ${headers.length} headers from client: ${headers.join(', ')}`);
    }
    
    // Log sample records for debugging
    if (records && records.length > 0) {
      console.log('Sample record (first row):', JSON.stringify(records[0]));
      
      // Check for required fields in first record
      const sampleRecord = records[0];
      const requiredFields = ['code', 'name', 'level', 'category', 'state'];
      const missingFields = requiredFields.filter(field => !sampleRecord[field]);
      
      if (missingFields.length > 0) {
        console.warn(`Missing required fields in sample record: ${missingFields.join(', ')}`);
        console.log('Available fields:', Object.keys(sampleRecord).join(', '));
        
        // Try to normalize/standardize fields in all records
        console.log('Attempting to standardize field names in records...');
        const normalizedRecords = records.map((record: any) => {
          const normalizedRecord = { ...record };
          
          // Common field mappings
          const fieldMappings = {
            'code': ['kod', 'school_code', 'schoolcode', 'id', 'schoolid'],
            'name': ['nama', 'school_name', 'schoolname'],
            'level': ['tahap', 'school_level', 'schoollevel'],
            'category': ['kategori', 'jenis', 'type', 'school_category'],
            'state': ['negeri', 'state_name']
          };
          
          // Apply mappings
          for (const [standardField, alternateFields] of Object.entries(fieldMappings)) {
            // Only map if the standard field is missing
            if (!normalizedRecord[standardField]) {
              // Try each alternate field
              for (const altField of alternateFields) {
                // Check if any key in the record matches this alternate field (case insensitive)
                const matchingKey = Object.keys(record).find(
                  key => key.toLowerCase() === altField.toLowerCase()
                );
                
                if (matchingKey && record[matchingKey]) {
                  normalizedRecord[standardField] = record[matchingKey];
                  console.log(`Mapped '${matchingKey}' to '${standardField}'`);
                  break;
                }
              }
            }
          }
          
          return normalizedRecord;
        });
        
        // Use the normalized records
        records = normalizedRecords;
      }
    }
    
    console.log(`Processing chunk ${chunkNumber}/${totalChunks} with ${records.length} records`);

    // Get all states for mapping
    const states = await prisma.state.findMany();
    
    // Create a more flexible state map with multiple possible formats
    const stateMap = new Map();
    
    // Log all available states for debugging
    console.log('Available states in database:', states.map(s => s.name).join(', '));
    
    // Add each state to the map with multiple formats
    states.forEach(state => {
      const stateName = state.name.toLowerCase().trim();
      stateMap.set(stateName, state.id); // Regular format
      stateMap.set(stateName.replace(/\s+/g, ''), state.id); // No spaces
      stateMap.set(stateName.replace(/\W/g, ''), state.id);  // Alphanumeric only
      
      // Handle common abbreviations and alternate names
      // Add known Malaysian state abbreviations/alternates if needed
      if (stateName === 'wilayah persekutuan') {
        stateMap.set('wp', state.id);
        stateMap.set('kuala lumpur', state.id);
        stateMap.set('putrajaya', state.id);
      }
      if (stateName === 'pulau pinang') stateMap.set('penang', state.id);
      // Add any other known aliases here
    });

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
            // Check for required fields with detailed error reporting
            const missingFields = [];
            if (!row.code) missingFields.push('code');
            if (!row.name) missingFields.push('name');
            if (!row.level) missingFields.push('level');
            if (!row.category) missingFields.push('category');
            if (!row.state) missingFields.push('state');
            
            if (missingFields.length > 0) {
              results.skipped++;
              results.errors.push({
                row: rowIndex,
                code: row.code || "unknown",
                error: `Missing required fields: ${missingFields.join(', ')}. Available fields: ${Object.keys(row).join(', ')}`,
              });
              return;
            }

            // Find state ID - try multiple formats for more forgiving matching
            const stateName = row.state.trim().toLowerCase();
            let stateId = stateMap.get(stateName);
            
            // If not found, try alternative formats
            if (!stateId) {
              // Try without spaces
              stateId = stateMap.get(stateName.replace(/\s+/g, ''));
            }
            
            if (!stateId) {
              // Try alphanumeric only
              stateId = stateMap.get(stateName.replace(/\W/g, ''));
            }
            
            // Log the problematic state name for diagnostics
            if (!stateId) {
              console.log(`State not found: '${row.state}' (normalized: '${stateName}')`);
            }

            if (!stateId) {
              // Try fallback - use first state if this is just for testing
              // COMMENT THIS OUT IN PRODUCTION if you don't want fallback
              if (states.length > 0 && process.env.NODE_ENV !== 'production') {
                console.warn(`Using fallback state ID for '${row.state}'. THIS SHOULD NOT BE USED IN PRODUCTION.`);
                stateId = states[0].id;
              } else {
                results.skipped++;
                results.errors.push({
                  row: rowIndex,
                  code: row.code,
                  error: `State '${row.state}' not found. Available states: ${states.map(s => s.name).join(', ')}`,
                });
                return;
              }
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
