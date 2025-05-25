import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";

// GET handler - Get a specific contingent by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const contingentId = parseInt(params.id);
    
    // Find the participant by email
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Get the contingent with related data
    const contingent = await prisma.contingent.findUnique({
      where: { id: contingentId },
      include: {
        school: {
          select: {
            id: true,
            name: true
          }
        },
        higherInstitution: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!contingent) {
      return NextResponse.json({ error: "Contingent not found" }, { status: 404 });
    }
    
    // Check if the participant has access to view this contingent
    // Either they are a manager or they have a pending request to join
    const isManager = await prisma.contingentManager.findFirst({
      where: {
        participantId: participant.id,
        contingentId
      }
    });
    
    const hasPendingRequest = await prisma.contingentRequest.findFirst({
      where: {
        participantId: participant.id,
        contingentId
      }
    });
    
    // Also check legacy relationship
    const legacyAccess = contingent.managedByParticipant && contingent.participantId === participant.id;
    
    const hasAccess = isManager !== null || hasPendingRequest !== null || legacyAccess;
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to view this contingent" },
        { status: 403 }
      );
    }
    
    // Get the count of contestants in this contingent
    const contestantCount = await prisma.contestant.count({
      where: { contingentId }
    });
    
    return NextResponse.json({
      contingent,
      contestantCount
    });
  } catch (error) {
    console.error("Error fetching contingent:", error);
    return NextResponse.json(
      { error: "Failed to fetch contingent" },
      { status: 500 }
    );
  }
}

// PUT handler - Update a contingent
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const contingentId = parseInt(params.id);
    const body = await request.json();
    
    // Find the participant by email
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Check if the contingent exists
    const contingent = await prisma.contingent.findUnique({
      where: { id: contingentId }
    });
    
    if (!contingent) {
      return NextResponse.json({ error: "Contingent not found" }, { status: 404 });
    }
    
    // Check if the participant is a manager of this contingent
    const isManager = await prisma.contingentManager.findFirst({
      where: {
        participantId: participant.id,
        contingentId
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
    
    // Prepare update data
    const updateData: any = {};
    
    // Only update fields that are provided
    if (body.name) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.short_name !== undefined) updateData.short_name = body.short_name;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;
    
    // Update the contingent
    const updatedContingent = await prisma.contingent.update({
      where: { id: contingentId },
      data: updateData,
      include: {
        school: {
          select: {
            id: true,
            name: true
          }
        },
        higherInstitution: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    return NextResponse.json({ contingent: updatedContingent });
  } catch (error) {
    console.error("Error updating contingent:", error);
    return NextResponse.json(
      { error: "Failed to update contingent" },
      { status: 500 }
    );
  }
}

// PATCH handler - Update a contingent (supports FormData for file uploads)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const contingentId = parseInt(params.id);
    
    // Find the participant by email
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Check if the contingent exists
    const contingent = await prisma.contingent.findUnique({
      where: { id: contingentId }
    });
    
    if (!contingent) {
      return NextResponse.json({ error: "Contingent not found" }, { status: 404 });
    }
    
    // Check if the participant is a manager of this contingent
    const isManager = await prisma.contingentManager.findFirst({
      where: {
        participantId: participant.id,
        contingentId
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
    
    // Handle both FormData and JSON requests
    let updateData: any = {};
    
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      // Process FormData
      const formData = await request.formData();
      
      // Handle text fields
      if (formData.has('name')) {
        updateData.name = formData.get('name') as string;
      }
      
      if (formData.has('short_name')) {
        updateData.short_name = formData.get('short_name') as string;
      }
      
      // Handle file upload if present
      const logoFile = formData.get('logoFile') as File;
      if (logoFile && logoFile.size > 0) {
        // Check file size (2MB limit)
        const fileSize = logoFile.size / (1024 * 1024); // Convert to MB
        if (fileSize > 2) {
          return NextResponse.json(
            { error: "File size exceeds the 2MB limit" },
            { status: 400 }
          );
        }
        
        // Check file type
        const fileType = logoFile.type;
        if (!fileType.startsWith("image/")) {
          return NextResponse.json(
            { error: "Only image files are allowed" },
            { status: 400 }
          );
        }

        try {
          // Create a buffer from the file
          const bytes = await logoFile.arrayBuffer();
          const buffer = Buffer.from(bytes);
          
          // Create a file path for the uploaded file
          // Use format contingent_[id]_[timestamp].[extension]
          const fileExtension = logoFile.name.split(".").pop() || "png";
          const fileName = `contingent_${contingentId}_${Date.now()}.${fileExtension}`;
          
          // Create upload directory path that works in both development and production
          // For production builds, we need to ensure correct permissions
          const publicDir = join(process.cwd(), 'public');
          const uploadDir = join(publicDir, 'uploads', 'contingents');
          console.log('Upload directory:', uploadDir);
          
          try {
            // Ensure directory exists with proper permissions
            await mkdir(uploadDir, { recursive: true });
            
            const filePath = join(uploadDir, fileName);
            console.log('Full file path:', filePath);
            
            // Write the file
            await writeFile(filePath, buffer);
            console.log('File written successfully');
            
            // Create a URL-friendly path for the file
            // In Next.js, files in /public are served from the root
            const fileUrl = `/uploads/contingents/${fileName}`;
            console.log('File URL for database:', fileUrl);
            
            // Add logo URL to update data
            updateData.logoUrl = fileUrl;
          } catch (dirError) {
            console.error('Directory/file error:', dirError);
            return NextResponse.json(
              { error: "Failed to save logo file" },
              { status: 500 }
            );
          }
        } catch (error) {
          console.error('Error processing logo file:', error);
          return NextResponse.json(
            { error: "Failed to process logo file" },
            { status: 500 }
          );
        }
      }
    } else {
      // Process JSON
      const body = await request.json();
      if (body.name) updateData.name = body.name;
      if (body.short_name !== undefined) updateData.short_name = body.short_name;
    }
    
    // Only proceed with update if there's data to update
    if (Object.keys(updateData).length > 0) {
      // Update the contingent
      const updatedContingent = await prisma.contingent.update({
        where: { id: contingentId },
        data: updateData,
        include: {
          school: {
            select: {
              id: true,
              name: true
            }
          },
          higherInstitution: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      return NextResponse.json({ contingent: updatedContingent });
    } else {
      return NextResponse.json({ error: "No valid update data provided" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating contingent:", error);
    return NextResponse.json(
      { error: "Failed to update contingent details" },
      { status: 500 }
    );
  }
}
