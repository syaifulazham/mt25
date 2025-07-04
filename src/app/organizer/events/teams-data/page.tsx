import { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { TeamDataTable } from './_components/team-data-table';
import QueryProvider from './_components/query-provider';

export const metadata: Metadata = {
  title: 'Teams Raw Data',
  description: 'View and filter teams data across events and contests',
};

export default function TeamsDataPage() {
  return (
    <div className="container p-6">
      <PageHeader
        title="Teams Raw Data"
        description="View and filter teams data across events, contests, and contingents."
      />
      <div className="mt-6">
        <QueryProvider>
          <TeamDataTable />
        </QueryProvider>
      </div>
    </div>
  );
}
