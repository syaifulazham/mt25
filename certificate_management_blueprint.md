### API Route Examples (with Prisma)
```typescript
// app/api/certificates/templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { TemplateService } from '@/lib/services/template-service'
import { templateQuerySchema, templateCreateSchema } from '@/lib/validations/template-schemas'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = {
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
    }

    const validatedParams = templateQuerySchema.parse(queryParams)
    const result = await TemplateService.getTemplates(validatedParams)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = templateCreateSchema.parse(body)
    
    // TODO: Get user ID from session/auth
    const userId = 1 // Replace with actual user ID from authentication

    const template = await TemplateService.createTemplate({
      ...validatedData,
      createdBy: userId,
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Failed to create template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
```

```typescript
// app/api/certificates/templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { TemplateService } from '@/lib/services/template-service'
import { templateUpdateSchema } from '@/lib/validations/template-schemas'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }

    const template = await TemplateService.getTemplate(id)
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Failed to fetch template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = templateUpdateSchema.parse({ ...body, id })
    
    // TODO: Get user ID from session/auth
    const userId = 1 // Replace with actual user ID

    const template = await TemplateService.updateTemplate(id, {
      ...validatedData,
      updatedBy: userId,
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Failed to update template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }

    await TemplateService.deleteTemplate(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
```

### Page Components with Prisma Integration
```typescript
// app/organizer/certificates/templates/page.tsx
import { Suspense } from 'react'
import { TemplateService } from '@/lib/services/template-service'
import { TemplateList } from '../_components/TemplateList'
import { TemplateListSkeleton } from '../_components/TemplateListSkeleton'

interface PageProps {
  searchParams: {
    page?: string
    search?: string
    status?: 'ACTIVE' | 'INACTIVE'
  }
}

export default async function TemplatesPage({ searchParams }: PageProps) {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Certificate Templates</h1>
        <a
          href="/organizer/certificates/templates/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Create Template
        </a>
      </div>
      
      <Suspense fallback={<TemplateListSkeleton />}>
        <TemplateListWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function TemplateListWrapper({ searchParams }: PageProps) {
  const templates = await TemplateService.getTemplates({
    page: parseInt(searchParams.page || '1'),
    search: searchParams.search,
    status: searchParams.status,
  })

  return <TemplateList initialData={templates} />
}
```

```typescript
// app/organizer/certificates/templates/create/page.tsx
import { CreateTemplateForm } from '../../_components/CreateTemplateForm'

export default function CreateTemplatePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Certificate Template</h1>
        <p className="text-gray-600 mt-2">
          Design a new certificate template by uploading a PDF base and adding custom elements.
        </p>
      </div>
      
      <CreateTemplateForm />
    </div>
  )
}
```

### Custom Hooks for Template Management
```typescript
// lib/hooks/use-template.ts
import { useState, useEffect } from 'react'
import { CertTemplate } from '@/lib/types/certificate'

export function useTemplate(id: number) {
  const [template, setTemplate] = useState<CertTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTemplate() {
      try {
        setLoading(true)
        const response = await fetch(`/api/certificates/templates/${id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch template')
        }
        
        const data = await response.json()
        setTemplate(data.template)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplate()
  }, [id])

  return { template, loading, error, refetch: () => fetchTemplate() }
}

