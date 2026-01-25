import { Outlet } from 'react-router-dom';

const WorkerLayout = () => {
  return (
    <div className="flex min-h-screen flex-1 flex-col p-2">
      <Outlet />
    </div>
  );
};

export default WorkerLayout;
