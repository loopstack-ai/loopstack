import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useStudio } from '@/providers/StudioProvider';

export default function RouteErrorPage() {
  const { environment } = useStudio();
  const error = useRouteError();

  let title = 'Something went wrong';
  let description = 'An unexpected error occurred while loading this page.';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    description = typeof error.data === 'string' ? error.data : description;
  } else if (error instanceof Error) {
    description = error.message;
  }

  const breadcrumbsData = [
    {
      label: environment.name,
      href: '#',
      icon: <Home className="h-4 w-4" />,
    },
    { label: 'Error', current: true },
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-xl border border-border/70 bg-background/95 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-3 wrap-break-word">{description}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="size-4" />
              Reload
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
