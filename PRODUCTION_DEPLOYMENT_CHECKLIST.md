# Production Deployment Checklist for Trainers Feature

## Issue
Page works fine locally but has issues on production server.

## Common Causes & Solutions

### 1. ⚠️ Database Schema Not Updated (MOST LIKELY)

**Symptoms:**
- Blank page with no errors
- "TRAINERS" not in enum error
- Missing columns errors

**Solution:**
```bash
# Step 1: Check production database
mysql -u YOUR_USER -p YOUR_DATABASE < check-production-db.sql

# Step 2: Apply migrations
mysql -u YOUR_USER -p YOUR_DATABASE < deploy-trainers-feature-to-production.sql

# Step 3: Fix indexes if needed
mysql -u YOUR_USER -p YOUR_DATABASE < fix-production-indexes.sql
```

### 2. 🔄 Next.js Build Cache

**Symptoms:**
- Old code still running
- Changes not reflected

**Solution:**
```bash
# Clear .next cache and rebuild
rm -rf .next
npm run build
npm run start
```

### 3. 📦 Dependencies Not Installed

**Symptoms:**
- Missing module errors
- Import errors

**Solution:**
```bash
# Reinstall dependencies
npm ci
npm run build
```

### 4. 🔐 Prisma Client Not Regenerated

**Symptoms:**
- TypeScript errors about TRAINERS enum
- Prisma client outdated

**Solution:**
```bash
# Regenerate Prisma client
npx prisma generate
npm run build
```

### 5. 🌍 Environment Variables

**Symptoms:**
- Database connection issues
- Authentication issues

**Check:**
```bash
# Verify .env or .env.production has correct values
cat .env.production
```

Required variables:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

### 6. 📊 No Data in Production

**Symptoms:**
- Empty trainers list
- No error messages

**Check:**
```sql
-- Run on production database
SELECT COUNT(*) FROM attendanceManager;
SELECT COUNT(*) FROM manager;
```

**Solution:**
- Ensure trainers are registered in the system
- Import data if needed

## Step-by-Step Deployment Process

### Phase 1: Pre-Deployment Checks

```bash
# 1. On local machine, verify everything works
npm run build
npm run start

# 2. Check if all migrations are committed
git status
git log --oneline -10
```

### Phase 2: Database Migration

```bash
# 1. SSH to production server
ssh user@production-server

# 2. Backup production database
mysqldump -u USER -p DATABASE > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Check current schema
mysql -u USER -p DATABASE < check-production-db.sql

# 4. Apply migrations (REVIEW OUTPUT CAREFULLY)
mysql -u USER -p DATABASE < deploy-trainers-feature-to-production.sql

# 5. When ready, commit the transaction
mysql -u USER -p DATABASE -e "COMMIT;"
```

### Phase 3: Application Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci

# 3. Regenerate Prisma client
npx prisma generate

# 4. Clear cache and rebuild
rm -rf .next
npm run build

# 5. Restart application
pm2 restart your-app-name
# OR
systemctl restart your-service-name
```

### Phase 4: Verification

```bash
# 1. Check application logs
pm2 logs your-app-name --lines 100
# OR
tail -f /var/log/your-app.log

# 2. Test the page
curl -I https://techlympics.my/organizer/certificates/templates/28/trainers

# 3. Check browser console for errors
```

## Rollback Procedure

If something goes wrong:

```bash
# 1. Restore database
mysql -u USER -p DATABASE < backup_YYYYMMDD_HHMMSS.sql

# 2. Revert code
git checkout previous-working-commit
npm ci
npx prisma generate
npm run build
pm2 restart your-app-name
```

## Debugging Commands

### Check if page is accessible
```bash
curl -v https://techlympics.my/organizer/certificates/templates/28/trainers
```

### Check application logs
```bash
# For PM2
pm2 logs --lines 200

# For systemd
journalctl -u your-service -n 200 -f

# For direct logs
tail -f /var/log/nodejs/app.log
```

### Check database connection
```bash
mysql -u USER -p -e "SELECT 1"
```

### Check Prisma
```bash
npx prisma db pull  # Pull current schema
npx prisma validate  # Validate schema
```

## Quick Fixes

### If indexes fail to create
```bash
mysql -u USER -p DATABASE < fix-production-indexes.sql
```

### If enum update fails
```sql
-- Manually update enum
ALTER TABLE cert_template 
MODIFY COLUMN targetType ENUM('GENERAL', 'EVENT_PARTICIPANT', 'EVENT_WINNER', 'NON_CONTEST_PARTICIPANT', 'QUIZ_PARTICIPANT', 'QUIZ_WINNER', 'TRAINERS') DEFAULT NULL;
```

### If build fails
```bash
# Clear everything
rm -rf node_modules .next
npm ci
npx prisma generate
npm run build
```

## Monitoring

After deployment, monitor:

1. **Error logs**: Check for any runtime errors
2. **Database queries**: Ensure no slow queries
3. **User reports**: Watch for user feedback
4. **Performance**: Monitor page load times

## Contact

If issues persist:
1. Check server logs: `[Trainers Page] Fetched trainers count`
2. Check browser console for JavaScript errors
3. Verify database schema matches local
4. Compare environment variables

## Success Criteria

✅ Page loads without errors
✅ Trainers list displays correctly
✅ Certificate generation works
✅ Download/preview functions work
✅ No console errors
✅ Database queries complete in reasonable time
