import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Sample themes data
  const themes = [
    {
      name: 'Artificial Intelligence',
      color: '#3B82F6', // blue-500
      description: 'Competitions focused on AI, machine learning, and intelligent systems that can learn and adapt.',
      logoPath: '/images/themes/ai.png'
    },
    {
      name: 'Cybersecurity',
      color: '#10B981', // emerald-500
      description: 'Challenges related to digital security, ethical hacking, and protecting systems from threats.',
      logoPath: '/images/themes/cybersecurity.png'
    },
    {
      name: 'IoT & Robotics',
      color: '#F59E0B', // amber-500
      description: 'Competitions involving Internet of Things, robotics, and automated physical systems.',
      logoPath: '/images/themes/iot.png'
    },
    {
      name: 'Web Development',
      color: '#8B5CF6', // violet-500
      description: 'Challenges focused on creating innovative web applications and services.',
      logoPath: '/images/themes/web.png'
    }
  ];

  console.log('Adding sample themes...');
  
  // Create themes
  for (const theme of themes) {
    // Check if theme already exists
    const existingTheme = await prisma.theme.findUnique({
      where: { name: theme.name }
    });

    if (!existingTheme) {
      await prisma.theme.create({
        data: {
          ...theme,
          updatedAt: new Date() // Add required updatedAt field
        }
      });
      console.log(`Created theme: ${theme.name}`);
    } else {
      console.log(`Theme already exists: ${theme.name}`);
    }
  }

  console.log('Sample themes added successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
