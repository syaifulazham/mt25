'use client'

import React, { useState } from "react";
import { Session } from "next-auth";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Download, Upload, Filter, FileText, Printer, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Types from the parent component
type CertificateTemplate = {
  id: number;
  name: string;
  description: string;
  type: "PARTICIPATION" | "ACHIEVEMENT" | "APPRECIATION" | "CUSTOM";
  previewUrl: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
};

type Certificate = {
  id: number;
  templateId: number;
  templateName: string;
  recipientName: string;
  recipientEmail: string | null;
  recipientType: "PARTICIPANT" | "CONTESTANT" | "JUDGE" | "ORGANIZER";
  contestName: string | null;
  awardTitle: string | null;
  issuedAt: Date | null;
  status: "DRAFT" | "GENERATED" | "SENT" | "DOWNLOADED";
  uniqueCode: string;
};

interface CertificatesClientProps {
  session: Session;
  mockTemplates: CertificateTemplate[];
  mockCertificates: Certificate[];
}

export function CertificatesClient({ session, mockTemplates, mockCertificates }: CertificatesClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("certificates");

  // Filter certificates based on search term
  const filteredCertificates = mockCertificates.filter((certificate) => 
    certificate.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    certificate.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (certificate.contestName && certificate.contestName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (certificate.awardTitle && certificate.awardTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
    certificate.uniqueCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter templates based on search term
  const filteredTemplates = mockTemplates.filter((template) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if user is admin
  const isAdmin = session.user.role === 'ADMIN';
  
  // Check if user can create/edit templates (ADMIN or OPERATOR)
  const canManageTemplates = ['ADMIN', 'OPERATOR'].includes(session.user.role as string);

  // Check if user can manage certificates (ADMIN or OPERATOR)
  const canManageCertificates = ['ADMIN', 'OPERATOR'].includes(session.user.role as string);

  return (
    <>
      <PageHeader 
        title="Certificate Management" 
        description="Create, manage, and distribute certificates for participants and winners"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search certificates or templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Download className="w-4 h-4" />
            <span>Export List</span>
          </Button>
          {canManageCertificates && (
            <>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <Printer className="w-4 h-4" />
                <span>Batch Print</span>
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <Mail className="w-4 h-4" />
                <span>Batch Send</span>
              </Button>
              <Button asChild className="h-9 gap-1">
                <Link href="/organizer/certificates/generate">
                  <PlusCircle className="w-4 h-4" />
                  <span>Generate Certificates</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="certificates" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="certificates" className="space-y-4 mt-4">
          {filteredCertificates.length === 0 ? (
            <EmptyState 
              title="No certificates found" 
              description={searchTerm ? `No certificates match '${searchTerm}'` : "No certificates have been generated yet"}
              buttonText="Generate Certificates"
              buttonHref="/organizer/certificates/generate"
              showButton={canManageCertificates}
            />
          ) : (
            <CertificatesTable certificates={filteredCertificates} canManage={canManageCertificates} />
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-4">
          {filteredTemplates.length === 0 ? (
            <EmptyState 
              title="No templates found" 
              description={searchTerm ? `No templates match '${searchTerm}'` : "No certificate templates have been created yet"}
              buttonText="Create Template"
              buttonHref="/organizer/certificates/templates/create"
              showButton={canManageTemplates}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} canEdit={canManageTemplates} />
              ))}
              {canManageTemplates && <NewTemplateCard />}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function EmptyState({ 
  title, 
  description, 
  buttonText, 
  buttonHref,
  showButton = true
}: { 
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  showButton?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-gray-100 p-3 mb-4">
        <FileText className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 mb-4 max-w-md">
        {description}
      </p>
      {showButton && (
        <Button asChild size="sm">
          <Link href={buttonHref}>
            <PlusCircle className="w-4 h-4 mr-2" />
            {buttonText}
          </Link>
        </Button>
      )}
    </div>
  );
}

function CertificatesTable({ certificates, canManage }: { certificates: Certificate[], canManage: boolean }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recipient</TableHead>
            <TableHead>Certificate Type</TableHead>
            <TableHead>Award / Contest</TableHead>
            <TableHead>Unique Code</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Issued Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {certificates.map((certificate) => {
            const statusColor = {
              'DRAFT': 'bg-yellow-100 text-yellow-800',
              'GENERATED': 'bg-blue-100 text-blue-800',
              'SENT': 'bg-green-100 text-green-800',
              'DOWNLOADED': 'bg-purple-100 text-purple-800',
            }[certificate.status];

            const recipientTypeLabel = {
              'PARTICIPANT': 'Participant',
              'CONTESTANT': 'Contestant',
              'JUDGE': 'Judge',
              'ORGANIZER': 'Organizer'
            }[certificate.recipientType];

            return (
              <TableRow key={certificate.id}>
                <TableCell>
                  <div className="font-medium">{certificate.recipientName}</div>
                  {certificate.recipientEmail && (
                    <div className="text-sm text-gray-500">{certificate.recipientEmail}</div>
                  )}
                  <Badge variant="outline" className="mt-1">{recipientTypeLabel}</Badge>
                </TableCell>
                <TableCell>
                  <div>{certificate.templateName}</div>
                </TableCell>
                <TableCell>
                  {certificate.awardTitle && (
                    <div className="font-medium">{certificate.awardTitle}</div>
                  )}
                  {certificate.contestName && (
                    <div className="text-sm text-gray-500">{certificate.contestName}</div>
                  )}
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-gray-100 p-1 rounded">{certificate.uniqueCode}</code>
                </TableCell>
                <TableCell>
                  <Badge className={statusColor}>{certificate.status}</Badge>
                </TableCell>
                <TableCell>
                  {certificate.issuedAt ? format(certificate.issuedAt, "MMM d, yyyy") : "Not issued yet"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Link href={`/organizer/certificates/${certificate.id}`} className="flex items-center w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View Certificate
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </DropdownMenuItem>
                      {certificate.recipientEmail && certificate.status !== "SENT" && canManage && (
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          Send by Email
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </DropdownMenuItem>
                      {canManage && (
                        <>
                          <DropdownMenuSeparator />
                          {certificate.status === "DRAFT" && (
                            <DropdownMenuItem className="text-blue-600">
                              Generate Certificate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-amber-600">
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TemplateCard({ template, canEdit }: { template: CertificateTemplate, canEdit: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[8.5/11] bg-gray-100 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          {template.previewUrl ? (
            <img 
              src={template.previewUrl} 
              alt={template.name} 
              className="object-cover w-full h-full"
            />
          ) : (
            <FileText className="w-16 h-16 text-gray-300" />
          )}
        </div>
        {template.isDefault && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-blue-100 text-blue-800">Default</Badge>
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{template.name}</CardTitle>
          <Badge variant="outline">{template.type}</Badge>
        </div>
        <CardDescription className="line-clamp-2">{template.description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-between pt-2">
        <div className="text-xs text-gray-500">
          Updated: {format(template.updatedAt, "MMM d, yyyy")}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/organizer/certificates/templates/${template.id}`}>
            {canEdit ? 'Edit' : 'View'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function NewTemplateCard() {
  return (
    <Card className="overflow-hidden border-dashed">
      <Link href="/organizer/certificates/templates/create" className="h-full">
        <div className="aspect-[8.5/11] bg-gray-50 flex items-center justify-center">
          <div className="text-center p-4">
            <div className="bg-primary/10 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlusCircle className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium text-primary">Create New Template</p>
            <p className="text-sm text-gray-500 mt-1">Design a custom certificate template</p>
          </div>
        </div>
      </Link>
    </Card>
  );
}
