import { useStudio } from '../providers/StudioProvider.tsx';

const DebugPage = () => {
  const { environment } = useStudio();

  return (
    <div>
      <p>Name: {environment?.name}</p>
      <p>Id: {environment?.id}</p>
      <p>URL: {environment?.url}</p>
    </div>
  );
};

export default DebugPage;
