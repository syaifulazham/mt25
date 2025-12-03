#!/usr/bin/env node

/**
 * Certificate Files Cleanup Script
 * 
 * This script helps clean up physical certificate PDF files from the server
 * after migrating to on-demand certificate generation system.
 * 
 * Usage:
 *   node scripts/cleanup-certificate-files.js --dry-run    # Preview what will be deleted
 *   node scripts/cleanup-certificate-files.js --execute    # Actually delete files
 *   node scripts/cleanup-certificate-files.js --backup     # Create backup before deletion
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const CERTIFICATE_DIR = path.join(process.cwd(), 'public', 'uploads', 'certificates');
const BACKUP_DIR = path.join(process.cwd(), 'backups');

async function getDirectorySize(dirPath) {
  try {
    const { stdout } = await execAsync(`du -sh "${dirPath}"`);
    return stdout.split('\t')[0];
  } catch (error) {
    return 'Unknown';
  }
}

async function countFiles(dirPath) {
  try {
    const files = await fs.promises.readdir(dirPath);
    return files.filter(f => f.endsWith('.pdf')).length;
  } catch (error) {
    return 0;
  }
}

async function listFiles(dirPath) {
  try {
    const files = await fs.promises.readdir(dirPath);
    return files.filter(f => f.endsWith('.pdf'));
  } catch (error) {
    return [];
  }
}

async function createBackup() {
  console.log('📦 Creating backup...');
  
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `certificate-files-${timestamp}.tar.gz`);

    console.log(`   Compressing to: ${backupFile}`);

    await execAsync(`tar -czf "${backupFile}" -C "${path.dirname(CERTIFICATE_DIR)}" "${path.basename(CERTIFICATE_DIR)}"`);

    const backupSize = await getDirectorySize(backupFile);
    console.log(`   ✅ Backup created: ${backupSize}`);
    console.log(`   📍 Location: ${backupFile}\n`);

    return backupFile;
  } catch (error) {
    console.error('   ❌ Backup failed:', error.message);
    throw error;
  }
}

async function deleteFiles(files) {
  console.log('🗑️  Deleting files...');
  
  let deleted = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(CERTIFICATE_DIR, file);
    try {
      await fs.promises.unlink(filePath);
      deleted++;
      if (deleted % 100 === 0) {
        console.log(`   Deleted ${deleted}/${files.length} files...`);
      }
    } catch (error) {
      failed++;
      console.error(`   ❌ Failed to delete ${file}:`, error.message);
    }
  }

  console.log(`   ✅ Deleted: ${deleted} files`);
  if (failed > 0) {
    console.log(`   ⚠️  Failed: ${failed} files`);
  }
  console.log();
}

async function dryRun() {
  console.log('🔍 DRY RUN MODE - No files will be deleted\n');
  console.log('═══════════════════════════════════════════════════\n');

  if (!fs.existsSync(CERTIFICATE_DIR)) {
    console.log('❌ Certificate directory not found:', CERTIFICATE_DIR);
    return;
  }

  const totalSize = await getDirectorySize(CERTIFICATE_DIR);
  const fileCount = await countFiles(CERTIFICATE_DIR);
  const files = await listFiles(CERTIFICATE_DIR);

  console.log('📊 Certificate Files Summary\n');
  console.log(`   Directory: ${CERTIFICATE_DIR}`);
  console.log(`   Total size: ${totalSize}`);
  console.log(`   Total files: ${fileCount} PDF files\n`);

  if (fileCount > 0) {
    console.log('📄 Sample files (first 10):\n');
    files.slice(0, 10).forEach((file, i) => {
      console.log(`   ${i + 1}. ${file}`);
    });
    if (fileCount > 10) {
      console.log(`   ... and ${fileCount - 10} more files\n`);
    }

    console.log('\n💡 To proceed with deletion:');
    console.log('   node scripts/cleanup-certificate-files.js --backup    # Create backup first');
    console.log('   node scripts/cleanup-certificate-files.js --execute   # Delete files');
  } else {
    console.log('✨ No PDF files found. Directory is clean!\n');
  }

  console.log('═══════════════════════════════════════════════════\n');
}

async function execute() {
  console.log('⚠️  EXECUTE MODE - Files will be permanently deleted!\n');
  console.log('═══════════════════════════════════════════════════\n');

  if (!fs.existsSync(CERTIFICATE_DIR)) {
    console.log('❌ Certificate directory not found:', CERTIFICATE_DIR);
    return;
  }

  const totalSize = await getDirectorySize(CERTIFICATE_DIR);
  const fileCount = await countFiles(CERTIFICATE_DIR);
  const files = await listFiles(CERTIFICATE_DIR);

  console.log('📊 Files to be deleted:\n');
  console.log(`   Directory: ${CERTIFICATE_DIR}`);
  console.log(`   Total size: ${totalSize}`);
  console.log(`   Total files: ${fileCount} PDF files\n`);

  if (fileCount === 0) {
    console.log('✨ No PDF files found. Nothing to delete!\n');
    return;
  }

  // Confirmation prompt (would need readline in real implementation)
  console.log('⚠️  WARNING: This action cannot be undone!');
  console.log('   Press Ctrl+C to cancel within 5 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  await deleteFiles(files);

  const remainingFiles = await countFiles(CERTIFICATE_DIR);
  console.log(`✅ Cleanup complete!`);
  console.log(`   Remaining files: ${remainingFiles}\n`);

  console.log('═══════════════════════════════════════════════════\n');
}

async function backupAndDelete() {
  console.log('💾 BACKUP & DELETE MODE\n');
  console.log('═══════════════════════════════════════════════════\n');

  if (!fs.existsSync(CERTIFICATE_DIR)) {
    console.log('❌ Certificate directory not found:', CERTIFICATE_DIR);
    return;
  }

  const totalSize = await getDirectorySize(CERTIFICATE_DIR);
  const fileCount = await countFiles(CERTIFICATE_DIR);

  console.log('📊 Certificate Files:\n');
  console.log(`   Directory: ${CERTIFICATE_DIR}`);
  console.log(`   Total size: ${totalSize}`);
  console.log(`   Total files: ${fileCount} PDF files\n`);

  if (fileCount === 0) {
    console.log('✨ No PDF files found. Nothing to backup or delete!\n');
    return;
  }

  // Create backup first
  const backupFile = await createBackup();

  // Then delete files
  const files = await listFiles(CERTIFICATE_DIR);
  await deleteFiles(files);

  const remainingFiles = await countFiles(CERTIFICATE_DIR);
  console.log(`✅ Backup and cleanup complete!`);
  console.log(`   Backup file: ${backupFile}`);
  console.log(`   Remaining files: ${remainingFiles}\n`);

  console.log('═══════════════════════════════════════════════════\n');
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];

  console.log('\n🧹 Certificate Files Cleanup Script\n');

  switch (mode) {
    case '--dry-run':
    case '-d':
      await dryRun();
      break;

    case '--execute':
    case '-e':
      await execute();
      break;

    case '--backup':
    case '-b':
      await backupAndDelete();
      break;

    default:
      console.log('Usage:');
      console.log('  node scripts/cleanup-certificate-files.js --dry-run    Preview files to delete');
      console.log('  node scripts/cleanup-certificate-files.js --backup     Create backup and delete');
      console.log('  node scripts/cleanup-certificate-files.js --execute    Delete files (no backup)\n');
      console.log('Recommended: Use --backup to safely create a backup before deletion\n');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
