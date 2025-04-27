/**
 * Helper functions for CSV uploads with better error handling
 */

// Max file size in MB
export const MAX_CSV_FILE_SIZE_MB = 2;

/**
 * Validate a CSV file before upload
 * @param file The file to validate
 * @returns Error message if validation fails, null if valid
 */
export function validateCsvFile(file: File): string | null {
  // Check file type
  if (!file.name.endsWith('.csv')) {
    return 'Only CSV files are allowed';
  }
  
  // Check file size
  const maxSizeBytes = MAX_CSV_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File size exceeds ${MAX_CSV_FILE_SIZE_MB}MB limit. Please reduce file size or split into smaller files.`;
  }
  
  return null;
}

/**
 * Upload a CSV file with enhanced error handling
 * @param url The API endpoint to upload to
 * @param file The file to upload
 * @param onProgress Optional callback for progress updates
 */
export async function uploadCsvWithErrorHandling(
  url: string,
  file: File,
  onProgress?: (progress: number) => void
) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    // Start progress
    if (onProgress) onProgress(10);
    
    // Set up interval for progress simulation
    let progressValue = 10;
    const progressInterval = setInterval(() => {
      progressValue += 5;
      if (progressValue >= 90) {
        progressValue = 90;
        clearInterval(progressInterval);
      }
      if (onProgress) onProgress(progressValue);
    }, 200);
    
    // Perform the upload with improved error handling
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set content-type header - FormData will set it with boundary
      headers: {
        // Add a cache buster to prevent caching issues
        'x-timestamp': Date.now().toString()
      }
    });
    
    // Clear the progress interval
    clearInterval(progressInterval);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (onProgress) onProgress(0); // Reset progress
      
      // Log the raw response for debugging
      const rawText = await response.text();
      console.error('Non-JSON response received:', {
        status: response.status,
        contentType,
        responseStart: rawText.substring(0, 500) // First 500 chars
      });
      
      // Throw a more specific error
      throw new Error(
        `Server returned non-JSON response (${response.status}). This may indicate a server timeout or size limit exceeded.`
      );
    }
    
    // Parse JSON response
    const data = await response.json();
    
    // Update progress to 100%
    if (onProgress) onProgress(100);
    
    if (!response.ok) {
      throw new Error(data.error || `Upload failed with status ${response.status}`);
    }
    
    return data;
  } catch (error: any) {
    // Reset progress
    if (onProgress) onProgress(0);
    
    // Create a more specific error message
    if (error.name === 'AbortError') {
      throw new Error('Upload cancelled or timed out');
    } else if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
      throw new Error('Network error during upload. Check your connection and try again.');
    } else {
      throw error; // Re-throw the original error
    }
  }
}
