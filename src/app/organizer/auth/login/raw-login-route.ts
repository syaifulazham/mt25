import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Mark as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// Handler for GET requests
export async function GET() {
  try {
    // Get the path to the HTML file
    const htmlPath = path.join(process.cwd(), "src", "app", "organizer", "auth", "login", "raw-login-page.html");
    
    // Read the HTML file
    const html = fs.readFileSync(htmlPath, "utf-8");
    
    // Return the HTML content with the appropriate headers
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error serving login page:", error);
    return NextResponse.json({ error: "Failed to load login page" }, { status: 500 });
  }
}
