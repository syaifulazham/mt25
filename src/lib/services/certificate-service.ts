import { prisma } from '@/lib/prisma';
import { 
  TemplateQueryParams, 
  TemplateCreateParams, 
  TemplateUpdateParams,
  CertificateCreateParams,
  CertificateQueryParams
} from '@/lib/interfaces/certificate-interfaces';
import { CertTemplate, Certificate } from '@prisma/client';

/**
 * Service for managing certificate templates
 */
export class TemplateService {
  /**
   * List templates with pagination and filters
   */
  static async listTemplates(queryParams: TemplateQueryParams) {
    const {
      search,
      status = 'ACTIVE',
      targetType,
      page = 1,
      limit = 10,
      orderBy = 'createdAt',
      orderDir = 'desc'
    } = queryParams;

    // Build where condition for filtering
    const where: any = {};
    
    // Add status filter if provided
    if (status) {
      where.status = status;
    }

    // Add targetType filter if provided
    if (targetType) {
      where.targetType = targetType;
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        { templateName: { contains: search } }
      ];
    }

    // Query templates with pagination
    const templates = await prisma.certTemplate.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [orderBy]: orderDir },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updater: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.certTemplate.count({ where });
    
    return {
      templates,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Get template by ID
   */
  static async getTemplate(id: number) {
    return prisma.certTemplate.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updater: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  /**
   * Create new template
   */
  static async createTemplate(data: TemplateCreateParams): Promise<CertTemplate> {
    return prisma.certTemplate.create({
      data: {
        templateName: data.templateName,
        basePdfPath: data.basePdfPath,
        configuration: data.configuration as any,
        // status will use default value 'ACTIVE' from schema
        // Don't set it explicitly due to FK constraint with certificate_status_enum
        // Target audience fields
        targetType: data.targetType || 'GENERAL',
        // Use Prisma relation syntax for foreign keys
        ...(data.eventId && {
          event: {
            connect: { id: data.eventId }
          }
        }),
        ...(data.quizId && {
          quiz: {
            connect: { id: data.quizId }
          }
        }),
        winnerRangeStart: data.winnerRangeStart,
        winnerRangeEnd: data.winnerRangeEnd,
        // Prerequisites
        prerequisites: data.prerequisites as any,
        creator: {
          connect: { id: data.createdBy }
        }
      }
    });
  }

  /**
   * Update template
   */
  static async updateTemplate(id: number, data: TemplateUpdateParams): Promise<CertTemplate> {
    return prisma.certTemplate.update({
      where: { id },
      data: {
        ...(data.templateName && { templateName: data.templateName }),
        ...(data.basePdfPath && { basePdfPath: data.basePdfPath }),
        ...(data.configuration && { configuration: data.configuration }),
        ...(data.status && { status: data.status }),
        // Target audience fields
        ...(data.targetType !== undefined && { targetType: data.targetType }),
        // Use Prisma relation syntax for foreign keys
        ...(data.eventId !== undefined && {
          event: data.eventId ? {
            connect: { id: data.eventId }
          } : {
            disconnect: true
          }
        }),
        ...(data.quizId !== undefined && {
          quiz: data.quizId ? {
            connect: { id: data.quizId }
          } : {
            disconnect: true
          }
        }),
        ...(data.winnerRangeStart !== undefined && { winnerRangeStart: data.winnerRangeStart }),
        ...(data.winnerRangeEnd !== undefined && { winnerRangeEnd: data.winnerRangeEnd }),
        ...(data.prerequisites !== undefined && { prerequisites: data.prerequisites as any }),
        updater: {
          connect: { id: data.updatedBy }
        }
      }
    });
  }

  /**
   * Delete template (soft delete by setting status to INACTIVE)
   */
  static async deleteTemplate(id: number, userId: number): Promise<CertTemplate> {
    return prisma.certTemplate.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        updater: {
          connect: { id: userId }
        }
      }
    });
  }

  /**
   * Duplicate template
   */
  static async duplicateTemplate(id: number, userId: number): Promise<CertTemplate> {
    // Get the template to duplicate
    const template = await prisma.certTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }

    // Create a copy with a new name
    return prisma.certTemplate.create({
      data: {
        templateName: `Copy of ${template.templateName}`,
        basePdfPath: template.basePdfPath,
        configuration: template.configuration as any,
        status: 'ACTIVE',
        creator: {
          connect: { id: userId }
        }
      }
    });
  }
}

