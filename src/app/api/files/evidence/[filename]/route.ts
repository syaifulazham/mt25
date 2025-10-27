import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    // Authenticate the request
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const filename = params.filename;
    
    if (!filename) {
      return new NextResponse('Filename is required', { status: 400 });
    }

    // Sanitize filename to prevent directory traversal attacks
    // Allow alphanumeric, dots, hyphens, underscores, spaces, and commas
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.\-_\s,]/g, '');
    if (sanitizedFilename !== filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    // Construct the file path
    const filePath = join(process.cwd(), 'public', 'uploads', 'evidence', sanitizedFilename);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Read the file
    const fileBuffer = await readFile(filePath);
    
    // Determine content type based on file extension
    const extension = filename.toLowerCase().split('.').pop();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      default:
        contentType = 'application/octet-stream';
    }

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error serving evidence file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
