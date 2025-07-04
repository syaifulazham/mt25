"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Pencil, Send, Eye } from "lucide-react";
import { format } from "date-fns";

interface EmailTemplate {
  id: number;
  template_name: string;
  title: string;
  subject: string;
  content: string;
  notes: string | null;
  delivery_type: string;
  scheduled_datetime: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  is_active: boolean;
  category: string | null;
  available_placeholders: string | null;
}

export default function ViewEmailTemplatePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const templateId = params.id;
  
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<boolean>(true);

  // Fetch template data on component mount
  useEffect(() => {
    async function fetchTemplate() {
      setLoading(true);
      try {
        const response = await fetch(`/api/organizer/email/templates/${templateId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch template");
        }
        
        const templateData = await response.json();
        setTemplate(templateData);
      } catch (err) {
        console.error("Error fetching template:", err);
        setError("Failed to load template. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchTemplate();
  }, [templateId]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading template...</span>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="container mx-auto py-8">
        <Button
          variant="outline"
          onClick={() => router.push("/organizer/email/templates")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Templates
        </Button>
        
        <Alert variant="destructive">
          <AlertDescription>
            {error || "Template not found"}
          </AlertDescription>
        </Alert>
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

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{template.template_name}</h1>
          <p className="text-muted-foreground">{template.title}</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/organizer/email/templates/${templateId}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button 
            onClick={() => router.push(`/organizer/email/compose?templateId=${templateId}`)}
          >
            <Send className="mr-2 h-4 w-4" /> Use Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Subject</div>
                <div className="font-medium">{template.subject}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Delivery Type</div>
                <div className="font-medium">{template.delivery_type}</div>
              </div>
              
              {template.category && (
                <div>
                  <div className="text-sm text-muted-foreground">Category</div>
                  <div className="font-medium">{template.category}</div>
                </div>
              )}
              
              <div className="flex items-center">
                <div className="text-sm text-muted-foreground mr-2">Status:</div>
                <Badge variant={template.is_active ? "default" : "outline"}>
                  {template.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              
              <Separator />
              
              <div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="font-medium">
                  {format(new Date(template.created_at), "PPP p")}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Last Updated</div>
                <div className="font-medium">
                  {format(new Date(template.updated_at), "PPP p")}
                </div>
              </div>
              
              {template.available_placeholders && (
                <div>
                  <div className="text-sm text-muted-foreground">Available Placeholders</div>
                  <div className="font-medium">
                    {template.available_placeholders.split(",").map((placeholder) => (
                      <Badge key={placeholder} variant="outline" className="mr-2 mb-2">
                        {placeholder.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {template.notes && (
                <div>
                  <div className="text-sm text-muted-foreground">Notes</div>
                  <div className="font-medium whitespace-pre-wrap">{template.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Email Preview</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant={previewMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode(true)}
                >
                  <Eye className="h-4 w-4 mr-2" /> Preview
                </Button>
                <Button
                  variant={!previewMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 mr-2"
                  >
                    <path d="M16 18 22 12 16 6" />
                    <path d="M8 6 2 12 8 18" />
                  </svg>
                  Source
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {previewMode ? (
                <div className="border rounded-md p-4 h-[600px] overflow-auto">
                  <iframe
                    srcDoc={template.content}
                    title="Email Preview"
                    className="w-full h-full"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <div className="border rounded-md">
                  <pre className="p-4 overflow-auto bg-muted h-[600px] text-sm font-mono">
                    {template.content}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
