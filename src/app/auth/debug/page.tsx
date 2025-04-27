'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export default function AuthDebugPage() {
  const { data: session, status } = useSession();
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/debug-auth');
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setApiData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Debug fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">Authentication Debug Page</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Client-Side Session Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Authenticated:</strong> {status === 'authenticated' ? 'Yes ✅' : 'No ❌'}</p>
            {session && (
              <div className="mt-4">
                <h3 className="font-medium">Session Data:</h3>
                <pre className="bg-slate-100 p-3 rounded-md text-sm mt-2 overflow-auto max-h-60">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="server">
        <TabsList>
          <TabsTrigger value="server">Server-Side Info</TabsTrigger>
          <TabsTrigger value="cookies">Cookies</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>
        
        <TabsContent value="server" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Server-Side Session</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && <p>Loading server data...</p>}
              {error && <p className="text-red-500">Error: {error}</p>}
              {apiData && (
                <div>
                  <p><strong>Server Session Exists:</strong> {apiData.session ? 'Yes ✅' : 'No ❌'}</p>
                  {apiData.session && (
                    <pre className="bg-slate-100 p-3 rounded-md text-sm mt-2 overflow-auto max-h-60">
                      {JSON.stringify(apiData.session, null, 2)}
                    </pre>
                  )}
                  
                  <p className="mt-4"><strong>Headers:</strong></p>
                  <pre className="bg-slate-100 p-3 rounded-md text-sm mt-2 overflow-auto max-h-40">
                    {JSON.stringify(apiData.headers, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cookies" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Cookie Information</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && <p>Loading cookie data...</p>}
              {error && <p className="text-red-500">Error: {error}</p>}
              {apiData && (
                <div>
                  <p><strong>Total Cookies:</strong> {apiData.cookies.count}</p>
                  <p><strong>Auth-Related Cookies:</strong> {apiData.cookies.authCookies.length}</p>
                  
                  {apiData.cookies.authCookies.length > 0 ? (
                    <div className="mt-4">
                      <h3 className="font-medium">Auth Cookies:</h3>
                      <pre className="bg-slate-100 p-3 rounded-md text-sm mt-2 overflow-auto max-h-60">
                        {JSON.stringify(apiData.cookies.authCookies, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-amber-600 mt-2">No auth cookies found! This is likely causing your auth issues.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="environment" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && <p>Loading environment data...</p>}
              {error && <p className="text-red-500">Error: {error}</p>}
              {apiData && (
                <div>
                  <pre className="bg-slate-100 p-3 rounded-md text-sm overflow-auto max-h-60">
                    {JSON.stringify(apiData.environment, null, 2)}
                  </pre>
                  
                  {!apiData.environment.NEXTAUTH_URL || apiData.environment.NEXTAUTH_URL === 'not set' ? (
                    <p className="text-red-600 mt-3">
                      ⚠️ NEXTAUTH_URL is not set. This is required for NextAuth to work correctly in production.
                    </p>
                  ) : null}
                  
                  {!apiData.environment.NEXTAUTH_SECRET || apiData.environment.NEXTAUTH_SECRET === 'not set' ? (
                    <p className="text-red-600 mt-3">
                      ⚠️ NEXTAUTH_SECRET is not set. This is required for NextAuth session security.
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="database" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Connection</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && <p>Loading database info...</p>}
              {error && <p className="text-red-500">Error: {error}</p>}
              {apiData && apiData.database && (
                <div>
                  <p><strong>Database Connected:</strong> {apiData.database.connected === 'yes' ? 'Yes ✅' : 'No ❌'}</p>
                  <p><strong>User Count:</strong> {apiData.database.userCount}</p>
                  
                  {apiData.database.sampleUserInfo && (
                    <div className="mt-4">
                      <h3 className="font-medium">Sample User Info:</h3>
                      <pre className="bg-slate-100 p-3 rounded-md text-sm mt-2 overflow-auto max-h-40">
                        {JSON.stringify(apiData.database.sampleUserInfo, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex space-x-4 mt-6">
        <Button onClick={fetchDebugData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Debug Data'}
        </Button>
        
        <Button variant="outline" onClick={() => window.location.href = '/auth/organizer/login'}>
          Go to Organizer Login
        </Button>
        
        <Button variant="outline" onClick={() => window.location.href = '/auth/participants/login'}>
          Go to Participant Login
        </Button>
      </div>
    </div>
  );
}
