// Script to get teams from database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getTeams() {
  try {
    const teams = await prisma.team.findMany({
      where: {
        team_email: {
          not: null
        },
        contestId: {
          not: undefined
        }
      },
      include: {
        contest: true
      },
      take: 5
    });
    
    console.log('Teams found:', teams.length);
    
    teams.forEach(team => {
      console.log(`ID: ${team.id}, Name: ${team.name}, Email: ${team.team_email}, ContestId: ${team.contestId}, ContestCode: ${team.contest?.code}`);
    });
    
    return teams;
  } catch (error) {
    console.error('Error retrieving teams:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
getTeams();
