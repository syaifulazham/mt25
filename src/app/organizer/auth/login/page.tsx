import { Metadata } from "next";
import LoginPageClient from "./_components/login-page-client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login | Organizer Portal",
  description: "Login to the Techlympics 2025 Organizer Portal",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string; message?: string };
}) {
  try {
    // Check if user is already logged in
    const session = await getServerSession(authOptions);
    
    // If already authenticated, redirect to dashboard
    if (session?.user) {
      redirect(searchParams.redirect || "/organizer/dashboard");
    }
  } catch (error) {
    // If there's an error with the session, we'll just show the login page
    console.error("Session error:", error);
  }
  
  return <LoginPageClient />;
}
