import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Diagnostic endpoint to check trainers feature health
 * Access: /api/diagnostics/trainers
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'OPERATOR'].includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {}
    }

    // 1. Check database connection
    try {
      await prisma.$queryRaw`SELECT 1 as test`
      diagnostics.checks.database_connection = { status: 'OK' }
    } catch (error) {
      diagnostics.checks.database_connection = { 
        status: 'FAILED', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // 2. Check cert_template table and TRAINERS enum
    try {
      const templates = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, templateName, targetType, status 
         FROM cert_template 
         WHERE targetType = 'TRAINERS'`
      )
      diagnostics.checks.trainers_templates = { 
        status: 'OK', 
        count: templates.length,
        templates: templates.map(t => ({
          id: Number(t.id),
          name: t.templateName,
          status: t.status
        }))
      }
    } catch (error) {
      diagnostics.checks.trainers_templates = { 
        status: 'FAILED', 
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'TRAINERS enum might not exist in targetType column'
      }
    }

    // 3. Check certificate table structure
    try {
      const columns = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'certificate'
           AND COLUMN_NAME IN ('recipientType', 'recipientEmail', 'filePath', 'updatedBy')
         ORDER BY ORDINAL_POSITION`
      )
      diagnostics.checks.certificate_columns = {
        status: columns.length === 4 ? 'OK' : 'PARTIAL',
        found: columns.map(c => c.COLUMN_NAME),
        missing: ['recipientType', 'recipientEmail', 'filePath', 'updatedBy'].filter(
          col => !columns.some(c => c.COLUMN_NAME === col)
        )
      }
    } catch (error) {
      diagnostics.checks.certificate_columns = { 
        status: 'FAILED', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // 4. Check attendanceManager data
    try {
      const trainerCount = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as count FROM attendanceManager`
      )
      diagnostics.checks.attendance_managers = { 
        status: 'OK', 
        count: Number(trainerCount[0]?.count || 0)
      }
    } catch (error) {
      diagnostics.checks.attendance_managers = { 
        status: 'FAILED', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // 5. Check manager table
    try {
      const managerCount = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as count FROM manager`
      )
      diagnostics.checks.managers = { 
        status: 'OK', 
        count: Number(managerCount[0]?.count || 0)
      }
    } catch (error) {
      diagnostics.checks.managers = { 
        status: 'FAILED', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // 6. Check trainer certificates
    try {
      const certCount = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as count FROM certificate WHERE recipientType = 'TRAINER'`
      )
      diagnostics.checks.trainer_certificates = { 
        status: 'OK', 
        count: Number(certCount[0]?.count || 0)
      }
    } catch (error) {
      diagnostics.checks.trainer_certificates = { 
        status: 'FAILED', 
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'recipientType column might not exist'
      }
    }

    // 7. Check certificate_serial table
    try {
      const serialCount = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as count FROM certificate_serial WHERE targetType = 'TRAINERS'`
      )
      diagnostics.checks.certificate_serials = { 
        status: 'OK', 
        count: Number(serialCount[0]?.count || 0)
      }
    } catch (error) {
      diagnostics.checks.certificate_serials = { 
        status: 'FAILED', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // 8. Check Prisma client generation
    try {
      const certTemplate = await prisma.certTemplate.findFirst({
        where: { targetType: 'TRAINERS' as any },
        select: { id: true, templateName: true }
      })
      diagnostics.checks.prisma_client = {
        status: 'OK',
        trainers_enum_available: true,
        sample_template: certTemplate
      }
    } catch (error) {
      diagnostics.checks.prisma_client = {
        status: 'FAILED',
        trainers_enum_available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Run: npx prisma generate'
      }
    }

    // Overall health
    const failedChecks = Object.values(diagnostics.checks).filter(
      (check: any) => check.status === 'FAILED'
    ).length
    
    diagnostics.overall = {
      status: failedChecks === 0 ? 'HEALTHY' : 'UNHEALTHY',
      failed_checks: failedChecks,
      total_checks: Object.keys(diagnostics.checks).length
    }

    return NextResponse.json(diagnostics, { status: 200 })

  } catch (error) {
    console.error('Diagnostic error:', error)
    return NextResponse.json(
      { 
        error: 'Diagnostic check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
