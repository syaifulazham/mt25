import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";
import { existsSync } from "fs";

// POST /api/upload - Upload a file
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string || "theme";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/svg+xml", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, SVG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 5MB." },
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
    }
    
    const fileName = `${filePrefix}_${uniqueId}.${fileExtension}`;
    
    // Ensure the uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads", uploadDir);
    
    // Create directory if it doesn't exist
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    
    // Convert the file to a Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Write the file to the uploads directory
    await writeFile(join(uploadsDir, fileName), buffer);
    
    // Return the path to the uploaded file
    const filePath = `/uploads/${uploadDir}/${fileName}`;
    
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
