import { Button } from '../ui/button';
import type { BatchAction } from './data-table';

interface DataTableBatchActionsProps {
  selectedCount: number;
  batchActions: BatchAction[];
  onBatchAction: (action: BatchAction) => void;
}

const DataTableBatchActions: React.FC<DataTableBatchActionsProps> = ({
  selectedCount,
  batchActions,
  onBatchAction,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="mr-4 flex items-center justify-between">
      <div className="flex gap-2">
        {batchActions.map((action) => (
          <Button key={action.id} variant={action.variant || 'outline'} size="sm" onClick={() => onBatchAction(action)}>
            {action.icon}
            {action.label} ({selectedCount})
          </Button>
        ))}
      </div>
    </div>
  );
};

export default DataTableBatchActions;
