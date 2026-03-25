import { Home, SearchX } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useStudio } from '@/providers/StudioProvider';

export default function NotFoundPage() {
  const { environment } = useStudio();
  const location = useLocation();

  const breadcrumbsData = [
    {
      label: environment.name,
      href: '#',
      icon: <Home className="h-4 w-4" />,
    },
    { label: 'Not Found', current: true },
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <SearchX className="text-muted-foreground size-6" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">404 - Page not found</h1>
          <p className="text-muted-foreground mt-3">
            The page <span className="font-mono text-xs">{location.pathname}</span> does not exist or has been moved.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
