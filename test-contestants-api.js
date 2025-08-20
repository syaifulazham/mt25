const { PrismaClient } = require('@prisma/client');

// Enable query logging
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'info', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// Log all queries
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});

async function testContestantsQuery() {
  // Test with these IDs - we'll try a few combinations
  const testCases = [
    { eventId: 1, contingentId: 1 },
    { eventId: 2, contingentId: 1 },
    { eventId: 1, contingentId: 2 },
    { eventId: 3, contingentId: 3 }
  ];
  
  // First check if we have any attendanceContestant records at all
  const totalCount = await prisma.attendanceContestant.count();
  console.log(`Total attendanceContestant records in database: ${totalCount}`);
  
  for (const testCase of testCases) {
    const eventId = testCase.eventId;
    const contingentId = testCase.contingentId;
  
  console.log('='.repeat(50));
  console.log(`TESTING CONTESTANTS API QUERY`);
  console.log(`Event ID: ${eventId}, Contingent ID: ${contingentId}`);
  console.log('='.repeat(50));
  
  try {
    // First, verify that we have attendanceContestant records for this event
    const attendanceContestantCount = await prisma.attendanceContestant.count({
      where: {
        eventId: eventId
      }
    });
    
    console.log(`Found ${attendanceContestantCount} total attendanceContestant records for event ${eventId}`);
    
    // Then run our fixed query
    console.log("\nExecuting main query...");
    
    const contestants = await prisma.$queryRaw`
      SELECT 
        ac.id as attendanceContestantId,
        ac.contestantId,
        ac.state as attendanceState,
        c.name as contestantName,
        c.ic as contestantIc,
        c.gender as contestantGender,
        c.age as contestantAge,
        t.id as teamId,
        t.name as teamName,
        ec.contestId,
        contest.name as contestName
      FROM attendanceContestant ac
      LEFT JOIN contestant c ON ac.contestantId = c.id
      LEFT JOIN team t ON ac.teamId = t.id
      LEFT JOIN eventcontestteam ect ON t.id = ect.teamId
      LEFT JOIN eventcontest ec ON ect.eventcontestId = ec.id
      LEFT JOIN contest ON ec.contestId = contest.id
      WHERE ac.eventId = ${eventId}
      AND (t.contingentId = ${contingentId} OR ac.contingentId = ${contingentId})
      ORDER BY c.name ASC
    `;
    
    console.log('\n✅ Query executed successfully without errors!');
    console.log(`Found ${contestants.length} contestants matching the criteria`);
    
    if (contestants.length > 0) {
      console.log('\nExample contestant:');
      console.log(JSON.stringify(contestants[0], null, 2));
      
      // Count how many have team info vs how many don't
      const withTeam = contestants.filter(c => c.teamId !== null).length;
      const withoutTeam = contestants.length - withTeam;
      
      console.log(`\nContestants with team info: ${withTeam}`);
      console.log(`Contestants without team info: ${withoutTeam}`);
    } else {
      console.log('\n⚠️ No contestants found matching the criteria');
      
      // Check if we have attendanceContestant records specifically for this contingent
      const contingentAttendanceCount = await prisma.attendanceContestant.count({
        where: {
          eventId: eventId,
          contingentId: contingentId
        }
      });
      
      console.log(`Found ${contingentAttendanceCount} attendanceContestant records for contingent ${contingentId}`);
    }
  } catch (error) {
    console.error('\n❌ ERROR executing query:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Don't disconnect after each test case
  }
  } // End of the for loop
  
  // Disconnect only once at the end
  await prisma.$disconnect();
  console.log('\nDatabase disconnected');
}

testContestantsQuery()
  .catch(e => {
    console.error('Unhandled error:', e);
    process.exit(1);
  });

