import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasRequiredRole } from '@/lib/auth';

// GET /api/judging-templates/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      if (!user || !hasRequiredRole(user, ['ADMIN', 'ORGANIZER'])) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const id = params.id;
    
    const template = await prisma.judgingtemplate.findUnique({
      where: { id: parseInt(id) },
      include: {
        judgingtemplatecriteria: true
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Judging template not found' },
        { status: 404 }
      );
    }

    // Parse discreteValues from JSON string to array for each criterion
    const parsedCriteria = template.judgingtemplatecriteria.map((criterion: any) => {
      return {
        ...criterion,
        discreteValues: criterion.discreteValues 
          ? JSON.parse(criterion.discreteValues) 
          : null
      };
    });

    const processedTemplate = {
      ...template,
      judgingtemplatecriteria: parsedCriteria
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
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      if (!user || !hasRequiredRole(user, ['ADMIN', 'ORGANIZER'])) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const id = params.id;
    
    const data = await request.json();
    const { name, description, isDefault, contestType, judgingtemplatecriteria } = data;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    if (!judgingtemplatecriteria || !Array.isArray(judgingtemplatecriteria) || judgingtemplatecriteria.length === 0) {
      return NextResponse.json(
        { error: 'At least one judging criterion is required' },
        { status: 400 }
      );
    }

    // Check if template exists
    const existingTemplate = await prisma.judgingtemplate.findUnique({
      where: { id: parseInt(id) }
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
      await tx.judgingtemplatecriteria.deleteMany({
        where: { templateId: parseInt(id) }
      });

      // Update template and create new criteria
      return tx.judgingtemplate.update({
        where: { id: parseInt(id) },
        data: {
          name,
          description,
          isDefault: isDefault || false,
          contestType: contestType || null,
          updatedAt: new Date(), 
          judgingtemplatecriteria: {
            create: judgingtemplatecriteria.map(criterion => ({
              name: criterion.name,
              description: criterion.description || null,
              needsJuryCourtesy: criterion.needsJuryCourtesy || false,
              evaluationType: criterion.evaluationType,
              weight: criterion.weight || 1,
              maxScore: criterion.maxScore || null,
              discreteValues: criterion.discreteValues 
                ? JSON.stringify(criterion.discreteValues) 
                : null,
              updatedAt: new Date() 
            }))
          }
        }
      });
    });

    // Fetch updated template
    const updatedTemplate = await prisma.judgingtemplate.findUnique({
      where: { id: parseInt(id) },
      include: {
        judgingtemplatecriteria: true
      }
    });

    if (!updatedTemplate) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated template' },
        { status: 500 }
      );
    }

    // Parse discreteValues from JSON string to array for each criterion
    const parsedCriteria = updatedTemplate.judgingtemplatecriteria.map((criterion: any) => {
      return {
        ...criterion,
        discreteValues: criterion.discreteValues 
          ? JSON.parse(criterion.discreteValues) 
          : null
      };
    });

    const processedTemplate = {
      ...updatedTemplate,
      judgingtemplatecriteria: parsedCriteria
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
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      if (!user || !hasRequiredRole(user, ['ADMIN', 'ORGANIZER'])) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const id = params.id;
    
    // Check if template exists
    const existingTemplate = await prisma.judgingtemplate.findUnique({
      where: { id: parseInt(id) },
      include: {
        contest: {
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

    // Check if template is used in any contests
    if (existingTemplate.contest && existingTemplate.contest.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template that is used in contests' },
        { status: 400 }
      );
    }

    // Delete the template (criteria will be deleted automatically due to cascade)
    await prisma.judgingtemplate.delete({
      where: { id: parseInt(id) }
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
