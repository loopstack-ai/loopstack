import React from 'react';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import LinkCard, { type LinkCardStatus } from '@/components/loopstack-elements/link.tsx';
import { useChildWorkflows } from '@/hooks/useWorkflows.ts';

type LinkMessageContentType = {
  label?: string;
  workflowId?: string;
  embed?: boolean;
  expanded?: boolean;
};

interface LinkMessageRendererProps {
  workflow: WorkflowFullInterface;
  document: Omit<DocumentItemInterface, 'content'> & { content: LinkMessageContentType };
}

function mapWorkflowStateToStatus(state: WorkflowState | undefined): LinkCardStatus {
  switch (state) {
    case WorkflowState.Completed:
      return 'success';
    case WorkflowState.Failed:
    case WorkflowState.Canceled:
      return 'failure';
    default:
      return 'pending';
  }
}

const LinkMessageRenderer: React.FC<LinkMessageRendererProps> = ({ workflow, document }) => {
  const { label, workflowId, embed, expanded } = document.content;
  const href = workflowId ? `/workflows/${workflowId}` : undefined;

  const childWorkflows = useChildWorkflows(workflow.id);
  const child = workflowId ? childWorkflows.data?.find((c) => c.id === workflowId) : undefined;
  const status = mapWorkflowStateToStatus(child?.status as WorkflowState | undefined);

  return <LinkCard href={href} label={label} status={status} embed={embed} defaultExpanded={expanded} />;
};

export default LinkMessageRenderer;
