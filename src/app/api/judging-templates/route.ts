import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { hasRequiredRole } from '@/lib/auth';

// GET /api/judging-templates
export async function GET(request: Request) {
  try {
    console.log('Judging templates API request received, env:', process.env.NODE_ENV);
    
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      console.log('Auth check starting for judging-templates');
      const session = await getServerSession(authOptions);
      console.log('Auth session result:', session ? `${session.user.email} (${session.user.role})` : 'No session found');
      
      // Check if session exists and has required role
      if (!session || !session.user) {
        console.log('Authentication failed: No session found');
        return NextResponse.json({ error: 'Unauthorized - No user found' }, { status: 401 });
      }
      
      if (!hasRequiredRole(session.user, ['ADMIN', 'ORGANIZER', 'OPERATOR'])) {
        console.log('Authentication failed: Insufficient permissions', session.user.role);
        return NextResponse.json({ error: 'Unauthorized - Insufficient permissions' }, { status: 401 });
      }
      
      console.log('Authentication successful for', session.user.email);
    }

    // Extract query parameters
    const url = new URL(request.url);
    const contestType = url.searchParams.get('contestType');

    // Build query filter
    const where: any = {};
    if (contestType) {
      where.contestType = contestType;
    }

    // Use raw SQL to avoid Prisma enum validation issues
    let templatesQuery = `
      SELECT 
        jt.id, jt.name, jt.description, jt.isDefault, jt.contestType, jt.createdAt, jt.updatedAt
      FROM judgingtemplate jt
    `;
    
    const queryParams: any[] = [];
    if (contestType) {
      templatesQuery += ` WHERE jt.contestType = ?`;
      queryParams.push(contestType);
    }
    
    templatesQuery += ` ORDER BY jt.name ASC`;
    
    const templates = await prisma.$queryRawUnsafe(templatesQuery, ...queryParams) as any[];
    
    // Get criteria for each template using raw SQL
    const templatesWithCriteria = await Promise.all(
      templates.map(async (template) => {
        const criteria = await prisma.$queryRawUnsafe(`
          SELECT 
            id, name, description, needsJuryCourtesy, evaluationType, weight, maxScore, discreteValues, templateId, createdAt, updatedAt
          FROM judgingtemplatecriteria 
          WHERE templateId = ?
          ORDER BY id ASC
        `, template.id) as any[];
        
        // Parse discreteValues from JSON string to array for each criterion
        const parsedCriteria = criteria.map((criterion: any) => {
          return {
            ...criterion,
            discreteValues: criterion.discreteValues ? JSON.parse(criterion.discreteValues) : null
          };
        });
        
        return {
          ...template,
          judgingtemplatecriteria: parsedCriteria
        };
      })
    );

    return NextResponse.json(templatesWithCriteria);
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
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const session = await getServerSession(authOptions);
      if (!session || !session.user || !hasRequiredRole(session.user, ['ADMIN', 'ORGANIZER', 'OPERATOR'])) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
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

    // Create the template
    const template = await prisma.judgingtemplate.create({
      data: {
        name,
        description,
        isDefault: isDefault || false,
        contestType: contestType || null,
        updatedAt: new Date(), // Add updatedAt for the template
        judgingtemplatecriteria: {
          create: criteria.map(criterion => ({
            name: criterion.name,
            description: criterion.description || null,
            needsJuryCourtesy: criterion.needsJuryCourtesy || false,
            evaluationType: criterion.evaluationType,
            weight: criterion.weight || 1,
            maxScore: criterion.maxScore || null,
            discreteValues: criterion.discreteValues 
              ? JSON.stringify(criterion.discreteValues) 
              : null,
            updatedAt: new Date() // Add updatedAt for each criterion
          }))
        }
      },
      include: {
        judgingtemplatecriteria: true
      }
    }) as any;

    // Parse discreteValues from JSON string to array for each criterion
    const parsedCriteria = template.judgingtemplatecriteria.map((criterion: any) => {
      return {
        ...criterion,
        discreteValues: criterion.discreteValues ? JSON.parse(criterion.discreteValues) : null
      };
    });

    const processedTemplate = {
      ...template,
      judgingtemplatecriteria: parsedCriteria
    };

    return NextResponse.json(processedTemplate, { status: 201 });
  } catch (error) {
    console.error('Error creating judging template:', error);
    return NextResponse.json(
      { error: 'Failed to create judging template' },
      { status: 500 }
    );
  }
}
