import { ReactFlowProvider } from '@xyflow/react';
import { Home, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MainLayout from '../components/layout/MainLayout.tsx';
import ConfigFlowViewer from '../features/debug/components/ConfigFlowViewer.tsx';
import { usePipelineConfig, usePipelineSource } from '../hooks/usePipelines.ts';
import { useStudio } from '../providers/StudioProvider.tsx';

export default function DebugWorkflowDetailsPage() {
  const { workflowId } = useParams();
  const { router } = useStudio();

  const [workspaceBlockName, pipelineBlockName] = useMemo(() => {
    if (!workflowId) return ['', ''];
    const parts = workflowId.split('::');
    if (parts.length === 2) return parts;
    return ['default', workflowId];
  }, [workflowId]);

  const { data: workflow, isLoading: isWorkflowLoading } = usePipelineConfig(workspaceBlockName, pipelineBlockName);
  const { data: source, isLoading: isSourceLoading } = usePipelineSource(workspaceBlockName, pipelineBlockName);
  const isLoading = isWorkflowLoading || isSourceLoading;
  const breadcrumbsData = [
    {
      label: 'Dashboard',
      href: router.getDashboard(),
      icon: <Home className="h-4 w-4" />,
    },
    {
      label: 'Debug Workflows',
      href: router.getDebugWorkflows(),
    },
    {
      label: workflow?.title || workflow?.blockName || pipelineBlockName || 'Workflow Details',
      current: true,
    },
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      ) : workflow ? (
        <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{workflow.title || workflow.blockName}</h1>
          <p className="text-muted-foreground">{workflow.description}</p>

          <div className="flex flex-1 gap-4 overflow-hidden">
            <div className="w-1/2 flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="border-b bg-muted/50 px-4 py-2 font-medium text-sm">{source?.filePath}</div>
              <div className="flex-1 overflow-auto bg-[#1e1e1e]">
                <SyntaxHighlighter
                  language={source?.raw ? 'yaml' : 'json'}
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, padding: '1rem', height: '100%', fontSize: '13px' }}
                  showLineNumbers={true}
                >
                  {source?.raw ? source.raw : JSON.stringify(workflow, null, 2)}
                </SyntaxHighlighter>
              </div>
            </div>

            <div className="w-1/2 flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="border-b bg-muted/50 px-4 py-2 font-medium text-sm">Diagram</div>
              <div className="flex-1 relative bg-background">
                <ReactFlowProvider>
                  <ConfigFlowViewer config={workflow} />
                </ReactFlowProvider>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          Workflow Type not found (Workspace: {workspaceBlockName}, Pipeline: {pipelineBlockName})
        </div>
      )}
    </MainLayout>
  );
}
