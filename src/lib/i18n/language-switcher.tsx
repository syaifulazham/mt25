'use client';

import { useLanguage } from './language-context';
import { Languages as LanguageIcon, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center px-3 py-1.5 text-sm rounded-full bg-black/10 hover:bg-black/20 transition-colors border border-gray-200/20">
        <LanguageIcon className="h-4 w-4 mr-1" />
        <span className="font-medium">{language === 'en' ? 'EN' : language === 'my' ? 'MY' : language === 'zh' ? 'ZH' : language === 'fil' ? 'FIL' : language === 'th' ? 'TH' : 'IB'}</span>
        <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-blue-50 text-blue-600 font-medium' : ''}
        >
          {t('language.english')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('my')}
          className={language === 'my' ? 'bg-blue-50 text-blue-600 font-medium' : ''}
        >
          {t('language.malay')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('ib')}
          className={language === 'ib' ? 'bg-blue-50 text-blue-600 font-medium' : ''}
        >
          {t('language.iban')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('zh')}
          className={language === 'zh' ? 'bg-blue-50 text-blue-600 font-medium' : ''}
        >
          {t('language.mandarin')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('fil')}
          className={language === 'fil' ? 'bg-blue-50 text-blue-600 font-medium' : ''}
        >
          {t('language.filipino')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('th')}
          className={language === 'th' ? 'bg-blue-50 text-blue-600 font-medium' : ''}
        >
          {t('language.thai')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
