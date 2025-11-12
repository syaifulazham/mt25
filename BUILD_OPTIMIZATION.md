# Build Memory Optimization Guide

## Current Configuration

### Memory Allocation
- **Heap Size**: 8GB (`--max-old-space-size=8192`)
- **Output Mode**: Standalone (reduces static generation)
- **Source Maps**: Disabled in production
- **Minification**: Terser (instead of SWC)

### Webpack Optimizations
- **Parallelism**: Limited to 1 (reduces concurrent memory usage)
- **Cache**: Disabled during build (prevents memory accumulation)
- **Chunk Splitting**: Aggressive (244kb max size)
- **Code Splitting**: Enabled for vendor and common chunks

## If Build Still Fails

### Option 1: Increase Memory to 12GB
```json
"build": "NODE_OPTIONS='--max-old-space-size=12288' next build"
```

### Option 2: Force Dynamic Rendering for Heavy Pages

Add this line to the top of problematic pages (after imports):
```typescript
export const dynamic = 'force-dynamic'
```

**Likely problematic pages (based on size/complexity):**
- `/src/app/organizer/contingents/[id]/page.tsx` (very large file)
- `/src/app/organizer/events/[id]/certificates/winners/page.tsx` (2473 lines)
- `/src/app/organizer/events/[id]/page.tsx` (complex event page)
- `/src/app/organizer/events/[id]/reports/*/page.tsx` (report pages with data)
- `/src/app/organizer/certificates/templates/[id]/generate/page.tsx`

### Option 3: Clear All Caches
```bash
rm -rf .next
rm -rf node_modules/.cache
rm -rf .swc
npm run build
```

### Option 4: Build in Stages
```bash
# Build with minimal features first
NODE_OPTIONS='--max-old-space-size=8192' next build 2>&1 | tee build.log

# Check which page failed
tail build.log
```

## Server Requirements

Your server needs:
- **Minimum**: 8GB RAM available
- **Recommended**: 12GB+ RAM for comfortable builds
- Swap space enabled for temporary overflow

## Alternative: Build Locally
If server resources are limited:
1. Build on local machine with more RAM
2. Copy `.next` folder to server
3. Run `npm start` on server (much less memory needed)

## Monitor Memory During Build
```bash
watch -n 1 free -h
```

## Production Deployment Note
Once built, the app runs with much less memory (~512MB-1GB typically).
The high memory is only needed during the build phase due to:
- TypeScript compilation
- Static page generation
- Bundle optimization
- Multiple concurrent processes
