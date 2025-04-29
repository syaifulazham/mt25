const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabaseStructure() {
  try {
    console.log('Checking database structure...');
    
    // Query information_schema to get foreign key constraints
    const constraints = await prisma.$queryRaw`
      SELECT 
        TABLE_NAME as tableName, 
        COLUMN_NAME as columnName,
        CONSTRAINT_NAME as constraintName,
        REFERENCED_TABLE_NAME as referencedTableName,
        REFERENCED_COLUMN_NAME as referencedColumnName
      FROM
        information_schema.KEY_COLUMN_USAGE
      WHERE
        TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND (TABLE_NAME = 'question_bank' OR TABLE_NAME = 'quiz')
    `;
    
    console.log('Foreign Key Constraints:');
    console.log(JSON.stringify(constraints, null, 2));
    
    // Check targetgroup table structure
    const targetgroupInfo = await prisma.$queryRaw`
      DESCRIBE targetgroup
    `;
    
    console.log('\nTargetgroup Table Structure:');
    console.log(JSON.stringify(targetgroupInfo, null, 2));
    
    // Check target_group table structure (if it exists)
    try {
      const targetGroupInfo = await prisma.$queryRaw`
        DESCRIBE target_group
      `;
      
      console.log('\nTarget_group Table Structure:');
      console.log(JSON.stringify(targetGroupInfo, null, 2));
    } catch (error) {
      console.log('\nTarget_group table does not exist or error:', error.message);
    }
    
    // Get sample data from question_bank
    const sampleQuestions = await prisma.question_bank.findMany({
      take: 3,
      select: {
        id: true,
        target_group: true,
        knowledge_field: true
      }
    });
    
    console.log('\nSample Questions:');
    console.log(JSON.stringify(sampleQuestions, null, 2));
    
  } catch (error) {
    console.error('Error checking database structure:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStructure();
