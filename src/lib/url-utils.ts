import { headers } from 'next/headers';

/**
 * Gets the base URL for the application, working in both development and production environments
 * 
 * This function uses the request headers to determine the host and protocol
 * when making server-side API calls from server components
 * 
 * @returns {string} The base URL (e.g., http://localhost:3000 or https://techlympics.my)
 */
export function getBaseUrl() {
  // In most cases, we'll use headers to determine the base URL
  const headersList = headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  
  // Check for Next.js environment variable
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback to headers
  return `${protocol}://${host}`;
}

/**
 * Constructs an absolute URL for API calls or navigation
 * 
 * @param {string} path - The relative path (e.g., '/api/users')
 * @returns {string} The absolute URL
 */
export function getAbsoluteUrl(path: string) {
  const baseUrl = getBaseUrl();
  // Ensure path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
