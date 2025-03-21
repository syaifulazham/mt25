'use client';

import { useRouter } from 'next/navigation';

export default function NewTemplatePage() {
  const router = useRouter();
  
  // Redirect to the template detail page with 'new' ID
  // This allows us to reuse the template detail page for creation
  router.push('/organizer/judging-templates/new');
  
  return (
    <div className="p-6 flex items-center justify-center h-[60vh]">
      <p className="text-muted-foreground">Redirecting to template creation...</p>
    </div>
  );
}
