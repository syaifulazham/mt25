import { Metadata } from "next";
import SimpleLoginForm from "./simple-login";

// Force all rendering options to be dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Login | Organizer Portal",
  description: "Login to the Techlympics 2025 Organizer Portal",
};

// Use a client component directly without server-side logic
export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100">
      <SimpleLoginForm />
    </div>
  );
}
