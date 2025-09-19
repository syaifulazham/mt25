import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { v4 as uuidv4 } from 'uuid'

// Allowed roles for uploading PDFs
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Authenticate user using NextAuth
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated and has required role
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    // Parse the FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the 10MB limit' },
        { status: 400 }
      )
    }

    // Generate a unique filename
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Create unique file path with uuid to prevent overwriting
    const uniqueId = uuidv4()
    const originalName = file.name
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${uniqueId}-${sanitizedName}`
    
    // Make sure the upload directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'templates')
    await mkdir(uploadDir, { recursive: true })
    
    // Save the file to disk
    const filePath = join(uploadDir, fileName)
    await writeFile(filePath, buffer)
    
    // Return the relative path for storage in the database
    const relativePath = `/uploads/templates/${fileName}`
    
    return NextResponse.json({ 
      success: true, 
      filePath: relativePath,
      originalName: originalName 
    })
    
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// Define limits for file size in config
export const config = {
  api: {
    bodyParser: false,
  },
}
