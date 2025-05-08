import { NextResponse } from 'next/server';
import { authenticateOrganizerApi } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/organizer/contestants/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization using the improved authenticateOrganizerApi function
    const auth = await authenticateOrganizerApi(['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER']);
    
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = auth.user;

    const contestantId = parseInt(params.id);
    if (isNaN(contestantId)) {
      return NextResponse.json({ error: 'Invalid contestant ID' }, { status: 400 });
    }

    // Get the contestant with contingent details
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
      include: {
        contingent: true, // Include all contingent fields instead of selecting specific ones
      },
    });

    if (!contestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 });
    }

    return NextResponse.json(contestant);
  } catch (error) {
    console.error('Error retrieving contestant:', error);
    return NextResponse.json(
      { error: 'An error occurred while retrieving the contestant' },
      { status: 500 }
    );
  }
}

// PUT /api/organizer/contestants/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization using the improved authenticateOrganizerApi function
    const auth = await authenticateOrganizerApi(['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER']);
    
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = auth.user;

    const contestantId = parseInt(params.id);
    if (isNaN(contestantId)) {
      return NextResponse.json({ error: 'Invalid contestant ID' }, { status: 400 });
    }

    // Check if contestant exists
    const existingContestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
    });

    if (!existingContestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.ic || !data.gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure contingentId is valid
    if (!data.contingentId) {
      return NextResponse.json({ error: 'Contingent ID is required' }, { status: 400 });
    }

    // Update the contestant
    const updatedContestant = await prisma.contestant.update({
      where: { id: contestantId },
      data: {
        name: data.name,
        ic: data.ic,
        gender: data.gender,
        edu_level: data.edu_level || existingContestant.edu_level || 'Sekolah Rendah',
        class_grade: data.class_grade || existingContestant.class_grade || '',
        class_name: data.class_name || existingContestant.class_name || '',
        email: data.email || null,
        phone: data.phone || null,
        contingentId: data.contingentId,
      },
    });

    return NextResponse.json(updatedContestant);
  } catch (error) {
    console.error('Error updating contestant:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the contestant' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizer/contestants/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization using the improved authenticateOrganizerApi function
    const auth = await authenticateOrganizerApi(['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER']);
    
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = auth.user;

    const contestantId = parseInt(params.id);
    if (isNaN(contestantId)) {
      return NextResponse.json({ error: 'Invalid contestant ID' }, { status: 400 });
    }

    // Check if contestant exists
    const existingContestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
    });

    if (!existingContestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 });
    }

    // First, remove any team memberships
    await prisma.teamMember.deleteMany({
      where: { contestantId: contestantId },
    });

    // Then delete the contestant
    await prisma.contestant.delete({
      where: { id: contestantId },
    });

    return NextResponse.json({
      success: true,
      message: 'Contestant deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting contestant:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting the contestant' },
      { status: 500 }
    );
  }
}
