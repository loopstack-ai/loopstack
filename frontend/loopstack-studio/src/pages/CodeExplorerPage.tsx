import { Home } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout.tsx';
import { CodeExplorer, mockFileContents, mockFileTree } from '../features/code-explorer';
import { useStudio } from '../providers/StudioProvider.tsx';

export default function CodeExplorerPage() {
  const { router } = useStudio();

  const breadcrumbData = [
    { label: 'Dashboard', href: router.getDashboard(), icon: <Home className="h-4 w-4" /> },
    { label: 'Code Explorer' },
  ];

  const fileContents: Record<string, string> = mockFileContents;

  return (
    <MainLayout breadcrumbsData={breadcrumbData}>
      <div className="h-[calc(100vh-8rem)] min-h-0">
        <CodeExplorer tree={mockFileTree} fileContents={fileContents} />
      </div>
    </MainLayout>
  );
}
