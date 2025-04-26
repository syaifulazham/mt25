import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard | Organizer Portal",
  description: "Administrator dashboard for Techlympics 2025 event management",
};

export default async function DashboardPage() {
  // Get the session using Next Auth
  const session = await getServerSession(authOptions);
  
  // If not authenticated, redirect to login
  if (!session || !session.user) {
    redirect("/organizer/auth/login?redirect=/organizer/dashboard");
  }

  // Get user from session
  const user = session.user;

  return (
    <div className="flex min-h-screen">
      {/* Main content */}
      <main className="flex-1 bg-background">
        <div className="py-6">
          <div className="px-6">
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, {user.name || "User"}
            </p>
          </div>
          <div className="px-6 py-6">
            {/* Dashboard cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Contests */}
              <div className="bg-card rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <h2 className="text-sm font-medium text-muted-foreground">Total Contests</h2>
                    <div className="mt-2 text-3xl font-semibold text-card-foreground">12</div>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    {/* Icon placeholder */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Registered Participants */}
              <div className="bg-card rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <h2 className="text-sm font-medium text-muted-foreground">Registered Participants</h2>
                    <div className="mt-2 text-3xl font-semibold text-card-foreground">1,234</div>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    {/* Icon placeholder */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="bg-card rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <h2 className="text-sm font-medium text-muted-foreground">Upcoming Events</h2>
                    <div className="mt-2 text-3xl font-semibold text-card-foreground">8</div>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    {/* Icon placeholder */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Active Judging Sessions */}
              <div className="bg-card rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <h2 className="text-sm font-medium text-muted-foreground">Active Judging</h2>
                    <div className="mt-2 text-3xl font-semibold text-card-foreground">3</div>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    {/* Icon placeholder */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent activity */}
            <div className="mt-8">
              <h2 className="text-lg font-medium text-foreground mb-4">Recent Activity</h2>
              <div className="bg-card rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <div className="space-y-6">
                    {/* Activity item */}
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="text-sm font-medium text-card-foreground">New contest created: Programming Challenge 2025</div>
                        <div className="mt-1 text-xs text-muted-foreground">2 hours ago by Admin</div>
                      </div>
                    </div>

                    {/* Activity item */}
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="text-sm font-medium text-card-foreground">25 new participants registered</div>
                        <div className="mt-1 text-xs text-muted-foreground">5 hours ago</div>
                      </div>
                    </div>

                    {/* Activity item */}
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="text-sm font-medium text-card-foreground">Event scheduled: National Finals - Kuala Lumpur</div>
                        <div className="mt-1 text-xs text-muted-foreground">Yesterday at 3:45 PM by Operator</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
