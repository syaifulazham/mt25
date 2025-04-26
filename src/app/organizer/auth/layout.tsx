import { Metadata } from "next";

// Force dynamic rendering for auth layout
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Authentication | Techlympics 2025",
  description: "Authentication for the Techlympics 2025 Organizer Portal",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 bg-background">
        {children}
      </main>
    </div>
  );
}
