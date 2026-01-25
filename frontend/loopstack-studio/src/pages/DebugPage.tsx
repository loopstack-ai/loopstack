import { useApiClient } from '../hooks';
import { useStudio } from '../providers/StudioProvider.tsx';

const DebugPage = () => {
  const { environment } = useStudio();
  const { api } = useApiClient();

  const authApi = api?.ApiV1AuthApi;
  // basePath is a protected property, access via type assertion for debug purposes
  const basePath = authApi ? (authApi as unknown as { basePath: string }).basePath : undefined;

  return (
    <div>
      <p>Name: {environment?.name}</p>
      <p>Id: {environment?.id}</p>
      <p>Base Path: {basePath}</p>
    </div>
  );
};

export default DebugPage;
