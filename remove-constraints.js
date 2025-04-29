const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dropConstraints() {
  try {
    // Execute raw SQL to drop the foreign key constraints
    console.log('Attempting to drop foreign key constraints...');
    
    // Try dropping the first constraint
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`question_bank\` DROP FOREIGN KEY \`question_bank_target_group_fkey\``);
      console.log('Successfully dropped question_bank constraint');
    } catch (error) {
      console.log('Error dropping question_bank constraint (might not exist):', error.message);
    }
    
    // Try dropping the second constraint
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`quiz\` DROP FOREIGN KEY \`quiz_target_group_fkey\``);
      console.log('Successfully dropped quiz constraint');
    } catch (error) {
      console.log('Error dropping quiz constraint (might not exist):', error.message);
    }
    
    console.log('Completed constraint removal process');
  } catch (error) {
    console.error('Error in dropConstraints function:', error);
  } finally {
    await prisma.$disconnect();
  }
}

dropConstraints();
