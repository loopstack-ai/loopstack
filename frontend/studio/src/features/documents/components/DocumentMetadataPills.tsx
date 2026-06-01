import { useState } from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { Badge } from '@/components/ui/badge.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import DocumentDetails from '../document-details/DocumentDetails.tsx';
import PromptDetails from '../document-details/PromptDetails.tsx';
import type { WorkflowDebugContext } from '../document-details/document-debug-utils.ts';

const PILL_LABELS: Record<string, string> = {
  document: 'Document',
  prompt: 'LLM prompt',
};

function formatPillLabel(key: string): string {
  if (PILL_LABELS[key]) return PILL_LABELS[key];
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

interface DocumentDebugPayload {
  data: Omit<DocumentItemInterface, 'content'>;
  content: unknown;
  workflowContext: WorkflowDebugContext;
}

function isDocumentDebugPayload(value: unknown): value is DocumentDebugPayload {
  return typeof value === 'object' && value != null && 'data' in value && 'workflowContext' in value;
}

const StructuredMetadataRenderer = ({ data }: { data: Record<string, unknown> }) => (
  <div className="min-w-0 space-y-2">
    {Object.entries(data).map(([key, value]) => (
      <div key={key} className="grid min-w-0 grid-cols-[7.5rem_1fr] gap-x-3 text-sm">
        <span className="text-muted-foreground font-medium">{formatPillLabel(key)}</span>
        <span className="min-w-0 overflow-x-auto font-mono text-xs wrap-break-word">
          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
        </span>
      </div>
    ))}
  </div>
);

const DefaultMetadataRenderer = ({ data }: { data: unknown }) => {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return <StructuredMetadataRenderer data={data as Record<string, unknown>} />;
  }

  return (
    <pre className="bg-muted max-h-96 min-w-0 max-w-full overflow-x-auto overflow-y-auto rounded-md p-4 font-mono text-xs whitespace-pre-wrap">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};

type MetadataRenderer = (data: unknown) => React.ReactNode;

const metadataRenderers: Record<string, MetadataRenderer> = {
  prompt: (data) => <PromptDetails promptData={data as Parameters<typeof PromptDetails>[0]['promptData']} />,
  document: (data) => {
    if (!isDocumentDebugPayload(data)) {
      return <DefaultMetadataRenderer data={data} />;
    }
    return <DocumentDetails data={data.data} content={data.content} workflowContext={data.workflowContext} />;
  },
};

export interface DocumentDebugMetadata {
  document: DocumentDebugPayload;
  [key: string]: unknown;
}

const DocumentMetadataPills = ({ metaData }: { metaData: DocumentDebugMetadata }) => {
  const [selectedItem, setSelectedItem] = useState<unknown>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const entries = Object.entries(metaData);
  if (entries.length === 0) return null;

  const handlePillClick = (item: unknown, key: string) => {
    setSelectedItem(item);
    setSelectedKey(key);
    setModalOpen(true);
  };

  const getRenderer = (key: string | null) => {
    if (key && metadataRenderers[key]) {
      return metadataRenderers[key](selectedItem);
    }
    return <DefaultMetadataRenderer data={selectedItem} />;
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {entries.map(([key, item]) => (
          <Badge
            key={key}
            variant="outline"
            className="hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-full px-3 py-1 transition-colors"
            onClick={() => handlePillClick(item, key)}
          >
            {formatPillLabel(key)}
          </Badge>
        ))}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>{selectedKey ? formatPillLabel(selectedKey) : 'Debug'}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            {selectedKey && getRenderer(selectedKey)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentMetadataPills;
