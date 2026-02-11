import { TopMenu } from './TopMenu';

const AppLayout = ({ children }: any) => {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <TopMenu />
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
};

export default AppLayout;
