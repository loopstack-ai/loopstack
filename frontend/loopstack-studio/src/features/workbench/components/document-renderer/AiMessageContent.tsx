import React from 'react';
import type { DataContent, FilePart, ImagePart, ModelMessage, TextPart, ToolCallPart, ToolResultPart } from 'ai';

interface ReasoningPart {
  type: 'reasoning';
  text: string;
}

// Helper function to convert data content to displayable format
const getDataUrl = (data: DataContent | URL, mediaType?: string): string => {
  if (data instanceof URL) {
    return data.toString();
  }
  if (typeof data === 'string') {
    // Assume it's already base64 encoded
    return `data:${mediaType || 'application/octet-stream'};base64,${data}`;
  }
  // For ArrayBuffer, Uint8Array, Buffer - would need proper conversion in real app
  return '#'; // Placeholder
};

// Individual content part renderers
const TextPartRenderer: React.FC<{ part: TextPart }> = ({ part }) => (
  <div className="text-sm leading-relaxed whitespace-pre-wrap">{part.text}</div>
);

const ImagePartRenderer: React.FC<{ part: ImagePart }> = ({ part }) => (
  <div>
    <img
      src={getDataUrl(part.image, part.mediaType)}
      alt="Uploaded image"
      className="h-auto max-w-full rounded-lg border shadow-sm"
      style={{ maxHeight: '400px' }}
    />
    {part.mediaType && <div className="mt-1 text-xs text-gray-500">Type: {part.mediaType}</div>}
  </div>
);

const FilePartRenderer: React.FC<{ part: FilePart }> = ({ part }) => (
  <div>
    <div className="flex items-center space-x-2">
      <div className="text-2xl">📎</div>
      <div>
        <div className="text-sm font-medium">{part.filename || 'Unnamed file'}</div>
        <div className="text-xs text-gray-500">{part.mediaType}</div>
      </div>
    </div>
  </div>
);

const ReasoningPartRenderer: React.FC<{ part: ReasoningPart }> = ({ part }) =>
  part.text ? (
    <div>
      <div className="mb-2 flex items-center space-x-2">
        <div className="text-sm font-medium text-purple-600">Reasoning</div>
      </div>
      <div className="text-sm whitespace-pre-wrap text-purple-800">{part.text}</div>
    </div>
  ) : (
    ''
  );

const ToolCallPartRenderer: React.FC<{ part: ToolCallPart }> = ({ part }) => (
  <div>
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="text-sm font-medium">{part.toolName}</div>
        {part.providerExecuted && (
          <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">Executed</span>
        )}
      </div>
      <div className="ml-5 font-mono text-xs text-gray-500">ID: {part.toolCallId}</div>
    </div>
    {part.input ? (
      <div className="rounded border bg-white p-2 text-xs">
        <div className="mb-1 text-gray-600">Input:</div>
        <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(part.input, null, 2)}</pre>
      </div>
    ) : (
      ''
    )}
  </div>
);

const ToolResultPartRenderer: React.FC<{ part: ToolResultPart }> = ({ part }) => (
  <div>
    <div className="mb-2 flex items-center justify-between">
      <div className="text-sm font-medium">{part.toolName} Result</div>
      <div className="ml-5 font-mono text-xs text-gray-500">ID: {part.toolCallId}</div>
    </div>
    <div className="rounded border bg-white p-2 text-xs">
      <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(part.output, null, 2)}</pre>
    </div>
  </div>
);

// Main content renderer component
const MessageContentRenderer: React.FC<{ message: ModelMessage }> = ({ message }) => {
  const renderContentPart = (part: any, index: number) => {
    switch (part.type) {
      case 'text':
        return <TextPartRenderer key={index} part={part as TextPart} />;
      case 'image':
        return <ImagePartRenderer key={index} part={part as ImagePart} />;
      case 'file':
        return <FilePartRenderer key={index} part={part as FilePart} />;
      case 'reasoning':
        return <ReasoningPartRenderer key={index} part={part as ReasoningPart} />;
      case 'tool-call':
        return <ToolCallPartRenderer key={index} part={part as ToolCallPart} />;
      case 'tool-result':
        return <ToolResultPartRenderer key={index} part={part as ToolResultPart} />;
      default:
        return (
          <div key={index} className="rounded bg-gray-100 p-2 text-sm">
            Unknown content type: {part.type}
          </div>
        );
    }
  };

  const renderContent = () => {
    // Handle system messages (always string)
    if (message.role === 'system') {
      return (
        <div className="rounded-lg border-l-4 border-gray-400 bg-gray-50 p-3 text-sm text-gray-600 italic">
          <div className="mb-1 font-medium">System</div>
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      );
    }

    const { content } = message;

    // Handle string content
    if (typeof content === 'string') {
      return <TextPartRenderer part={{ type: 'text', text: content }} />;
    }

    // Handle array content
    if (Array.isArray(content)) {
      return <div className="space-y-2">{content.map((part, index) => renderContentPart(part, index))}</div>;
    }

    return <div className="text-sm text-red-600">Invalid content format</div>;
  };

  return <div className="message-content">{renderContent()}</div>;
};

export default MessageContentRenderer;