export function useTemplates(params: {
  page?: number
  search?: string
  status?: 'ACTIVE' | 'INACTIVE'
}) {
  const [templates, setTemplates] = useState<CertTemplate[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoading(true)
        const searchParams = new URLSearchParams()
        
        if (params.page) searchParams.set('page', params.page.toString())
        if (params.search) searchParams.set('search', params.search)
        if (params.status) searchParams.set('status', params.status)

        const response = await fetch(`/api/certificates/templates?${searchParams}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch templates')
        }
        
        const data = await response.json()
        setTemplates(data.templates)
        setTotal(data.total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [params.page, params.search, params.status])

  return { templates, total, loading, error }
}
```

### Prisma Commands and Setup
```bash
# Package.json scripts
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset"
  }
}
```

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create sample certificate templates
  const sampleTemplate = await prisma.certTemplate.create({
    data: {
      templateName: 'Sample Certificate of Achievement',
      basePdfPath: '/uploads/templates/sample-certificate.pdf',
      configuration: {
        canvas: { width: 842, height: 595, scale: 1.0 },
        background: { pdf_path: '/uploads/templates/sample-certificate.pdf', page: 1 },
        elements: [
          {
            id: 'title',
            type: 'static_text',
            content: 'Certificate of Achievement',
            position: { x: 421, y: 150 },
            style: {
              font_family: 'Arial',
              font_size: 24,
              font_weight: 'bold',
              color: '#000000',
              align: 'center'
            },
            layer: 1
          },
          {
            id: 'recipient',
            type: 'dynamic_text',
            placeholder: '{{recipient_name}}',
            position: { x: 421, y: 300 },
            style: {
              font_family: 'Times New Roman',
              font_size: 18,
              font_weight: 'normal',
              color: '#333333',
              align: 'center'
            },
            layer: 2
          }
        ]
      },
      status: 'ACTIVE',
    },
  })

  console.log('Sample template created:', sampleTemplate)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```# Certificate Management Module Blueprint

## Overview
The Certificate Management module provides a comprehensive solution for creating, managing, and generating digital certificates using customizable templates. Users can design certificate templates with static and dynamic content, then use these templates to generate certificates for various purposes.

## Module Structure

**Root Path:** `/organizer/certificates`

## Core Features

### Certificate Template Management
- **Template Listing** - View all available certificate templates
- **Template Creation** - Create new certificate templates with custom design
- **Template Editing** - Modify existing templates
- **Template Preview** - Real-time preview of template design

## Page Structure

### 1. Certificate Template Hub (`/organizer/certificates`)
**Purpose:** Central dashboard for certificate template management

**Components:**
- Template gallery with thumbnail previews
- Search and filter functionality
- Quick action buttons (Create, Edit, Delete)
- Template usage statistics
- Recent templates section

**Features:**
- Grid/list view toggle
- Template categorization
- Bulk operations
- Export/import templates

### 2. Template List (`/organizer/certificates/templates`)
**Purpose:** Comprehensive list of all certificate templates

**Components:**
- Data table with sorting and filtering
- Template preview thumbnails
- Status indicators (Active/Inactive)
- Action buttons (Edit, Duplicate, Delete)
- Pagination controls

**Table Columns:**
- Template Name
- Created Date
- Last Modified
- Usage Count
- Status
- Actions

### 3. Create New Template (`/organizer/certificates/templates/create`)
**Purpose:** Template design interface for creating new certificate templates

**Components:**
- **PDF Upload Section**
  - Drag & drop file upload
  - File validation (PDF only)
  - Preview of uploaded PDF
  - Replace/remove functionality

- **Design Canvas**
  - Interactive PDF viewer with overlay
  - Zoom controls
  - Grid/ruler guides
  - Undo/redo functionality

- **Element Toolbox**
  - Static Text tool
  - Dynamic Text tool
  - Image tool
  - Shape tools (optional)

- **Properties Panel**
  - Element positioning (X, Y coordinates)
  - Font settings (size, family, color)
  - Text alignment
  - Layer management
  - Element styling options

**Workflow:**
1. Upload base PDF template
2. Add static captions (fixed text)
3. Add dynamic text placeholders
4. Insert images/logos
5. Configure positioning and styling
6. Save template configuration

### 4. Update Template (`/organizer/certificates/templates/edit/{id}`)
**Purpose:** Edit existing certificate templates

**Components:**
- Same interface as Create Template
- Pre-loaded with existing configuration
- Version history (optional)
- Template comparison view

## Technical Specifications

### Framework: Next.js 14+ (App Router) with Prisma ORM

### Database Schema (Prisma)

#### Prisma Schema
```prisma
// prisma/schema.prisma
model CertTemplate {
  id            Int      @id @default(autoincrement())
  templateName  String   @map("template_name") @db.VarChar(255)
  basePdfPath   String?  @map("base_pdf_path") @db.VarChar(500)
  configuration Json
  status        Status   @default(ACTIVE)
  createdBy     Int?     @map("created_by")
  updatedBy     Int?     @map("updated_by")
  createdAt     DateTime @default(now()) @map("createdAt")
  updatedAt     DateTime @updatedAt @map("updatedAt")

  // Relations (if needed)
  creator       User?    @relation("TemplateCreator", fields: [createdBy], references: [id])
  updater       User?    @relation("TemplateUpdater", fields: [updatedBy], references: [id])

  @@index([templateName])
  @@index([status])
  @@index([createdAt])
  @@map("cert_template")
}

enum Status {
  ACTIVE   @map("active")
  INACTIVE @map("inactive")
}

// Optional User model reference
model User {
  id                Int            @id @default(autoincrement())
  email             String         @unique
  name              String?
  createdTemplates  CertTemplate[] @relation("TemplateCreator")
  updatedTemplates  CertTemplate[] @relation("TemplateUpdater")
  
  @@map("users")
}
```

#### Generated SQL Migration
```sql
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "cert_template" (
    "id" SERIAL NOT NULL,
    "template_name" VARCHAR(255) NOT NULL,
    "base_pdf_path" VARCHAR(500),
    "configuration" JSONB NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'active',
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cert_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cert_template_template_name_idx" ON "cert_template"("template_name");
CREATE INDEX "cert_template_status_idx" ON "cert_template"("status");
CREATE INDEX "cert_template_createdAt_idx" ON "cert_template"("createdAt");

-- AddForeignKey (if User model exists)
ALTER TABLE "cert_template" ADD CONSTRAINT "cert_template_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cert_template" ADD CONSTRAINT "cert_template_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### Configuration JSON Structure
```json
{
  "canvas": {
    "width": 842,
    "height": 595,
    "scale": 1.0
  },
  "background": {
    "pdf_path": "/uploads/templates/base-certificate.pdf",
    "page": 1
  },
  "elements": [
    {
      "id": "element_001",
      "type": "static_text",
      "content": "Certificate of Achievement",
      "position": {
        "x": 421,
        "y": 150
      },
      "style": {
        "font_family": "Arial",
        "font_size": 24,
        "font_weight": "bold",
        "color": "#000000",
        "align": "center"
      },
      "layer": 1
    },
    {
      "id": "element_002",
      "type": "dynamic_text",
      "placeholder": "{{recipient_name}}",
      "position": {
        "x": 421,
        "y": 300
      },
      "style": {
        "font_family": "Times New Roman",
        "font_size": 18,
        "font_weight": "normal",
        "color": "#333333",
        "align": "center"
      },
      "layer": 2
    },
    {
      "id": "element_003",
      "type": "image",
      "source": "/uploads/logos/company-logo.png",
      "position": {
        "x": 50,
        "y": 50
      },
      "dimensions": {
        "width": 100,
        "height": 100
      },
      "layer": 0
    }
  ]
}
```

## User Interface Specifications

### Design Requirements
- **Responsive Design** - Mobile and tablet friendly
- **Drag & Drop Interface** - Intuitive element positioning
- **Real-time Preview** - Live updates during editing
- **Accessibility** - WCAG 2.1 AA compliance
- **Cross-browser Support** - Modern browsers (Chrome, Firefox, Safari, Edge)

### Key UI Components

#### Template Canvas
- Interactive PDF viewer with overlay system
- Element selection and manipulation handles
- Context menus for element actions
- Snap-to-grid functionality
- Multi-element selection

#### Element Properties Panel
- Tabbed interface (Position, Style, Content)
- Real-time property updates
- Color picker for text/background colors
- Font selection dropdown
- Numeric inputs with validation

#### File Management
- PDF upload with progress indicator
- Image library browser
- File size and format validation
- Thumbnail generation

## API Endpoints (Next.js App Router)

### Route Handlers
- `GET /api/certificates/templates` - List all templates
- `POST /api/certificates/templates` - Create new template
- `GET /api/certificates/templates/[id]` - Get template details
- `PUT /api/certificates/templates/[id]` - Update template
- `DELETE /api/certificates/templates/[id]` - Delete template
- `POST /api/certificates/templates/[id]/duplicate` - Duplicate template

### File Upload Routes
- `POST /api/certificates/upload-pdf` - Upload base PDF
- `POST /api/certificates/upload-image` - Upload template images
- `GET /api/certificates/preview/[id]` - Generate template preview

### Server Actions (for form handling)
```typescript
// app/organizer/certificates/_actions/template-actions.ts
'use server'

export async function createTemplate(formData: FormData) {
  // Server-side template creation logic
}

export async function updateTemplate(id: number, formData: FormData) {
  // Server-side template update logic
}

export async function deleteTemplate(id: number) {
  // Server-side template deletion logic
}
```

## Security Considerations

### File Upload Security
- File type validation (PDF/images only)
- File size limits
- Virus scanning integration
- Secure file storage with restricted access

### Access Control
- Role-based permissions (Admin, Editor, Viewer)
- Template ownership validation
- Secure API endpoints with authentication

### Data Protection
- Input sanitization for all user inputs
- SQL injection prevention
- XSS protection for dynamic content

## Future Enhancements

### Phase 2 Features
- Template versioning and rollback
- Collaborative editing
- Template marketplace/sharing
- Bulk certificate generation
- Email integration for certificate delivery
- QR code integration for verification
- Advanced typography controls
- Multi-language support

### Integration Possibilities
- Learning Management Systems (LMS)
- Event Management platforms
- HR Management systems
- Digital signature services

## Development Guidelines

## Development Guidelines

### Next.js Project Structure
```
/app/
├── organizer/
│   └── certificates/
│       ├── page.tsx                    # Main certificates hub
│       ├── templates/
│       │   ├── page.tsx               # Template list
│       │   ├── create/
│       │   │   └── page.tsx           # Create template
│       │   └── [id]/
│       │       ├── page.tsx           # View template
│       │       └── edit/
│       │           └── page.tsx       # Edit template
│       ├── _components/
│       │   ├── TemplateCanvas.tsx
│       │   ├── ElementToolbox.tsx
│       │   ├── PropertiesPanel.tsx
│       │   ├── TemplateGallery.tsx
│       │   └── FileUpload.tsx
│       ├── _actions/
│       │   └── template-actions.ts    # Server Actions
│       └── _lib/
│           ├── template-utils.ts
│           └── pdf-processor.ts
├── api/
│   └── certificates/
│       ├── templates/
│       │   ├── route.ts               # GET, POST /api/certificates/templates
│       │   └── [id]/
│       │       ├── route.ts           # GET, PUT, DELETE /api/certificates/templates/[id]
│       │       └── duplicate/
│       │           └── route.ts       # POST duplicate
│       ├── upload-pdf/
│       │   └── route.ts               # PDF upload handler
│       ├── upload-image/
│       │   └── route.ts               # Image upload handler
│       └── preview/
│           └── [id]/
│               └── route.ts           # Template preview
├── globals.css
└── layout.tsx

/lib/
├── database/
│   ├── connection.ts                  # Database connection
│   ├── models/
│   │   └── cert-template.ts           # Template model/repository
│   └── migrations/
│       └── 001_create_cert_template.sql
├── types/
│   └── certificate.ts                # TypeScript types
├── utils/
│   ├── file-validation.ts
│   ├── pdf-utils.ts
│   └── canvas-utils.ts
└── hooks/
    ├── use-template.ts
    ├── use-canvas.ts
    └── use-file-upload.ts

/components/ui/                        # Shared UI components
├── button.tsx
├── input.tsx
├── dialog.tsx
├── toast.tsx
└── ...

/public/
├── uploads/
│   ├── templates/                     # PDF templates
│   ├── images/                        # Template images
│   └── previews/                      # Generated previews
└── icons/
```

### Key Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0",
    "@types/node": "^20.0.0",
    "@prisma/client": "^5.6.0",
    "prisma": "^5.6.0",
    "pdf-lib": "^1.17.0",
    "react-pdf": "^7.5.0",
    "fabric": "^5.3.0",
    "react-dropzone": "^14.2.0",
    "zod": "^3.22.0",
    "tailwindcss": "^3.3.0",
    "lucide-react": "^0.290.0",
    "framer-motion": "^10.16.0"
  },
  "devDependencies": {
    "@types/fabric": "^5.3.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0"
  }
}
```

### Prisma Client Setup
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Environment Configuration
```env
# .env
DATABASE_URL="postgresql://username:password@localhost:5432/certificates_db?schema=public"
# or for MySQL
# DATABASE_URL="mysql://username:password@localhost:3306/certificates_db"

NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# File upload settings
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR="./public/uploads"
```

### Component Examples

#### Template Canvas Component
```typescript
// app/organizer/certificates/_components/TemplateCanvas.tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import { fabric } from 'fabric'

interface TemplateCanvasProps {
  pdfUrl?: string
  configuration?: TemplateConfiguration
  onConfigurationChange: (config: TemplateConfiguration) => void
}

export function TemplateCanvas({ 
  pdfUrl, 
  configuration, 
  onConfigurationChange 
}: TemplateCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null)

  // Canvas initialization and event handlers
  // PDF rendering logic
  // Element manipulation logic
  
  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="border border-gray-300" />
      {/* Canvas controls */}
    </div>
  )
}
```

#### Server Action Example (with Prisma)
```typescript
// app/organizer/certificates/_actions/template-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { templateCreateSchema } from '@/lib/validations/template-schemas'

