import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import DevAuthProvider from "@/components/dev/auth-provider";
import AuthSessionProvider from "@/providers/session-provider";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { CookieConsent } from "@/components/cookie-consent";

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: "Techlympics 2025",
  description: "Where Technology Meets Olympic Spirit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body 
        className={`antialiased ${poppins.className}`}
      >
        <Toaster position="top-right" />
        <AuthSessionProvider>
          <LanguageProvider>
            <DevAuthProvider>
              {children}
              <CookieConsent />
            </DevAuthProvider>
          </LanguageProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
