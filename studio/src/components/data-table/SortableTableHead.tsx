import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '../ui/button';
import { TableHead } from '../ui/table';

interface SortableTableHeadProps extends ComponentProps<typeof TableHead> {
  label: ReactNode;
  /** The order this column sorts the table in, or `undefined` while another column does. */
  sorted?: 'ASC' | 'DESC';
  onSort: () => void;
}

/** A column header that sorts its table when clicked, with an arrow on the column the table is sorted by. */
export default function SortableTableHead({ label, sorted, onSort, ...props }: SortableTableHeadProps) {
  return (
    <TableHead aria-sort={sorted === 'ASC' ? 'ascending' : sorted === 'DESC' ? 'descending' : undefined} {...props}>
      <Button variant="ghost" onClick={onSort} className="h-auto p-0 font-semibold hover:bg-transparent">
        {label}
        {sorted === 'ASC' && <ArrowUp className="h-4 w-4" />}
        {sorted === 'DESC' && <ArrowDown className="h-4 w-4" />}
      </Button>
    </TableHead>
  );
}
