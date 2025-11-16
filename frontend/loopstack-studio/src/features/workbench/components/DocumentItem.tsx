import React from 'react';
import type { DocumentItemDto, PipelineDto, WorkflowDto } from '@loopstack/api-client';
import { omit } from 'lodash';
import type { WorkbenchSettingsInterface } from '../WorkflowList.tsx';
import DocumentRenderer from './DocumentRenderer.tsx';
import DocumentMetadataPills from './DocumentMetadataPills.tsx';

const DocumentItem: React.FC<{
  document: DocumentItemDto;
  workflow: WorkflowDto;
  pipeline: PipelineDto;
  isActive: boolean;
  isLastItem: boolean;
  hidden?: boolean;
  settings: WorkbenchSettingsInterface;
}> = ({ document, workflow, pipeline, isActive, isLastItem, settings, hidden }) => {

    // const { messages, sendMessage, status, regenerate } = useChat();

    if (hidden) {
      return ''
    }

    return <>
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
              meta: omit((document.meta as any) ?? {}, ['data'])
            }
          }}
        />
      ) : (
        <></>
      )}
    </>
};

export default DocumentItem;
