import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

type Certificate = {
  id: number
  templateName: string
  targetType: string
  filePath: string | null
  uniqueCode: string
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the participant
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email }
    })
    
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Get all contingents managed by this participant
    const managedContingents = await prisma.contingentManager.findMany({
      where: {
        participantId: participant.id
      },
      select: {
        contingentId: true
      }
    })
    
    // Also check legacy relationship
    const legacyContingents = await prisma.contingent.findMany({
      where: {
        managedByParticipant: true,
        participantId: participant.id
      },
      select: {
        id: true
      }
    })
    
    // Combine both types of managed contingents
    const contingentIds = [
      ...managedContingents.map(c => c.contingentId),
      ...legacyContingents.map(c => c.id)
    ]
    
    if (contingentIds.length === 0) {
      return NextResponse.json({ contestants: [] })
    }

    // Get all contestants from these contingents with their certificates
    const contestants = await prisma.contestant.findMany({
      where: {
        contingentId: { in: contingentIds }
      },
      select: {
        id: true,
        name: true,
        ic: true,
        class_grade: true,
        class_name: true,
        age: true,
        contingent: {
          select: {
            id: true,
            name: true
          }
        },
        teamMembers: {
          select: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    })

    // Batch queries to avoid exhausting Prisma connection pool in production
    const contestantIds = contestants.map(c => c.id)
    const contestantIcTrimmedById = new Map<number, string>()
    const contestantIdByIcTrimmed = new Map<string, number>()
    const icTrimmedList: string[] = []

    contestants.forEach(c => {
      const trimmed = (c.ic || '').trim()
      contestantIcTrimmedById.set(c.id, trimmed)
      if (trimmed) {
        icTrimmedList.push(trimmed)
        // In case duplicates exist, keep the first one (best-effort fallback)
        if (!contestantIdByIcTrimmed.has(trimmed)) {
          contestantIdByIcTrimmed.set(trimmed, c.id)
        }
      }
    })

    const uniqueIcTrimmedList = Array.from(new Set(icTrimmedList))
    const uniqueContingentIds = Array.from(new Set(contestants.map(c => c.contingent?.id).filter((x): x is number => Boolean(x))))

    // School certificates (GENERAL) - best-effort matching by stored ic_number
    const schoolIcsRaw = Array.from(
      new Set(contestants.map(c => (c.ic || '').trim()).filter(ic => ic.length > 0))
    )

    const schoolCertificates = schoolIcsRaw.length
      ? await prisma.certificate.findMany({
          where: {
            ic_number: { in: schoolIcsRaw },
            status: { in: ['READY', 'LISTED'] },
            template: { targetType: 'GENERAL' }
          },
          include: {
            template: {
              select: {
                id: true,
                templateName: true,
                targetType: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' }
        })
      : []

    const schoolCertByIcRaw = new Map<string, typeof schoolCertificates[number]>()
    schoolCertificates.forEach(cert => {
      const key = (cert.ic_number || '').trim()
      if (key && !schoolCertByIcRaw.has(key)) {
        schoolCertByIcRaw.set(key, cert)
      }
    })

    // Zone/Online/National certificates (event scope) - match by ownership.contestantId when possible, else trimmed IC
    const zoneNationalCertificates =
      contestantIds.length && uniqueContingentIds.length
        ? await prisma.$queryRaw<Array<{
            id: number
            templateId: number
            recipientName: string
            filePath: string | null
            uniqueCode: string
            ownership: any
            templateName: string
            targetType: string
            eventId: number | null
            scopeArea: string | null
            contestantId: number | null
            icTrimmed: string | null
          }>>`
            SELECT 
              c.id,
              c.templateId,
              TRIM(REPLACE(REPLACE(c.recipientName, '\r', ''), '\n', '')) as recipientName,
              c.filePath,
              TRIM(c.uniqueCode) as uniqueCode,
              c.ownership,
              ct.templateName,
              ct.targetType,
              ct.eventId,
              e.scopeArea,
              CAST(JSON_EXTRACT(c.ownership, '$.contestantId') AS SIGNED) as contestantId,
              TRIM(c.ic_number) as icTrimmed
            FROM certificate c
            INNER JOIN cert_template ct ON c.templateId = ct.id
            LEFT JOIN event e ON ct.eventId = e.id
            WHERE c.status IN ('READY', 'LISTED')
              AND e.scopeArea IN ('ZONE', 'ONLINE_STATE', 'NATIONAL')
              AND CAST(JSON_EXTRACT(c.ownership, '$.contingentId') AS SIGNED) IN (${Prisma.join(uniqueContingentIds.map((id: number) => Prisma.sql`${id}`))})
              AND (
                CAST(JSON_EXTRACT(c.ownership, '$.contestantId') AS SIGNED) IN (${Prisma.join(contestantIds.map((id: number) => Prisma.sql`${id}`))})
                OR (
                  ${uniqueIcTrimmedList.length > 0}
                  AND TRIM(c.ic_number) IN (${Prisma.join(uniqueIcTrimmedList.map((ic: string) => Prisma.sql`${ic}`))})
                )
              )
          `
        : []

    // Quiz certificates - match by ownership.contestantId when possible, else trimmed IC
    const quizCertificates =
      contestantIds.length
        ? await prisma.$queryRaw<Array<{
            id: number
            templateId: number
            recipientName: string
            filePath: string | null
            uniqueCode: string
            ownership: any
            templateName: string
            targetType: string
            quizId: number | null
            contestantId: number | null
            icTrimmed: string | null
          }>>`
            SELECT 
              c.id,
              c.templateId,
              TRIM(REPLACE(REPLACE(c.recipientName, '\r', ''), '\n', '')) as recipientName,
              c.filePath,
              TRIM(c.uniqueCode) as uniqueCode,
              c.ownership,
              ct.templateName,
              ct.targetType,
              ct.quizId,
              CAST(JSON_EXTRACT(c.ownership, '$.contestantId') AS SIGNED) as contestantId,
              TRIM(c.ic_number) as icTrimmed
            FROM certificate c
            INNER JOIN cert_template ct ON c.templateId = ct.id
            WHERE c.status IN ('READY', 'LISTED')
              AND ct.targetType IN ('QUIZ_PARTICIPANT', 'QUIZ_WINNER')
              AND (
                CAST(JSON_EXTRACT(c.ownership, '$.contestantId') AS SIGNED) IN (${Prisma.join(contestantIds.map((id: number) => Prisma.sql`${id}`))})
                OR (
                  ${uniqueIcTrimmedList.length > 0}
                  AND TRIM(c.ic_number) IN (${Prisma.join(uniqueIcTrimmedList.map((ic: string) => Prisma.sql`${ic}`))})
                )
              )
          `
        : []

    // Build certificate maps by contestant
    const stateByContestantId = new Map<number, Certificate[]>()
    const onlineByContestantId = new Map<number, Certificate[]>()
    const nationalByContestantId = new Map<number, Certificate[]>()
    const quizByContestantId = new Map<number, Certificate[]>()

    const pushToMap = (map: Map<number, Certificate[]>, contestantId: number, cert: Certificate) => {
      const arr = map.get(contestantId) || []
      arr.push(cert)
      map.set(contestantId, arr)
    }

    zoneNationalCertificates.forEach(cert => {
      const explicitContestantId = cert.contestantId ? Number(cert.contestantId) : null
      const fallbackContestantId = cert.icTrimmed ? contestantIdByIcTrimmed.get((cert.icTrimmed || '').trim()) || null : null
      const mappedContestantId = explicitContestantId || fallbackContestantId
      if (!mappedContestantId) return

      const normalizedCert: Certificate = {
        id: cert.id,
        templateName: cert.templateName || '',
        targetType: cert.targetType || '',
        filePath: cert.filePath,
        uniqueCode: cert.uniqueCode
      }

      if (cert.scopeArea === 'ZONE') {
        pushToMap(stateByContestantId, mappedContestantId, normalizedCert)
      } else if (cert.scopeArea === 'ONLINE_STATE') {
        pushToMap(onlineByContestantId, mappedContestantId, normalizedCert)
      } else if (cert.scopeArea === 'NATIONAL') {
        pushToMap(nationalByContestantId, mappedContestantId, normalizedCert)
      }
    })

    quizCertificates.forEach(cert => {
      const explicitContestantId = cert.contestantId ? Number(cert.contestantId) : null
      const fallbackContestantId = cert.icTrimmed ? contestantIdByIcTrimmed.get((cert.icTrimmed || '').trim()) || null : null
      const mappedContestantId = explicitContestantId || fallbackContestantId
      if (!mappedContestantId) return

      const normalizedCert: Certificate = {
        id: cert.id,
        templateName: cert.templateName || '',
        targetType: cert.targetType || '',
        filePath: cert.filePath,
        uniqueCode: cert.uniqueCode
      }

      pushToMap(quizByContestantId, mappedContestantId, normalizedCert)
    })

    // Debug logging (batched)
    const debugContingentIdRaw = process.env.DEBUG_CERT_CONTINGENT_ID
    const debugContingentId = debugContingentIdRaw ? parseInt(debugContingentIdRaw) : null
    if (debugContingentId) {
      const debugContestants = contestants.filter(c => c.contingent?.id === debugContingentId)
      if (debugContestants.length > 0) {
        console.log(`\n[DEBUG] Batched certificate fetch for contingentId=${debugContingentId}`)
        console.log(`  Contestants: ${debugContestants.length}`)
        console.log(`  School cert rows: ${schoolCertificates.length}`)
        console.log(`  Zone/National cert rows: ${zoneNationalCertificates.length}`)
        console.log(`  Quiz cert rows: ${quizCertificates.length}`)
      }
    }

    const contestantsWithCerts = contestants.map((contestant) => {
      const classDisplay = contestant.class_name 
        ? `${contestant.class_grade || ''} ${contestant.class_name}`.trim()
        : contestant.class_grade || '-'

      const schoolCert = contestant.ic ? schoolCertByIcRaw.get((contestant.ic || '').trim()) || null : null

      return {
        id: contestant.id,
        contestantId: contestant.id,
        name: contestant.name?.trim() || '',
        ic: contestant.ic?.trim() || '',
        class: classDisplay,
        team: contestant.teamMembers?.[0]?.team?.name?.trim() || null,
        teamId: contestant.teamMembers?.[0]?.team?.id || null,
        contingent: contestant.contingent?.name?.trim() || '',
        certificates: {
          school: schoolCert ? {
            id: schoolCert.id,
            templateName: schoolCert.template?.templateName || '',
            targetType: schoolCert.template?.targetType || '',
            filePath: schoolCert.filePath,
            uniqueCode: schoolCert.uniqueCode.replace(/[\r\n]/g, '').trim()
          } : null,
          state: stateByContestantId.get(contestant.id) || [],
          online: onlineByContestantId.get(contestant.id) || [],
          national: nationalByContestantId.get(contestant.id) || [],
          quiz: quizByContestantId.get(contestant.id) || []
        }
      }
    })

    return NextResponse.json({ contestants: contestantsWithCerts })
  } catch (error) {
    console.error('Error fetching contestants with certificates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contestants' },
      { status: 500 }
    )
  }
}
