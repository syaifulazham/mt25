import prisma from "@/lib/prisma";

// Function to test the selection of contestant fields
async function testContestantSelection() {
  try {
    // Get a team with all of its members and their contestant details
    const team = await prisma.team.findFirst({
      include: {
        members: {
          include: {
            contestant: {
              select: {
                id: true,
                name: true,
                ic: true,
                gender: true,
                age: true,
                edu_level: true,
                class_grade: true,  // Make sure we're selecting these fields
                class_name: true,   // Make sure we're selecting these fields
                email: true,
                phoneNumber: true,
                status: true
              }
            }
          }
        }
      }
    });
    
    if (!team) {
      console.log("No team found");
      return;
    }
    
    // Log team details
    console.log(`Team: ${team.name} (ID: ${team.id})`);
    console.log(`Members count: ${team.members.length}`);
    
    // Log each member with their contestant details
    team.members.forEach((member, index) => {
      console.log(`\nMember ${index + 1}:`);
      console.log(`ID: ${member.id}`);
      console.log(`Contestant ID: ${member.contestantId}`);
      console.log(`Contestant Name: ${member.contestant.name}`);
      console.log(`IC: ${member.contestant.ic}`);
      console.log(`Education Level: ${member.contestant.edu_level}`);
      console.log(`Class Grade: ${member.contestant.class_grade}`);
      console.log(`Class Name: ${member.contestant.class_name}`);
    });
    
  } catch (error) {
    console.error("Error testing contestant selection:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test when the file is executed
testContestantSelection()
  .then(() => console.log("Test completed"))
  .catch(e => console.error("Test failed:", e));
