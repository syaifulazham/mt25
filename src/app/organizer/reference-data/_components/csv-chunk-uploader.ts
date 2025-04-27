/**
 * CSV Chunk Uploader
 * 
 * This utility handles large CSV files by:
 * 1. Parsing the entire CSV on the client-side
 * 2. Dividing the records into smaller chunks
 * 3. Uploading each chunk separately to avoid server limits
 * 4. Aggregating the results
 */

import { parse } from 'papaparse';

// Configuration
const DEFAULT_CHUNK_SIZE = 250; // Number of records per chunk
const MAX_CONCURRENT_UPLOADS = 3; // Maximum concurrent uploads

// Result type for chunk uploads
export interface ChunkUploadResult {
  total: number;   // Added total field to match the expected interface
  created: number;
  updated: number;
  skipped: number;
  errors: any[];
}

// Progress callback type
export type ProgressCallback = (current: number, total: number, phase: 'parsing' | 'uploading') => void;

/**
 * Process a CSV file in chunks and upload each chunk
 * 
 * @param file The CSV file to process
 * @param uploadUrl The API endpoint to upload chunks to
 * @param chunkSize Number of records per chunk
 * @param onProgress Progress callback
 * @returns Aggregated results from all chunks
 */
export async function uploadCsvInChunks(
  file: File,
  uploadUrl: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  onProgress?: ProgressCallback
): Promise<ChunkUploadResult> {
  // Step 1: Parse the CSV file
  onProgress?.(0, 100, 'parsing');
  
  const parseResult = await parseCSV(file, (progress) => {
    onProgress?.(progress, 100, 'parsing');
  });
  
  if (parseResult.errors.length > 0 && parseResult.errors[0].row !== 0) {
    throw new Error(`CSV parsing error: ${parseResult.errors[0].message}`);
  }
  
  // Get the records from the parse result
  const allRecords = parseResult.data;
  
  // Step 2: Validate basic CSV structure
  console.log('CSV parsing complete. Found records:', allRecords.length, 'First record:', allRecords[0]);
  
  if (!allRecords || allRecords.length === 0) {
    throw new Error('CSV file contains no data or could not be parsed correctly');
  }
  
  // Check if we have valid object records with expected fields (not empty arrays)
  if (allRecords.length > 0 && typeof allRecords[0] !== 'object') {
    throw new Error('CSV file format is incorrect. Please ensure it has headers and proper comma separation.');
  }
  
  // Create chunks of records
  const chunks: any[][] = [];
  for (let i = 0; i < allRecords.length; i += chunkSize) {
    chunks.push(allRecords.slice(i, i + chunkSize));
  }
  
  console.log(`CSV split into ${chunks.length} chunks of ~${chunkSize} records each`);
  
  // Step 3: Upload each chunk with progress tracking
  let uploadedChunks = 0;
  let currentProgress = 0;
  
  // Initialize aggregated results
  const aggregatedResult: ChunkUploadResult = {
    total: allRecords.length,  // Set total to the number of records processed
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };
  
  // Process chunks with limited concurrency
  for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_UPLOADS) {
    const chunkBatch = chunks.slice(i, i + MAX_CONCURRENT_UPLOADS);
    
    await Promise.all(chunkBatch.map(async (chunk, index) => {
      const chunkNumber = i + index + 1;
      
      try {
        // Create a JSON payload for this chunk
        const chunkData = {
          records: chunk,
          totalChunks: chunks.length,
          chunkNumber: chunkNumber,
          isLastChunk: chunkNumber === chunks.length
        };
        
        // Upload the chunk
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Chunk-Upload': 'true',
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify(chunkData)
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          // Handle HTML response
          const text = await response.text();
          console.error('Non-JSON response for chunk ${chunkNumber}:', text.substring(0, 200));
          throw new Error(`Server returned HTML instead of JSON. The server may have timed out.`);
        }
        
        // Parse the result
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || `Upload failed with status ${response.status}`);
        }
        
        // Aggregate the results
        aggregatedResult.created += result.created || 0;
        aggregatedResult.updated += result.updated || 0;
        aggregatedResult.skipped += result.skipped || 0;
        
        if (result.errors && result.errors.length > 0) {
          // Adjust error row numbers to account for chunking
          const baseRowIndex = (chunkNumber - 1) * chunkSize;
          const adjustedErrors = result.errors.map((err: any) => ({
            ...err,
            row: err.row + baseRowIndex  // Adjust row number based on chunk
          }));
          aggregatedResult.errors.push(...adjustedErrors);
        }
      } catch (error: any) {
        console.error(`Error uploading chunk ${chunkNumber}:`, error);
        aggregatedResult.errors.push({
          chunkNumber,
          error: error.message
        });
      }
      
      // Update progress
      uploadedChunks++;
      currentProgress = Math.floor((uploadedChunks / chunks.length) * 100);
      onProgress?.(currentProgress, 100, 'uploading');
    }));
  }
  
  return aggregatedResult;
}

/**
 * Parse a CSV file using PapaParse
 */
function parseCSV(file: File, onProgress?: (progress: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    // Try to detect file encoding to avoid parsing issues
    const reader = new FileReader();
    
    reader.onload = () => {
      // Check if file seems to be a valid CSV
      const textSample = reader.result?.toString().slice(0, 1000) || '';
      if (!textSample.includes(',')) {
        return reject(new Error('File does not appear to be a valid CSV. No commas detected.'));
      }
      
      // Logging to help with debugging
      console.log('CSV sample:', textSample.slice(0, 100));
      
      // Proceed with parsing
      parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim(),
        complete: (results) => {
          console.log('CSV parsing complete:', results.data.length, 'rows,', 
                    results.errors.length, 'errors, Fields:', 
                    results.meta.fields?.join(', '));
          resolve(results);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          reject(error);
        },
        // Unfortunately, PapaParse doesn't provide reliable progress tracking with typings
        // So we'll just update progress at fixed intervals
        step: (results, parser) => {
          if (onProgress) {
            // Use an approximation since we don't have direct access to bytes read
            // The typings in PapaParse don't specify the data type properly
            const dataLength = Array.isArray(results.data) ? results.data.length : 0;
            const approxProgress = Math.min(95, Math.floor((dataLength / (file.size / 100)) * 20));
            onProgress(approxProgress);
          }
        },
        download: false,
        delimiter: '',  // Auto-detect delimiter
        comments: false,
        fastMode: false,
      });
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading the CSV file'));
    };
    
    // Read a portion of the file for validation
    const blob = file.slice(0, 8192);  // First 8KB should be enough for header detection
    reader.readAsText(blob);
  });
}
