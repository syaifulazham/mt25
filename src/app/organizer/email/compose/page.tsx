"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, ArrowLeft } from "lucide-react";

interface EmailTemplate {
  id: number;
  template_name: string;
  title: string;
  subject: string;
  content: string;
  available_placeholders: string | null;
}

interface EmailForm {
  recipient_email: string;
  subject: string;
  content: string;
  placeholders: Record<string, string>;
}

export default function ComposeEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");
  
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [availablePlaceholders, setAvailablePlaceholders] = useState<string[]>([]);
  
  const [form, setForm] = useState<EmailForm>({
    recipient_email: "",
    subject: "",
    content: "",
    placeholders: {}
  });

  // Fetch template if templateId is provided
  useEffect(() => {
    if (templateId) {
      fetchTemplate(templateId);
    }
  }, [templateId]);

  async function fetchTemplate(id: string) {
    setLoading(true);
    try {
      const response = await fetch(`/api/organizer/email/templates/${id}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch template");
      }
      
      const templateData = await response.json();
      setTemplate(templateData);
      setForm(prev => ({
        ...prev,
        subject: templateData.subject,
        content: templateData.content
      }));

      // Parse available placeholders
      if (templateData.available_placeholders) {
        const placeholders = templateData.available_placeholders
          .split(",")
          .map((p: string) => p.trim())
          .filter(Boolean);
        
        setAvailablePlaceholders(placeholders);
        
        // Initialize placeholders object
        const placeholderValues: Record<string, string> = {};
        placeholders.forEach(p => {
          placeholderValues[p] = "";
        });
        
        setForm(prev => ({
          ...prev,
          placeholders: placeholderValues
        }));
      }
    } catch (err) {
      console.error("Error fetching template:", err);
      setError("Failed to load template. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (field: keyof EmailForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePlaceholderChange = (placeholder: string, value: string) => {
    setForm(prev => ({
      ...prev,
      placeholders: {
        ...prev.placeholders,
        [placeholder]: value
      }
    }));
  };

  const replacePlaceholders = (content: string, placeholders: Record<string, string>) => {
    let result = content;
    for (const [key, value] of Object.entries(placeholders)) {
      result = result.replace(new RegExp(`{${key}}`, "g"), value || `{${key}}`);
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      // Replace placeholders in content
      const processedContent = replacePlaceholders(form.content, form.placeholders);

      const response = await fetch("/api/organizer/email/outgoing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: template?.id || null,
          recipient_email: form.recipient_email,
          subject: form.subject,
          content: processedContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send email");
      }

      setSuccess(true);
      // Reset form
      setForm(prev => ({
        ...prev,
        recipient_email: ""
      }));
    } catch (error) {
      console.error("Error sending email:", error);
      setError(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Button
        variant="outline"
        onClick={() => router.push("/organizer/email/templates")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Templates
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {template ? `Compose Email from Template: ${template.template_name}` : "Compose Email"}
          </CardTitle>
        </CardHeader>
        {loading ? (
          <CardContent className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading template...</span>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <AlertDescription>
                    Email sent successfully!
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="recipient_email">Recipient Email</Label>
                <Input
                  id="recipient_email"
                  type="email"
                  placeholder="recipient@example.com"
                  value={form.recipient_email}
                  onChange={(e) => handleInputChange("recipient_email", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Email Subject"
                  value={form.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  required
                />
              </div>
              
              {availablePlaceholders.length > 0 && (
                <div className="space-y-2">
                  <Label>Placeholders</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availablePlaceholders.map(placeholder => (
                      <div key={placeholder} className="space-y-1">
                        <Label htmlFor={`placeholder-${placeholder}`} className="text-sm">
                          {placeholder}
                        </Label>
                        <Input
                          id={`placeholder-${placeholder}`}
                          placeholder={`Value for ${placeholder}`}
                          value={form.placeholders[placeholder] || ""}
                          onChange={(e) => handlePlaceholderChange(placeholder, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="content">Email Content (HTML)</Label>
                <div className="border rounded-md p-2 bg-muted">
                  <div className="max-h-96 overflow-y-auto">
                    <iframe 
                      srcDoc={replacePlaceholders(form.content, form.placeholders)}
                      title="Email Preview"
                      className="w-full h-96 border-0"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/organizer/email/templates")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Send Email
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
