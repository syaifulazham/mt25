import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { hasRequiredRole } from '@/lib/auth';

// Force dynamic route
export const dynamic = 'force-dynamic';

// GET /api/judging-templates/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const session = await getServerSession(authOptions);
      if (!session || !session.user || !hasRequiredRole(session.user, ['ADMIN', 'ORGANIZER', 'OPERATOR'])) {
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
  // Define data outside try/catch to make it accessible in catch block
  let data: any = {};
  
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const session = await getServerSession(authOptions);
      if (!session || !session.user || !hasRequiredRole(session.user, ['ADMIN', 'ORGANIZER', 'OPERATOR'])) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const id = params.id;
    
    data = await request.json();
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

    // Check if template exists using raw query
    const existingTemplates = await prisma.$queryRaw`
      SELECT id FROM judgingtemplate WHERE id = ${parseInt(id)}
    `;

    if (!existingTemplates || (existingTemplates as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Judging template not found' },
        { status: 404 }
      );
    }

    // Update template with raw SQL to avoid Prisma enum issues
    // 1. Update the template metadata
    await prisma.$executeRaw`
      UPDATE judgingtemplate
      SET name = ${name},
          description = ${description || null},
          isDefault = ${isDefault || false},
          contestType = ${contestType || null},
          updatedAt = NOW()
      WHERE id = ${parseInt(id)}
    `;
    
    // 2. Delete existing criteria
    await prisma.$executeRaw`
      DELETE FROM judgingtemplatecriteria
      WHERE templateId = ${parseInt(id)}
    `;
    
    // Function to map API evaluationType values to database enum values
    const mapEvaluationTypeToDbEnum = (apiType: string): string => {
      // Map from API values to DB enum values (now supporting all enum values directly)
      const typeMap: Record<string, string> = {
        'POINTS': 'POINTS',
        'TIME': 'TIME',
        'DISCRETE': 'DISCRETE',
        'DISCRETE_SINGLE': 'DISCRETE_SINGLE',
        'DISCRETE_MULTIPLE': 'DISCRETE_MULTIPLE'
      };
      
      return typeMap[apiType] || 'POINTS'; // Default to POINTS if unknown
    };
    
    // 3. Insert new criteria
    for (const criterion of judgingtemplatecriteria) {
      const discreteValuesJson = criterion.discreteValues 
        ? JSON.stringify(criterion.discreteValues) 
        : null;
      
      // Map evaluationType to the correct database enum value
      const dbEvaluationType = mapEvaluationTypeToDbEnum(criterion.evaluationType);
      
      console.log(`Mapping evaluationType from ${criterion.evaluationType} to ${dbEvaluationType}`);
      
      await prisma.$executeRaw`
        INSERT INTO judgingtemplatecriteria (
          name, 
          description, 
          needsJuryCourtesy, 
          evaluationType, 
          weight, 
          maxScore, 
          discreteValues, 
          templateId, 
          createdAt, 
          updatedAt
        ) VALUES (
          ${criterion.name},
          ${criterion.description || null},
          ${criterion.needsJuryCourtesy || false},
          ${dbEvaluationType},
          ${criterion.weight || 1},
          ${criterion.maxScore !== undefined ? criterion.maxScore : null},
          ${discreteValuesJson},
          ${parseInt(id)},
          NOW(),
          NOW()
        )
      `;
    }

    // Fetch updated template using raw query for consistency
    // Note: MySQL doesn't support json_agg, so we'll use JSON_ARRAYAGG and JSON_OBJECT
    const updatedTemplateRaw = await prisma.$queryRaw`
      SELECT 
        jt.*, 
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', jtc.id, 
            'name', jtc.name,
            'description', jtc.description,
            'needsJuryCourtesy', jtc.needsJuryCourtesy,
            'evaluationType', jtc.evaluationType,
            'weight', jtc.weight,
            'maxScore', jtc.maxScore,
            'discreteValues', jtc.discreteValues,
            'templateId', jtc.templateId,
            'createdAt', jtc.createdAt,
            'updatedAt', jtc.updatedAt
          )
        ) as judgingtemplatecriteria
      FROM judgingtemplate jt
      LEFT JOIN judgingtemplatecriteria jtc ON jt.id = jtc.templateId
      WHERE jt.id = ${parseInt(id)}
      GROUP BY jt.id
    `;

    if (!updatedTemplateRaw || (updatedTemplateRaw as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated template' },
        { status: 500 }
      );
    }

    // Process the raw result
    const updatedTemplate = (updatedTemplateRaw as any[])[0];
    
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
  } catch (error: unknown) {
    console.error('Error updating judging template:', error);
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error as object)));
    console.error('Request data:', JSON.stringify(data, null, 2));
    return NextResponse.json(
      { error: 'Failed to update judging template', details: error instanceof Error ? error.message : 'Unknown error' },
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
      const session = await getServerSession(authOptions);
      if (!session || !session.user || !hasRequiredRole(session.user, ['ADMIN', 'ORGANIZER', 'OPERATOR'])) {
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
