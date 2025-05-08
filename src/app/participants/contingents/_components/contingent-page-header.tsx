"use client";

import { useLanguage } from "@/lib/i18n/language-context";

export function ContingentPageHeader() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t('contingent.management')}</h1>
      <p className="text-muted-foreground">
        {t('contingent.management_desc')}
      </p>
    </div>
  );
}
