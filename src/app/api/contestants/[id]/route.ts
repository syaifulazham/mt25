import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

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
    
    // Check if the contestant belongs to the current user
    if (contestant.userId !== Number(user.id) && user.role !== 'ADMIN') {
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
    
    if (existingContestant.userId !== Number(user.id) && user.role !== 'ADMIN') {
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
    
    if (existingContestant.userId !== Number(user.id) && user.role !== 'ADMIN') {
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
