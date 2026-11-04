import { CheckIcon, CopyIcon, InfoIcon } from 'lucide-react';
import React, { useState } from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { Button } from '@/components/ui/button.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { useDocumentConfigs } from '@/hooks/useConfig';
import { resolveWidgetName } from '@/lib/document-widget.ts';
import { BadgeList, CopyableId, DetailRow, formatDate } from './detail-parts.tsx';

export interface DocumentBoxActionsProps {
  document: DocumentItemInterface;
  /** The speaker of a message document. */
  role?: string;
  /** What the copy action copies; the document content as JSON when not given. */
  copyText?: string;
}

const DocumentMetadata = ({ document, role }: { document: DocumentItemInterface; role?: string }) => {
  const documentConfigs = useDocumentConfigs();
  const widget = resolveWidgetName(documentConfigs.get(document.documentName)?.ui) ?? 'no widget';

  return (
    <div className="space-y-2">
      <DetailRow label="Type">{widget}</DetailRow>
      <DetailRow label="Name">{document.documentName}</DetailRow>
      {role && <DetailRow label="Role">{role}</DetailRow>}
      <DetailRow label="Created">{formatDate(document.createdAt)}</DetailRow>
      <DetailRow label="Updated">{formatDate(document.updatedAt)}</DetailRow>
      <DetailRow label="Place">{document.place ?? '—'}</DetailRow>
      <DetailRow label="Transition">{document.transition ?? '—'}</DetailRow>
      <DetailRow label="Index">{document.index}</DetailRow>
      {document.labels?.length > 0 && (
        <DetailRow label="Labels">
          <BadgeList items={document.labels} />
        </DetailRow>
      )}
      {document.tags?.length > 0 && (
        <DetailRow label="Tags">
          <BadgeList items={document.tags} />
        </DetailRow>
      )}
      {document.isInvalidated && <DetailRow label="Invalidated">Yes</DetailRow>}
      {document.validationError != null && (
        <DetailRow label="Validation error">
          <pre className="bg-muted max-h-32 overflow-auto rounded p-1.5 font-mono text-xs whitespace-pre-wrap">
            {JSON.stringify(document.validationError, null, 2)}
          </pre>
        </DetailRow>
      )}
      <DetailRow label="Document ID">
        <CopyableId value={document.id} />
      </DetailRow>
      <DetailRow label="Workflow ID">
        <CopyableId value={document.workflowId} />
      </DetailRow>
      <DetailRow label="Workspace ID">
        <CopyableId value={document.workspaceId} />
      </DetailRow>
    </div>
  );
};

/**
 * The copy and details icons in the top-right corner of a document box. They show while the pointer is over
 * the closest `group/document` ancestor, which must also be `relative`.
 */
const DocumentBoxActions: React.FC<DocumentBoxActionsProps> = ({ document, role, copyText }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(copyText ?? JSON.stringify(document.content, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-card absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-md opacity-0 transition-opacity group-hover/document:opacity-100 focus-within:opacity-100 has-data-[state=open]:opacity-100">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground size-7"
        aria-label="Copy content"
        title="Copy content"
        onClick={() => void handleCopy()}
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-7"
            aria-label="Document details"
            title="Document details"
          >
            <InfoIcon className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96">
          <DocumentMetadata document={document} role={role} />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DocumentBoxActions;
