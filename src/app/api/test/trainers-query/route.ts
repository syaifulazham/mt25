import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Test endpoint to debug trainers query
 * Access: /api/test/trainers-query
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'OPERATOR'].includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    }

    // Test 1: Simple count
    try {
      const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM attendanceManager`
      result.tests.simple_count = {
        status: 'OK',
        count: Number((count as any)[0]?.count || 0)
      }
    } catch (error) {
      result.tests.simple_count = {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 2: Simple query with manager join
    try {
      const simple = await prisma.$queryRaw`
        SELECT 
          am.id as attendanceManagerId,
          am.managerId,
          m.name as managerName
        FROM attendanceManager am
        INNER JOIN manager m ON am.managerId = m.id
        LIMIT 5
      `
      result.tests.simple_join = {
        status: 'OK',
        count: (simple as any[]).length,
        sample: simple
      }
    } catch (error) {
      result.tests.simple_join = {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 3: Full complex query
    try {
      const complex = await prisma.$queryRaw`
        SELECT DISTINCT
          am.id as attendanceManagerId,
          am.managerId,
          am.eventId,
          am.contingentId,
          am.attendanceStatus,
          am.createdAt as attendanceCreatedAt,
          m.name as managerName,
          m.email as managerEmail,
          m.phoneNumber as managerPhone,
          m.ic as managerIc,
          c.name as contingentName,
          e.name as eventName,
          e.startDate as eventStartDate,
          e.endDate as eventEndDate,
          COALESCE(s.name, hi.name, i.name) as institutionName,
          COALESCE(st.name, NULL) as stateName
        FROM attendanceManager am
        INNER JOIN manager m ON am.managerId = m.id
        LEFT JOIN contingent c ON am.contingentId = c.id
        LEFT JOIN event e ON am.eventId = e.id
        LEFT JOIN school s ON c.schoolId = s.id
        LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
        LEFT JOIN independent i ON c.independentId = i.id
        LEFT JOIN state st ON s.stateId = st.id OR hi.stateId = st.id OR i.stateId = st.id
        ORDER BY am.createdAt DESC
        LIMIT 5
      ` as any[]
      
      const processed = complex.map(row => ({
        ...row,
        attendanceManagerId: Number(row.attendanceManagerId),
        managerId: Number(row.managerId),
        eventId: Number(row.eventId),
        contingentId: Number(row.contingentId),
        attendanceCreatedAt: row.attendanceCreatedAt ? new Date(row.attendanceCreatedAt).toISOString() : null,
        eventStartDate: row.eventStartDate ? new Date(row.eventStartDate).toISOString() : null,
        eventEndDate: row.eventEndDate ? new Date(row.eventEndDate).toISOString() : null
      }))
      
      result.tests.complex_query = {
        status: 'OK',
        count: processed.length,
        sample: processed[0]
      }
    } catch (error) {
      result.tests.complex_query = {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }

    // Test 4: Check prismaExecute wrapper
    try {
      const { prismaExecute } = await import('@/lib/prisma')
      const testResult = await prismaExecute(async (p) => {
        const test = await p.$queryRaw`SELECT COUNT(*) as count FROM attendanceManager`
        return test
      })
      result.tests.prisma_execute = {
        status: 'OK',
        result: testResult
      }
    } catch (error) {
      result.tests.prisma_execute = {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
