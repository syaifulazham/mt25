'use client';

import { useLanguage } from '@/lib/i18n/language-context';

/**
 * This component provides a consistent way to access common translations
 * regardless of potential issues in translation files
 */
export function useCommonTranslations() {
  const { t, language } = useLanguage();
  
  // Add fallbacks for important common translations
  const translations = {
    cancel: t('common.cancel') || 'Cancel',
    save: t('common.save') || 'Save',
    delete: t('common.delete') || 'Delete',
    edit: t('common.edit') || 'Edit',
    confirm: t('common.confirm') || 'Confirm',
    back: t('common.back') || 'Back',
    next: t('common.next') || 'Next',
    loading: t('common.loading') || 'Loading...',
    error: t('common.error') || 'Error',
  };
  
  // Add language-specific fallbacks
  if (language === 'my') {
    return {
      ...translations,
      cancel: 'Batal',
      save: 'Simpan',
      delete: 'Padam',
      edit: 'Sunting',
      confirm: 'Sahkan',
      back: 'Kembali',
      next: 'Seterusnya',
      loading: 'Memuatkan...',
      error: 'Ralat',
    };
  }
  
  return translations;
}
