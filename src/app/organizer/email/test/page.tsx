"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Send, CheckCircle, XCircle } from "lucide-react";

interface EmailTestForm {
  to: string;
  subject: string;
  message: string;
}

interface EmailTestResult {
  success: boolean;
  message: string;
  details?: any;
}

interface SMTPConfig {
  service: string | null;
  host: string | null;
  port: string | null;
  secure: string | null;
  emailUser: string | null;
  emailPass: string | null;
}

interface SMTPConfigResponse {
  configured: boolean;
  config: SMTPConfig;
  status: string;
}

export default function EmailTestPage() {
  const [form, setForm] = useState<EmailTestForm>({
    to: "",
    subject: "Email Test from Techlympics 2025",
    message: "This is a test email sent from the Techlympics 2025 organizer portal. If you receive this, the email configuration is working correctly."
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EmailTestResult | null>(null);
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Fetch SMTP configuration on component mount
  useEffect(() => {
    const fetchSmtpConfig = async () => {
      try {
        const response = await fetch("/api/organizer/email/test");
        const data: SMTPConfigResponse = await response.json();
        setSmtpConfig(data.config);
      } catch (error) {
        console.error("Failed to fetch SMTP configuration:", error);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchSmtpConfig();
  }, []);

  const handleInputChange = (field: keyof EmailTestForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/organizer/email/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      
      setResult({
        success: response.ok,
        message: data.message || (response.ok ? "Email sent successfully!" : "Failed to send email"),
        details: data.details || data.error
      });
    } catch (error) {
      setResult({
        success: false,
        message: "Network error occurred while sending email",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = form.to.trim() && form.subject.trim() && form.message.trim();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Email Test</h1>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Email Test Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Test Email
            </CardTitle>
            <CardDescription>
              Test your SMTP configuration by sending a test email. This will use the SMTP settings configured in your environment variables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="to">Recipient Email *</Label>
                <Input
                  id="to"
                  type="email"
                  placeholder="recipient@example.com"
                  value={form.to}
                  onChange={(e) => handleInputChange("to", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder="Email subject"
                  value={form.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Email message content"
                  value={form.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  rows={6}
                  required
                />
              </div>

              <Button 
                type="submit" 
                disabled={!isFormValid || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Test Email
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* SMTP Configuration Info */}
        <Card>
          <CardHeader>
            <CardTitle>SMTP Configuration</CardTitle>
            <CardDescription>
              Current SMTP settings from environment variables
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {configLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading configuration...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Service:</strong>
                  <div className="text-muted-foreground">
                    {smtpConfig?.service || "Not configured"}
                  </div>
                </div>
                <div>
                  <strong>Host:</strong>
                  <div className="text-muted-foreground">
                    {smtpConfig?.host || "Not configured"}
                  </div>
                </div>
                <div>
                  <strong>Port:</strong>
                  <div className="text-muted-foreground">
                    {smtpConfig?.port || "Not configured"}
                  </div>
                </div>
                <div>
                  <strong>Secure:</strong>
                  <div className="text-muted-foreground">
                    {smtpConfig?.secure || "Not configured"}
                  </div>
                </div>
              </div>
            )}
            
            <Alert>
              <AlertDescription>
                <strong>Note:</strong> For security reasons, EMAIL_USER and EMAIL_PASS are not displayed here. 
                Make sure these are properly configured in your environment variables.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Test Result */}
      {result && (
        <Card className={result.success ? "border-green-200" : "border-red-200"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Test Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">{result.message}</div>
                  {result.details && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Details:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">
                        {typeof result.details === 'string' 
                          ? result.details 
                          : JSON.stringify(result.details, null, 2)
                        }
                      </pre>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
