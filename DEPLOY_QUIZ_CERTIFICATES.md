# Deploy Quiz Certificate Support - Quick Guide

## ✅ What's Been Done (Local)

1. **Database Schema Changes**
   - Added `QUIZ_PARTICIPANT` and `QUIZ_WINNER` to enum
   - Added `quizId` column to `cert_template`
   - Updated Prisma schema

2. **Backend Updates**
   - Serial service supports QPART/QWIN type codes
   - New `/api/quizzes` endpoint created
   - Type definitions updated

3. **Frontend Updates**
   - Quiz certificate options in template editor
   - Quiz selection dropdown
   - Validation and save logic

4. **Prisma Client**
   - ✅ Regenerated locally

## 🚀 Deployment Steps

### Step 1: Apply Database Migration (Production)

```bash
# On production server
cd ~/apps/mt25
mysql -u azham -p mtdb < add-quiz-certificate-support.sql
```

**Expected Output:**
```
Query OK, 0 rows affected
Query OK, 0 rows affected
Query OK, 0 rows affected
```

**Verify:**
```bash
mysql -u azham -p mtdb -e "DESCRIBE cert_template;" | grep quizId
mysql -u azham -p mtdb -e "SHOW INDEX FROM cert_template WHERE Key_name = 'idx_cert_template_quizId';"
```

### Step 2: Deploy Code

```bash
# Commit changes
git add .
git commit -m "Add quiz certificate support with QUIZ_PARTICIPANT and QUIZ_WINNER types"
git push

# On production server
cd ~/apps/mt25
git pull
```

### Step 3: Install Dependencies & Regenerate Prisma

```bash
# On production server
npm install
npx prisma generate
```

### Step 4: Rebuild & Restart

```bash
# Build application
npm run build

# Restart with PM2
pm2 restart mt25

# Check status
pm2 status
pm2 logs mt25 --lines 50
```

### Step 5: Verify Deployment

**Check API:**
```bash
curl -H "Cookie: your-auth-cookie" \
  https://techlympics.my/api/quizzes
```

**Check UI:**
1. Go to: `https://techlympics.my/organizer/certificates/templates/create`
2. Scroll to "Certificate Type"
3. Verify "Quiz Participants" and "Quiz Winners" options appear

## 📝 Quick Test

### Create a Quiz Participant Certificate

1. **Navigate:**
   - Go to `/organizer/certificates/templates/create`

2. **Configure:**
   - Upload a PDF template
   - Select "Quiz Participants" as Certificate Type
   - Choose a quiz from the dropdown
   - Add text elements

3. **Save:**
   - Click "Save Template"
   - Verify template appears in list

4. **Check Serial Number:**
   ```sql
   SELECT templateId, serialNumber 
   FROM certificate 
   WHERE serialNumber LIKE 'MT25/QPART%' 
   LIMIT 5;
   ```

### Create a Quiz Winner Certificate

1. **Navigate:**
   - Go to `/organizer/certificates/templates/create`

2. **Configure:**
   - Upload a PDF template
   - Select "Quiz Winners" as Certificate Type
   - Choose a quiz from the dropdown
   - Set winner range (e.g., 1-3)
   - Add text elements

3. **Save:**
   - Click "Save Template"
   - Verify template saved with range

4. **Check Serial Number:**
   ```sql
   SELECT templateId, serialNumber, awardTitle
   FROM certificate 
   WHERE serialNumber LIKE 'MT25/QWIN%' 
   LIMIT 5;
   ```

## 🔍 Troubleshooting

### Issue: "Quiz dropdown is empty"

**Check:**
```sql
SELECT id, quiz_name, status FROM quiz WHERE status = 'published';
```

**Fix:** Ensure quizzes have `status = 'published'`

### Issue: "Failed to fetch quizzes"

**Check API logs:**
```bash
pm2 logs mt25 | grep quizzes
```

**Verify authentication:**
- API requires valid session
- Check if user is logged in

### Issue: "Cannot save template with quiz"

**Check database:**
```sql
DESCRIBE cert_template;
```

**Verify:**
- `quizId` column exists
- Foreign key constraint exists
- Enum includes QUIZ_PARTICIPANT and QUIZ_WINNER

### Issue: "Serial number validation fails"

**Check pattern:**
```typescript
// Should accept: MT25/QPART/T15/000001
const pattern = /^MT\d{2}\/(GEN|PART|WIN|NCP|QPART|QWIN)\/T\d+\/\d{6}$/;
```

