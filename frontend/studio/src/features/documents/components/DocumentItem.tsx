import { omit } from 'lodash';
import React from 'react';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import type { WorkbenchSettingsInterface } from '@/features/workbench';
import DocumentRenderer from '../DocumentRenderer.tsx';
import DocumentMetadataPills from './DocumentMetadataPills.tsx';

interface DocumentMeta {
  data?: Record<string, unknown>;
  [key: string]: unknown;
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
    <>
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
              ...document,
              meta: omit(meta ?? {}, ['data']),
            },
          }}
        />
      ) : (
        <></>
      )}
    </>
  );
};

export default DocumentItem;
