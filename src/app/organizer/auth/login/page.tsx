import { Metadata } from "next";
import LoginPageClient from "./_components/login-page-client";

export const metadata: Metadata = {
  title: "Login | Organizer Portal",
  description: "Login to the Techlympics 2025 Organizer Portal",
};

export default function LoginPage() {
  return <LoginPageClient />;
}