**Test:**
```javascript
console.log(/^MT\d{2}\/(GEN|PART|WIN|NCP|QPART|QWIN)\/T\d+\/\d{6}$/.test('MT25/QPART/T15/000001')); // Should be true
```

## 📊 Database Verification

### Check Enum Values
```sql
SHOW COLUMNS FROM cert_template WHERE Field = 'targetType';
```

**Expected:**
```
ENUM('GENERAL','EVENT_PARTICIPANT','EVENT_WINNER','NON_CONTEST_PARTICIPANT','QUIZ_PARTICIPANT','QUIZ_WINNER')
```

### Check Foreign Key
```sql
SELECT 
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'cert_template'
  AND CONSTRAINT_NAME = 'fk_cert_template_quiz';
```

### Check Indexes
```sql
SHOW INDEX FROM cert_template WHERE Key_name = 'idx_cert_template_quizId';
```

### Count Quiz Templates
```sql
SELECT 
  targetType,
  COUNT(*) as count
FROM cert_template
WHERE targetType IN ('QUIZ_PARTICIPANT', 'QUIZ_WINNER')
GROUP BY targetType;
```

## 🎯 Usage Examples

### Example 1: Mathematics Quiz Completion Certificate

**Setup:**
- Certificate Type: Quiz Participants
- Quiz: "Mathematics Challenge 2025"
- Template: Custom PDF with school logo

**Result:**
```
Serial: MT25/QPART/T15/000001
Recipient: Student Name
Quiz: Mathematics Challenge 2025
```

### Example 2: Science Quiz Top 3 Certificate

**Setup:**
- Certificate Type: Quiz Winners
- Quiz: "Science Olympiad"
- Winner Range: 1-3
- Template: Custom PDF with gold border

**Result:**
```
Serial: MT25/QWIN/T16/000001
Recipient: 1st Place Winner
Quiz: Science Olympiad
Award: 1st Place
```

## 📋 Rollback (If Needed)

### Step 1: Revert Database
```sql
-- Remove foreign key
ALTER TABLE cert_template 
DROP FOREIGN KEY fk_cert_template_quiz;

-- Remove index
ALTER TABLE cert_template 
DROP INDEX idx_cert_template_quizId;

-- Remove column
ALTER TABLE cert_template 
DROP COLUMN quizId;

-- Revert enum
ALTER TABLE cert_template 
MODIFY COLUMN targetType ENUM(
  'GENERAL',
  'EVENT_PARTICIPANT',
  'EVENT_WINNER',
  'NON_CONTEST_PARTICIPANT'
) DEFAULT 'GENERAL';
```

### Step 2: Revert Code
```bash
git revert <commit-hash>
git push
```

### Step 3: Redeploy
```bash
cd ~/apps/mt25
git pull
npm run build
npx prisma generate
pm2 restart mt25
```

## ✅ Deployment Checklist

- [ ] Database migration applied
- [ ] Database changes verified (enum, column, index, FK)
- [ ] Code deployed to production
- [ ] Dependencies installed
- [ ] Prisma client regenerated
- [ ] Application rebuilt
- [ ] PM2 restarted
- [ ] API endpoint accessible (`/api/quizzes`)
- [ ] UI shows quiz options
- [ ] Test template created successfully
- [ ] Serial numbers generated correctly
- [ ] Documentation reviewed

## 🎉 Success Indicators

✅ **Database:** quizId column exists, enum updated, indexes created
✅ **API:** `/api/quizzes` returns quiz list
✅ **UI:** Quiz options visible in template editor
✅ **Templates:** Can create and save quiz certificate templates
✅ **Serial Numbers:** Format `MT25/QPART/T{id}/000001` working
✅ **Generation:** Certificates generated with correct type codes

## 📚 Related Documentation

- `QUIZ_CERTIFICATE_FEATURE.md` - Complete feature documentation
- `add-quiz-certificate-support.sql` - Database migration script
- `SERIAL_NUMBER_TEMPLATE_ID_UPDATE.md` - Serial number format details

## 🆘 Support

If you encounter issues:

1. **Check Logs:**
   ```bash
   pm2 logs mt25 --lines 100
   ```

2. **Check Database:**
   ```bash
   mysql -u azham -p mtdb
   ```

3. **Verify Schema:**
   ```bash
   npx prisma db pull
   npx prisma generate
   ```

4. **Test API Directly:**
   ```bash
   curl -X GET https://techlympics.my/api/quizzes \
     -H "Cookie: your-session-cookie"
   ```

---

**Ready to deploy?** Follow the steps above in order. Each step should complete successfully before moving to the next.
