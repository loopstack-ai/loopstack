import { Outlet } from 'react-router-dom';

const WorkerLayout = () => {
  return (
    <div className="flex flex-1 flex-col p-2 min-h-screen">
      <Outlet />
    </div>
  );
};

export default WorkerLayout;
