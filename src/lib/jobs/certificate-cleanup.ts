/**
 * Certificate File Cleanup Job
 * 
 * Automatically removes old certificate PDF files while preserving database records
 * Run this as a cron job (e.g., daily at 2 AM)
 * 
 * Usage:
 * - As cron job: Add to pm2 ecosystem.config.js with cron schedule
 * - Manual: node --loader ts-node/esm src/lib/jobs/certificate-cleanup.ts
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import prisma from '@/lib/prisma'

interface CleanupConfig {
  // Delete PDF files older than this many days
  maxAgeInDays: number
  // Keep minimum this many MB free
  minFreeSpaceGB: number
  // Dry run (don't actually delete)
  dryRun: boolean
}

interface CleanupStats {
  filesScanned: number
  filesDeleted: number
  spaceFreedMB: number
  errors: number
}

async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0
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
  
  return totalSize
}

async function cleanupOldCertificates(config: CleanupConfig): Promise<CleanupStats> {
  const stats: CleanupStats = {
    filesScanned: 0,
    filesDeleted: 0,
    spaceFreedMB: 0,
    errors: 0
  }

  const certDir = path.join(process.cwd(), 'public', 'uploads', 'certificates')
  const maxAgeMs = config.maxAgeInDays * 24 * 60 * 60 * 1000
  const now = Date.now()

  console.log('=== Certificate Cleanup Job ===')
  console.log(`Config:`, config)
  console.log(`Scanning directory: ${certDir}`)

  try {
    // Get initial directory size
    const initialSize = await getDirectorySize(certDir)
    console.log(`Initial size: ${(initialSize / 1024 / 1024 / 1024).toFixed(2)} GB`)

    // Get all PDF files
    const files = await fs.readdir(certDir)
    const pdfFiles = files.filter(f => f.endsWith('.pdf'))

    console.log(`Found ${pdfFiles.length} PDF files`)

    for (const file of pdfFiles) {
      stats.filesScanned++
      const filePath = path.join(certDir, file)

      try {
        const fileStats = await fs.stat(filePath)
        const ageMs = now - fileStats.mtime.getTime()

        // Check if file is old enough to delete
        if (ageMs > maxAgeMs) {
          if (!config.dryRun) {
            await fs.unlink(filePath)
            stats.spaceFreedMB += fileStats.size / 1024 / 1024
            stats.filesDeleted++
            
            // Update database to mark for regeneration
            const filename = file
            await prisma.$executeRaw`
              UPDATE certificate
              SET filePath = NULL, 
                  status = 'LISTED',
                  updatedAt = NOW()
              WHERE filePath LIKE ${`%${filename}%`}
            `
          } else {
            // Dry run - just count
            stats.spaceFreedMB += fileStats.size / 1024 / 1024
            stats.filesDeleted++
            console.log(`[DRY RUN] Would delete: ${file} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB, age: ${Math.floor(ageMs / (1000 * 60 * 60 * 24))} days)`)
          }
        }
      } catch (error) {
        console.error(`Error processing file ${file}:`, error)
        stats.errors++
      }

      // Progress indicator
      if (stats.filesScanned % 1000 === 0) {
        console.log(`Progress: ${stats.filesScanned}/${pdfFiles.length} files scanned`)
      }
    }

    // Get final directory size
    const finalSize = await getDirectorySize(certDir)
    console.log(`Final size: ${(finalSize / 1024 / 1024 / 1024).toFixed(2)} GB`)

  } catch (error) {
    console.error('Cleanup job error:', error)
    throw error
  }

  return stats
}

// Run cleanup with configuration
export async function runCertificateCleanup(config?: Partial<CleanupConfig>) {
  const defaultConfig: CleanupConfig = {
    maxAgeInDays: 7, // Delete files older than 7 days
    minFreeSpaceGB: 20, // Keep at least 20GB free
    dryRun: false
  }

  const finalConfig = { ...defaultConfig, ...config }

  try {
    const stats = await cleanupOldCertificates(finalConfig)

    console.log('=== Cleanup Complete ===')
    console.log(`Files scanned: ${stats.filesScanned}`)
    console.log(`Files deleted: ${stats.filesDeleted}`)
    console.log(`Space freed: ${stats.spaceFreedMB.toFixed(2)} MB (${(stats.spaceFreedMB / 1024).toFixed(2)} GB)`)
    console.log(`Errors: ${stats.errors}`)

    return stats
  } catch (error) {
    console.error('Certificate cleanup failed:', error)
    throw error
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const days = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '7')

  runCertificateCleanup({
    maxAgeInDays: days,
    dryRun
  })
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}