export async function createTemplate(formData: FormData) {
  const validatedFields = templateCreateSchema.safeParse({
    templateName: formData.get('templateName'),
    configuration: JSON.parse(formData.get('configuration') as string),
    basePdfPath: formData.get('basePdfPath'),
  })

  if (!validatedFields.success) {
    return { 
      error: 'Invalid fields',
      details: validatedFields.error.flatten().fieldErrors 
    }
  }

  try {
    const template = await prisma.certTemplate.create({
      data: {
        templateName: validatedFields.data.templateName,
        configuration: validatedFields.data.configuration,
        basePdfPath: validatedFields.data.basePdfPath,
        status: 'ACTIVE',
        // createdBy: userId, // Add from session
      },
    })

    revalidatePath('/organizer/certificates/templates')
    redirect(`/organizer/certificates/templates/${template.id}`)
  } catch (error) {
    console.error('Failed to create template:', error)
    return { error: 'Failed to create template' }
  }
}

export async function updateTemplate(id: number, formData: FormData) {
  const validatedFields = templateCreateSchema.safeParse({
    templateName: formData.get('templateName'),
    configuration: JSON.parse(formData.get('configuration') as string),
    basePdfPath: formData.get('basePdfPath'),
  })

  if (!validatedFields.success) {
    return { 
      error: 'Invalid fields',
      details: validatedFields.error.flatten().fieldErrors 
    }
  }

  try {
    const template = await prisma.certTemplate.update({
      where: { id },
      data: {
        templateName: validatedFields.data.templateName,
        configuration: validatedFields.data.configuration,
        basePdfPath: validatedFields.data.basePdfPath,
        // updatedBy: userId, // Add from session
      },
    })

    revalidatePath('/organizer/certificates/templates')
    revalidatePath(`/organizer/certificates/templates/${id}`)
    return { success: true, template }
  } catch (error) {
    console.error('Failed to update template:', error)
    return { error: 'Failed to update template' }
  }
}

