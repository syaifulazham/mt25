import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasRequiredRole } from '@/lib/auth';

// GET /api/contests/[id]/judging-template
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

    const contestId = params.id;
    
    // Get the contest with its judging template
    const contest = await prisma.contest.findUnique({
      where: { id: parseInt(contestId) },
      include: {
        judgingtemplate: {
          include: {
            judgingtemplatecriteria: true
          }
        }
      }
    });

    if (!contest) {
      return NextResponse.json(
        { error: 'Contest not found' },
        { status: 404 }
      );
    }

    if (!contest.judgingtemplate) {
      return NextResponse.json({ template: null });
    }

    // Parse discreteValues from JSON string to array for each criterion
    const processedTemplate = {
      ...contest.judgingtemplate,
      judgingtemplatecriteria: (contest.judgingtemplate as any).judgingtemplatecriteria.map((criterion: any) => ({
        ...criterion,
        discreteValues: criterion.discreteValues 
          ? JSON.parse(criterion.discreteValues) 
          : null
      }))
    };

    return NextResponse.json({ template: processedTemplate });
  } catch (error) {
    console.error('Error fetching contest judging template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contest judging template' },
      { status: 500 }
    );
  }
}

// PUT /api/contests/[id]/judging-template
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

    const contestId = params.id;
    
    const data = await request.json();
    const { templateId } = data;

    // Validate required fields
    if (templateId !== null && templateId !== undefined) {
      // If templateId is provided, check if template exists
      if (templateId !== null) {
        const template = await prisma.judgingtemplate.findUnique({
          where: { id: parseInt(templateId) }
        });

        if (!template) {
          return NextResponse.json(
            { error: 'Judging template not found' },
            { status: 404 }
          );
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Template ID is required (or null to remove template)' },
        { status: 400 }
      );
    }

    // Check if contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: parseInt(contestId) }
    });

    if (!contest) {
      return NextResponse.json(
        { error: 'Contest not found' },
        { status: 404 }
      );
    }

    // Update the contest with the template ID
    const updatedContest = await prisma.contest.update({
      where: { id: parseInt(contestId) },
      data: {
        judgingTemplateId: templateId ? parseInt(templateId) : null
      },
      include: {
        judgingtemplate: {
          include: {
            judgingtemplatecriteria: true
          }
        }
      }
    });

    // If template was removed
    if (templateId === null) {
      return NextResponse.json({ success: true, template: null });
    }

    // Parse discreteValues from JSON string to array for each criterion
    const processedTemplate = updatedContest.judgingtemplate ? {
      ...updatedContest.judgingtemplate,
      judgingtemplatecriteria: (updatedContest.judgingtemplate as any).judgingtemplatecriteria.map((criterion: any) => ({
        ...criterion,
        discreteValues: criterion.discreteValues 
          ? JSON.parse(criterion.discreteValues) 
          : null
      }))
    } : null;

    return NextResponse.json({ 
      success: true, 
      template: processedTemplate 
    });
  } catch (error) {
    console.error('Error updating contest judging template:', error);
    return NextResponse.json(
      { error: 'Failed to update contest judging template' },
      { status: 500 }
    );
  }
}
