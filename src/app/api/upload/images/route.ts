import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { join } from "path";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";
import { readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// GET /api/upload/images - Get uploaded images
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "content";
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    
    // Determine which directory to read based on type
    let uploadDir = "content";
    if (type === "theme") {
      uploadDir = "themes";
    } else if (type === "avatar") {
      uploadDir = "avatars";
    } else if (type === "contest") {
      uploadDir = "contests";
    }
    
    const uploadsPath = join(process.cwd(), "public", "uploads", uploadDir);
    
    // Check if directory exists
    if (!existsSync(uploadsPath)) {
      return NextResponse.json({
        images: [],
        total: 0,
        page: 1,
        totalPages: 1
      });
    }
    
    try {
      // Read directory contents
      const files = await readdir(uploadsPath);
      
      // Filter for image files
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      });
      
      // Get file stats for each image
      const imagePromises = imageFiles.map(async (filename) => {
        const filePath = join(uploadsPath, filename);
        const fileStats = await stat(filePath);
        
        return {
          id: filename.replace(/\.[^/.]+$/, ""), // Remove extension to use as ID
          url: `/uploads/${uploadDir}/${filename}`,
          filename,
          createdAt: fileStats.birthtime.toISOString(),
          fileSize: fileStats.size,
          // We can't easily get image dimensions from the server without additional libraries
          // In a production app, you might want to store this metadata in a database
        };
      });
      
      const allImages = await Promise.all(imagePromises);
      
      // Sort by newest first
      allImages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Paginate results
      const total = allImages.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedImages = allImages.slice(startIndex, endIndex);
      
      return NextResponse.json({
        images: paginatedImages,
        total,
        page,
        totalPages
      });
    } catch (error) {
      console.error("Error reading directory:", error);
      
      // Return empty results if there's an error reading the directory
      return NextResponse.json({
        images: [],
        total: 0,
        page: 1,
        totalPages: 1
      });
    }
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}