export async function deleteTemplate(id: number) {
  try {
    await prisma.certTemplate.update({
      where: { id },
      data: { status: 'INACTIVE' }, // Soft delete
    })

    revalidatePath('/organizer/certificates/templates')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete template:', error)
    return { error: 'Failed to delete template' }
  }
}
```

### TypeScript Types (Prisma Generated + Custom)
```typescript
// lib/types/certificate.ts
import { CertTemplate as PrismaCertTemplate, Status } from '@prisma/client'

// Use Prisma generated types as base
export type CertTemplate = PrismaCertTemplate

// Custom types for template configuration
export interface TemplateConfiguration {
  canvas: {
    width: number
    height: number
    scale: number
  }
  background: {
    pdf_path: string
    page: number
  }
  elements: TemplateElement[]
}

export interface TemplateElement {
  id: string
  type: 'static_text' | 'dynamic_text' | 'image'
  position: { x: number; y: number }
  style?: TextStyle
  content?: string
  placeholder?: string
  source?: string
  dimensions?: { width: number; height: number }
  layer: number
}

export interface TextStyle {
  font_family: string
  font_size: number
  font_weight: 'normal' | 'bold'
  color: string
  align: 'left' | 'center' | 'right'
}

// Form types
export interface CreateTemplateData {
  templateName: string
  basePdfPath?: string
  configuration: TemplateConfiguration
}

