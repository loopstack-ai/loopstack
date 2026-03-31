import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import type { DocumentType } from '@loopstack/contracts/types';
import type { WorkbenchSettingsInterface } from '@/features/workbench';
import DocumentItem from './DocumentItem.tsx';

const DocumentList: React.FC<{
  workflow: WorkflowFullInterface;
  childWorkflow: WorkflowFullInterface;
  documents: DocumentItemInterface[];
  scrollTo: (workflowId: string) => void;
  settings: WorkbenchSettingsInterface;
  isLoading: boolean;
}> = ({ workflow, childWorkflow, documents, scrollTo, settings }) => {
  const { workflowId: paramsWorkflowId, clickId } = useParams();

  // auto scroll to the item on a navigation event (clickId) but only after element is fully loaded
  useEffect(() => {
    if (paramsWorkflowId === childWorkflow.id) {
      scrollTo(childWorkflow.id);
    }
  }, [childWorkflow.id, paramsWorkflowId, clickId, scrollTo]);

  const isWorkflowActive = childWorkflow.status === WorkflowState.Waiting;

  return (
    <div className="flex flex-col gap-3">
      {documents.map((item: DocumentItemInterface, documentIndex: number) => {
        const document = item as DocumentType;

        // document is active when created at current place
        // or when explicitly set to enabled for specific places
        const isDocumentActive =
          item.place === childWorkflow.place || !!document.meta?.enableAtPlaces?.includes(childWorkflow.place);

        console.log({
          isDocumentActive,
          enableAtPlaces: document.meta?.enableAtPlaces,
          place: childWorkflow.place,
        });

        const isActive = isWorkflowActive && isDocumentActive;

        const isLastItem = documentIndex === documents.length - 1;

        return (
          <DocumentItem
            key={item.id}
            document={item}
            workflow={childWorkflow}
            parentWorkflow={workflow}
            isActive={isActive}
            isLastItem={isLastItem}
            settings={settings}
          />
        );
      })}
    </div>
  );
};

export default DocumentList;
