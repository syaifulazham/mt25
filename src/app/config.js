// Force all pages in the app directory to be server-rendered
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Skip static optimization
export const generateStaticParams = () => {
  return [];
};
