import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasRequiredRole } from '@/lib/auth';

// GET /api/contests/[id]/judging-template
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ['ADMIN', 'ORGANIZER'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contestId = parseInt(params.id);
    if (isNaN(contestId)) {
      return NextResponse.json(
        { error: 'Invalid contest ID' },
        { status: 400 }
      );
    }

    // Get the contest with its judging template
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        judgingTemplate: {
          include: {
            criteria: true
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

    if (!contest.judgingTemplate) {
      return NextResponse.json({ template: null });
    }

    // Parse discreteValues from JSON string to array for each criterion
    const processedTemplate = {
      ...contest.judgingTemplate,
      criteria: contest.judgingTemplate.criteria.map(criterion => ({
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
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ['ADMIN', 'ORGANIZER'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contestId = parseInt(params.id);
    if (isNaN(contestId)) {
      return NextResponse.json(
        { error: 'Invalid contest ID' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { templateId } = data;

    // Validate required fields
    if (!templateId && templateId !== null) {
      return NextResponse.json(
        { error: 'Template ID is required (or null to remove template)' },
        { status: 400 }
      );
    }

    // Check if contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: contestId }
    });

    if (!contest) {
      return NextResponse.json(
        { error: 'Contest not found' },
        { status: 404 }
      );
    }

    // If templateId is provided, check if template exists
    if (templateId !== null) {
      const template = await prisma.judgingTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        return NextResponse.json(
          { error: 'Judging template not found' },
          { status: 404 }
        );
      }
    }

    // Update the contest with the template
    const updatedContest = await prisma.contest.update({
      where: { id: contestId },
      data: {
        judgingTemplateId: templateId
      },
      include: {
        judgingTemplate: {
          include: {
            criteria: true
          }
        }
      }
    });

    // If template was removed
    if (templateId === null) {
      return NextResponse.json({ success: true, template: null });
    }

    // Parse discreteValues from JSON string to array for each criterion
    const processedTemplate = updatedContest.judgingTemplate ? {
      ...updatedContest.judgingTemplate,
      criteria: updatedContest.judgingTemplate.criteria.map(criterion => ({
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
