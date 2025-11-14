import React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '../../../../components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface DocumentDebugRendererProps {
  //TODO: ADD TYPE
  document: any;
}

const DocumentDebugRenderer: React.FC<DocumentDebugRendererProps> = ({ document }) => {
  return (
    <div className="flex justify-end mb-2 mx-3">
      <Collapsible className="bg-gray-100 rounded-lg border-0 shadow-none">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left">
          <span className="text-gray-500">Debug Info</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <div className="max-w-full overflow-scroll">
            <pre>{document.content}</pre>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default DocumentDebugRenderer;
