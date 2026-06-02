import { AlertCircle, CheckIcon, CopyIcon, Cpu, FileJson, Settings2, Timer, Workflow } from 'lucide-react';
import React, { useState } from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { CodeBlock } from '@/components/ai-elements/code-block.tsx';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useDocumentConfigs } from '@/hooks/useConfig';
import {
  type ApiResponseInfo,
  type ContentSummary,
  type WorkflowDebugContext,
  extractApiResponseInfo,
  formatDurationMs,
  formatNumber,
  formatRelativeTime,
  summarizeDocumentContent,
} from './document-debug-utils.ts';

type DynMeta = {
  invalidate?: boolean;
  provider?: string;
  response?: unknown;
  streaming?: boolean;
  data?: unknown;
  [key: string]: unknown;
};

export interface DocumentDetailsProps {
  data: Omit<DocumentItemInterface, 'content'>;
  content?: unknown;
  workflowContext?: WorkflowDebugContext;
}

const formatDate = (date: Date | string): string => {
  try {
    return new Date(date).toLocaleString();
  } catch {
    return String(date);
  }
};

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid min-w-0 grid-cols-[7.5rem_1fr] gap-x-3 gap-y-0.5 text-sm">
    <span className="text-muted-foreground font-medium">{label}</span>
    <span className="min-w-0 wrap-break-word">{children}</span>
  </div>
);

const CopyableId = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span className="flex w-full min-w-0 items-center gap-1.5">
      <code className="bg-muted min-w-0 flex-1 truncate rounded px-1.5 py-0.5 font-mono text-xs">{value}</code>
      <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0" onClick={handleCopy}>
        {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
      </Button>
    </span>
  );
};

const BadgeList = ({ items, emptyLabel = 'None' }: { items?: string[] | null; emptyLabel?: string }) => {
  if (!items?.length) return <span className="text-muted-foreground">{emptyLabel}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="text-xs">
          {item}
        </Badge>
      ))}
    </span>
  );
};

const ContentSummarySection = ({ summary }: { summary: ContentSummary }) => (
  <div className="space-y-2 pb-1">
    <DetailRow label="Type">{summary.kind}</DetailRow>
    {summary.role && <DetailRow label="Role">{summary.role}</DetailRow>}
    {summary.messageId && (
      <DetailRow label="Message ID">
        <CopyableId value={summary.messageId} />
      </DetailRow>
    )}
    {summary.stopReason && <DetailRow label="Stop reason">{summary.stopReason}</DetailRow>}
    {summary.charCount != null && <DetailRow label="Size">{formatNumber(summary.charCount)} chars</DetailRow>}
    {summary.itemCount != null && <DetailRow label="Items">{summary.itemCount}</DetailRow>}
    {summary.topLevelKeys && summary.topLevelKeys.length > 0 && (
      <DetailRow label="Fields">
        <BadgeList items={summary.topLevelKeys} emptyLabel="—" />
      </DetailRow>
    )}
    {summary.blocks && summary.blocks.length > 0 && (
      <DetailRow label="Blocks">
        <span className="flex flex-col gap-1">
          {summary.blocks.map((block) => (
            <span key={block.type} className="flex flex-wrap items-center gap-1">
              <Badge variant="secondary" className="font-mono text-xs">
                {block.type} × {block.count}
              </Badge>
              {block.labels?.map((label) => (
                <Badge key={label} variant="outline" className="text-xs">
                  {label}
                </Badge>
              ))}
            </span>
          ))}
        </span>
      </DetailRow>
    )}
  </div>
);

const LlmMetadataSection = ({
  provider,
  apiInfo,
  rawResponse,
}: {
  provider?: string;
  apiInfo: ApiResponseInfo;
  rawResponse?: unknown;
}) => (
  <div className="space-y-3">
    <div className="space-y-2 pb-1">
      {provider && <DetailRow label="Provider">{provider}</DetailRow>}
      {apiInfo.model && <DetailRow label="Model">{apiInfo.model}</DetailRow>}
      {apiInfo.id && (
        <DetailRow label="Response ID">
          <CopyableId value={apiInfo.id} />
        </DetailRow>
      )}
      {apiInfo.stopReason && <DetailRow label="Finish reason">{apiInfo.stopReason}</DetailRow>}
      {apiInfo.usage && (
        <>
          <DetailRow label="Input tokens">{formatNumber(apiInfo.usage.input)}</DetailRow>
          <DetailRow label="Output tokens">{formatNumber(apiInfo.usage.output)}</DetailRow>
          {apiInfo.usage.cacheRead != null && apiInfo.usage.cacheRead > 0 && (
            <DetailRow label="Cache read">{formatNumber(apiInfo.usage.cacheRead)}</DetailRow>
          )}
          {apiInfo.usage.cacheWrite != null && apiInfo.usage.cacheWrite > 0 && (
            <DetailRow label="Cache write">{formatNumber(apiInfo.usage.cacheWrite)}</DetailRow>
          )}
          {apiInfo.usage.reasoning != null && apiInfo.usage.reasoning > 0 && (
            <DetailRow label="Reasoning">{formatNumber(apiInfo.usage.reasoning)}</DetailRow>
          )}
        </>
      )}
    </div>
    {rawResponse != null && (
      <Accordion type="single" collapsible className="min-w-0">
        <AccordionItem value="raw-response">
          <AccordionTrigger className="py-2 text-sm font-medium">Raw API response</AccordionTrigger>
          <AccordionContent>
            <CodeBlock
              code={JSON.stringify(rawResponse, null, 2)}
              language="json"
              className="max-h-48 min-w-0 max-w-full"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )}
  </div>
);

