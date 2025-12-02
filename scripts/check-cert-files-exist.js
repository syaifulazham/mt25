#!/usr/bin/env node

/**
 * Check if GENERAL certificate files actually exist on disk
 * Verifies database records against actual filesystem
 */

const mysql = require('mysql2/promise')
const fs = require('fs').promises
const path = require('path')

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mtdb'
}

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

async function checkFileExists(filePath) {
  try {
    const fullPath = path.join(process.cwd(), 'public', filePath)
    await fs.access(fullPath)
    return { exists: true, path: fullPath }
  } catch {
    return { exists: false, path: filePath }
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan')
  log('║     Check GENERAL Certificate Files Existence             ║', 'cyan')
  log('╚════════════════════════════════════════════════════════════╝', 'cyan')
  
  const connection = await mysql.createConnection(dbConfig)
  log('\n✓ Connected to database', 'green')

  try {
    // Get database stats
    log('\n=== Database Stats ===', 'blue')
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as with_path,
        SUM(CASE WHEN c.filePath IS NULL THEN 1 ELSE 0 END) as without_path
      FROM certificate c
      JOIN cert_template ct ON c.templateId = ct.id
      WHERE ct.targetType = 'GENERAL'
    `)
    
    const stat = stats[0]
    log(`Total GENERAL certificates: ${stat.total}`, 'reset')
    log(`With filePath: ${stat.with_path}`, stat.with_path > 0 ? 'yellow' : 'reset')
    log(`Without filePath (NULL): ${stat.without_path}`, 'reset')

    if (stat.with_path === 0) {
      log('\n✅ All GENERAL certificates already have NULL filePath!', 'green')
      log('No files to check. Database is clean.', 'green')
      return
    }

    // Sample file paths
    log(`\n=== Checking File Existence (sample of 50) ===`, 'blue')
    const [rows] = await connection.execute(`
      SELECT DISTINCT c.id, c.filePath
      FROM certificate c
      JOIN cert_template ct ON c.templateId = ct.id
      WHERE ct.targetType = 'GENERAL'
        AND c.filePath IS NOT NULL
        AND c.filePath != ''
      LIMIT 50
    `)

    if (rows.length === 0) {
      log('\n✅ No GENERAL certificates with file paths found!', 'green')
      return
    }

    log(`Checking ${rows.length} files...\n`, 'reset')

    let exists = 0
    let missing = 0
    const missingIds = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const result = await checkFileExists(row.filePath)
      
      if (result.exists) {
        exists++
        log(`✓ [${i + 1}/${rows.length}] EXISTS: ${row.filePath}`, 'green')
      } else {
        missing++
        missingIds.push(row.id)
        log(`✗ [${i + 1}/${rows.length}] MISSING: ${row.filePath}`, 'red')
      }
    }

    // Summary
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan')
    log('║                         Summary                            ║', 'cyan')
    log('╚════════════════════════════════════════════════════════════╝', 'cyan')
    
    log(`\nFiles checked: ${rows.length}`, 'reset')
    log(`Files exist on disk: ${exists}`, exists > 0 ? 'green' : 'reset')
    log(`Files missing from disk: ${missing}`, missing > 0 ? 'red' : 'reset')
    log(`\nTotal GENERAL certs with filePath in DB: ${stat.with_path}`, 'yellow')

    if (missing > 0) {
      const percentage = ((missing / rows.length) * 100).toFixed(1)
      log(`\n⚠️  ${percentage}% of sampled files are missing!`, 'yellow')
      log('\nFiles are deleted but database still has filePath values.', 'yellow')
      log('Run this command to update database:', 'cyan')
      log('\n  mysql mtdb -e "UPDATE certificate c JOIN cert_template ct ON c.templateId = ct.id SET c.filePath = NULL, c.status = \'LISTED\' WHERE ct.targetType = \'GENERAL\' AND c.filePath IS NOT NULL"', 'yellow')
    } else {
      log('\n✅ All sampled files exist on disk!', 'green')
      log('Files have not been deleted yet.', 'reset')
    }

    // Check actual disk usage
    log('\n=== Checking Actual Certificate Directory ===', 'blue')
    try {
      const certDir = path.join(process.cwd(), 'public', 'uploads', 'certificates')
      const files = await fs.readdir(certDir)
      const pdfFiles = files.filter(f => f.endsWith('.pdf'))
      log(`PDF files in directory: ${pdfFiles.length}`, 'reset')
      
      // Get directory size
      let totalSize = 0
      for (const file of pdfFiles) {
        const stats = await fs.stat(path.join(certDir, file))
        totalSize += stats.size
      }
      const sizeGB = (totalSize / (1024 ** 3)).toFixed(2)
      log(`Directory size: ${sizeGB} GB`, totalSize > 10 * (1024 ** 3) ? 'red' : 'green')
    } catch (err) {
      log(`Cannot access certificate directory: ${err.message}`, 'yellow')
    }

  } finally {
    await connection.end()
    log('\n✓ Database connection closed\n', 'cyan')
  }
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red')
  console.error(error)
  process.exit(1)
})
