import React, { useEffect } from 'react';
import type { DocumentItemDto, PipelineDto, WorkflowDto } from '@loopstack/api-client';
import type { DocumentType } from '@loopstack/shared';
import { useParams } from 'react-router-dom';
import type { WorkbenchSettingsInterface } from '../WorkflowList.tsx';
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation.tsx';
import DocumentItem from '@/features/workbench/components/DocumentItem.tsx';

const DocumentList: React.FC<{
  pipeline: PipelineDto;
  workflow: WorkflowDto;
  documents: DocumentItemDto[];
  scrollTo: (workflowId: string) => void;
  settings: WorkbenchSettingsInterface;
}> = ({ pipeline, workflow, documents, scrollTo, settings }) => {
  const { workflowId: paramsWorkflowId, clickId } = useParams();

  // auto scroll to the item on a navigation event (clickId) but only after element is fully loaded
  useEffect(() => {
    if (paramsWorkflowId === workflow.id) {
      scrollTo(workflow.id);
    }
  }, [workflow.id, paramsWorkflowId, clickId]);

  const isWorkflowActive = workflow.status === 'waiting';

  // const { messages, sendMessage, status, regenerate } = useChat();

  return <Conversation>
    <ConversationContent>

      {documents.map((item: DocumentItemDto, documentIndex: number) => {
        const document = item as DocumentType;

        // document is active when created at current place
        // or when explicitly set to enabled for specific places
        const isDocumentActive =
          item.place === workflow.place ||
          !!document.meta?.enableAtPlaces?.includes(workflow.place);

        const isActive = isWorkflowActive && isDocumentActive;

        // document will be hidden if configured as hidden
        // or when configured hidden for specific places
        let hidden =
          document.meta?.['hidden'] ||
          document.ui?.hidden ||
          !!document.meta?.hideAtPlaces?.includes(workflow.place);

        const isInternalMessage = false; //['tool'].includes(document.content.role);

        if (
          !settings.showFullMessageHistory &&
          (isInternalMessage || item.tags?.includes('internal'))
        ) {
          hidden = true;
        }

        const isLastItem =
          documentIndex === documents.length - 1;

        return <DocumentItem
          key={item.id}
          document={item}
          workflow={workflow}
          pipeline={pipeline}
          isActive={isActive}
          isLastItem={isLastItem}
          settings={settings}
          hidden={hidden}
        />
      })}
    </ConversationContent>
  </Conversation>
};

export default DocumentList;
