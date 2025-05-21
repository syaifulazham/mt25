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
  title: "Malaysia Techlympics 2025",
  description: "Extraordinary, Global, Inclusive. Malaysia Techlympics is a vital initiative that promotes the enculturation of Science, Technology, and Innovation (STI) across the nation. The annual Techlympics not only sparks interest in STI fields but also embeds the importance of innovation in the minds of young Malaysians. An initiative under the Ministry of Science, Technology and Innovation (MOSTI)",
  keywords: "techlympics, malaysia, stem, robotic, csi, ez rover, metaverse, robot tempur, quizathon, kampung angkat, redbrick, ez bot, maicy, techlympian, g-rover, kereta roket, skytech, cetakan 3d, bioekonomi, liga dron, innovathon",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
