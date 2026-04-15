import MainLayout from '../components/layout/MainLayout.tsx';
import Runs from '../features/runs/Runs.tsx';
import { useStudio } from '../providers/StudioProvider.tsx';

export default function RunsPage() {
  const { router } = useStudio();

  const breadcrumbsData = [
    { label: 'Runs', href: router.getRuns() },
    { label: 'Action Required', current: true },
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Action Required</h1>
      <Runs defaultFilters={{ status: 'paused' }} />
    </MainLayout>
  );
}
