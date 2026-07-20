import { Outlet, useSearchParams } from 'react-router-dom';
import LocalHealthCheck from '../features/health/LocalHealthCheck.tsx';
import { LoopstackClientProvider } from '../providers/LoopstackClientProvider.tsx';
import { QueryProvider } from '../providers/QueryProvider.tsx';
import { StudioProvider } from '../providers/StudioProvider.tsx';
import { useRouter } from '../routing/LocalRouter.tsx';
import type { Environment } from '../types';

export default function EnvironmentEmbedRoot() {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url') ?? 'http://localhost:3080';
  const name = searchParams.get('name') ?? 'Preview Environment';

  const environment: Environment = {
    id: 'preview-env',
    name,
    url,
  };

  const router = useRouter(environment.id, '/embed/env');

  return (
    <QueryProvider>
      <StudioProvider router={router} environment={environment}>
        <LoopstackClientProvider>
          <LocalHealthCheck />
          <Outlet />
        </LoopstackClientProvider>
      </StudioProvider>
    </QueryProvider>
  );
}
