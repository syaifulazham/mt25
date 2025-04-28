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
  
  // Log detailed parsing results for debugging
  console.log('Parsed records:', parseResult.data.length, 
            'Errors:', parseResult.errors.length,
            'Fields:', parseResult.meta.fields);
            
  if (parseResult.data.length === 0) {
    throw new Error('CSV file contains no valid data records');
  }
            
  if (parseResult.errors.length > 0) {
    throw new Error(`CSV parsing error: ${parseResult.errors[0].message}`);
  }
  
  // Step 3: Split records into chunks and upload each chunk
  // Define fallback headers if none detected
  if (!parseResult.meta.fields || parseResult.meta.fields.length === 0) {
    console.warn('CSV headers could not be detected automatically - using fallback headers');
    // Provide standard school fields as fallback headers
    parseResult.meta.fields = ['code', 'name', 'level', 'category', 'state', 'ppd', 'address', 'city', 'postcode', 'latitude', 'longitude'];
  }
  
  // Store the headers for each chunk
  const headers = parseResult.meta.fields;
  console.log('Using headers for chunks:', headers);
  
  const chunkCount = Math.ceil(parseResult.data.length / chunkSize);
  const chunks = [];
  
  for (let i = 0; i < chunkCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, parseResult.data.length);
    chunks.push(parseResult.data.slice(start, end));
  }
  
  console.log(`CSV split into ${chunks.length} chunks of ~${chunkSize} records each`);
  
  // Step 3: Upload each chunk with progress tracking
  let uploadedChunks = 0;
  let currentProgress = 0;
  
  // Initialize aggregated results
  const aggregatedResult: ChunkUploadResult = {
    total: parseResult.data.length,  // Set total to the number of records processed
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
          headers: headers, // Include headers with each chunk
          chunkNumber: index + 1,
          totalChunks: chunks.length,
          isLastChunk: index === chunks.length - 1
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
 * Parse a CSV file using PapaParse with enhanced format detection
 */
function parseCSV(file: File, onProgress?: (progress: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    // Try to detect file encoding and format
    const reader = new FileReader();
    
    reader.onload = () => {
      // Get a sample of the file content
      const textSample = reader.result?.toString() || '';
      
      // Check for UTF-8 BOM (Byte Order Mark) which can interfere with parsing
      const hasBOM = textSample.charCodeAt(0) === 0xFEFF;
      if (hasBOM) {
        console.log('Detected UTF-8 BOM character at the start of file');
      }
      
      // Get a clean sample without BOM if present
      const cleanSample = hasBOM ? textSample.slice(1) : textSample;
      const lines = cleanSample.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      if (lines.length === 0) {
        return reject(new Error('File appears to be empty or contains no data rows.'));
      }
      
      // Log the first few lines for debugging
      console.log('First lines of CSV:');
      lines.slice(0, 3).forEach((line, i) => console.log(`Line ${i}: ${line}`));
      console.log('Detected line endings:', textSample.includes('\r\n') ? 'CRLF' : 'LF');
      
      // Try to detect the delimiter by checking common options
      const potentialDelimiters = [',', ';', '\t', '|'];
      let mostLikelyDelimiter = ',';
      let maxFields = 0;
      
      potentialDelimiters.forEach(delimiter => {
        const fieldCount = lines[0].split(delimiter).length;
        console.log(`Testing delimiter '${delimiter}' - fields: ${fieldCount}`);
        if (fieldCount > maxFields) {
          maxFields = fieldCount;
          mostLikelyDelimiter = delimiter;
        }
      });
      
      // Get list of potential headers from the first row
      const potentialHeaders = lines[0].split(mostLikelyDelimiter).map(h => h.trim());
      console.log(`Potential headers (${potentialHeaders.length}):`, potentialHeaders.join(', '));
      console.log(`Selected delimiter: '${mostLikelyDelimiter}' with ${maxFields} fields`);
      
      // Try parsing with multiple configurations 
      parse(file, {
        header: true, 
        dynamicTyping: false, 
        skipEmptyLines: 'greedy', 
        transformHeader: (header: string) => {
          // Better header normalization - strip quotes and whitespace
          let normalized = header.trim();
          
          // Remove quotes if present
          if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
              (normalized.startsWith('\'') && normalized.endsWith('\'')))
          {
            normalized = normalized.slice(1, -1).trim();
          }
          
          normalized = normalized.toLowerCase();
          console.log(`Header mapping: '${header}' -> '${normalized}'`);
          return normalized;
        },
        delimiter: mostLikelyDelimiter,
        complete: (results: any) => {
          // Even if no field headers are detected, try to work with the data
          if (!results.meta.fields || results.meta.fields.length === 0) {
            // First try - maybe the file doesn't have headers but has data
            if (results.data && results.data.length > 0) {
              console.log('No headers detected, but data found. Creating default column names.');
              
              // Create default column names based on first row's structure
              const sampleRow = results.data[0];
              const columnCount = Object.keys(sampleRow).length || 1;
              
              // Generate numeric column names
              results.meta.fields = [];
              for (let i = 0; i < columnCount; i++) {
                results.meta.fields.push(`column${i+1}`);
              }
              
              console.log('Created default column names:', results.meta.fields);
              
              // Continue with these column names
              return resolve(results);
            }
            
            // Real error - no headers and no data
            return reject(new Error('CSV file appears to be empty or has an invalid format.'));
          }
          
          if (results.data.length === 0) {
            return reject(new Error('CSV file contains no data rows after parsing.'));
          }
          
          // Identify rows with data vs empty rows
          const nonEmptyRows = results.data.filter((row: any) => {
            return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '');
          });
          
          if (nonEmptyRows.length === 0) {
            return reject(new Error('All rows appear to be empty after parsing.'));
          }
          
          console.log('CSV parsing complete:', 
                    `${results.data.length} total rows,`,
                    `${nonEmptyRows.length} non-empty rows,`, 
                    `${results.errors.length} errors,`,
                    'Fields:', results.meta.fields?.join(', '));
                    
          // Log a data sample to help with debugging
          if (results.data.length > 0) {
            console.log('First row sample:', JSON.stringify(results.data[0]));
          }
          
          resolve(results);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          reject(error);
        },
        // Progress tracking
        step: (results: any, parser: any) => {
          if (onProgress) {
            const dataLength = Array.isArray(results.data) ? results.data.length : 0;
            const approxProgress = Math.min(95, Math.floor((dataLength / (file.size / 100)) * 20));
            onProgress(approxProgress);
          }
        },
        download: false,
        comments: false,
        fastMode: false
      });
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading the CSV file: ' + reader.error?.message));
    };
    
    // Read with UTF-8 encoding first
    try {
      reader.readAsText(file, 'UTF-8');
    } catch (err: any) {
      // If that fails, try with a different encoding
      console.error('Error with UTF-8 encoding, trying ISO-8859-1', err);
      reader.readAsText(file, 'ISO-8859-1');
    }
  });
}
