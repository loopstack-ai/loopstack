import type { ReactElement } from 'react';
import PageBreadcrumbs from '../page/PageBreadcrumbs.tsx';
import type { BreadCrumbsData } from '../page/PageBreadcrumbs.tsx';

const MainLayout = ({
  children,
  breadcrumbsData,
  headerMenu
}: {
  children: ReactElement | ReactElement[];
  breadcrumbsData: BreadCrumbsData[];
  headerMenu?: ReactElement;
}) => {
  return (
    <div className="px-4">
      <div className="flex items-center justify-between min-h-[60px]">
        <PageBreadcrumbs breadcrumbData={breadcrumbsData} />
        {headerMenu}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
};

export default MainLayout;
