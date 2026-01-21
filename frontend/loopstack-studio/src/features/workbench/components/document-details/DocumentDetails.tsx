import React from 'react';
import { Code, FileText, Tag } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../../components/ui/accordion.tsx';
import { Badge } from '../../../../components/ui/badge.tsx';
import { Card, CardContent } from '../../../../components/ui/card.tsx';

interface DocumentMeta {
  mimeType?: string;
  enableAtPlaces?: string[];
  [key: string]: any; // Allow for additional meta properties
}

interface DocumentData {
  id: string;
  name: string;
  content: string | any;
  schema: any | string;
  meta?: DocumentMeta;
  isInvalidated: boolean;
  isPendingRemoval: boolean;
  version: number;
  index: number;
  transition: string;
  place: string;
  labels: string[];
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  pipelineId: string;
  workflowId: string;
}

interface DocumentDetailsProps {
  data: DocumentData;
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch {
    return dateString;
  }
};

const DocumentDetails: React.FC<DocumentDetailsProps> = ({ data }) => {
  if (!data) return null;

  // Handle schema format - could be string or object
  const schemaContent = typeof data.schema === 'string' ? data.schema : JSON.stringify(data.schema, null, 2);

  // Handle content format - convert to string if it's not already
  const contentDisplay = typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2);

  return (
    <div className="mt-4">
      <Accordion type="multiple" defaultValue={['document-info', 'content', 'schema']} className="space-y-2">
        <AccordionItem value="document-info">
          <AccordionTrigger className="text-base font-semibold">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Document Information
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="ml-6 space-y-2">
              <div className="text-sm">
                <span className="font-medium">ID:</span> {data.id}
              </div>
              <div className="text-sm">
                <span className="font-medium">Name:</span> {data.name}
              </div>
              <div className="text-sm">
                <span className="font-medium">Version:</span> {data.version}
              </div>
              <div className="text-sm">
                <span className="font-medium">Index:</span> {data.index}
              </div>

              <div className="pt-2">
                <div className="mb-2 text-sm font-medium">Labels:</div>
                <div className="flex flex-wrap gap-2">
                  {data.labels && data.labels.length > 0 ? (
                    data.labels.map((label, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">None</span>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <div className="mb-2 text-sm font-medium">Tags:</div>
                <div className="flex flex-wrap gap-2">
                  {data.tags && data.tags.length > 0 ? (
                    data.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <Tag className="mr-1 h-3 w-3" />
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">None</span>
                  )}
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="text-sm">
                  <span className="font-medium">Created:</span> {formatDate(data.createdAt)}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Updated:</span> {formatDate(data.updatedAt)}
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="text-sm">
                  <span className="font-medium">Workspace ID:</span> {data.workspaceId}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Pipeline ID:</span> {data.pipelineId}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Workflow ID:</span> {data.workflowId}
                </div>
              </div>

              {data.meta?.mimeType && (
                <div className="pt-2 text-sm">
                  <span className="font-medium">MIME Type:</span> {data.meta.mimeType}
                </div>
              )}

              {data.meta?.enableAtPlaces && (
                <div className="pt-2">
                  <div className="mb-2 text-sm font-medium">Enable At Places:</div>
                  <div className="flex flex-wrap gap-2">
                    {data.meta.enableAtPlaces.map((place, index) => (
                      <Badge key={index} variant="outline" className="bg-blue-50 text-xs">
                        {place}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {data.meta &&
                Object.entries(data.meta)
                  .filter(([key]) => !['mimeType', 'enableAtPlaces'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-medium">{key}:</span>{' '}
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                  ))}

              <div className="space-y-1 pt-2">
                <div className="text-sm">
                  <span className="font-medium">Invalidated:</span> {data.isInvalidated ? 'Yes' : 'No'}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Pending Removal:</span> {data.isPendingRemoval ? 'Yes' : 'No'}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Transition:</span> {data.transition}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Place:</span> {data.place}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="content">
          <AccordionTrigger className="text-base font-semibold">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <pre
                  className={`max-h-96 overflow-auto rounded bg-gray-100 p-2 text-xs break-words whitespace-pre-wrap ${
                    data.meta?.mimeType === 'text/markdown' ? 'font-sans' : 'font-mono'
                  }`}
                >
                  {contentDisplay}
                </pre>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="schema">
          <AccordionTrigger className="text-base font-semibold">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Schema
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <pre className="rounded bg-gray-100 p-2 font-mono text-xs break-words whitespace-pre-wrap">
                  {schemaContent}
                </pre>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default DocumentDetails;
