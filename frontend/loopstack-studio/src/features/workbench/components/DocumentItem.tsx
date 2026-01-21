import React from 'react';
import { omit } from 'lodash';
import type { PipelineDto } from '@loopstack/api-client';
import type { DocumentItemInterface, WorkflowInterface } from '@loopstack/contracts/types';
import type { WorkbenchSettingsInterface } from '../WorkflowList.tsx';
import DocumentMetadataPills from './DocumentMetadataPills.tsx';
import DocumentRenderer from './DocumentRenderer.tsx';

const DocumentItem: React.FC<{
  document: DocumentItemInterface;
  workflow: WorkflowInterface;
  pipeline: PipelineDto;
  isActive: boolean;
  isLastItem: boolean;
  settings: WorkbenchSettingsInterface;
}> = ({ document, workflow, pipeline, isActive, isLastItem, settings }) => {
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
            ...((document.meta as any)?.data ?? {}),
            document: {
              ...document,
              meta: omit((document.meta as any) ?? {}, ['data']),
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
