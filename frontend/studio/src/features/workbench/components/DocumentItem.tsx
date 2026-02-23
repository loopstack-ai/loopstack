import { omit } from 'lodash';
import React from 'react';
import type { DocumentItemDto, PipelineDto, WorkflowDto } from '@loopstack/api-client';
import type { WorkbenchSettingsInterface } from '../WorkflowList.tsx';
import DocumentMetadataPills from './DocumentMetadataPills.tsx';
import DocumentRenderer from './DocumentRenderer.tsx';

interface DocumentMeta {
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

const DocumentItem: React.FC<{
  document: DocumentItemDto;
  workflow: WorkflowDto;
  pipeline: PipelineDto;
  isActive: boolean;
  isLastItem: boolean;
  settings: WorkbenchSettingsInterface;
}> = ({ document, workflow, pipeline, isActive, isLastItem, settings }) => {
  const meta = document.meta as DocumentMeta | undefined;

  return (
    <>
      <DocumentRenderer
        document={document}
        workflow={workflow}
        pipeline={pipeline}
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
