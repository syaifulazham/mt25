"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function TestManagerPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [managerData, setManagerData] = useState({
    name: "Test Manager",
    ic: "123456789012",
    teamId: null
  });

  // Run diagnostic test
  const runDiagnostic = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/diagnostic');
      const data = await response.json();
      setDiagnosticResult(data);
      toast.success("Diagnostic completed");
    } catch (error) {
      console.error("Diagnostic error:", error);
      toast.error("Diagnostic failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Test direct manager creation
  const testCreateManager = async () => {
    setIsLoading(true);
    try {
      // Generate a simple hashcode with a timestamp to ensure uniqueness
      const timestamp = new Date().getTime();
      const hashcode = `test-${timestamp.toString(36)}`;
      
      // Add more variety in test data to prevent potential duplicate issues
      const testData = {
        ...managerData,
        name: `${managerData.name} ${timestamp.toString(36).substring(0, 4)}`,
        hashcode,
        // Set teamId to explicit null rather than undefined
        teamId: null
      };
      
      console.log("Attempting to create manager with:", testData);
      
      // Try direct database insert
      const response = await fetch('/api/participants/managers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });
      
      const data = await response.json();
      setDiagnosticResult({ response: data });
      
      if (response.ok) {
        toast.success("Manager created successfully");
        console.log("Created manager:", data);
      } else {
        toast.error(data.error || "Failed to create manager");
        console.error("API error:", data);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to test manager creation");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Direct database test for emergencies
  const testDirectSql = async () => {
    setIsLoading(true);
    try {
      // This is a direct diagnostic endpoint that will try to create a manager with raw SQL
      const response = await fetch('/api/diagnostic?action=create_manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: "Emergency Test Manager",
          ic: "111122223333",
          hashcode: `emerg-${Date.now().toString(36)}`,
        }),
      });
      
      const data = await response.json();
      setDiagnosticResult(data);
      
      toast.success("Direct SQL test completed");
    } catch (error) {
      console.error("Error with direct SQL:", error);
      toast.error("Failed to run direct SQL test");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Manager System Test</h1>
      
      <div className="grid gap-6">
        {/* Diagnostic Card */}
        <Card>
          <CardHeader>
            <CardTitle>System Diagnostic</CardTitle>
            <CardDescription>Run diagnostics to check system state</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button onClick={runDiagnostic} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : "Run Diagnostic"}
              </Button>
              
              <Button onClick={testDirectSql} disabled={isLoading} variant="outline">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : "Emergency SQL Test"}
              </Button>
            </div>
            
            {diagnosticResult && (
              <div className="mt-4 p-4 bg-slate-100 rounded-md text-sm overflow-auto max-h-80">
                <pre>{JSON.stringify(diagnosticResult, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Test Manager Creation */}
        <Card>
          <CardHeader>
            <CardTitle>Test Manager Creation</CardTitle>
            <CardDescription>Attempt to create a test manager</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={managerData.name}
                  onChange={(e) => setManagerData({...managerData, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="ic">IC Number (12 digits)</Label>
                <Input 
                  id="ic" 
                  value={managerData.ic}
                  onChange={(e) => setManagerData({...managerData, ic: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href="/participants/managers">
              <Button variant="outline">Back to Managers</Button>
            </Link>
            <Button onClick={testCreateManager} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : "Test Create Manager"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
