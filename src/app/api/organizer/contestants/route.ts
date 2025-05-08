import { NextResponse } from 'next/server';
import { authenticateOrganizerApi } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/organizer/contestants
export async function POST(request: Request) {
  try {
    // Check authorization using the improved authenticateOrganizerApi function
    const auth = await authenticateOrganizerApi(['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER']);
    
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = auth.user;

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.ic || !data.gender || !data.contingentId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, IC number, gender, and contingentId are required' },
        { status: 400 }
      );
    }

    // Validate IC number format (simple 12-digit check)
    if (!/^\d{12}$/.test(data.ic)) {
      return NextResponse.json(
        { error: 'Invalid IC number format. Must be 12 digits without dashes' },
        { status: 400 }
      );
    }

    // Check if contingent exists
    const contingent = await prisma.contingent.findUnique({
      where: { id: data.contingentId },
    });

    if (!contingent) {
      return NextResponse.json({ error: 'Contingent not found' }, { status: 404 });
    }

    // Create the contestant
    const newContestant = await prisma.contestant.create({
      data: {
        name: data.name,
        ic: data.ic,
        gender: data.gender,
        edu_level: data.educationLevel || 'Sekolah Rendah', // Map educationLevel to edu_level
        class_grade: data.classGrade, // Map classGrade to class_grade
        class_name: data.className, // Map className if provided
        email: data.email || null,
        phoneNumber: data.phoneNumber || null,
        contingentId: data.contingentId,
      },
    });

    return NextResponse.json(newContestant, { status: 201 });
  } catch (error) {
    console.error('Error creating contestant:', error);
    
    // Check for duplicate IC number error
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return NextResponse.json(
        { error: 'A contestant with this IC number already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'An error occurred while creating the contestant' },
      { status: 500 }
    );
  }
}
