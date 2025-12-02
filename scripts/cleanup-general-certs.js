#!/usr/bin/env node

/**
 * Targeted Certificate Cleanup - GENERAL Type Only
 * 
 * Deletes only GENERAL certificate PDFs while preserving:
 * - EVENT_WINNER certificates
 * - TRAINERS certificates  
 * - CONTINGENT certificates
 * 
 * Usage:
 *   node scripts/cleanup-general-certs.js --dry-run    # Preview only
 *   node scripts/cleanup-general-certs.js              # Actually delete
 */

const mysql = require('mysql2/promise')
const fs = require('fs').promises
const path = require('path')

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'azham',
  password: 'DBAzham231',
  database: 'mtdb'
}

// Configuration from command line
const args = process.argv.slice(2)
const config = {
  dryRun: args.includes('--dry-run'),
  publicDir: path.join(process.cwd(), 'public')
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
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

async function getCertificatesByType(connection) {
  const [rows] = await connection.execute(`
    SELECT 
      ct.targetType,
      COUNT(c.id) as total,
      SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as with_files,
      SUM(CASE WHEN c.filePath IS NULL THEN 1 ELSE 0 END) as without_files
    FROM certificate c
    JOIN cert_template ct ON c.templateId = ct.id
    GROUP BY ct.targetType
    ORDER BY ct.targetType
  `)
  return rows
}

async function getGeneralCertificateFiles(connection) {
  const [rows] = await connection.execute(`
    SELECT DISTINCT c.filePath
    FROM certificate c
    JOIN cert_template ct ON c.templateId = ct.id
    WHERE ct.targetType = 'GENERAL'
      AND c.filePath IS NOT NULL
      AND c.filePath != ''
  `)
  return rows.map(row => row.filePath)
}

async function deleteFile(filePath) {
  try {
    const fullPath = path.join(config.publicDir, filePath)
    const stats = await fs.stat(fullPath)
    await fs.unlink(fullPath)
    return { success: true, size: stats.size }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, size: 0, alreadyDeleted: true }
    }
    return { success: false, error: error.message, size: 0 }
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan')
  log('║    Targeted Certificate Cleanup - GENERAL Type Only       ║', 'cyan')
  log('╚════════════════════════════════════════════════════════════╝', 'cyan')
  
  if (config.dryRun) {
    log('\n⚠️  DRY RUN MODE - No files will be deleted', 'yellow')
  }

  // Connect to database
  log('\n=== Connecting to Database ===', 'blue')
  const connection = await mysql.createConnection(dbConfig)
  log('✓ Connected to MySQL database', 'green')

  try {
    // Show current certificate distribution
    log('\n=== Current Certificate Distribution ===', 'blue')
    const certsByType = await getCertificatesByType(connection)
    
    let totalGeneral = 0
    let totalPreserved = 0
    
    console.log('\n┌─────────────────────┬───────────┬──────────────┬────────────────┐')
    console.log('│ Type                │ Total     │ With Files   │ Without Files  │')
    console.log('├─────────────────────┼───────────┼──────────────┼────────────────┤')
    
    for (const row of certsByType) {
      const typeLabel = row.targetType || 'NULL'
      const action = typeLabel === 'GENERAL' ? '🗑️  DELETE' : '✅ KEEP'
      const color = typeLabel === 'GENERAL' ? 'red' : 'green'
      
      const line = `│ ${typeLabel.padEnd(19)} │ ${String(row.total).padStart(9)} │ ${String(row.with_files).padStart(12)} │ ${String(row.without_files).padStart(14)} │ ${action}`
      log(line, color)
      
      if (typeLabel === 'GENERAL') {
        totalGeneral += parseInt(row.with_files)
      } else {
        totalPreserved += parseInt(row.with_files)
      }
    }
    console.log('└─────────────────────┴───────────┴──────────────┴────────────────┘')
    
    log(`\n📊 Summary:`, 'cyan')
    log(`   To DELETE: ${totalGeneral} GENERAL certificate PDFs`, 'red')
    log(`   To KEEP: ${totalPreserved} other certificate PDFs (WINNER/TRAINERS/CONTINGENT)`, 'green')

    // Get file paths for GENERAL certificates
    log('\n=== Scanning GENERAL Certificate Files ===', 'blue')
    const generalFiles = await getGeneralCertificateFiles(connection)
    log(`Found ${generalFiles.length} GENERAL certificate file paths in database`, 'yellow')

    if (generalFiles.length === 0) {
      log('\n✓ No GENERAL certificate files to delete!', 'green')
      return
    }

    // Delete files
    const stats = {
      total: generalFiles.length,
      deleted: 0,
      alreadyDeleted: 0,
      errors: 0,
      spaceFreed: 0,
      errorFiles: []
    }

    log('\n=== Processing Files ===', 'blue')
    
    for (let i = 0; i < generalFiles.length; i++) {
      const filePath = generalFiles[i]
      
      if (config.dryRun) {
        log(`[${i + 1}/${generalFiles.length}] Would delete: ${filePath}`, 'yellow')
        stats.deleted++
      } else {
        const result = await deleteFile(filePath)
        
        if (result.success) {
          if (result.alreadyDeleted) {
            stats.alreadyDeleted++
          } else {
            stats.deleted++
            stats.spaceFreed += result.size
          }
        } else {
          stats.errors++
          stats.errorFiles.push({ path: filePath, error: result.error })
        }
      }
      
      // Progress indicator
      if ((i + 1) % 100 === 0) {
        process.stdout.write(`\rProgress: ${i + 1}/${generalFiles.length} files processed`)
      }
    }
    
    process.stdout.write('\n')

    // Show results
    log('\n╔════════════════════════════════════════════════════════════╗', 'green')
    log('║                     Cleanup Results                        ║', 'green')
    log('╚════════════════════════════════════════════════════════════╝', 'green')
    
    log(`\nGENERAL certificates:`, 'yellow')
    log(`  Total file paths: ${stats.total}`, 'reset')
    log(`  ${config.dryRun ? 'Would be deleted' : 'Deleted'}: ${stats.deleted}`, stats.deleted > 0 ? 'yellow' : 'reset')
    log(`  Already deleted: ${stats.alreadyDeleted}`, 'cyan')
    log(`  Errors: ${stats.errors}`, stats.errors > 0 ? 'red' : 'reset')
    
    if (!config.dryRun) {
      log(`  Space freed: ${formatBytes(stats.spaceFreed)}`, 'green')
    }
    
    if (stats.errorFiles.length > 0) {
      log(`\n❌ Errors encountered:`, 'red')
      for (const err of stats.errorFiles.slice(0, 10)) {
        log(`   ${err.path}: ${err.error}`, 'red')
      }
      if (stats.errorFiles.length > 10) {
        log(`   ... and ${stats.errorFiles.length - 10} more errors`, 'red')
      }
    }

    // Show what was preserved
    log(`\nPRESERVED certificates:`, 'green')
    log(`  EVENT_WINNER: All files kept ✓`, 'green')
    log(`  TRAINERS: All files kept ✓`, 'green')
    log(`  CONTINGENT: All files kept ✓`, 'green')

    // Next steps
    log('\n=== Next Steps ===', 'blue')
    if (config.dryRun) {
      log('1. Review the files that would be deleted', 'reset')
      log('2. Run without --dry-run to actually delete:', 'reset')
      log('   node scripts/cleanup-general-certs.js', 'yellow')
    } else {
      log('1. Update database to mark GENERAL certificates for regeneration:', 'reset')
      log('   mysql -u azham -p mtdb < scripts/cleanup-general-certificates.sql', 'yellow')
      log('\n2. Verify disk space freed:', 'reset')
      log('   df -h /', 'yellow')
      log('\n3. GENERAL certificates will be regenerated on-demand when requested', 'reset')
      log('   Other certificate types (WINNER/TRAINERS/CONTINGENT) are untouched', 'green')
    }

    log('\n✅ Cleanup complete!', 'green')

  } finally {
    await connection.end()
    log('\n✓ Database connection closed', 'cyan')
  }
}

// Run the script
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red')
  console.error(error)
  process.exit(1)
})
