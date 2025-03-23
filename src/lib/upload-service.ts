/**
 * Upload service for handling file uploads
 */

/**
 * Upload a file to the server
 * @param file The file to upload
 * @param type The type of file (image, document, etc.)
 * @returns The URL of the uploaded file
 */
export async function uploadFile(file: File, type: string = 'image'): Promise<string> {
  // Create a FormData object to send the file
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  try {
    // Send the file to the upload endpoint
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include', // Include cookies for authentication
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Get a list of uploaded images
 * @param limit Maximum number of images to return
 * @param page Page number for pagination
 * @returns Array of image objects with URLs and metadata
 */
export async function getUploadedImages(limit: number = 20, page: number = 1): Promise<{
  images: Array<{
    id: string;
    url: string;
    filename: string;
    createdAt: string;
    fileSize: number;
    dimensions?: { width: number; height: number };
  }>;
  total: number;
  page: number;
  totalPages: number;
}> {
  try {
    const response = await fetch(`/api/upload/images?limit=${limit}&page=${page}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch images with status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching uploaded images:', error);
    throw error;
  }
}
