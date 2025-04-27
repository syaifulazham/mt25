/**
 * Helper utilities for debugging session issues in production
 */
import { signIn, SignInOptions, SignInResponse } from 'next-auth/react';

/**
 * Enhanced signIn function that includes additional logging and debugging
 */
export async function debugSignIn(
  provider: string,
  options?: SignInOptions
): Promise<SignInResponse | undefined> {
  try {
    console.log(`[AUTH DEBUG] Attempting sign in with provider: ${provider}`);
    console.log(`[AUTH DEBUG] Callback URL: ${options?.callbackUrl || 'Not provided'}`);
    console.log(`[AUTH DEBUG] Redirect: ${options?.redirect === false ? 'Disabled' : 'Enabled'}`);
    
    // Check for existing cookies before signin
    const cookiesBefore = document.cookie;
    console.log(`[AUTH DEBUG] Cookies before signIn: ${cookiesBefore.length} characters`);
    
    // Record timing
    const startTime = performance.now();
    
    // Perform the actual sign in
    const result = await signIn(provider, { ...options, redirect: false });
    
    const endTime = performance.now();
    console.log(`[AUTH DEBUG] Sign in completed in ${Math.round(endTime - startTime)}ms`);
    
    // Check cookies after sign in
    const cookiesAfter = document.cookie;
    console.log(`[AUTH DEBUG] Cookies after signIn: ${cookiesAfter.length} characters`);
    console.log(`[AUTH DEBUG] Cookie change: ${cookiesAfter.length - cookiesBefore.length} characters`);
    
    // Log the result
    if (result?.error) {
      console.error(`[AUTH DEBUG] Sign in error: ${result.error}`);
    } else if (result?.url) {
      console.log(`[AUTH DEBUG] Sign in success, redirect URL: ${result.url}`);
    } else {
      console.log(`[AUTH DEBUG] Sign in result:`, result);
    }
    
    return result;
  } catch (error) {
    console.error('[AUTH DEBUG] Exception during sign in:', error);
    throw error;
  }
}

/**
 * Navigate with diagnostics after sign in
 */
export function performAuthRedirect(url: string, manualRedirect = true): void {
  try {
    console.log(`[AUTH DEBUG] Redirecting to: ${url}`);
    
    if (manualRedirect) {
      // Use a small delay to ensure cookies are properly set before redirect
      console.log(`[AUTH DEBUG] Using window.location.href with 500ms delay for redirect`);
      setTimeout(() => {
        // Log final cookies before redirect
        console.log(`[AUTH DEBUG] Cookies before redirect: ${document.cookie.length} characters`);
        window.location.href = url;
      }, 500);
    } else {
      console.log(`[AUTH DEBUG] Relying on NextAuth automatic redirect`);
    }
  } catch (error) {
    console.error('[AUTH DEBUG] Error during redirect:', error);
    // Fallback redirect
    window.location.href = url || '/';
  }
}
