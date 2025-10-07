// Server component wrapper for school contingent client component
import SchoolContingentClient from './school-contingent-client';

type SchoolLocation = {
  location: string | null;
  count: number | bigint;
};

interface SchoolContingentButtonProps {
  count: number;
  locations: SchoolLocation[];
}

// This is a server component that passes data to the client component
export default function SchoolContingentButton({ count, locations }: SchoolContingentButtonProps) {
  return (
    <SchoolContingentClient count={count} locations={locations} />
  );
}