export interface UpdateTemplateData extends CreateTemplateData {
  id: number
}

// API Response types
export interface TemplateListResponse {
  templates: CertTemplate[]
  total: number
  page: number
  pageSize: number
}

export interface TemplateResponse {
  template: CertTemplate
}

export interface ApiError {
  error: string
  details?: Record<string, string[]>
}
```

### Validation Schemas (Zod)
```typescript
// lib/validations/template-schemas.ts
import { z } from 'zod'

const textStyleSchema = z.object({
  font_family: z.string(),
  font_size: z.number().min(1).max(200),
  font_weight: z.enum(['normal', 'bold']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  align: z.enum(['left', 'center', 'right']),
})

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
  source: z.string().optional(),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
  }).optional(),
  layer: z.number().min(0),
})

const configurationSchema = z.object({
  canvas: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    scale: z.number().positive(),
  }),
  background: z.object({
    pdf_path: z.string(),
    page: z.number().min(1),
  }),
  elements: z.array(templateElementSchema),
})

export const templateCreateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required').max(255),
  basePdfPath: z.string().optional(),
  configuration: configurationSchema,
})

export const templateUpdateSchema = templateCreateSchema.extend({
  id: z.number().positive(),
})

export const templateQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})
```

### Prisma Service Layer
```typescript
// lib/services/template-service.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { CreateTemplateData, UpdateTemplateData } from '@/lib/types/certificate'

