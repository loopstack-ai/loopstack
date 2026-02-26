import { useState } from 'react';
import { Badge } from '../../../components/ui/badge.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog.tsx';
import DocumentDetails from './document-details/DocumentDetails.tsx';
import PromptDetails from './document-details/PromptDetails.tsx';

// Component to render standard metadata values (non-prompt)
const DefaultMetadataRenderer = ({ data }: { data: unknown }) => {
  return (
    <div className="bg-muted max-h-96 overflow-auto rounded-md p-4 font-mono whitespace-pre-wrap">
      {JSON.stringify(data, null, 2)}
    </div>
  );
};

// Renderer function type that takes unknown data and returns a React element
type MetadataRenderer = (data: unknown) => React.ReactNode;

// Component map for different metadata types
const metadataRenderers: Record<string, MetadataRenderer> = {
  prompt: (data) => <PromptDetails promptData={data as Parameters<typeof PromptDetails>[0]['promptData']} />,
  document: (data) => <DocumentDetails data={data as Parameters<typeof DocumentDetails>[0]['data']} />,
};

const DocumentMetadataPills = ({ metaData }: { metaData: Record<string, unknown> }) => {
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handlePillClick = (item: unknown, key: string) => {
    setSelectedItem(item as Record<string, unknown>);
    setSelectedKey(key);
    setModalOpen(true);
  };

  // Get the appropriate renderer component for the selected key
  const getRenderer = (key: string | null) => {
    // Check if we have a specialized renderer for this key
    if (key && metadataRenderers[key]) {
      return metadataRenderers[key](selectedItem);
    }

    // Otherwise use the default renderer
    return <DefaultMetadataRenderer data={selectedItem} />;
  };

  return (
    <div className="px-6">
      <div className="mb-8 flex flex-wrap gap-2">
        {Object.entries(metaData).map(([key, item]) => (
          <Badge
            key={key}
            variant="outline"
            className="hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-full px-3 py-1 transition-colors"
            onClick={() => handlePillClick(item, key)}
          >
            {key}
          </Badge>
        ))}
      </div>

      {selectedItem && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-h-3/4 max-w-2xl overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedKey}
                <span className="text-muted-foreground text-xs font-normal">Metadata</span>
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">{getRenderer(selectedKey)}</div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DocumentMetadataPills;
