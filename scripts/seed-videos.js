// This script adds sample videos to the database
// Run with: node scripts/seed-videos.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding video data...');

  // Sample videos
  const videos = [
    {
      group_name: 'Tutorials',
      title: 'How to Register for Techlympics 2025',
      video_description: 'A step-by-step guide on how to register your school and contestants for the competition.',
      video_link: '1Jio-7q2eSs', // Replace with actual Google Drive file ID
      isActive: true
    },
    {
      group_name: 'Tutorials',
      title: 'Creating Your First Submission',
      video_description: 'Learn how to create and submit your project for evaluation.',
      video_link: '2xkNJL4gJ9E', // Replace with actual Google Drive file ID
      isActive: true
    },
    {
      group_name: 'Inspirational',
      title: 'Techlympics 2024 Highlights',
      video_description: 'See the best moments from last year\'s competition.',
      video_link: 'dQw4w9WgXcQ', // Replace with actual Google Drive file ID
      isActive: true
    },
    {
      group_name: 'Rules',
      title: 'Competition Rules Explained',
      video_description: 'Detailed explanation of the rules and judging criteria.',
      video_link: 'M7lc1UVf-VE', // Replace with actual Google Drive file ID
      isActive: true
    },
    {
      group_name: 'Rules',
      title: 'Code of Conduct',
      video_description: 'Important guidelines for all participants.',
      video_link: 'rfscVS0vtbw', // Replace with actual Google Drive file ID
      isActive: true
    }
  ];

  // Insert videos into the database
  for (const video of videos) {
    await prisma.video.upsert({
      where: {
        // Since there's no unique constraint other than ID, we'll use a combination of fields
        // This is just for the seed script to avoid duplicates
        id: await getVideoIdByTitle(video.title) || -1
      },
      update: video,
      create: video
    });
  }

  console.log('Video seeding completed!');
}

// Helper function to find a video ID by title
async function getVideoIdByTitle(title) {
  const video = await prisma.video.findFirst({
    where: { title }
  });
  return video?.id;
}

main()
  .catch((e) => {
    console.error('Error seeding videos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
