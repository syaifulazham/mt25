import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasRequiredRole } from '@/lib/auth';

// GET /api/judging-templates
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ['ADMIN', 'ORGANIZER'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contestTypeParam = searchParams.get('contestType');

    let whereClause = {};
    if (contestTypeParam) {
      whereClause = {
        contestType: contestTypeParam
      };
    }

    const templates = await prisma.judgingTemplate.findMany({
      where: whereClause,
      include: {
        criteria: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching judging templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch judging templates' },
      { status: 500 }
    );
  }
}

// POST /api/judging-templates
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ['ADMIN', 'ORGANIZER'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { name, description, isDefault, contestType, criteria } = data;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      return NextResponse.json(
        { error: 'At least one judging criterion is required' },
        { status: 400 }
      );
    }

    // Create the template with its criteria
    const template = await prisma.judgingTemplate.create({
      data: {
        name,
        description,
        isDefault: isDefault || false,
        contestType: contestType || null,
        criteria: {
          create: criteria.map(criterion => ({
            name: criterion.name,
            description: criterion.description || null,
            needsJuryCourtesy: criterion.needsJuryCourtesy || false,
            evaluationType: criterion.evaluationType,
            weight: criterion.weight || 1,
            maxScore: criterion.maxScore || null,
            discreteValues: criterion.discreteValues 
              ? JSON.stringify(criterion.discreteValues) 
              : null
          }))
        }
      },
      include: {
        criteria: true
      }
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating judging template:', error);
    return NextResponse.json(
      { error: 'Failed to create judging template' },
      { status: 500 }
    );
  }
}
