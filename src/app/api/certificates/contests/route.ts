import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Query to get all contests using Prisma's $queryRaw
    const contests = await prisma.$queryRaw`
      SELECT id, name, code FROM contest ORDER BY name
    `
    
    // Convert BigInt IDs to regular numbers for JSON serialization
    const serializedContests = (contests as any[]).map(contest => ({
      id: Number(contest.id),
      name: contest.name,
      code: contest.code,
      displayName: `${contest.code} - ${contest.name}`
    }))
    
    return NextResponse.json({ contests: serializedContests }, { status: 200 })
  } catch (error) {
    console.error('Error fetching contests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contests' },
      { status: 500 }
    )
  } finally {
    // Disconnect from Prisma client (optional in Next.js API routes as Next.js handles this)
    await prisma.$disconnect()
  }
}
