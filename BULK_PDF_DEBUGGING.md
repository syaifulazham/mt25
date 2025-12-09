# Bulk PDF Generation - Debugging Guide

## Issue
The bulk generate & download is triggered but not responding at `http://localhost:3000/api/certificates/bulk-generate-pdf`

## Changes Made to Debug

### 1. Backend API Improvements (`/src/app/api/certificates/bulk-generate-pdf/route.ts`)

**Route Configuration Added:**
```typescript
export const maxDuration = 300 // 5 minutes timeout
export const dynamic = 'force-dynamic' // Always run dynamically
```

**Comprehensive Logging Added:**
- Request details (certificate IDs, save to server option)
- Certificate processing progress (with counter)
- PDF generation for each certificate
- Template file validation
- ZIP archive creation
- Final buffer sizes
- Response sending

**Archiver Event Handling Fixed:**
- Set up promise-based event handling BEFORE finalizing archive
- Proper 'end' and 'error' event listeners
- Better async/await flow

### 2. Frontend Improvements (`/src/app/organizer/certificates/_components/CertificateList.tsx`)

**Console Logging Added:**
- Request initiation
- Selected certificates array
- Response status and headers
- Blob conversion
- Download trigger
- Error details

## How to Debug

### Step 1: Open Browser DevTools
1. Open Chrome DevTools (F12 or Cmd+Option+I on Mac)
2. Go to **Console** tab
3. Go to **Network** tab

### Step 2: Trigger Bulk Generation
1. Select 1-2 certificates (start small for testing)
2. Click "Generate & Download PDFs"
3. Watch for console logs

### Step 3: Check Console Logs

**Expected Frontend Logs:**
```
Starting bulk PDF generation...
Selected certificates: [1352, 113563]
Save to server: true
Sending request to API...
Response received: 200 OK
Response headers: {...}
Generation results: { totalCerts: 2, successCount: 2, failedCount: 0 }
Converting response to blob...
Blob size: 45678 bytes
Triggering download: certificates-bulk-1733739123456.zip
Download triggered successfully
```

**Expected Backend Logs (Terminal):**
```
Starting bulk PDF generation for 2 certificates
Certificate IDs: 1352, 113563
Save to server: true
Processing 2 certificates...
[1/2] Processing certificate 1352 - John Doe
  ✓ Added John_Doe_CERT-ABC123.pdf to ZIP (23456 bytes)
  ✓ Updated certificate 1352 status to READY
[2/2] Processing certificate 113563 - Jane Smith
  ✓ Added Jane_Smith_CERT-DEF456.pdf to ZIP (22345 bytes)
  ✓ Updated certificate 113563 status to READY

=== Generation Summary ===
Total: 2
Successful: 2
Failed: 0
=========================

Finalizing archive...
Archive finalized
Total chunks collected: 15, total bytes: 45678
Final ZIP buffer size: 45678 bytes
Returning ZIP file to client...
```

### Step 4: Check Network Tab

**Look for:**
1. Request to `/api/certificates/bulk-generate-pdf`
2. Method: POST
3. Status: Should be `200` when successful
4. Response headers should include:
   - `Content-Type: application/zip`
   - `X-Total-Certificates: 2`
   - `X-Successful-Count: 2`
   - `X-Failed-Count: 0`
5. Response size should match ZIP file size

### Step 5: Common Issues & Solutions

#### Issue: Request Times Out
**Symptoms:**
- Browser shows "Request timed out"
- No response after long wait

**Solutions:**
- Check if certificate templates exist (see logs for "Template PDF not found")
- Reduce number of certificates (test with 1-2 first)
- Check server memory/resources

#### Issue: Response Not OK (Status 403)
**Symptoms:**
- Console shows "Response not OK: 403"
- Error: "Unauthorized access"

**Solution:**
- Ensure you're logged in as ADMIN or OPERATOR
- Check session is valid
- Refresh page and try again

#### Issue: Response Not OK (Status 400)
**Symptoms:**
- Console shows "Response not OK: 400"
- Error: "Certificate IDs array is required"

**Solution:**
- Check frontend is sending correct data format
- Verify selectedCertificates state is not empty
- Check console log for "Selected certificates" array

#### Issue: All Certificates Failed
**Symptoms:**
- Console shows error with list of failures
- Common error: "Template PDF file not found"

**Solutions:**
1. **Check Template Files:**
   ```bash
   # In terminal, check if template files exist
   ls -la public/uploads/templates/
   ```

