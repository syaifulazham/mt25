import { Metadata } from "next";
import StaticLogin from "../organizer/auth/static-login";

// Force all rendering options to be dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Login | Techlympics 2025",
  description: "Login to the Techlympics 2025 Portal",
};

// Simple page with minimal dependencies
export default function EmergencyLoginPage() {
  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      backgroundColor: "#f5f5f7" 
    }}>
      <StaticLogin />
    </div>
  );
}
