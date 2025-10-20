import { z } from 'zod'

// Text style schema for certificate elements
const textStyleSchema = z.object({
  font_family: z.string(),
  font_size: z.number().min(1).max(200),
  font_weight: z.enum(['normal', 'bold']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  align: z.enum(['left', 'center', 'right']),
})

// Template element schema
const templateElementSchema = z.object({
  id: z.string(),
  type: z.enum(['static_text', 'dynamic_text', 'image']),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  style: textStyleSchema.optional(),
  content: z.string().optional(),
  placeholder: z.string().optional(),
  prefix: z.string().optional(), // Add prefix property for dynamic text
  text_anchor: z.enum(['start', 'middle', 'end']).optional(), // Add text_anchor property
  source: z.string().optional(),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
  }).optional(),
  layer: z.number().min(0),
})

// Template configuration schema
const templateConfigurationSchema = z.object({
  canvas: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    scale: z.number().positive(),
    paperSize: z.string().optional(), // Paper size identifier (e.g., 'A4-Portrait')
    orientation: z.enum(['portrait', 'landscape']).optional(), // Paper orientation
  }),
  calibration: z.object({
    scaleX: z.number().default(0.98),
    scaleY: z.number().default(0.98),
    offsetY: z.number().default(-20),
    baselineRatio: z.number().default(0.35),
  }).optional(),
  background: z.object({
    pdf_path: z.string(),
    page: z.number().int().positive(),
  }),
  elements: z.array(templateElementSchema),
})

// Template query parameters schema
export const templateQuerySchema = z.object({
  page: z.string().nullable().optional().transform(val => val ? parseInt(val) : 1),
  pageSize: z.string().nullable().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().nullable().optional(),
  status: z.string().nullable().optional().refine((val) => !val || ['ACTIVE', 'INACTIVE'].includes(val), {
    message: 'Status must be ACTIVE or INACTIVE'
  }),
  targetType: z.string().nullable().optional().refine((val) => !val || ['GENERAL', 'EVENT_PARTICIPANT', 'EVENT_WINNER', 'NON_CONTEST_PARTICIPANT'].includes(val), {
    message: 'Invalid target type'
  }),
})

// Target audience type enum
export const targetTypeEnum = z.enum(['GENERAL', 'EVENT_PARTICIPANT', 'EVENT_WINNER', 'NON_CONTEST_PARTICIPANT'])

// Prerequisite schema
const prerequisiteSchema = z.object({
  prerequisite: z.string(),
  id: z.number().int().positive()
})

// Template creation schema
export const templateCreateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required').max(255, 'Template name cannot exceed 255 characters'),
  basePdfPath: z.string().optional(),
  configuration: templateConfigurationSchema,
  // Target audience fields
  targetType: targetTypeEnum.default('GENERAL'),
  eventId: z.number().int().positive().nullable().optional(),
  winnerRangeStart: z.number().int().min(1).nullable().optional(),
  winnerRangeEnd: z.number().int().min(1).nullable().optional(),
  // Prerequisites field
  prerequisites: z.array(prerequisiteSchema).nullable().optional(),
  createdBy: z.number().optional(), // Added by the API route from the session
})

// Template update schema
export const templateUpdateSchema = z.object({
  id: z.number().int().positive('Invalid template ID'),
  templateName: z.string().min(1, 'Template name is required').max(255, 'Template name cannot exceed 255 characters').optional(),
  basePdfPath: z.string().optional(),
  configuration: templateConfigurationSchema.optional(),
  // Target audience fields
  targetType: targetTypeEnum.optional(),
  eventId: z.number().int().positive().nullable().optional(),
  winnerRangeStart: z.number().int().min(1).nullable().optional(),
  winnerRangeEnd: z.number().int().min(1).nullable().optional(),
  // Prerequisites field
  prerequisites: z.array(prerequisiteSchema).nullable().optional(),
  updatedBy: z.number().optional(), // Added by the API route from the session
})

// Template access control helper
export const checkTemplateAccess = (
  operation: 'view' | 'create' | 'edit' | 'delete',
  userRole?: string | null
): boolean => {
  // If no role is provided, deny access
  if (!userRole) {
    return false
  }
  
  // Admin users always have full access
  if (userRole === 'ADMIN') {
    return true
  }
  
  // Access rules for different operations
  switch (operation) {
    case 'view':
      // OPERATOR and VIEWER roles can view templates
      return ['OPERATOR', 'VIEWER'].includes(userRole)
    
    case 'create':
    case 'edit':
      // Only ADMIN and OPERATOR roles can create/edit templates
      return userRole === 'OPERATOR'
    
    case 'delete':
      // Only ADMIN role can delete templates
      return false
    
    default:
      return false
  }
}
