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
    <div className="px-4">
      <div className="flex min-h-[60px] items-center justify-between">
        <PageBreadcrumbs breadcrumbData={breadcrumbsData} />
        {headerMenu}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
};

export default MainLayout;
