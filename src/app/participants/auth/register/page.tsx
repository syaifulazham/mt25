import { Metadata } from 'next';
import RegisterPageClient from './_components/register-page-client';

export const metadata: Metadata = {
  title: 'Register | Techlympics 2025',
  description: 'Register as a participant for Techlympics 2025',
};

export default function RegisterPage() {
  return <RegisterPageClient />;
}
