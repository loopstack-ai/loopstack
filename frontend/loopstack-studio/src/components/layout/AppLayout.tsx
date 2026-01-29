import { TopMenu } from './TopMenu';

const AppLayout = ({ children }: any) => {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-background dark:to-background">
      <TopMenu />
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
};

export default AppLayout;
