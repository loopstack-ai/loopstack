import type { ReactNode } from 'react';
import PageBreadcrumbs from '../page/PageBreadcrumbs.tsx';
import type { BreadCrumbsData } from '../page/PageBreadcrumbs.tsx';

const MainLayout = ({
  children,
  breadcrumbsData,
  headerMenu,
}: {
  children: ReactNode;
  breadcrumbsData: BreadCrumbsData[];
  headerMenu?: ReactNode;
}) => {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b flex h-12 shrink-0 items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2">
          <PageBreadcrumbs breadcrumbData={breadcrumbsData} />
        </div>
        {headerMenu}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default MainLayout;
