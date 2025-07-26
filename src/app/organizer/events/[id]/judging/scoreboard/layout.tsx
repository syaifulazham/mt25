import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Judging Scoreboard | Techlympics 2025",
  description: "Live judging results and scoreboard for Techlympics 2025",
};

// This layout completely bypasses the organizer sidebar layout
// to provide a full-screen immersive experience like the judge results page
export default function JudgingScoreboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 min-h-screen bg-gradient-to-b from-blue-900 via-indigo-900 to-purple-900 text-white overflow-auto">
      {children}
    </div>
  );
}
