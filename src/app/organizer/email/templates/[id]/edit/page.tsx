"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  is_active: boolean;
  available_placeholders: string;
}

export default function EditEmailTemplatePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const templateId = params.id;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [form, setForm] = useState<EmailTemplateForm>({
    template_name: "",
    title: "",
    subject: "",
    content: "",
    notes: "",
    delivery_type: "MANUAL",
    category: "",
    is_active: true,
    available_placeholders: "",
  });

  // Fetch template data on component mount
  useEffect(() => {
    async function fetchTemplate() {
      setLoading(true);
      try {
        const response = await fetch(`/api/organizer/email/templates/${templateId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch template");
        }
        
        const template = await response.json();
        setForm({
          template_name: template.template_name,
          title: template.title,
          subject: template.subject,
          content: template.content,
          notes: template.notes || "",
          delivery_type: template.delivery_type,
          category: template.category || "",
          is_active: template.is_active,
          available_placeholders: template.available_placeholders || "",
        });
      } catch (err) {
        console.error("Error fetching template:", err);
        setError("Failed to load template. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchTemplate();
  }, [templateId]);

  const handleInputChange = (field: keyof EmailTemplateForm, value: any) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/organizer/email/templates/${templateId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update template");
      }

      router.push("/organizer/email/templates");
    } catch (error) {
      console.error("Error updating template:", error);
      setError(error instanceof Error ? error.message : "Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading template...</span>
      </div>
    );
  }

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
          <CardTitle>Edit Email Template</CardTitle>
        </CardHeader>
        {error && (
          <Alert variant="destructive" className="mx-6 mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template_name">Template Name</Label>
                <Input
                  id="template_name"
                  value={form.template_name}
                  onChange={(e) => handleInputChange("template_name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
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
            
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) => handleInputChange("is_active", checked)}
              />
              <Label htmlFor="is_active">Template Active</Label>
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
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
