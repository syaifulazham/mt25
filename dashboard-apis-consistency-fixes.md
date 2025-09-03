# Dashboard APIs Consistency Fixes

## Problem Statement
The dashboard displayed inconsistent data between different sections because:
- Some APIs counted distinct schools or contingents
- Some APIs counted distinct contestants 
- Some APIs counted actual contest participations

This inconsistency made the dashboard sections (PPD distribution, school categories, education levels, gender distribution) show different totals than the main contest participation count.

## Fixed APIs

### 1. School PPD Distribution API
**File:** `/src/app/api/dashboard/school-ppd-distribution/route.ts`
**Issue:** Counted distinct contingents instead of contest participations
**Fix:** Updated SQL query to count contestParticipation records joined through contestant and contingent tables

### 2. School Categories API
**File:** `/src/app/api/dashboard/school-categories/route.ts` and `/src/app/api/dashboard/school-category/route.ts`
**Issue:** Counted distinct schools or contingents instead of contest participations
**Fix:** Updated SQL queries to count contestParticipation records for both general and state-specific queries

### 3. Education Levels API
**File:** `/src/app/api/dashboard/education-levels/route.ts` and `/src/app/api/dashboard/education-level/route.ts`
**Issue:** Counted distinct contestants instead of contest participations
**Fix:** Updated SQL queries to count contestParticipation records joined with contestants table

### 4. Gender Distribution API
**File:** `/src/app/api/dashboard/gender-distribution/route.ts`
**Issue:** Counted distinct contestants instead of contest participations
**Fix:** Updated SQL queries to count contestParticipation records for both general and state-specific queries

## Other Important Fixes
- Converted BigInt counts to Numbers to avoid JSON serialization errors
- Maintained proper joining logic through contestParticipation → contestant → contingent → school
- Applied consistent filtering with appropriate WHERE clauses
- Created test scripts for all modified APIs for validation

## Test Scripts
1. `test-school-ppd-distribution.sh`
2. `test-school-category-api.sh`
3. `test-education-levels-api.sh`
4. `test-gender-distribution-api.sh`

## Consistent Data Model
All dashboard APIs now use the same counting methodology:
```sql
SELECT 
  [group_field], 
  COUNT(cp.id) as count
FROM 
  contestParticipation cp
JOIN 
  contestant cnt ON cp.contestantId = cnt.id
JOIN 
  contingent c ON cnt.contingentId = c.id
-- Additional joins as needed
GROUP BY 
  [group_field]
```

This ensures consistent totals across all dashboard sections, matching the main contest participation count.
