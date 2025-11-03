import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contingentId = parseInt(searchParams.get('contingentId') || '202')

    // Get ALL certificates for this contingent (no filters)
    const allCerts = await prisma.$queryRaw<Array<{
      id: number
      templateId: number
      recipientName: string
      ic_number: string | null
      filePath: string | null
      status: string
      uniqueCode: string
      ownership: any
      templateName: string
      targetType: string
      eventId: number | null
      eventName: string | null
      scopeArea: string | null
    }>>`
      SELECT 
        c.id,
        c.templateId,
        c.recipientName,
        c.ic_number,
        c.filePath,
        c.status,
        c.uniqueCode,
        c.ownership,
        ct.templateName,
        ct.targetType,
        ct.eventId,
        e.name as eventName,
        e.scopeArea
      FROM certificate c
      INNER JOIN cert_template ct ON c.templateId = ct.id
      LEFT JOIN event e ON ct.eventId = e.id
      WHERE JSON_EXTRACT(c.ownership, '$.contingentId') = ${contingentId}
      ORDER BY c.id DESC
    `

    return NextResponse.json({ 
      contingentId,
      totalCertificates: allCerts.length,
      certificates: allCerts.map(c => ({
        id: c.id,
        recipientName: c.recipientName,
        ic: c.ic_number,
        status: c.status,
        templateName: c.templateName,
        targetType: c.targetType,
        eventId: c.eventId,
        eventName: c.eventName,
        scopeArea: c.scopeArea,
        filePath: c.filePath ? 'EXISTS' : 'NULL',
        ownership: c.ownership
      }))
    })
  } catch (error) {
    console.error('Error in debug endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debug data', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