2. **Verify Database Paths:**
   - Go to Templates page
   - Check each template's PDF is uploaded
   - Re-upload missing PDFs

3. **Test Individual Certificate:**
   - Try generating one certificate at a time
   - Click "View" on certificate to check template

#### Issue: Archive Not Finalizing
**Symptoms:**
- Backend logs show "Finalizing archive..." but never "Archive finalized"
- Request hangs indefinitely

**Solution:**
- This was the main issue fixed
- The archiver promise should now resolve properly
- If still happening, check archiver version:
  ```bash
  npm list archiver
  ```

#### Issue: Blob Size is 0
**Symptoms:**
- Console shows "Blob size: 0 bytes"
- Downloaded ZIP is empty or corrupt

**Solutions:**
- Check backend logs for "Final ZIP buffer size"
- If backend shows 0 bytes, archive didn't collect data
- Check if PDFs were actually added to archive (look for "Added ... to ZIP" logs)

#### Issue: Download Not Triggered
**Symptoms:**
- All logs look good but file doesn't download
- Browser may be blocking download

**Solutions:**
1. **Check Browser Settings:**
   - Allow downloads from localhost
   - Check if popup blocker is active

2. **Check Download Folder:**
   - File might have downloaded to different folder
   - Search for `certificates-bulk-*.zip`

3. **Try Different Browser:**
   - Test in Chrome if using Safari
   - Test in incognito/private mode

### Step 6: Testing Scenarios

#### Test 1: Single Certificate (Valid Template)
```
1. Select 1 certificate with valid template
2. Click Generate & Download
3. Expected: Success, 1 PDF in ZIP
```

#### Test 2: Multiple Certificates (All Valid)
```
1. Select 2-3 certificates with valid templates
2. Click Generate & Download
3. Expected: Success, all PDFs in ZIP
```

#### Test 3: Mixed Valid/Invalid
```
1. Select 2 certificates: 1 valid, 1 with missing template
2. Click Generate & Download
3. Expected: Partial success
   - ZIP contains 1 PDF + metadata.json
   - Warning message about 1 failure
   - metadata.json shows details
```

#### Test 4: All Invalid
```
1. Select 2 certificates with missing templates
2. Click Generate & Download
3. Expected: Error message
   - No ZIP download
   - Error lists all failures
   - Selection not cleared (can fix and retry)
```

### Step 7: Performance Monitoring

**For Large Batches (10+ certificates):**

1. **Monitor Memory:**
   ```bash
   # Check Node.js memory usage
   ps aux | grep node
   ```

2. **Monitor Request Time:**
   - Network tab shows request duration
   - Should be ~500ms per certificate + ZIP overhead
   - 10 certificates ≈ 5-10 seconds

3. **Check Disk Space:**
   ```bash
   df -h
   ```

### Step 8: Fix Template Issues

**If many certificates have missing templates:**

1. **Identify Affected Template:**
   - Check error logs for template ID
   - Find template in database or admin panel

2. **Re-upload Template:**
   - Go to Templates page
   - Click Edit on affected template
   - Upload PDF file
   - Save

3. **Verify Fix:**
   - Go back to Certificates
   - Select one failed certificate
   - Try generating again (should work now)

4. **Bulk Retry:**
   - Select all previously failed certificates
   - Generate again (should all succeed)

## Quick Diagnostics

**Run this in browser console to check state:**
```javascript
// Check selected certificates
console.log('Selected:', window.selectedCertificates?.size)

// Check if modal is open
console.log('Modal open:', window.showBulkModal)

// Check generating state
console.log('Is generating:', window.isBulkGenerating)
```

**Check API is reachable:**
```bash
# In terminal
curl -X POST http://localhost:3000/api/certificates/bulk-generate-pdf \
  -H "Content-Type: application/json" \
  -d '{"certificateIds":[]}'

# Should return 400 error (expected - empty array)
# If connection refused, server is down
```

## Contact Points

**If issue persists:**
1. Copy ALL console logs (frontend + backend)
2. Note exact steps to reproduce
3. Include:
   - Number of certificates selected
   - Certificate IDs
   - Template types
   - Browser used
   - Error messages

**Logs to Include:**
- Browser console (full output)
- Terminal/server logs (full output)
- Network tab screenshot
- Any error modal screenshots

---

**Status:** Debugging mode active with comprehensive logging
**Version:** 2.0 (with archiver fix)
**Last Updated:** December 9, 2025
