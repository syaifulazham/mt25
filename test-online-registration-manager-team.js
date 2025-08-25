const fetch = require('node-fetch');

// Function to fetch online registration data for a participant
async function fetchOnlineRegistrationData(participantId) {
  try {
    // Use the non-authenticated test route
    const response = await fetch(`http://localhost:3000/api/participants/online-registration/test?participantId=${participantId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching online registration data:', error);
    throw error;
  }
}

// Execute the test
async function runTest() {
  try {
    // You can replace this with a valid participant ID from your database
    const participantId = 304; // Replace with a valid participant ID
    
    console.log(`Fetching online registration data for participant ${participantId}...`);
    const data = await fetchOnlineRegistrationData(participantId);
    
    console.log(`Total teams: ${data.totalCount}`);
    
    // Check each team for trainers
    data.teams.forEach((team, index) => {
      console.log(`\nTeam ${index + 1}: ${team.teamName} (ID: ${team.id})`);
      console.log(`Contest: ${team.contestName} (Code: ${team.contestCode})`);
      
      // Log trainer information
      console.log(`Trainers (${team.managerTeams.length}):`);
      if (team.managerTeams.length === 0) {
        console.log('  No trainers assigned to this team');
      } else {
        team.managerTeams.forEach((mt, i) => {
          console.log(`  Trainer ${i + 1}: ${mt.manager.name} (ID: ${mt.manager.id})`);
          console.log(`    Email: ${mt.manager.email || 'Not provided'}`);
          console.log(`    Phone: ${mt.manager.phoneNumber || 'Not provided'}`);
        });
      }
    });
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();
