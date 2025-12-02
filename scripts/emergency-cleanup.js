#!/usr/bin/env node

/**
 * Emergency Certificate Storage Cleanup Script
 * 
 * Safely deletes old certificate PDFs while preserving database records
 * Certificates can be regenerated on-demand when needed
 * 
 * Usage:
 *   node scripts/emergency-cleanup.js --dry-run          # Preview only
 *   node scripts/emergency-cleanup.js --days=7           # Delete files older than 7 days
 *   node scripts/emergency-cleanup.js --target-size=20   # Keep only 20GB of certificates
 */

const fs = require('fs').promises
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

// Configuration from command line arguments
const args = process.argv.slice(2)
const config = {
  dryRun: args.includes('--dry-run'),
  days: parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '7'),
  targetSizeGB: parseInt(args.find(a => a.startsWith('--target-size='))?.split('=')[1] || '0'),
  certDir: path.join(process.cwd(), 'public', 'uploads', 'certificates')
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function formatBytes(bytes) {
  const gb = bytes / (1024 ** 3)
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  const mb = bytes / (1024 ** 2)
  if (mb >= 1) return `${mb.toFixed(2)} MB`
  const kb = bytes / 1024
  return `${kb.toFixed(2)} KB`
}

async function getDirectorySize(dirPath) {
  let totalSize = 0
  try {
    const files = await fs.readdir(dirPath)
    for (const file of files) {
      const filePath = path.join(dirPath, file)
      const stats = await fs.stat(filePath)
      if (stats.isFile()) {
        totalSize += stats.size
      } else if (stats.isDirectory()) {
        totalSize += await getDirectorySize(filePath)
      }
    }
  } catch (error) {
    log(`Error reading directory: ${error.message}`, 'red')
  }
  return totalSize
}

async function getDiskUsage() {
  try {
    const { stdout } = await execAsync('df -BG / | tail -1')
    const parts = stdout.trim().split(/\s+/)
    const used = parseInt(parts[2])
    const available = parseInt(parts[3])
    const total = used + available
    const percentage = Math.round((used / total) * 100)
    
    return {
      total,
      used,
      available,
      percentage
    }
  } catch (error) {
    log(`Error getting disk usage: ${error.message}`, 'red')
    return null
  }
}

async function getCertificateFiles() {
  const files = []
  try {
    const allFiles = await fs.readdir(config.certDir)
    const pdfFiles = allFiles.filter(f => f.endsWith('.pdf'))
    
    for (const file of pdfFiles) {
      const filePath = path.join(config.certDir, file)
      const stats = await fs.stat(filePath)
      files.push({
        name: file,
        path: filePath,
        size: stats.size,
        mtime: stats.mtime,
        ageInDays: (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)
      })
    }
    
    // Sort by age (oldest first)
    files.sort((a, b) => b.ageInDays - a.ageInDays)
  } catch (error) {
    log(`Error reading certificate files: ${error.message}`, 'red')
  }
  
  return files
}

async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath)
    return true
  } catch (error) {
    log(`Error deleting ${filePath}: ${error.message}`, 'red')
    return false
  }
}

async function cleanupByAge(files, maxAgeInDays) {
  const stats = {
    scanned: files.length,
    deleted: 0,
    spaceFreed: 0,
    errors: 0
  }
  
  log(`\n=== Cleanup by Age (older than ${maxAgeInDays} days) ===`, 'cyan')
  
  for (const file of files) {
    if (file.ageInDays > maxAgeInDays) {
      if (config.dryRun) {
        log(`[DRY RUN] Would delete: ${file.name} (${formatBytes(file.size)}, ${Math.floor(file.ageInDays)} days old)`, 'yellow')
      } else {
        if (await deleteFile(file.path)) {
          stats.deleted++
          stats.spaceFreed += file.size
        } else {
          stats.errors++
        }
      }
    }
    
    // Progress indicator
    if (stats.scanned % 100 === 0) {
      process.stdout.write(`\rProcessed: ${stats.deleted}/${files.length}`)
    }
  }
  
  process.stdout.write('\n')
  return stats
}

