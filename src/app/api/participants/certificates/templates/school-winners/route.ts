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

    // Fetch active SCHOOL_WINNER templates using raw query
    const templates = await prisma.$queryRaw<Array<{
      id: number
      templateName: string
      status: string
    }>>`
      SELECT id, templateName, status
      FROM cert_template
      WHERE targetType = 'SCHOOL_WINNER'
        AND status = 'ACTIVE'
      ORDER BY createdAt DESC
    `

    return NextResponse.json({
      templates,
      total: templates.length
    })

  } catch (error) {
    console.error('Error fetching school winner templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}
