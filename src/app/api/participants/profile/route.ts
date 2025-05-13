import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaExecute } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

// Define validation schema
const updateProfileSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  phoneNumber: z.string().min(10, {
    message: "Phone number must be at least 10 digits.",
  }).optional().or(z.literal("")),
  ic: z.string().min(12, {
    message: "IC number must be at least 12 characters.",
  }).optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]).optional().nullable(),
});

// Define a participant user type
type ParticipantUser = {
  id: number;
  name: string | null;
  email: string;
  username: string;
  // We only need to check if user is in user_participant table
};

export async function PUT(request: NextRequest) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    
    // Check if user exists and is a participant
    // For participants, we don't need to check an isParticipant flag
    // Instead, we check if we can find them in the user_participant table
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user exists in user_participant table using prismaExecute for connection management
    const participantUser = await prismaExecute(prisma => prisma.user_participant.findUnique({
      where: { id: currentUser.id }
    }));
    
    if (!participantUser) {
      return NextResponse.json({ message: 'Unauthorized: Not a participant' }, { status: 401 });
    }
    
    // Parse and validate the request body
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);
    
    // Clean up data before update
    const updateData: any = {};
    
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    
    if (validatedData.phoneNumber !== undefined) {
      updateData.phoneNumber = validatedData.phoneNumber === "" ? null : validatedData.phoneNumber;
    }
    
    if (validatedData.ic !== undefined) {
      updateData.ic = validatedData.ic === "" ? null : validatedData.ic;
    }
    
    if (validatedData.gender !== undefined) {
      updateData.gender = validatedData.gender;
    }
    
    // Update the participant profile using prismaExecute for connection management
    const updatedParticipant = await prismaExecute(prisma => prisma.user_participant.update({
      where: {
        id: currentUser.id
      },
      data: updateData
    }));
    
    // Return success response with updated data
    return NextResponse.json({ 
      message: 'Profile updated successfully', 
      user: {
        id: updatedParticipant.id,
        name: updatedParticipant.name,
        phoneNumber: updatedParticipant.phoneNumber,
        ic: updatedParticipant.ic,
        gender: updatedParticipant.gender,
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error updating profile:", error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        message: 'Validation error', 
        errors: error.errors 
      }, { status: 400 });
    }
    
    // Handle other errors
    return NextResponse.json({ 
      message: 'An error occurred while updating your profile' 
    }, { status: 500 });
  }
}
