import React, { useEffect } from 'react';
import type { PipelineDto } from '@loopstack/api-client';
import type {
  DocumentItemInterface,
  DocumentType,
  WorkflowInterface,
  WorkflowStateType,
} from '@loopstack/contracts/types';
import { useParams } from 'react-router-dom';
import type { WorkbenchSettingsInterface } from '../WorkflowList.tsx';
import DocumentItem from '@/features/workbench/components/DocumentItem';

const DocumentList: React.FC<{
  pipeline: PipelineDto;
  workflow: WorkflowInterface;
  documents: DocumentItemInterface[];
  scrollTo: (workflowId: string) => void;
  settings: WorkbenchSettingsInterface;
  isLoading: boolean;
}> = ({ pipeline, workflow, documents, scrollTo, settings }) => {
  const { workflowId: paramsWorkflowId, clickId } = useParams();

  // auto scroll to the item on a navigation event (clickId) but only after element is fully loaded
  useEffect(() => {
    if (paramsWorkflowId === workflow.id) {
      scrollTo(workflow.id);
    }
  }, [workflow.id, paramsWorkflowId, clickId]);

  const isWorkflowActive = workflow.status === 'waiting' satisfies WorkflowStateType;

  return <div className="flex flex-col gap-8 p-4">
    {documents.map((item: DocumentItemInterface, documentIndex: number) => {
      const document = item as DocumentType;

      // document is active when created at current place
      // or when explicitly set to enabled for specific places
      const isDocumentActive =
        item.place === workflow.place ||
        !!document.meta?.enableAtPlaces?.includes(workflow.place);

      const isActive = isWorkflowActive && isDocumentActive;

      const isLastItem = documentIndex === documents.length - 1;

      return <DocumentItem
        key={item.id}
        document={item}
        workflow={workflow}
        pipeline={pipeline}
        isActive={isActive}
        isLastItem={isLastItem}
        settings={settings}
      />
    })}
  </div>
};

export default DocumentList;
