"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, ArrowLeft } from "lucide-react";

interface EmailTemplateForm {
  template_name: string;
  title: string;
  subject: string;
  content: string;
  notes: string;
  delivery_type: string;
  category: string;
  available_placeholders: string;
}

export default function NewEmailTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState<EmailTemplateForm>({
    template_name: "",
    title: "",
    subject: "",
    content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f0f0f0; padding: 10px; text-align: center; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Your Email Title</h2>
    </div>
    
    <p>Hello {recipient_name},</p>
    
    <p>Your email content goes here...</p>
    
    <p>Regards,<br>Techlympics 2025 Team</p>
    
    <div class="footer">
      <p>This is an automated email from Techlympics 2025. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`,
    notes: "",
    delivery_type: "MANUAL",
    category: "",
    available_placeholders: "recipient_name, event_date, registration_link",
  });

  const handleInputChange = (field: keyof EmailTemplateForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/organizer/email/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create template");
      }

      router.push("/organizer/email/templates");
    } catch (error) {
      console.error("Error creating template:", error);
      alert(error instanceof Error ? error.message : "Failed to create template");
    } finally {
      setLoading(false);
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
          <CardTitle>Create New Email Template</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template_name">Template Name</Label>
                <Input
                  id="template_name"
                  placeholder="Welcome Email"
                  value={form.template_name}
                  onChange={(e) => handleInputChange("template_name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Welcome to Techlympics 2025"
                  value={form.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                placeholder="Welcome to Techlympics 2025"
                value={form.subject}
                onChange={(e) => handleInputChange("subject", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_type">Delivery Type</Label>
                <Select
                  value={form.delivery_type}
                  onValueChange={(value) => handleInputChange("delivery_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  placeholder="Registration, Reminder, Notification, etc."
                  value={form.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="available_placeholders">Available Placeholders (comma separated)</Label>
              <Input
                id="available_placeholders"
                placeholder="recipient_name, event_date, registration_link"
                value={form.available_placeholders}
                onChange={(e) =>
                  handleInputChange("available_placeholders", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Email Content (HTML)</Label>
              <Textarea
                id="content"
                rows={15}
                value={form.content}
                onChange={(e) => handleInputChange("content", e.target.value)}
                className="font-mono text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Any additional notes about this template"
                value={form.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
              />
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
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Create Template
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
