import { Play } from 'lucide-react';
import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout.tsx';
import { Button } from '../components/ui/button.tsx';
import Runs from '../features/runs/Runs.tsx';
import { NewRunDialog } from '../features/workbench/components/NewRunDialog.tsx';
import { useStudio } from '../providers/StudioProvider.tsx';

export default function RunsListPage() {
  const { router } = useStudio();
  const [newRunDialogOpen, setNewRunDialogOpen] = useState(false);

  const breadcrumbsData = [{ label: 'Runs', current: true }];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Runs</h1>
        <Button variant="default" size="sm" className="gap-1.5" onClick={() => setNewRunDialogOpen(true)}>
          <Play className="h-3.5 w-3.5" />
          New Run
        </Button>
      </div>
      <Runs />
      <NewRunDialog
        open={newRunDialogOpen}
        onOpenChange={setNewRunDialogOpen}
        onSuccess={(workflowId) => {
          setNewRunDialogOpen(false);
          void router.navigateToWorkflow(workflowId);
        }}
      />
    </MainLayout>
  );
}
