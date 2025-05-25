import { Metadata } from 'next';
import EmailRegisterPageClient from './_components/email-register-page-client';

export const metadata: Metadata = {
  title: 'Email Registration | Techlympics 2025',
  description: 'Register with email for Techlympics 2025',
};

export default function EmailRegisterPage() {
  return <EmailRegisterPageClient />;
}
