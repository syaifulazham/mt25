import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasRequiredRole } from '@/lib/auth';

// GET /api/judging-templates/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ['ADMIN', 'ORGANIZER'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    const template = await prisma.judgingTemplate.findUnique({
      where: { id },
      include: {
        criteria: true
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Judging template not found' },
        { status: 404 }
      );
    }

    // Parse discreteValues from JSON string to array for each criterion
    const processedTemplate = {
      ...template,
      criteria: template.criteria.map(criterion => ({
        ...criterion,
        discreteValues: criterion.discreteValues 
          ? JSON.parse(criterion.discreteValues) 
          : null
      }))
    };

    return NextResponse.json(processedTemplate);
  } catch (error) {
    console.error('Error fetching judging template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch judging template' },
      { status: 500 }
    );
  }
}

// PUT /api/judging-templates/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ['ADMIN', 'ORGANIZER'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      );
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

    // Check if template exists
    const existingTemplate = await prisma.judgingTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Judging template not found' },
        { status: 404 }
      );
    }

    // Update the template
    await prisma.$transaction(async (tx) => {
      // Delete existing criteria
      await tx.judgingTemplateCriteria.deleteMany({
        where: { templateId: id }
      });

      // Update template and create new criteria
      return tx.judgingTemplate.update({
        where: { id },
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
        }
      });
    });

    // Fetch updated template
    const updatedTemplate = await prisma.judgingTemplate.findUnique({
      where: { id },
      include: {
        criteria: true
      }
    });

    if (!updatedTemplate) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated template' },
        { status: 500 }
      );
    }

    // Parse discreteValues from JSON string to array for each criterion
    const processedTemplate = {
      ...updatedTemplate,
      criteria: updatedTemplate.criteria.map(criterion => ({
        ...criterion,
        discreteValues: criterion.discreteValues 
          ? JSON.parse(criterion.discreteValues) 
          : null
      }))
    };

    return NextResponse.json(processedTemplate);
  } catch (error) {
    console.error('Error updating judging template:', error);
    return NextResponse.json(
      { error: 'Failed to update judging template' },
      { status: 500 }
    );
  }
}

// DELETE /api/judging-templates/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ['ADMIN', 'ORGANIZER'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    // Check if template exists
    const existingTemplate = await prisma.judgingTemplate.findUnique({
      where: { id },
      include: {
        contests: {
          select: { id: true }
        }
      }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Judging template not found' },
        { status: 404 }
      );
    }

    // Check if template is in use by any contests
    if (existingTemplate.contests.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete template as it is in use by contests',
          contests: existingTemplate.contests
        },
        { status: 400 }
      );
    }

    // Delete the template (criteria will be deleted due to cascade)
    await prisma.judgingTemplate.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting judging template:', error);
    return NextResponse.json(
      { error: 'Failed to delete judging template' },
      { status: 500 }
    );
  }
}
