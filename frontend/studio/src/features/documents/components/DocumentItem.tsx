import { omit } from 'lodash';
import React from 'react';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { FadeIn } from '@/components/motion/FadeIn';
import type { WorkbenchSettingsInterface } from '@/features/workbench';
import { useDocumentConfigs } from '@/hooks/useConfig';
import DocumentRenderer from '../DocumentRenderer.tsx';
import type { WorkflowDebugContext } from '../document-details/document-debug-utils.ts';
import DocumentMetadataPills from './DocumentMetadataPills.tsx';

const DocumentItem: React.FC<{
  document: DocumentItemInterface;
  workflow: WorkflowFullInterface;
  parentWorkflow: WorkflowFullInterface;
  isActive: boolean;
  isLastItem: boolean;
  settings: WorkbenchSettingsInterface;
}> = ({ document, workflow, parentWorkflow, isActive, isLastItem, settings }) => {
  const documentConfigs = useDocumentConfigs();
  const docConfig = documentConfigs.get(document.documentName);
  const staticMeta = docConfig?.meta;
  const dynamicMeta = document.meta as { data?: Record<string, unknown> } | null;
  const isDocumentActive = document.place === workflow.place || !!staticMeta?.enableAtPlaces?.includes(workflow.place);

  const workflowContext: WorkflowDebugContext = {
    workflowId: workflow.id,
    workflowName: workflow.workflowName,
    title: workflow.title,
    status: workflow.status,
    place: workflow.place,
    isActive,
    isDocumentActive,
    ...(parentWorkflow.id !== workflow.id
      ? { parentWorkflowId: parentWorkflow.id, parentTitle: parentWorkflow.title }
      : {}),
  };

  return (
    <FadeIn>
      <DocumentRenderer
        document={document}
        workflow={workflow}
        parentWorkflow={parentWorkflow}
        isActive={isActive}
        isLastItem={isLastItem}
      />
      {settings.enableDebugMode ? (
        <DocumentMetadataPills
          metaData={{
            ...(dynamicMeta?.data ?? {}),
            document: {
              data: Object.assign({}, omit(document, ['content']), { meta: document.meta, staticMeta }),
              content: document.content,
              workflowContext,
            },
          }}
        />
      ) : null}
    </FadeIn>
  );
};

export default DocumentItem;
