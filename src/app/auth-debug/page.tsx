"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function AuthDebugPage() {
  const { data: session, status } = useSession();
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/debug');
      const data = await response.json();
      setApiData(data);
    } catch (err) {
      setError('Failed to fetch debug data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  return (
    <div className="container mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Authentication Debug</h1>
      <p className="text-muted-foreground">
        This page displays information about your current authentication status.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Client-Side Session</CardTitle>
          <CardDescription>Information from useSession() hook</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Status</h3>
              <p className={`${status === 'authenticated' ? 'text-green-600' : status === 'loading' ? 'text-amber-600' : 'text-red-600'}`}>
                {status}
              </p>
            </div>

            {session ? (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium">User</h3>
                  <pre className="bg-slate-100 p-4 rounded-md overflow-auto text-sm mt-2">
                    {JSON.stringify(session.user, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="font-medium">Session Expires</h3>
                  <p>{new Date(session.expires).toLocaleString()}</p>
                </div>
              </>
            ) : status !== 'loading' && (
              <p className="text-muted-foreground">No active session</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Server-Side Session</CardTitle>
          <CardDescription>Information from API route</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : (
              <>
                <div>
                  <h3 className="font-medium">Environment Variables</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {apiData?.environment && Object.entries(apiData.environment).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="font-mono text-sm">{key}:</span>
                        <span className={`text-sm ${String(value).includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium">Server Session</h3>
                  {apiData?.session ? (
                    <pre className="bg-slate-100 p-4 rounded-md overflow-auto text-sm mt-2">
                      {JSON.stringify(apiData.session, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground">No active session on server</p>
                  )}
                </div>
              </>
            )}

            <Button onClick={fetchDebugData} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
