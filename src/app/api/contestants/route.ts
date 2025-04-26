import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { generateContestantHashcode } from '@/lib/hashcode';

// GET /api/contestants - Get all contestants for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const url = new URL(request.url);
    const contingentId = url.searchParams.get('contingentId');
    
    // Build the query
    const query: any = {
      where: {
        userId: Number(user.id)
      },
      orderBy: {
        createdAt: 'desc'
      }
    };
    
    // Add contingentId filter if provided
    if (contingentId) {
      query.where.contingentId = Number(contingentId);
    }
    
    const contestants = await prisma.contestant.findMany(query);
    
    return NextResponse.json(contestants);
  } catch (error) {
    console.error('Error fetching contestants:', error);
    return NextResponse.json({ error: 'Failed to fetch contestants' }, { status: 500 });
  }
}

// POST /api/contestants - Create a new contestant
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, ic, gender, age, edu_level, class_name, contingentId } = body;
    
    // Validate required fields
    if (!name || !ic || !gender || !age || !edu_level || !contingentId) {
      return NextResponse.json(
        { error: 'Missing required fields. Name, IC, gender, age, education level, and contingent are required.' },
        { status: 400 }
      );
    }
    
    // Check if contestant with this IC already exists
    const existingContestant = await prisma.contestant.findFirst({
      where: { ic }
    });
    
    if (existingContestant) {
      return NextResponse.json(
        { error: 'A contestant with this IC number already exists.' },
        { status: 400 }
      );
    }
    
    // Generate unique hashcode
    const hashcode = generateContestantHashcode(name, ic);
    
    // Create the contestant
    const contestant = await prisma.contestant.create({
      data: {
        name,
        ic,
        gender,
        age: Number(age),
        edu_level,
        class_name: class_name || null,
        hashcode,
        contingentId: Number(contingentId),
        updatedAt: new Date(),
        updatedBy: user.name || 'System',
        status: 'ACTIVE'
      }
    });
    
    return NextResponse.json(contestant, { status: 201 });
  } catch (error) {
    console.error('Error creating contestant:', error);
    return NextResponse.json({ error: 'Failed to create contestant' }, { status: 500 });
  }
}
