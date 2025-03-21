import type { Metadata } from "next";
//import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

//

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
        className={`antialiased`}
      >
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
