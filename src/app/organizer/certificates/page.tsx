import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { redirect } from 'next/navigation';
import { TemplateService } from '@/lib/services/certificate-service';
import { CertificateService } from '@/lib/services/certificate-service';
import { CertificateHub } from './_components/CertificateHub';
import { PageHeader } from '@/components/page-header';

// Allowed roles for certificate management
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER'];

export default async function CertificatesPage() {
  // Get user session
  const session = await getServerSession(authOptions);
  
  // Check if user is authenticated
  if (!session?.user) {
    // Redirect to login page if not authenticated
    redirect('/auth/organizer/login?callbackUrl=/organizer/certificates');
  }
  
  // Check if user has required role
  if (!session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    // Redirect to dashboard if not authorized
    redirect('/organizer/dashboard');
  }

  // Fetch initial data from database
  // Fetch all templates since we do client-side pagination
  const templatesResult = await TemplateService.listTemplates({
    page: 1,
    limit: 1000,
    status: 'ACTIVE'
  });

  const certificatesResult = await CertificateService.listCertificates({
    page: 1,
    limit: 10
  });

  // Format certificates to include template data at the top level
  const formattedCertificates = certificatesResult.certificates.map((cert: any) => ({
    ...cert,
    templateName: cert.template?.templateName || 'Unknown Template',
    templateTargetType: cert.template?.targetType
  }));

  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title="Certificate Management" 
        description="Create, manage, and distribute certificates for participants and winners"
      />
      
      <CertificateHub 
        session={session} 
        initialTemplates={templatesResult.templates} 
        initialCertificates={formattedCertificates}
        templatesPagination={templatesResult.pagination}
        certificatesPagination={certificatesResult.pagination}
      />
    </div>
  );
}
