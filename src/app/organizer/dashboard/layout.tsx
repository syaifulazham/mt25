import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Organizer Portal",
  description: "Administrator dashboard for Techlympics 2025 event management",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
