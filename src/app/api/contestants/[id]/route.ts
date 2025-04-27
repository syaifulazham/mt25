import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

// Mark this route as dynamic since it uses getCurrentUser() which uses headers()
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// GET /api/contestants/[id] - Get a specific contestant
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const id = Number(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid contestant ID' }, { status: 400 });
    }
    
    const contestant = await prisma.contestant.findUnique({
      where: { id }
    });
    
    if (!contestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 });
    }
    
    // Check if the contestant belongs to the current user through contingent relationship
    // Use safe property checks to handle different user types
    const isParticipant = user && 'isParticipant' in user && user.isParticipant === true;
    const role = isParticipant ? 'PARTICIPANTS_ADMIN' : (user && 'role' in user ? user.role : '');
    const isAdmin = role === 'ADMIN';
    
    // If user is participant, check if they manage the contingent this contestant belongs to
    let hasAccess = false;
    if (isParticipant && contestant.contingentId) {
      // Check if current participant manages this contingent
      const contingentManager = await prisma.contingentManager.findFirst({
        where: {
          participantId: Number(user.id),
          contingentId: contestant.contingentId
        }
      });
      
      hasAccess = !!contingentManager;
    }
    
    if (!hasAccess && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    return NextResponse.json(contestant);
  } catch (error) {
    console.error('Error fetching contestant:', error);
    return NextResponse.json({ error: 'Failed to fetch contestant' }, { status: 500 });
  }
}

// PATCH /api/contestants/[id] - Update a contestant
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const id = Number(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid contestant ID' }, { status: 400 });
    }
    
    // Check if the contestant exists and belongs to the current user
    const existingContestant = await prisma.contestant.findUnique({
      where: { id }
    });
    
    if (!existingContestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 });
    }
    
    // Check if user has access to this contestant through contingent management
    // Use safe property checks to handle different user types
    const isParticipant = user && 'isParticipant' in user && user.isParticipant === true;
    const role = isParticipant ? 'PARTICIPANTS_ADMIN' : (user && 'role' in user ? user.role : '');
    const isAdmin = role === 'ADMIN';
    
    // If user is participant, check if they manage the contingent this contestant belongs to
    let hasAccess = false;
    if (isParticipant && existingContestant.contingentId) {
      // Check if current participant manages this contingent
      const contingentManager = await prisma.contingentManager.findFirst({
        where: {
          participantId: Number(user.id),
          contingentId: existingContestant.contingentId
        }
      });
      
      hasAccess = !!contingentManager;
    }
    
    if (!hasAccess && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const body = await request.json();
    const { name, gender, age, edu_level, class_name, contingentId } = body;
    
    // IC number cannot be changed once set
    if (body.ic) {
      delete body.ic;
    }
    
    // Hashcode cannot be changed
    if (body.hashcode) {
      delete body.hashcode;
    }
    
    // Update the contestant
    const updatedContestant = await prisma.contestant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(gender && { gender }),
        ...(age && { age: Number(age) }),
        ...(edu_level && { edu_level }),
        ...(class_name !== undefined && { class_name }),
        ...(contingentId !== undefined && { 
          contingentId: contingentId ? Number(contingentId) : null 
        }),
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json(updatedContestant);
  } catch (error) {
    console.error('Error updating contestant:', error);
    return NextResponse.json({ error: 'Failed to update contestant' }, { status: 500 });
  }
}

// DELETE /api/contestants/[id] - Delete a contestant
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const id = Number(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid contestant ID' }, { status: 400 });
    }
    
    // Check if the contestant exists and belongs to the current user
    const existingContestant = await prisma.contestant.findUnique({
      where: { id }
    });
    
    if (!existingContestant) {
      return NextResponse.json({ error: 'Contestant not found' }, { status: 404 });
    }
    
    // Check if user has access to this contestant through contingent management
    // Use safe property checks to handle different user types
    const isParticipant = user && 'isParticipant' in user && user.isParticipant === true;
    const role = isParticipant ? 'PARTICIPANTS_ADMIN' : (user && 'role' in user ? user.role : '');
    const isAdmin = role === 'ADMIN';
    
    // If user is participant, check if they manage the contingent this contestant belongs to
    let hasAccess = false;
    if (isParticipant && existingContestant.contingentId) {
      // Check if current participant manages this contingent
      const contingentManager = await prisma.contingentManager.findFirst({
        where: {
          participantId: Number(user.id),
          contingentId: existingContestant.contingentId
        }
      });
      
      hasAccess = !!contingentManager;
    }
    
    if (!hasAccess && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Delete the contestant
    await prisma.contestant.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contestant:', error);
    return NextResponse.json({ error: 'Failed to delete contestant' }, { status: 500 });
  }
}
