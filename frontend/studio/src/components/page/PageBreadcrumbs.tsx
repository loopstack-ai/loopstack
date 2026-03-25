import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils.ts';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';

export interface BreadCrumbsData {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface PageBreadcrumbsProps {
  className?: string;
  breadcrumbData: BreadCrumbsData[];
}

const PageBreadcrumbs: React.FC<PageBreadcrumbsProps> = ({ breadcrumbData, className }) => {
  const navigate = useNavigate();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    void navigate(href);
  };

  const renderCrumbLabel = (item: BreadCrumbsData) => (
    <>
      {item.icon}
      <span className="min-w-0 truncate">{item.label}</span>
    </>
  );

  const hasMany = breadcrumbData.length > 2;
  const first = breadcrumbData[0];
  const last = breadcrumbData[breadcrumbData.length - 1];

  return (
    <div className={cn('ml-3 min-w-0 max-w-full', className)}>
      <Breadcrumb>
        <BreadcrumbList className="flex-nowrap overflow-hidden sm:hidden">
          {breadcrumbData.length <= 1 ? null : (
            <>
              <BreadcrumbItem className="min-w-0">
                {first.current ? (
                  <BreadcrumbPage className="flex min-w-0 items-center gap-2">{renderCrumbLabel(first)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href={first.href}
                    onClick={(e) => first.href && handleClick(e, first.href)}
                    className="flex min-w-0 items-center gap-2"
                    title={first.label}
                  >
                    {renderCrumbLabel(first)}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>

              {hasMany ? (
                <>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbEllipsis />
                  </BreadcrumbItem>
                </>
              ) : null}

              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>

              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="flex min-w-0 items-center gap-2" title={last.label}>
                  {renderCrumbLabel(last)}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>

        <BreadcrumbList className="hidden flex-nowrap overflow-hidden sm:flex">
          {breadcrumbData.map((item, index) => {
            const isLast = index === breadcrumbData.length - 1;

            return (
              <div key={index} className="contents">
                <BreadcrumbItem className="min-w-0">
                  {isLast || item.current ? (
                    <BreadcrumbPage className="flex min-w-0 items-center gap-2" title={item.label}>
                      {renderCrumbLabel(item)}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href={item.href}
                      onClick={(e) => item.href && handleClick(e, item.href)}
                      className="flex min-w-0 items-center gap-2"
                      title={item.label}
                    >
                      {renderCrumbLabel(item)}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && (
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                )}
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default PageBreadcrumbs;
