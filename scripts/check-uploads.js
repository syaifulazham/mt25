/**
 * Diagnostic script for checking upload paths and permissions
 * Run this on the production server to diagnose image 404 issues
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BASE_UPLOAD_PATH = path.join(process.cwd(), 'public', 'uploads');
const CONTINGENT_UPLOAD_PATH = path.join(BASE_UPLOAD_PATH, 'contingents');

// Helper function to check if a path exists
function checkPath(pathToCheck) {
  try {
    const stats = fs.statSync(pathToCheck);
    return {
      exists: true,
      isDirectory: stats.isDirectory(),
      permissions: stats.mode.toString(8).slice(-3),
      owner: execSync(`ls -la ${pathToCheck} | head -n 2 | tail -n 1 | awk '{print $3}'`).toString().trim(),
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
}

// Check if directories exist and have correct permissions
console.log('\n=== DIRECTORY CHECKS ===');
console.log(`Current working directory: ${process.cwd()}`);
console.log(`Public directory: ${path.join(process.cwd(), 'public')}`);

const publicCheck = checkPath(path.join(process.cwd(), 'public'));
console.log(`Public directory exists: ${publicCheck.exists}`);
if (publicCheck.exists) {
  console.log(`  Is directory: ${publicCheck.isDirectory}`);
  console.log(`  Permissions: ${publicCheck.permissions}`);
  console.log(`  Owner: ${publicCheck.owner}`);
}

const uploadsCheck = checkPath(BASE_UPLOAD_PATH);
console.log(`\nUploads directory exists: ${uploadsCheck.exists}`);
if (uploadsCheck.exists) {
  console.log(`  Is directory: ${uploadsCheck.isDirectory}`);
  console.log(`  Permissions: ${uploadsCheck.permissions}`);
  console.log(`  Owner: ${uploadsCheck.owner}`);
} else {
  console.log(`  Error: ${uploadsCheck.error}`);
}

const contingentsCheck = checkPath(CONTINGENT_UPLOAD_PATH);
console.log(`\nContingents directory exists: ${contingentsCheck.exists}`);
if (contingentsCheck.exists) {
  console.log(`  Is directory: ${contingentsCheck.isDirectory}`);
  console.log(`  Permissions: ${contingentsCheck.permissions}`);
  console.log(`  Owner: ${contingentsCheck.owner}`);
  
  // List files in the contingents directory
  console.log('\n=== FILES IN CONTINGENTS DIRECTORY ===');
  const files = fs.readdirSync(CONTINGENT_UPLOAD_PATH);
  files.forEach(file => {
    const filePath = path.join(CONTINGENT_UPLOAD_PATH, file);
    const fileStats = fs.statSync(filePath);
    console.log(`${file} (${fileStats.size} bytes, permissions: ${fileStats.mode.toString(8).slice(-3)})`);
  });
} else {
  console.log(`  Error: ${contingentsCheck.error}`);
}

// Create directories if they don't exist
if (!uploadsCheck.exists || !contingentsCheck.exists) {
  console.log('\n=== CREATING MISSING DIRECTORIES ===');
  try {
    fs.mkdirSync(BASE_UPLOAD_PATH, { recursive: true, mode: 0o755 });
    console.log(`Created: ${BASE_UPLOAD_PATH}`);
    
    fs.mkdirSync(CONTINGENT_UPLOAD_PATH, { recursive: true, mode: 0o755 });
    console.log(`Created: ${CONTINGENT_UPLOAD_PATH}`);
  } catch (error) {
    console.error(`Failed to create directories: ${error.message}`);
  }
}

// Check Next.js configuration
console.log('\n=== NEXT.JS CONFIGURATION CHECK ===');
try {
  const nextConfigPath = path.join(process.cwd(), 'next.config.js');
  if (fs.existsSync(nextConfigPath)) {
    const configContent = fs.readFileSync(nextConfigPath, 'utf-8');
    console.log(`next.config.js exists`);
    
    // Check for key configurations
    console.log(`  Contains publicRuntimeConfig: ${configContent.includes('publicRuntimeConfig')}`);
    console.log(`  Contains rewrites: ${configContent.includes('rewrites')}`);
    console.log(`  Contains images config: ${configContent.includes('images:')}`);
  } else {
    console.log('next.config.js not found');
  }
} catch (error) {
  console.error(`Error checking Next.js config: ${error.message}`);
}

console.log('\nRun this script on your production server to diagnose upload issues');
