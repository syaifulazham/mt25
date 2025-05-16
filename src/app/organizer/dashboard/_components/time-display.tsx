"use client";

import { useEffect, useState } from "react";

// Component for displaying formatted date using client's local time
export function FormattedDate({ 
  date, 
  format = "medium" 
}: { 
  date: Date | string | null;
  format?: "full" | "long" | "medium" | "short" | "relative";
}) {
  const [formattedDate, setFormattedDate] = useState<string>("Loading...");
  
  useEffect(() => {
    if (!date) {
      setFormattedDate("N/A");
      return;
    }
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (format === "relative") {
      setFormattedDate(formatRelativeTime(dateObj));
    } else {
      const options: Intl.DateTimeFormatOptions = getDateFormatOptions(format);
      setFormattedDate(dateObj.toLocaleDateString(undefined, options));
    }
  }, [date, format]);
  
  return <span>{formattedDate}</span>;
}

// Component for displaying current date
export function TodayDate({
  format = "full"
}: {
  format?: "full" | "long" | "medium" | "short";
}) {
  const [today, setToday] = useState<string>("Loading...");
  
  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = getDateFormatOptions(format);
    setToday(new Date().toLocaleDateString(undefined, options));
    
    // Update every minute to keep it current
    const timer = setInterval(() => {
      setToday(new Date().toLocaleDateString(undefined, options));
    }, 60000);
    
    return () => clearInterval(timer);
  }, [format]);
  
  return <span>{today}</span>;
}

// Helper function to format relative time (e.g., "5 minutes ago")
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 172800) return "Yesterday";
  
  // For older dates, use standard date format
  return date.toLocaleDateString();
}

// Helper function to get date format options based on format string
function getDateFormatOptions(format: "full" | "long" | "medium" | "short"): Intl.DateTimeFormatOptions {
  switch (format) {
    case "full":
      return { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      };
    case "long":
      return { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      };
    case "medium":
      return { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      };
    case "short":
      return { 
        day: 'numeric', 
        month: 'numeric', 
        year: 'numeric' 
      };
  }
}
