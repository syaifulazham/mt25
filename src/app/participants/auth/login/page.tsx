import { Metadata } from "next";
import LoginPageClient from "@/app/participants/auth/login/_components/login-page-client";

export const metadata: Metadata = {
  title: "Login | Techlympics 2025 Participant Portal",
  description: "Login to your Techlympics 2025 participant account",
};

export default function LoginPage() {
  return <LoginPageClient />;
}
