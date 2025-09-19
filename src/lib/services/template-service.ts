import { PrismaClient, Status } from '@prisma/client'
import { prismaExecute } from "@/lib/prisma"

// Template query params type
export type TemplateQueryParams = {
  page?: number | string | null
  pageSize?: number | string | null
  search?: string | null
  status?: string | null
}

// Template creation params type
export type TemplateCreateParams = {
  templateName: string
  basePdfPath?: string
  configuration: any
  createdBy: number
}

// Template update params type
export type TemplateUpdateParams = {
  templateName?: string
  basePdfPath?: string
  configuration?: any
  updatedBy: number
}

/**
 * Service for certificate template operations
 */
export const TemplateService = {
  /**
   * Get templates with pagination and filtering
   */
  async getTemplates(params: TemplateQueryParams) {
    // Parse query params with defaults
    const page = params.page ? parseInt(String(params.page)) : 1
    const pageSize = params.pageSize ? parseInt(String(params.pageSize)) : 10
    const search = params.search || ''
    const status = params.status as Status | undefined

    // Calculate pagination values
    const skip = (page - 1) * pageSize

    // Build filter condition
    const where: any = {}

    // Apply status filter if provided
    if (status) {
      where.status = status
    }

    // Apply search filter if provided
    if (search) {
      where.templateName = {
        contains: search,
        mode: 'insensitive' // Case-insensitive search
      }
    }

    // Execute query using prismaExecute for connection management
    const [templates, total] = await prismaExecute(async (prisma) => {
      // Get templates with pagination
      const templates = await prisma.certTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
            }
          },
          updater: {
            select: {
              id: true,
              name: true,
              username: true,
            }
          }
        }
      })

      // Count total for pagination
      const total = await prisma.certTemplate.count({ where })

      return [templates, total]
    })

    // Return formatted result
    return {
      templates,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  },

  /**
   * Get a single template by ID
   */
  async getTemplate(id: number) {
    return await prismaExecute(prisma => 
      prisma.certTemplate.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
            }
          },
          updater: {
            select: {
              id: true,
              name: true,
              username: true,
            }
          }
        }
      })
    )
  },

  /**
   * Create a new certificate template
   */
  async createTemplate(data: TemplateCreateParams) {
    return await prismaExecute(prisma => 
      prisma.certTemplate.create({
        data: {
          templateName: data.templateName,
          basePdfPath: data.basePdfPath,
          configuration: data.configuration,
          status: 'ACTIVE',
          createdBy: data.createdBy,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
            }
          }
        }
      })
    )
  },

  /**
   * Update an existing certificate template
   */
  async updateTemplate(id: number, data: TemplateUpdateParams) {
    return await prismaExecute(prisma => 
      prisma.certTemplate.update({
        where: { id },
        data: {
          ...(data.templateName && { templateName: data.templateName }),
          ...(data.basePdfPath && { basePdfPath: data.basePdfPath }),
          ...(data.configuration && { configuration: data.configuration }),
          updatedBy: data.updatedBy,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
            }
          },
          updater: {
            select: {
              id: true,
              name: true,
              username: true,
            }
          }
        }
      })
    )
  },

  /**
   * Delete a template (soft delete by setting status to INACTIVE)
   */
  async deleteTemplate(id: number) {
    return await prismaExecute(prisma =>
      prisma.certTemplate.update({
        where: { id },
        data: { status: 'INACTIVE' },
      })
    )
  },

  /**
   * Duplicate an existing template
   */
  async duplicateTemplate(id: number, userId: number) {
    return await prismaExecute(async (prisma) => {
      // Get the original template
      const original = await prisma.certTemplate.findUnique({
        where: { id }
      })

      if (!original) {
        throw new Error('Template not found')
      }

      // Create a copy with new name and user ID
      return await prisma.certTemplate.create({
        data: {
          templateName: `${original.templateName} (Copy)`,
          basePdfPath: original.basePdfPath,
          configuration: original.configuration,
          status: original.status,
          createdBy: userId,
        }
      })
    })
  }
}