async function cleanupBySize(files, targetSizeGB) {
  const targetSizeBytes = targetSizeGB * (1024 ** 3)
  const stats = {
    scanned: files.length,
    deleted: 0,
    spaceFreed: 0,
    errors: 0
  }
  
  log(`\n=== Cleanup by Size (target: ${targetSizeGB}GB) ===`, 'cyan')
  
  let currentSize = files.reduce((sum, f) => sum + f.size, 0)
  
  for (const file of files) {
    if (currentSize <= targetSizeBytes) {
      break
    }
    
    if (config.dryRun) {
      log(`[DRY RUN] Would delete: ${file.name} (${formatBytes(file.size)}, ${Math.floor(file.ageInDays)} days old)`, 'yellow')
    } else {
      if (await deleteFile(file.path)) {
        currentSize -= file.size
        stats.deleted++
        stats.spaceFreed += file.size
      } else {
        stats.errors++
      }
    }
    
    // Progress indicator
    if (stats.deleted % 100 === 0) {
      process.stdout.write(`\rCurrent size: ${formatBytes(currentSize)} / Target: ${formatBytes(targetSizeBytes)}`)
    }
  }
  
  process.stdout.write('\n')
  return stats
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan')
  log('║      Emergency Certificate Storage Cleanup Script         ║', 'cyan')
  log('╚════════════════════════════════════════════════════════════╝', 'cyan')
  
  if (config.dryRun) {
    log('\n⚠️  DRY RUN MODE - No files will be deleted', 'yellow')
  }
  
  // Show current disk usage
  log('\n=== Current Disk Usage ===', 'blue')
  const diskUsage = await getDiskUsage()
  if (diskUsage) {
    log(`Total: ${diskUsage.total}G`, 'reset')
    log(`Used: ${diskUsage.used}G (${diskUsage.percentage}%)`, diskUsage.percentage > 90 ? 'red' : 'yellow')
    log(`Available: ${diskUsage.available}G`, diskUsage.available < 10 ? 'red' : 'green')
  }
  
  // Get certificate directory size
  log('\n=== Certificate Storage ===', 'blue')
  const certSize = await getDirectorySize(config.certDir)
  log(`Location: ${config.certDir}`, 'reset')
  log(`Size: ${formatBytes(certSize)}`, certSize > 50 * (1024 ** 3) ? 'red' : 'yellow')
  
  // Get certificate files
  log('\n=== Scanning Certificate Files ===', 'blue')
  const files = await getCertificateFiles()
  log(`Total PDF files: ${files.length}`, 'reset')
  
  if (files.length === 0) {
    log('No certificate files found!', 'yellow')
    return
  }
  
  // Show age distribution
  const ageGroups = {
    '0-1 days': files.filter(f => f.ageInDays <= 1).length,
    '1-3 days': files.filter(f => f.ageInDays > 1 && f.ageInDays <= 3).length,
    '3-7 days': files.filter(f => f.ageInDays > 3 && f.ageInDays <= 7).length,
    '7-30 days': files.filter(f => f.ageInDays > 7 && f.ageInDays <= 30).length,
    '30+ days': files.filter(f => f.ageInDays > 30).length,
  }
  
  log('\nAge Distribution:', 'reset')
  for (const [range, count] of Object.entries(ageGroups)) {
    log(`  ${range}: ${count} files`, 'reset')
  }
  
  // Perform cleanup
  let stats
  if (config.targetSizeGB > 0) {
    stats = await cleanupBySize(files, config.targetSizeGB)
  } else {
    stats = await cleanupByAge(files, config.days)
  }
  
  // Show results
  log('\n╔════════════════════════════════════════════════════════════╗', 'green')
  log('║                     Cleanup Results                        ║', 'green')
  log('╚════════════════════════════════════════════════════════════╝', 'green')
  
  log(`\nFiles scanned: ${stats.scanned}`, 'reset')
  log(`Files ${config.dryRun ? 'would be' : ''} deleted: ${stats.deleted}`, stats.deleted > 0 ? 'yellow' : 'reset')
  log(`Space ${config.dryRun ? 'would be' : ''} freed: ${formatBytes(stats.spaceFreed)}`, stats.spaceFreed > 0 ? 'green' : 'reset')
  log(`Errors: ${stats.errors}`, stats.errors > 0 ? 'red' : 'reset')
  
  // Show final disk usage
  if (!config.dryRun && stats.deleted > 0) {
    log('\n=== Final Disk Usage ===', 'blue')
    const finalDiskUsage = await getDiskUsage()
    if (finalDiskUsage) {
      log(`Used: ${finalDiskUsage.used}G (${finalDiskUsage.percentage}%)`, 'reset')
      log(`Available: ${finalDiskUsage.available}G`, 'green')
      log(`Freed: ${diskUsage.used - finalDiskUsage.used}G`, 'green')
    }
    
    const finalCertSize = await getDirectorySize(config.certDir)
    log(`\nCertificate folder: ${formatBytes(finalCertSize)}`, 'reset')
    log(`Reduced by: ${formatBytes(certSize - finalCertSize)}`, 'green')
  }
  
  // Next steps
  log('\n=== Next Steps ===', 'blue')
  if (config.dryRun) {
    log('1. Review the files that would be deleted', 'reset')
    log('2. Run without --dry-run to actually delete files', 'reset')
    log('   Example: node scripts/emergency-cleanup.js --days=7', 'yellow')
  } else {
    log('1. Update database to mark certificates for regeneration:', 'reset')
    log('   mysql -u azham -p mtdb < scripts/mark-certificates-for-regeneration.sql', 'yellow')
    log('\n2. Set up automatic cleanup (runs daily):', 'reset')
    log('   Add to crontab: 0 2 * * * cd /root/apps/mt25 && node scripts/emergency-cleanup.js --days=7', 'yellow')
    log('\n3. Test certificate regeneration:', 'reset')
    log('   curl http://localhost:3000/api/certificates/[id]/generate-on-demand', 'yellow')
  }
  
  log('\n✅ Cleanup complete!', 'green')
}

// Run the script
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red')
  console.error(error)
  process.exit(1)
})
