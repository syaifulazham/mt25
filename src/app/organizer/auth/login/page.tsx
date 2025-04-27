// Redirect page for backward compatibility
import { redirect } from 'next/navigation';

export const metadata = {
  title: "Login | Organizer Portal",
  description: "Login to the Techlympics 2025 Organizer Portal",
};

// Mark this page as dynamic to ensure it's always fresh
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Convert search params to URL search params string
  const params = new URLSearchParams();
  
  // Add all search parameters to the redirect URL
  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === 'string') {
      params.append(key, value);
    } else if (Array.isArray(value)) {
      value.forEach(v => params.append(key, v));
    }
  });
  
  const queryString = params.toString();
  const redirectUrl = `/auth/organizer/login${queryString ? `?${queryString}` : ''}`;
  
  // Redirect to the new unified auth path
  redirect(redirectUrl);
}