export class TemplateService {
  static async getTemplates(params: {
    page?: number
    pageSize?: number
    search?: string
    status?: 'ACTIVE' | 'INACTIVE'
  }) {
    const { page = 1, pageSize = 10, search, status } = params
    const skip = (page - 1) * pageSize

    const where: Prisma.CertTemplateWhereInput = {
      ...(status && { status }),
      ...(search && {
        templateName: {
          contains: search,
          mode: 'insensitive',
        },
      }),
    }

    const [templates, total] = await Promise.all([
      prisma.certTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
          updater: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.certTemplate.count({ where }),
    ])

    return {
      templates,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  static async getTemplate(id: number) {
    return prisma.certTemplate.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        updater: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  static async createTemplate(data: CreateTemplateData & { createdBy?: number }) {
    return prisma.certTemplate.create({
      data: {
        templateName: data.templateName,
        basePdfPath: data.basePdfPath,
        configuration: data.configuration as Prisma.JsonObject,
        createdBy: data.createdBy,
        status: 'ACTIVE',
      },
    })
  }

  static async updateTemplate(
    id: number, 
    data: Partial<UpdateTemplateData> & { updatedBy?: number }
  ) {
    return prisma.certTemplate.update({
      where: { id },
      data: {
        ...(data.templateName && { templateName: data.templateName }),
        ...(data.basePdfPath && { basePdfPath: data.basePdfPath }),
        ...(data.configuration && { 
          configuration: data.configuration as Prisma.JsonObject 
        }),
        updatedBy: data.updatedBy,
      },
    })
  }

  static async deleteTemplate(id: number) {
    return prisma.certTemplate.update({
      where: { id },
      data: { status: 'INACTIVE' },
    })
  }

  static async duplicateTemplate(id: number, createdBy?: number) {
    const original = await this.getTemplate(id)
    if (!original) throw new Error('Template not found')

    return prisma.certTemplate.create({
      data: {
        templateName: `${original.templateName} (Copy)`,
        basePdfPath: original.basePdfPath,
        configuration: original.configuration,
        createdBy,
        status: 'ACTIVE',
      },
    })
  }
}
```

### Testing Strategy
- **Unit Tests**: Jest + React Testing Library for components
- **Integration Tests**: Playwright for end-to-end testing
- **API Tests**: Supertest for route handlers
- **Component Tests**: Storybook for UI components
- **Database Tests**: In-memory MySQL for model testing

## Documentation Requirements
- API documentation with examples
- User manual with screenshots
- Administrator setup guide
- Troubleshooting guide
- Template design best practices