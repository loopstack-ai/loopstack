import { ApiV1AuthApi } from '@loopstack/api-client';
import { useStudio } from '../providers/StudioProvider.tsx';
import { useApiClient } from '../hooks';

const DebugPage = () => {
  const { environment } = useStudio();
  const { api } = useApiClient();

  const authApi = api?.ApiV1AuthApi as ApiV1AuthApi;

  // @ts-ignore
  const basePath = authApi?.basePath;

  return (
    <div>
      <p>Name: {environment?.name}</p>
      <p>Id: {environment?.id}</p>
      <p>Base Path: {basePath}</p>
    </div>
  );
};

export default DebugPage;
