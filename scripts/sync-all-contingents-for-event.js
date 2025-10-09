// This script helps sync all contingents for a specific event to ensure all approved teams are in the attendance records
// Usage: node sync-all-contingents-for-event.js <eventId>

const fetch = require('node-fetch');

const EVENT_ID = process.argv[2];
if (!EVENT_ID) {
  console.error('Please provide an event ID as an argument');
  console.error('Usage: node sync-all-contingents-for-event.js <eventId>');
  process.exit(1);
}

async function syncAllContingentsForEvent() {
  try {
    console.log(`Fetching contingents for event ${EVENT_ID}...`);
    
    // 1. Get all contingents that need syncing
    const endlistContingentsResponse = await fetch(`http://localhost:3001/api/organizer/events/${EVENT_ID}/attendance/endlist-contingents`);
    if (!endlistContingentsResponse.ok) {
      throw new Error(`Failed to fetch contingents: ${endlistContingentsResponse.status} ${endlistContingentsResponse.statusText}`);
    }
    
    const { contingents } = await endlistContingentsResponse.json();
    const allContingents = contingents || [];
    
    console.log(`Found ${allContingents.length} total contingents`);
    const needingSyncContingents = allContingents.filter(c => c.needsSync);
    console.log(`${needingSyncContingents.length} contingents need syncing`);
    
    if (needingSyncContingents.length === 0) {
      console.log('All contingents are already fully synced!');
      return;
    }
    
    // 2. Sync each contingent that needs syncing
    for (let i = 0; i < needingSyncContingents.length; i++) {
      const contingent = needingSyncContingents[i];
      console.log(`[${i+1}/${needingSyncContingents.length}] Syncing contingent: ${contingent.name} (ID: ${contingent.id})`);
      
      try {
        const syncResponse = await fetch(`http://localhost:3001/api/organizer/events/${EVENT_ID}/attendance/sync-contingent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contingentId: contingent.id }),
        });
        
        if (!syncResponse.ok) {
          throw new Error(`Failed to sync: ${syncResponse.status} ${syncResponse.statusText}`);
        }
        
        const syncResult = await syncResponse.json();
        console.log(`  ✓ Successfully synced: ${syncResult.syncResults?.newTeams || 0} new teams, ${syncResult.syncResults?.updatedTeams || 0} updated teams`);
      } catch (syncError) {
        console.error(`  ✗ Failed to sync contingent ${contingent.name} (ID: ${contingent.id}):`, syncError);
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 3. Verify final sync status
    const finalStatusResponse = await fetch(`http://localhost:3001/api/organizer/events/${EVENT_ID}/attendance/endlist-contingents`);
    const { contingents: updatedContingents } = await finalStatusResponse.json();
    const stillNeedingSyncContingents = updatedContingents.filter(c => c.needsSync);
    
    console.log('\n===== SYNC SUMMARY =====');
    console.log(`Contingents needing sync before: ${needingSyncContingents.length}`);
    console.log(`Contingents needing sync after: ${stillNeedingSyncContingents.length}`);
    console.log(`Contingents successfully synced: ${needingSyncContingents.length - stillNeedingSyncContingents.length}`);
    
    if (stillNeedingSyncContingents.length > 0) {
      console.log('\nThe following contingents still need syncing:');
      stillNeedingSyncContingents.forEach(c => {
        console.log(`- ${c.name} (ID: ${c.id}): ${c.syncedTeamCount}/${c.teamCount} teams synced`);
      });
    } else {
      console.log('\nSuccess! All contingents are now fully synced.');
    }
  } catch (error) {
    console.error('Error during sync process:', error);
  }
}

// Run the sync function
syncAllContingentsForEvent();
