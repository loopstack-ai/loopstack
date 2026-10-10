import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Router-level error element. Renders OUTSIDE the app's provider tree
 * (react-router replaces the route element with it), so it must not use
 * any Studio context — a crash here would mask the original error.
 */
export default function RouteErrorPage() {
  const error = useRouteError();

  useEffect(() => {
    console.error('[loopstack-studio] route error:', error);
  }, [error]);

  let title = 'Something went wrong';
  let description = 'An unexpected error occurred while loading this page.';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    description = typeof error.data === 'string' ? error.data : description;
  } else if (error instanceof Error) {
    description = error.message;
  }

  return (
    <div className="mx-auto flex min-h-[100vh] w-full max-w-2xl items-center justify-center">
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
  );
}
