// This ensures all routes under /api are always rendered dynamically
// and never statically generated during build time
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
