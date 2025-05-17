import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prismaExecute } from '@/lib/prisma';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const teamId = formData.get('teamId') as string;

    if (!file || !teamId) {
      return NextResponse.json({ error: 'File and teamId are required' }, { status: 400 });
    }

    // Check file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed. Please upload PDF or images (JPEG, PNG).' }, { status: 400 });
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const filename = `${uuidv4()}-${file.name.replace(/\s+/g, '_')}`;
    
    // Ensure the uploads directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'evidence');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    const filePath = join(uploadDir, filename);
    const fileUrl = `/uploads/evidence/${filename}`;

    // Write the file to the server
    await writeFile(filePath, buffer);

    // Update the team record with the evidence document URL
    await prismaExecute(prisma => 
      prisma.team.update({
        where: { id: parseInt(teamId) },
        data: { 
          evidence_doc: fileUrl,
          evidence_submitteddate: new Date()
        }
      })
    );

    return NextResponse.json({ 
      success: true, 
      documentUrl: fileUrl,
      message: 'Evidence document uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading evidence document:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
