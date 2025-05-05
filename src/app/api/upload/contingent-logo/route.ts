import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get the participant
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const contingentId = formData.get("contingentId") as string | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    
    if (!contingentId) {
      return NextResponse.json({ error: "No contingent ID provided" }, { status: 400 });
    }
    
    // Check file size (2MB limit)
    const fileSize = file.size / (1024 * 1024); // Convert to MB
    if (fileSize > 2) {
      return NextResponse.json(
        { error: "File size exceeds the 2MB limit" },
        { status: 400 }
      );
    }
    
    // Check file type
    const fileType = file.type;
    if (!fileType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }
    
    // Check if contingent exists and participant has permission
    const contingent = await prisma.contingent.findUnique({
      where: { id: parseInt(contingentId) }
    });
    
    if (!contingent) {
      return NextResponse.json({ error: "Contingent not found" }, { status: 404 });
    }
    
    // Check if participant is a manager of this contingent
    const isManager = await prisma.contingentManager.findFirst({
      where: {
        participantId: participant.id,
        contingentId: parseInt(contingentId)
      }
    });
    
    // Also check legacy relationship
    const hasAccess = isManager !== null || 
      (contingent.managedByParticipant && contingent.participantId === participant.id);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You must be a manager to update this contingent" },
        { status: 403 }
      );
    }
    
    // Create a buffer from the file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create a file path for the uploaded file
    // Use format contingent_[id]_[timestamp].[extension]
    const fileExtension = file.name.split(".").pop() || "png";
    const fileName = `contingent_${contingentId}_${Date.now()}.${fileExtension}`;
    
    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "uploads", "contingents");
    await mkdir(uploadDir, { recursive: true });
    
    const filePath = join(uploadDir, fileName);
    
    // Write the file
    await writeFile(filePath, buffer);
    
    // Create a URL-friendly path for the file
    const fileUrl = `/uploads/contingents/${fileName}`;
    
    // Update the contingent with the logo URL
    // Using raw update for compatibility with schema to avoid type errors
    await prisma.$executeRaw`UPDATE contingent SET logoUrl = ${fileUrl} WHERE id = ${parseInt(contingentId)}`;
    
    return NextResponse.json({ 
      success: true, 
      fileUrl,
      message: "Logo uploaded successfully" 
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
