const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPendingTeams() {
  try {
    const eventId = 16;
    console.log(`\n=== Checking Eligible Teams for Event ID: ${eventId} ===\n`);
    
    // First, get all PENDING teams for this event
    const pendingTeams = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.name as teamName,
        t.team_email as teamEmail,
        ct.name as contestName,
        COUNT(tm.contestantId) as memberCount
      FROM eventcontestteam ect
      JOIN eventcontest ec ON ect.eventcontestId = ec.id
      JOIN team t ON ect.teamId = t.id
      JOIN contest ct ON ec.contestId = ct.id
      LEFT JOIN teamMember tm ON t.id = tm.teamId
      WHERE ec.eventId = ${eventId} AND ect.status = 'PENDING'
      GROUP BY t.id, t.name, t.team_email, ct.name
    `;
    
    console.log(`Found ${pendingTeams.length} teams with PENDING status\n`);
    
    if (pendingTeams.length === 0) {
      console.log('No PENDING teams found for this event. This explains why "No eligible pending teams to approve" is shown.');
      return;
    }
    
    // Check each team for all eligibility criteria
    console.log('Checking eligibility criteria for each team:');
    let eligibleTeams = 0;
    
    for (const team of pendingTeams) {
      console.log(`\n=== Team: ${team.teamName} (ID: ${team.id}) ===`);
      console.log(`Contest: ${team.contestName}`);
      console.log(`Email: ${team.teamEmail || 'None'}`);
      console.log(`Member Count: ${team.memberCount}`);
      
      // Check 1: Valid Email
      const isValidEmail = team.teamEmail && team.teamEmail.includes('@') && team.teamEmail.includes('.');
      console.log(`✓ Valid Email: ${isValidEmail ? 'Yes' : 'No'}`);
      
      // Check 2: Has members
      const hasMembers = team.memberCount > 0;
      console.log(`✓ Has Members: ${hasMembers ? 'Yes' : 'No'}`);
      
      // Check 3: Check for duplicate members
      const duplicateMembersCheck = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM teamMember tm1 
        JOIN teamMember tm2 ON tm1.contestantId = tm2.contestantId AND tm1.teamId != tm2.teamId 
        WHERE tm1.teamId = ${team.id}
      `;
      const hasDuplicates = Number(duplicateMembersCheck[0].count) > 0;
      console.log(`✓ No Duplicate Members: ${!hasDuplicates ? 'Yes' : 'No'}`);
      
      // Check 4: Check for age mismatches
      const ageMismatchCheck = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM teamMember tm 
        JOIN contestant c ON tm.contestantId = c.id 
        JOIN eventcontestteam ect ON tm.teamId = ect.teamId 
        JOIN eventcontest ec ON ect.eventcontestId = ec.id 
        JOIN contest ct ON ec.contestId = ct.id 
        JOIN _contesttotargetgroup ctg ON ctg.A = ct.id 
        JOIN targetgroup tg ON tg.id = ctg.B 
        WHERE tm.teamId = ${team.id} 
        AND (c.age < tg.minAge OR c.age > tg.maxAge)
      `;
      const hasAgeMismatch = Number(ageMismatchCheck[0].count) > 0;
      console.log(`✓ No Age Mismatches: ${!hasAgeMismatch ? 'Yes' : 'No'}`);
      
      // Final eligibility
      const isEligible = isValidEmail && hasMembers && !hasDuplicates && !hasAgeMismatch;
      console.log(`\n► OVERALL ELIGIBLE: ${isEligible ? 'YES' : 'NO'}`);
      if (!isEligible) {
        console.log('  Reason(s):');
        if (!isValidEmail) console.log('  - Missing or invalid email address');
        if (!hasMembers) console.log('  - Team has no members');
        if (hasDuplicates) console.log('  - Team has members that belong to multiple teams');
        if (hasAgeMismatch) console.log('  - Team has members with age mismatches');
      } else {
        eligibleTeams++;
      }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Total PENDING teams: ${pendingTeams.length}`);
    console.log(`Eligible for approval: ${eligibleTeams}`);
    if (eligibleTeams === 0) {
      console.log(`\nThis explains why "No eligible pending teams to approve" is shown in the UI.`);
    }

  } catch (error) {
    console.error('Error checking pending teams:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingTeams();
