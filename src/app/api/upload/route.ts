import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";
import { existsSync } from "fs";

// POST /api/upload - Upload a file
export async function POST(request: NextRequest) {
  try {
    console.log("Starting upload process");
    
    // Check authentication
    const user = await getCurrentUser();
    
    // Must be authenticated for any upload
    if (!user) {
      console.log("Upload failed: User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string || "theme";
    
    console.log(`Upload request: Type=${type}, File size=${file?.size || 'N/A'}, File type=${file?.type || 'N/A'}`);
    
    // Photo gallery uploads can be performed by any authenticated user
    // Other uploads require ADMIN or OPERATOR roles
    if (!type.includes("photo-galleries") && !hasRequiredRole(user, ["ADMIN", "OPERATOR"])) {
      console.log(`Upload failed: User ${user.email} lacks permission for upload type ${type}`);
      return NextResponse.json({ error: "Insufficient permissions for this upload type" }, { status: 403 });
    }

    if (!file) {
      console.log("Upload failed: No file provided");
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/svg+xml", "image/webp"];
    if (!validTypes.includes(file.type)) {
      console.log(`Upload failed: Invalid file type ${file.type}`);
      return NextResponse.json(
        { error: `Invalid file type ${file.type}. Only JPEG, PNG, GIF, SVG, and WebP are allowed.` },
        { status: 400 }
      );
    }

    // Validate file size - different limits based on upload type
    let maxSize = 5 * 1024 * 1024; // Default: 5MB
    
    // For photo galleries, allow larger files (25MB)
    if (type.includes("photo-galleries")) {
      maxSize = 25 * 1024 * 1024; // 25MB
    }
    
    if (file.size > maxSize) {
      const sizeInMB = Math.round(maxSize / (1024 * 1024));
      console.log(`Upload failed: File too large (${file.size} bytes), max allowed ${maxSize} bytes`);
      return NextResponse.json(
        { error: `File is too large. Maximum size is ${sizeInMB}MB.` },
        { status: 400 }
      );
    }

    // Create a unique filename
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const uniqueId = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Get file extension
    const fileExtension = file.name.split('.').pop();
    
    // Determine upload directory based on type
    let uploadDir = "themes";
    let filePrefix = "theme";
    
    if (type === "content" || type === "news") {
      uploadDir = "content";
      filePrefix = "content";
    } else if (type === "avatar") {
      uploadDir = "avatars";
      filePrefix = "avatar";
    } else if (type === "contest") {
      uploadDir = "contests";
      filePrefix = "contest";
    } else if (type === "photo-galleries") {
      uploadDir = "photo-galleries";
      filePrefix = "gallery";
    } else if (type === "photo-galleries/photos") {
      uploadDir = "photo-galleries/photos";
      filePrefix = "photo";
    }
    
    const fileName = `${filePrefix}_${uniqueId}.${fileExtension}`;
    
    // Ensure the uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads", uploadDir);
    console.log(`Creating upload directory: ${uploadsDir}`);
    
    try {
      // Create directory if it doesn't exist (using recursive to create nested paths)
      await mkdir(uploadsDir, { recursive: true });
    } catch (dirError) {
      console.error(`Error creating directory ${uploadsDir}:`, dirError);
      return NextResponse.json(
        { error: "Server error: Could not create upload directory" },
        { status: 500 }
      );
    }
    
    // Public URL path to the uploaded file
    const filePath = `/uploads/${uploadDir}/${fileName}`;
    
    try {
      console.log(`Processing file: ${fileName}, size: ${file.size} bytes`);
      
      // Convert the file to a Buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Full path to the file
      const fullFilePath = join(uploadsDir, fileName);
      console.log(`Writing file to: ${fullFilePath}`);
      
      // Write the file to the uploads directory
      await writeFile(fullFilePath, buffer);
      
      console.log(`File successfully uploaded: ${filePath}`);
    } catch (fileError) {
      console.error("Error processing file:", fileError);
      return NextResponse.json(
        { error: "Failed to process uploaded file" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      url: filePath,
      filePath,
      fileName,
      fileSize: file.size,
      fileType: file.type
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
