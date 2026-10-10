import MainLayout from '../components/layout/MainLayout.tsx';
import FleetBoard from '../features/fleet/FleetBoard.tsx';

export default function DashboardPage() {
  const breadcrumbsData = [{ label: 'Dashboard', current: true }];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <FleetBoard />
    </MainLayout>
  );
}
