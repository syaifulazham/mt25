# Server Disk Space Cleanup & Rebuild Guide

## Issue
Build completed successfully but failed to copy traced files due to **no disk space left** on server.

## Root Cause
- `output: 'standalone'` mode tried to copy ALL files including `public/uploads/` (PDFs, images, evidence files)
- Your uploads directory is very large with thousands of generated certificates
- This filled up the server disk during the build finalization step

## Fix Applied
✅ Removed `output: 'standalone'` from next.config.js
- Standalone mode is only needed for Docker/containerized deployments
- Standard server deployments don't need it

## Steps to Fix on Server

### 1. Check Disk Space
```bash
df -h
```

### 2. Clean Up Failed Build Artifacts
```bash
cd /root/apps/mt25

# Remove the incomplete standalone build
rm -rf .next/standalone

# Remove the entire .next directory
rm -rf .next

# Remove SWC cache
rm -rf .swc
```

### 3. Check What's Using Disk Space
```bash
# Check size of uploads directory
du -sh public/uploads/*

# Expected output example:
# 500M  public/uploads/certificates
# 200M  public/uploads/evidence  
# 50M   public/uploads/contingents
# etc.
```

### 4. Optional: Clean Old/Temp Certificates
If you have test/temporary certificates you don't need:
```bash
# List certificate files by date
ls -lh public/uploads/certificates/ | tail -20

# Remove temp/test certificates if needed (CAREFUL!)
# Only run this if you're sure these are test files
# find public/uploads/certificates -name "*test*" -delete
```

### 5. Rebuild
```bash
npm run build
```

The build should now complete without disk space errors.

## Why This Happens

### Standalone Mode (Removed)
- Creates a self-contained copy in `.next/standalone/`
- Copies EVERYTHING: node_modules, public, uploads, etc.
- Good for: Docker containers, isolated deployments
- Bad for: Traditional servers with large upload directories

### Standard Mode (Current)
- Only builds the `.next/` directory
- References `public/` and `node_modules/` in place
- Much smaller disk footprint
- Perfect for traditional server deployments

## Disk Space Recommendations

For your production server with large uploads:
- **Minimum**: 20GB free space
- **Recommended**: 50GB+ free space
- **Uploads directory**: Can grow to several GB with certificates/evidence

## If Disk Still Full

### Option 1: Move Uploads to Separate Storage
```bash
# Move uploads to different mount/disk
mv public/uploads /mnt/storage/mt25-uploads
ln -s /mnt/storage/mt25-uploads public/uploads
```

### Option 2: Clean Up System Space
```bash
# Remove old logs
sudo journalctl --vacuum-time=7d

# Remove old packages (Ubuntu/Debian)
sudo apt-get autoremove
sudo apt-get clean

# Remove Docker images if not needed
docker system prune -a

# Remove old node_modules from other projects
find /root -name "node_modules" -type d
```

### Option 3: Increase Server Disk Size
Contact your hosting provider to expand disk allocation.

## Verify Build Success

After successful build, you should see:
```
✓ Generating static pages (107/107)
✓ Collecting build traces
✓ Finalizing page optimization

Route (app)                                Size     First Load JS
...
```

No ENOSPC errors = Success! ✅

## Production Deployment

After successful build:
```bash
# Stop current app
pm2 stop mt25

# Start with new build
pm2 start npm --name mt25 -- start

# Or restart if already exists
pm2 restart mt25
```

## Monitoring Disk Space

Set up automatic alerts:
```bash
# Add to crontab
0 */6 * * * df -h | grep -E '^/dev/' | awk '{ if ($5+0 > 80) print "Disk usage high: " $0 }'
```
