import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '../ui/breadcrumb';
import { cn } from '../../utils/utils.ts';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface BreadCrumbsData {
  label: string;
  href?: string;
  icon?: any;
  current?: boolean;
}

interface PageBreadcrumbsProps {
  className?: string;
  breadcrumbData: BreadCrumbsData[];
}

const PageBreadcrumbs: React.FC<PageBreadcrumbsProps> = ({ breadcrumbData, className }) => {
  const navigate = useNavigate();

  const handleClick = (event: any, href: string) => {
    event.preventDefault();
    navigate(href);
  };

  return (
    <div className={cn('mb-6', className)}>
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbData.map((item, index) => {
            const isLast = index === breadcrumbData.length - 1;

            return (
              <div key={index} className="contents">
                <BreadcrumbItem>
                  {isLast || item.current ? (
                    <BreadcrumbPage className="flex items-center gap-1">
                      {item.icon}
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href={item.href}
                      onClick={(e) => item.href && handleClick(e, item.href)}
                      className="flex items-center gap-1"
                    >
                      {item.icon}
                      {item.label}
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
