import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

async function createAttendanceEndpointTable() {
  try {
    // SQL to create the table if it doesn't exist
    const sql = `
      CREATE TABLE IF NOT EXISTS \`attendance_endpoint\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`eventId\` INT NOT NULL,
        \`endpointhash\` VARCHAR(191) NOT NULL,
        \`passcode\` VARCHAR(191) NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`attendance_endpoint_endpointhash_key\` (\`endpointhash\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `;

    // Execute the SQL query
    await prisma.$executeRawUnsafe(sql);
    console.log('✅ attendance_endpoint table created successfully');
  } catch (error) {
    console.error('❌ Error creating attendance_endpoint table:', error);
  } finally {
    // Close the Prisma client connection
    await prisma.$disconnect();
  }
}

// Run the function
createAttendanceEndpointTable();
