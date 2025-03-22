'use client';

import TemplateDetailPage from '../[id]/page';

export default function NewTemplatePage() {
  // Pass 'new' as the ID parameter to the TemplateDetailPage component
  return <TemplateDetailPage params={{ id: 'new' }} />;
}
