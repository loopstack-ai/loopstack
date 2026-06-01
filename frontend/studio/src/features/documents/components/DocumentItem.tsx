import { omit } from 'lodash';
import React from 'react';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { FadeIn } from '@/components/motion/FadeIn';
import type { WorkbenchSettingsInterface } from '@/features/workbench';
import DocumentRenderer from '../DocumentRenderer.tsx';
import type { WorkflowDebugContext } from '../document-details/document-debug-utils.ts';
import DocumentMetadataPills from './DocumentMetadataPills.tsx';

interface DocumentMeta {
  data?: Record<string, unknown>;
  enableAtPlaces?: string[];
  [key: string]: unknown;
}

function buildWorkflowContext(
  document: DocumentItemInterface,
  workflow: WorkflowFullInterface,
  parentWorkflow: WorkflowFullInterface,
  isActive: boolean,
): WorkflowDebugContext {
  const meta = document.meta as DocumentMeta | undefined;
  const isDocumentActive = document.place === workflow.place || !!meta?.enableAtPlaces?.includes(workflow.place);

  return {
    workflowId: workflow.id,
    workflowName: workflow.workflowName,
    className: workflow.className,
    title: workflow.title,
    status: workflow.status,
    place: workflow.place,
    isActive,
    isDocumentActive,
    ...(parentWorkflow.id !== workflow.id
      ? { parentWorkflowId: parentWorkflow.id, parentTitle: parentWorkflow.title }
      : {}),
  };
}

const DocumentItem: React.FC<{
  document: DocumentItemInterface;
  workflow: WorkflowFullInterface;
  parentWorkflow: WorkflowFullInterface;
  isActive: boolean;
  isLastItem: boolean;
  settings: WorkbenchSettingsInterface;
}> = ({ document, workflow, parentWorkflow, isActive, isLastItem, settings }) => {
  const meta = document.meta as DocumentMeta | undefined;

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
            ...(meta?.data ?? {}),
            document: {
              data: {
                ...omit(document, ['content']),
                meta: omit(meta ?? {}, ['data']),
              },
              content: document.content,
              workflowContext: buildWorkflowContext(document, workflow, parentWorkflow, isActive),
            },
          }}
        />
      ) : null}
    </FadeIn>
  );
};

export default DocumentItem;
