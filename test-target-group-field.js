// Test script for directly accessing target group data
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Create a target group with contestant_class_grade
    console.log('Creating test target group...');
    const testCode = `TG-TEST-${Date.now()}`;
    
    // First create without directly specifying the field to avoid any TypeScript issues
    const targetGroup = await prisma.targetgroup.create({
      data: {
        code: testCode,
        name: 'Test Grade Field Group',
        ageGroup: 'Test Age Group',
        schoolLevel: 'PRIMARY',
        minAge: 7,
        maxAge: 12,
      },
    });
    
    console.log('Target group created:', targetGroup);
    console.log('Has contestant_class_grade?', 'contestant_class_grade' in targetGroup);
    
    // 2. Update with raw query to add contestant_class_grade
    console.log('\nUpdating with contestant_class_grade using raw SQL...');
    await prisma.$executeRaw`
      UPDATE targetgroup 
      SET contestant_class_grade = '4' 
      WHERE id = ${targetGroup.id}
    `;
    
    // 3. Retrieve and check if field exists
    console.log('\nRetrieving updated target group...');
    const updated = await prisma.targetgroup.findUnique({
      where: { id: targetGroup.id }
    });
    
    console.log('Updated target group:', updated);
    console.log('Has contestant_class_grade?', 'contestant_class_grade' in updated);
    
    // 4. Try direct creation with the field
    console.log('\nTrying direct creation with contestant_class_grade...');
    try {
      const directCode = `TG-DIRECT-${Date.now()}`;
      // @ts-ignore - TypeScript might complain but we want to try anyway
      const directGroup = await prisma.targetgroup.create({
        data: {
          code: directCode,
          name: 'Direct Field Group',
          ageGroup: 'Test Age Group',
          schoolLevel: 'PRIMARY',
          minAge: 7,
          maxAge: 12,
          contestant_class_grade: '5',
        },
      });
      console.log('Direct creation succeeded:', directGroup);
      console.log('Has contestant_class_grade?', 'contestant_class_grade' in directGroup);
    } catch (err) {
      console.error('Direct creation failed:', err.message);
    }
    
    // 5. Try raw query to see all columns in the table
    console.log('\nChecking table structure with raw query...');
    const columnInfo = await prisma.$queryRaw`SHOW COLUMNS FROM targetgroup`;
    console.log('Table columns:', columnInfo);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