/**
 * Service for managing certificates
 */
export class CertificateService {
  /**
   * List certificates with pagination and filters
   */
  static async listCertificates(queryParams: CertificateQueryParams) {
    const {
      search,
      templateId,
      recipientType,
      status,
      targetType,
      page = 1,
      limit = 10,
      orderBy = 'createdAt',
      orderDir = 'desc'
    } = queryParams;

    // Build where condition for filtering
    const where: any = {};

    if (templateId) {
      where.templateId = templateId;
    }

    if (recipientType) {
      where.recipientType = recipientType;
    }

    if (status) {
      where.status = status;
    }

    // Add targetType filter if provided - filter by template's targetType
    if (targetType) {
      where.template = {
        targetType: targetType
      };
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        { recipientName: { contains: search } },
        { recipientEmail: { contains: search } },
        { uniqueCode: { contains: search } },
        { contestName: { contains: search } },
        { awardTitle: { contains: search } }
      ];
    }

    // Query certificates with pagination
    const certificates = await prisma.certificate.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [orderBy]: orderDir },
      include: {
        template: {
          select: {
            id: true,
            templateName: true,
            targetType: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.certificate.count({ where });
    
    return {
      certificates,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Get certificate by ID
   */
  static async getCertificate(id: number) {
    return prisma.certificate.findUnique({
      where: { id },
      include: {
        template: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  /**
   * Create new certificate
   */
  static async createCertificate(data: CertificateCreateParams): Promise<Certificate> {
    return prisma.certificate.create({
      data: {
        templateId: data.templateId,
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        recipientType: data.recipientType,
        contestName: data.contestName,
        awardTitle: data.awardTitle,
        uniqueCode: data.uniqueCode,
        filePath: data.filePath,
        status: data.status || 'DRAFT',
        issuedAt: data.issuedAt,
        creator: {
          connect: { id: data.createdBy }
        }
      }
    });
  }

  /**
   * Update certificate status
   */
  static async updateCertificateStatus(id: number, status: string): Promise<Certificate> {
    return prisma.certificate.update({
      where: { id },
      data: {
        status,
        ...(status === 'SENT' || status === 'DOWNLOADED' ? { issuedAt: new Date() } : {})
      }
    });
  }

  /**
   * Get certificate by unique code
   */
  static async getCertificateByUniqueCode(uniqueCode: string) {
    return prisma.certificate.findUnique({
      where: { uniqueCode },
      include: {
        template: true
      }
    });
  }

  /**
   * Generate batch certificates for multiple recipients
   */
  static async generateBatchCertificates(
    templateId: number,
    recipients: Array<{
      name: string;
      email?: string;
      type: 'PARTICIPANT' | 'CONTESTANT' | 'JUDGE' | 'ORGANIZER';
      contestName?: string;
      awardTitle?: string;
    }>,
    userId: number
  ): Promise<Certificate[]> {
    // Create certificates in a transaction
    return prisma.$transaction(
      recipients.map((recipient) => {
        // Generate a unique code for each certificate
        const uniqueCode = `CERT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        return prisma.certificate.create({
          data: {
            templateId,
            recipientName: recipient.name,
            recipientEmail: recipient.email,
            recipientType: recipient.type,
            contestName: recipient.contestName,
            awardTitle: recipient.awardTitle,
            uniqueCode,
            status: 'DRAFT',
            creator: {
              connect: { id: userId }
            }
          }
        });
      })
    );
  }
}
