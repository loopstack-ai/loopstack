import { useState } from 'react';
import { Badge } from '../../../components/ui/badge.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog.tsx';
import PromptDetails from './document-details/PromptDetails.tsx';
import DocumentDetails from './document-details/DocumentDetails.tsx';

// Define types for the renderer components
type MetadataRendererProps = {
  data: any;
};

// Component to render standard metadata values (non-prompt)
const DefaultMetadataRenderer = ({ data }: MetadataRendererProps) => {
  return (
    <div className="p-4 font-mono whitespace-pre-wrap overflow-auto max-h-96 bg-muted rounded-md">
      {JSON.stringify(data, null, 2)}
    </div>
  );
};

// Type for the renderer function
type MetadataRenderer = React.FC<MetadataRendererProps>;

// Component map for different metadata types
const metadataRenderers: Record<string, MetadataRenderer> = {
  prompt: ({ data }) => <PromptDetails promptData={data} />,
  document: ({ data }) => <DocumentDetails data={data} />
  // Add more specialized renderers here in the future
};

const DocumentMetadataPills = ({ metaData }: { metaData: Record<string, any> }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handlePillClick = (item: any, key: string) => {
    setSelectedItem(item);
    setSelectedKey(key);
    setModalOpen(true);
  };

  // Get the appropriate renderer component for the selected key
  const getRenderer = (key: string | null) => {
    // Check if we have a specialized renderer for this key
    if (key && metadataRenderers[key]) {
      const Renderer = metadataRenderers[key];
      return <Renderer data={selectedItem} />;
    }

    // Otherwise use the default renderer
    return <DefaultMetadataRenderer data={selectedItem} />;
  };

  return (
    <div className="px-6">
      <div className="flex flex-wrap gap-2 mb-8">
        {Object.entries(metaData).map(([key, item]) => (
          <Badge
            key={key}
            variant="outline"
            className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors rounded-full px-3 py-1"
            onClick={() => handlePillClick(item, key)}
          >
            {key}
          </Badge>
        ))}
      </div>

      {selectedItem && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl max-h-3/4 overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedKey}
                <span className="text-xs text-muted-foreground font-normal">Metadata</span>
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
