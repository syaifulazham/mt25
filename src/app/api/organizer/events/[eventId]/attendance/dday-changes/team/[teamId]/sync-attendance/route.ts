import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; teamId: string } }
) {
  try {
    console.log('Sync attendance API called with params:', params);
    
    // Check authentication
    const session = await getServerSession(authOptions);
    console.log('Session:', session?.user?.role);
    
    if (!session?.user || !['ADMIN', 'OPERATOR'].includes(session.user.role)) {
      console.log('Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!params?.eventId || !params?.teamId) {
      console.log('Missing parameters');
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { eventId, teamId } = params;
    console.log('Processing sync for eventId:', eventId, 'teamId:', teamId);

    // Get current endlist members for this team (using same query as endlist API)
    const endlistQuery = `
      SELECT 
        con.id,
        con.name,
        con.ic,
        con.age,
        CASE 
          WHEN con.class_grade IS NOT NULL AND con.class_grade != '' 
          THEN CONCAT('Grade ', con.class_grade)
          ELSE 'N/A'
        END as classGrade,
        cont.id as contingentId,
        s.zoneId,
        CASE 
          WHEN cont.contingentType = 'SCHOOL' THEN sch.stateId
          WHEN cont.contingentType = 'INDEPENDENT' THEN ind.stateId
          ELSE NULL
        END as stateId,
        s.name as state,
        c.id as contestId,
        c.name as contestName,
        CASE 
          WHEN tg.schoolLevel = 'Primary' THEN 'Kids'
          WHEN tg.schoolLevel = 'Secondary' THEN 'Teens'
          WHEN tg.schoolLevel = 'Higher Education' THEN 'Youth'
          ELSE 'General'
        END as contestGroup
      FROM teamMember tm
      JOIN contestant con ON tm.contestantId = con.id
      JOIN contingent cont ON con.contingentId = cont.id
      LEFT JOIN school sch ON cont.schoolId = sch.id AND cont.contingentType = 'SCHOOL'
      LEFT JOIN independent ind ON cont.independentId = ind.id AND cont.contingentType = 'INDEPENDENT'
      LEFT JOIN state s ON s.id = CASE 
        WHEN cont.contingentType = 'SCHOOL' THEN sch.stateId
        WHEN cont.contingentType = 'INDEPENDENT' THEN ind.stateId
        ELSE NULL
      END
      JOIN team t ON tm.teamId = t.id
      JOIN contest c ON t.contestId = c.id
      LEFT JOIN _contesttotargetgroup ctg ON ctg.A = c.id
      LEFT JOIN targetgroup tg ON tg.id = ctg.B
      JOIN eventcontest ec ON ec.contestId = c.id AND ec.eventId = ?
      WHERE tm.teamId = ?
      ORDER BY con.name ASC
    `;

    console.log('Executing endlist query...');
    const endlistMembers = await prisma.$queryRawUnsafe(endlistQuery, 
      parseInt(eventId),
      parseInt(teamId)
    ) as any[];
    console.log('Endlist members found:', endlistMembers.length);

    // Get current attendance records for this team
    const attendanceQuery = `
      SELECT 
        ac.id,
        ac.contestantId,
        con.ic,
        con.name
      FROM attendanceContestant ac
      JOIN contestant con ON ac.contestantId = con.id
      WHERE ac.teamId = ? AND ac.eventId = ?
    `;

    console.log('Executing attendance query...');
    const currentAttendance = await prisma.$queryRawUnsafe(attendanceQuery,
      parseInt(teamId),
      parseInt(eventId)
    ) as any[];
    console.log('Current attendance records found:', currentAttendance.length);

    // Create sets for comparison
    const endlistICs = new Set(endlistMembers.map(m => m.ic));
    const attendanceICs = new Set(currentAttendance.map(a => a.ic));

    console.log('=== SYNC COMPARISON DETAILS ===');
    console.log('Endlist ICs:', Array.from(endlistICs));
    console.log('Attendance ICs:', Array.from(attendanceICs));

    let syncResults = {
      removed: 0,
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: [] as string[]
    };

    // 1. Remove attendance records for contestants not in endlist
    const toRemove = currentAttendance.filter(a => !endlistICs.has(a.ic));
    console.log(`Records to REMOVE: ${toRemove.length}`);
    toRemove.forEach(record => {
      console.log(`  - REMOVE: ${record.name} (IC: ${record.ic})`);
    });
    for (const attendanceRecord of toRemove) {
      try {
        await prisma.$queryRawUnsafe(
          'DELETE FROM attendanceContestant WHERE id = ?',
          attendanceRecord.id
        );
        syncResults.removed++;
        console.log(`Removed attendance record for ${attendanceRecord.name} (IC: ${attendanceRecord.ic})`);
      } catch (error) {
        console.error(`Error removing attendance record for ${attendanceRecord.name}:`, error);
        syncResults.errors.push(`Failed to remove ${attendanceRecord.name}`);
      }
    }

    // 2. Update existing attendance records with latest endlist information
    const toUpdate = endlistMembers.filter(m => attendanceICs.has(m.ic));
    console.log(`Records to UPDATE: ${toUpdate.length}`);
    toUpdate.forEach(member => {
      console.log(`  - UPDATE: ${member.name} (IC: ${member.ic})`);
    });
    for (const member of toUpdate) {
      try {
        // Find the existing attendance record for this IC
        const existingRecord = currentAttendance.find(a => a.ic === member.ic);
        if (existingRecord) {
          // Update the existing record with latest endlist information
          await prisma.$queryRawUnsafe(`
            UPDATE attendanceContestant 
            SET participantId = ?, contestantId = ?, teamId = ?, eventId = ?, contingentId = ?, ic = ?, zoneId = ?, stateId = ?, state = ?, contestGroup = ?, contestId = ?, contestName = ?, attendanceDate = NOW(), attendanceTime = NOW()
            WHERE id = ?
          `, member.id, member.id, parseInt(teamId), parseInt(eventId), member.contingentId, member.ic, member.zoneId, member.stateId, member.state, member.contestGroup, member.contestId, member.contestName, existingRecord.id);
          syncResults.updated++;
          console.log(`Updated attendance record for ${member.name} (IC: ${member.ic})`);
        }
      } catch (error) {
        console.error(`Error updating attendance record for ${member.name}:`, error);
        syncResults.errors.push(`Failed to update ${member.name}`);
      }
    }

    // 3. Add attendance records for endlist members not in attendance
    const toAdd = endlistMembers.filter(m => !attendanceICs.has(m.ic));
    console.log(`Records to ADD: ${toAdd.length}`);
    toAdd.forEach(member => {
      console.log(`  - ADD: ${member.name} (IC: ${member.ic})`);
    });
    for (const member of toAdd) {
      try {
        // Create hashcode using IC, eventId, and contingentId
        const hashInput = `${member.ic}-${eventId}-${member.contingentId}`;
        const hashcode = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);

        // Check if hashcode already exists (collision handling)
        const existingHashcode = await prisma.$queryRawUnsafe(
          'SELECT id FROM attendanceContestant WHERE hashcode = ?',
          hashcode
        ) as any[];

        if (existingHashcode.length > 0) {
          // Update existing record with same hashcode
          await prisma.$queryRawUnsafe(`
            UPDATE attendanceContestant 
            SET participantId = ?, contestantId = ?, teamId = ?, eventId = ?, contingentId = ?, ic = ?, zoneId = ?, stateId = ?, state = ?, contestGroup = ?, contestId = ?, contestName = ?, attendanceDate = NOW(), attendanceTime = NOW()
            WHERE hashcode = ?
          `, member.id, member.id, parseInt(teamId), parseInt(eventId), member.contingentId, member.ic, member.zoneId, member.stateId, member.state, member.contestGroup, member.contestId, member.contestName, hashcode);
          syncResults.added++;
          console.log(`Updated existing attendance record for ${member.name} (IC: ${member.ic})`);
        } else {
          // Create new attendance record
          await prisma.$queryRawUnsafe(`
            INSERT INTO attendanceContestant 
            (participantId, contestantId, teamId, eventId, contingentId, hashcode, ic, zoneId, stateId, state, contestGroup, contestId, contestName, attendanceStatus, attendanceDate, attendanceTime, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Not Present', NOW(), NOW(), NOW(), NOW())
          `, member.id, member.id, parseInt(teamId), parseInt(eventId), member.contingentId, hashcode, member.ic, member.zoneId, member.stateId, member.state, member.contestGroup, member.contestId, member.contestName);
          syncResults.added++;
          console.log(`Added attendance record for ${member.name} (IC: ${member.ic})`);
        }
      } catch (error) {
        console.error(`Error adding attendance record for ${member.name}:`, error);
        syncResults.errors.push(`Failed to add ${member.name}`);
      }
    }

    // Count unchanged records
    syncResults.unchanged = endlistMembers.length - syncResults.added - syncResults.updated;

    console.log(`Sync completed for team ${teamId}:`, syncResults);

    return NextResponse.json({
      success: true,
      results: syncResults,
      message: `Sync completed: ${syncResults.added} added, ${syncResults.updated} updated, ${syncResults.removed} removed, ${syncResults.unchanged} unchanged`
    });

  } catch (error) {
    console.error('Error syncing attendance:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    
    return NextResponse.json(
      { 
        error: 'Failed to sync attendance records',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
