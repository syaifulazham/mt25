"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Pencil, Trash2, Eye, Send } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface EmailTemplate {
  id: number;
  template_name: string;
  title: string;
  subject: string;
  delivery_type: string;
  scheduled_datetime: string | null;
  created_at: string;
  category: string | null;
  is_active: boolean;
}

export default function EmailTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const response = await fetch("/api/organizer/email/templates");
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status}`);
      }
      const data = await response.json();
      setTemplates(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching templates:", err);
      setError("Failed to load email templates. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate(id: number) {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      const response = await fetch(`/api/organizer/email/templates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete template");
      }

      // Refresh templates list
      fetchTemplates();
    } catch (err) {
      console.error("Error deleting template:", err);
      alert(err instanceof Error ? err.message : "Failed to delete template");
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <Button onClick={() => router.push("/organizer/email/templates/new")}>
          <Plus className="mr-2 h-4 w-4" /> Create Template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-lg">Loading templates...</span>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">{error}</div>
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No email templates found. Create your first template to get started.
              </p>
              <Button onClick={() => router.push("/organizer/email/templates/new")}>
                <Plus className="mr-2 h-4 w-4" /> Create Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{template.template_name}</CardTitle>
                    <CardDescription className="line-clamp-1">
                      {template.title}
                    </CardDescription>
                  </div>
                  <Badge variant={template.is_active ? "default" : "outline"}>
                    {template.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-3">
                  <div className="flex justify-between mb-1">
                    <span>Subject:</span>
                    <span className="font-medium text-foreground">
                      {template.subject}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Type:</span>
                    <span className="font-medium text-foreground">
                      {template.delivery_type}
                    </span>
                  </div>
                  {template.category && (
                    <div className="flex justify-between mb-1">
                      <span>Category:</span>
                      <span className="font-medium text-foreground">
                        {template.category}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-medium text-foreground">
                      {format(new Date(template.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/organizer/email/templates/${template.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/organizer/email/templates/${template.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/organizer/email/compose?templateId=${template.id}`)}
                  >
                    <Send className="h-4 w-4 mr-1" /> Use
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
