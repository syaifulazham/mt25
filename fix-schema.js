const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSchema() {
  try {
    console.log('Starting schema fix...');
    
    // Get all target group records from both tables
    const targetgroups = await prisma.targetgroup.findMany();
    console.log(`Found ${targetgroups.length} records in targetgroup table`);
    
    // Try to get target_group records (might fail if using raw query only)
    try {
      const targetGroupsRaw = await prisma.$queryRaw`SELECT * FROM target_group`;
      console.log(`Found ${targetGroupsRaw.length} records in target_group table`);
    } catch (error) {
      console.log('Error querying target_group table:', error.message);
    }
    
    // Ensure target_group table data is copied to targetgroup if needed
    try {
      const result = await prisma.$executeRawUnsafe(`
        INSERT IGNORE INTO targetgroup (code, name, ageGroup, schoolLevel, maxAge, minAge)
        SELECT name, display_name, 'All', 'All', 0, 0
        FROM target_group
      `);
      console.log('Copied unique records from target_group to targetgroup table');
    } catch (error) {
      console.log('Error copying data (might be already done):', error.message);
    }
    
    // Prepare initial data to ensure targetgroup has proper target groups
    const initialData = [
      { code: 'PRIMARY', name: 'Primary School', ageGroup: '7-12', schoolLevel: 'Primary', maxAge: 12, minAge: 7 },
      { code: 'SECONDARY', name: 'Secondary School', ageGroup: '13-17', schoolLevel: 'Secondary', maxAge: 17, minAge: 13 },
      { code: 'HIGHER', name: 'Higher Education', ageGroup: '18+', schoolLevel: 'Higher', maxAge: 30, minAge: 18 }
    ];
    
    // Insert initial data ensuring it exists
    for (const data of initialData) {
      const existing = await prisma.targetgroup.findUnique({
        where: { code: data.code }
      });
      
      if (!existing) {
        await prisma.targetgroup.create({ data });
        console.log(`Created target group: ${data.code}`);
      } else {
        console.log(`Target group ${data.code} already exists`);
      }
    }
    
    console.log('Schema fix complete');
  } catch (error) {
    console.error('Error in fixSchema function:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSchema();