const DocumentDetails: React.FC<DocumentDetailsProps> = ({ data, content, workflowContext }) => {
  const documentConfigs = useDocumentConfigs();
  if (!data) return null;

  const docConfig = documentConfigs.get(data.alias);
  const staticMeta = docConfig?.meta;
  const dynMeta = (data.meta ?? {}) as DynMeta;
  const widget = docConfig?.ui?.widgets?.[0]?.widget ?? 'form';
  const contentSummary = summarizeDocumentContent(content);
  const apiInfo = extractApiResponseInfo(dynMeta.response);
  const hasValidationError = !!data.validationError;
  const hasSchema = docConfig?.schema && Object.keys(docConfig.schema).length > 0;
  const hasUiConfig = docConfig?.ui && Object.keys(docConfig.ui).length > 0;
  const hasLlmMeta = !!(dynMeta.provider || dynMeta.response || apiInfo.model || apiInfo.usage);
  const hasContentSummary = contentSummary.kind !== 'null';
  const createdAt = new Date(data.createdAt);
  const updatedAt = new Date(data.updatedAt);
  const editDurationMs = updatedAt.getTime() - createdAt.getTime();

  const dynMetaEntries = Object.entries(dynMeta).filter(
    ([key, value]) =>
      !['data', 'response', 'provider', 'streaming'].includes(key) &&
      value !== undefined &&
      value !== null &&
      value !== '',
  );

  const defaultOpenSections = ['overview', 'context'];
  if (workflowContext) defaultOpenSections.push('workflow');
  if (hasContentSummary) defaultOpenSections.push('content-summary');
  if (hasLlmMeta) defaultOpenSections.push('llm');
  if (hasValidationError) defaultOpenSections.push('validation');

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap gap-2">
        {workflowContext?.isActive && (
          <Badge variant="default" className="text-xs">
            Active
          </Badge>
        )}
        {dynMeta.streaming && (
          <Badge variant="secondary" className="text-xs">
            Streaming
          </Badge>
        )}
        {data.isInvalidated && (
          <Badge variant="destructive" className="text-xs">
            Invalidated
          </Badge>
        )}
        {data.isPendingRemoval && (
          <Badge variant="secondary" className="text-xs">
            Pending removal
          </Badge>
        )}
        {hasValidationError && (
          <Badge variant="destructive" className="gap-1 text-xs">
            <AlertCircle className="size-3" />
            Validation error
          </Badge>
        )}
        {staticMeta?.level && (
          <Badge variant="outline" className="text-xs capitalize">
            {staticMeta.level}
          </Badge>
        )}
        {staticMeta?.hidden && (
          <Badge variant="outline" className="text-xs">
            Hidden
          </Badge>
        )}
        {dynMeta.invalidate && (
          <Badge variant="outline" className="text-xs">
            Invalidates on update
          </Badge>
        )}
      </div>

      <Accordion type="multiple" defaultValue={defaultOpenSections} className="min-w-0 space-y-1">
        <AccordionItem value="overview">
          <AccordionTrigger className="py-3 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Workflow className="size-4" />
              Overview
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pb-1">
              <DetailRow label="Name">{data.name}</DetailRow>
              <DetailRow label="Alias">{data.alias}</DetailRow>
              <DetailRow label="Widget">
                <Badge variant="secondary" className="font-mono text-xs">
                  {widget}
                </Badge>
              </DetailRow>
              <DetailRow label="Version">
                v{data.version} · index {data.index}
              </DetailRow>
              {staticMeta?.mimeType && <DetailRow label="MIME">{staticMeta.mimeType}</DetailRow>}
            </div>
          </AccordionContent>
        </AccordionItem>

        {workflowContext && (
          <AccordionItem value="workflow">
            <AccordionTrigger className="py-3 text-sm font-semibold">Workflow</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pb-1">
                <DetailRow label="Title">{workflowContext.title}</DetailRow>
                <DetailRow label="Workflow">{workflowContext.workflowName}</DetailRow>
                {workflowContext.className && <DetailRow label="Class">{workflowContext.className}</DetailRow>}
                <DetailRow label="Status">
                  <Badge variant="outline" className="text-xs capitalize">
                    {workflowContext.status}
                  </Badge>
                </DetailRow>
                <DetailRow label="Current place">{workflowContext.place}</DetailRow>
                <DetailRow label="Document place">{data.place ?? '—'}</DetailRow>
                <DetailRow label="Place match">
                  {data.place === workflowContext.place ? 'Same as current' : 'Different place'}
                </DetailRow>
                <DetailRow label="Interactive">
                  {workflowContext.isDocumentActive
                    ? workflowContext.isActive
                      ? 'Yes — awaiting input'
                      : 'Eligible, workflow not waiting'
                    : 'No'}
                </DetailRow>
                {workflowContext.parentTitle && <DetailRow label="Parent">{workflowContext.parentTitle}</DetailRow>}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="context">
          <AccordionTrigger className="py-3 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Timer className="size-4" />
              Execution context
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pb-1">
              <DetailRow label="Transition">{data.transition ?? '—'}</DetailRow>
              <DetailRow label="Place">{data.place ?? '—'}</DetailRow>
              <DetailRow label="Labels">
                <BadgeList items={data.labels} />
              </DetailRow>
              <DetailRow label="Tags">
                <BadgeList items={data.tags} />
              </DetailRow>
              <DetailRow label="Created">
                {formatDate(data.createdAt)}
                <span className="text-muted-foreground ml-1 text-xs">({formatRelativeTime(data.createdAt)})</span>
              </DetailRow>
              <DetailRow label="Updated">
                {formatDate(data.updatedAt)}
                <span className="text-muted-foreground ml-1 text-xs">({formatRelativeTime(data.updatedAt)})</span>
              </DetailRow>
              {editDurationMs > 0 && <DetailRow label="Edit window">{formatDurationMs(editDurationMs)}</DetailRow>}
            </div>
          </AccordionContent>
        </AccordionItem>

        {hasContentSummary && (
          <AccordionItem value="content-summary">
            <AccordionTrigger className="py-3 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <FileJson className="size-4" />
                Content summary
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ContentSummarySection summary={contentSummary} />
            </AccordionContent>
          </AccordionItem>
        )}

        {hasLlmMeta && (
          <AccordionItem value="llm">
            <AccordionTrigger className="py-3 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Cpu className="size-4" />
                LLM / API
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <LlmMetadataSection provider={dynMeta.provider} apiInfo={apiInfo} rawResponse={dynMeta.response} />
            </AccordionContent>
          </AccordionItem>
        )}

        {hasValidationError && (
          <AccordionItem value="validation">
            <AccordionTrigger className="py-3 text-sm font-semibold text-destructive">
              Validation error
            </AccordionTrigger>
            <AccordionContent>
              <CodeBlock
                code={JSON.stringify(data.validationError, null, 2)}
                language="json"
                className="max-h-64 min-w-0 max-w-full"
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {(hasUiConfig || hasSchema) && (
          <AccordionItem value="config">
            <AccordionTrigger className="py-3 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Settings2 className="size-4" />
                Configuration
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {hasUiConfig && (
                <div>
                  <p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">UI</p>
                  <CodeBlock
                    code={JSON.stringify(docConfig?.ui, null, 2)}
                    language="json"
                    className="max-h-48 min-w-0 max-w-full"
                  />
                </div>
              )}
              {hasSchema && (
                <div>
                  <p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">Schema</p>
                  <CodeBlock
                    code={JSON.stringify(docConfig?.schema, null, 2)}
                    language="json"
                    className="max-h-48 min-w-0 max-w-full"
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {(staticMeta || dynMetaEntries.length > 0) && (
          <AccordionItem value="meta">
            <AccordionTrigger className="py-3 text-sm font-semibold">Document meta</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pb-1">
                {staticMeta?.enableAtPlaces && (
                  <DetailRow label="Show at">
                    <BadgeList items={staticMeta.enableAtPlaces} emptyLabel="—" />
                  </DetailRow>
                )}
                {staticMeta?.hideAtPlaces && (
                  <DetailRow label="Hide at">
                    <BadgeList items={staticMeta.hideAtPlaces} emptyLabel="—" />
                  </DetailRow>
                )}
                {dynMetaEntries.map(([key, value]) => (
                  <DetailRow key={key} label={key}>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </DetailRow>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="ids">
          <AccordionTrigger className="py-3 text-sm font-semibold">Identifiers</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pb-1">
              <DetailRow label="Document">
                <CopyableId value={data.id} />
              </DetailRow>
              <DetailRow label="Workflow">
                <CopyableId value={data.workflowId} />
              </DetailRow>
              <DetailRow label="Workspace">
                <CopyableId value={data.workspaceId} />
              </DetailRow>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default DocumentDetails;
