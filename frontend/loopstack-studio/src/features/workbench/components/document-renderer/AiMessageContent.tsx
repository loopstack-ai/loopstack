import React from 'react';
import type {
  DataContent,
  FilePart,
  ImagePart,
  ModelMessage,
  TextPart,
  ToolCallPart,
  ToolResultPart
} from 'ai';

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
  <div className="whitespace-pre-wrap text-sm leading-relaxed">{part.text}</div>
);

const ImagePartRenderer: React.FC<{ part: ImagePart }> = ({ part }) => (
  <div>
    <img
      src={getDataUrl(part.image, part.mediaType)}
      alt="Uploaded image"
      className="max-w-full h-auto rounded-lg border shadow-sm"
      style={{ maxHeight: '400px' }}
    />
    {part.mediaType && <div className="text-xs text-gray-500 mt-1">Type: {part.mediaType}</div>}
  </div>
);

const FilePartRenderer: React.FC<{ part: FilePart }> = ({ part }) => (
  <div>
    <div className="flex items-center space-x-2">
      <div className="text-2xl">📎</div>
      <div>
        <div className="font-medium text-sm">{part.filename || 'Unnamed file'}</div>
        <div className="text-xs text-gray-500">{part.mediaType}</div>
      </div>
    </div>
  </div>
);

const ReasoningPartRenderer: React.FC<{ part: ReasoningPart }> = ({ part }) =>
  part.text ? (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        <div className="text-purple-600 font-medium text-sm">Reasoning</div>
      </div>
      <div className="text-sm text-purple-800 whitespace-pre-wrap">{part.text}</div>
    </div>
  ) : (
    ''
  );

const ToolCallPartRenderer: React.FC<{ part: ToolCallPart }> = ({ part }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        <div className="font-medium text-sm">{part.toolName}</div>
        {part.providerExecuted && (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Executed</span>
        )}
      </div>
      <div className="text-xs text-gray-500 font-mono ml-5">ID: {part.toolCallId}</div>
    </div>
    {part.input ? (
      <div className="text-xs bg-white p-2 rounded border">
        <div className="text-gray-600 mb-1">Input:</div>
        <pre className="whitespace-pre-wrap overflow-x-auto">
          {JSON.stringify(part.input, null, 2)}
        </pre>
      </div>
    ) : (
      ''
    )}
  </div>
);

const ToolResultPartRenderer: React.FC<{ part: ToolResultPart }> = ({ part }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <div className="font-medium text-sm">{part.toolName} Result</div>
      <div className="text-xs text-gray-500 font-mono ml-5">ID: {part.toolCallId}</div>
    </div>
    <div className="text-xs bg-white p-2 rounded border">
      <pre className="whitespace-pre-wrap overflow-x-auto">
        {JSON.stringify(part.output, null, 2)}
      </pre>
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
          <div key={index} className="p-2 bg-gray-100 rounded text-sm">
            Unknown content type: {part.type}
          </div>
        );
    }
  };

  const renderContent = () => {
    // Handle system messages (always string)
    if (message.role === 'system') {
      return (
        <div className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-lg border-l-4 border-gray-400">
          <div className="font-medium mb-1">System</div>
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
      return (
        <div className="space-y-2">
          {content.map((part, index) => renderContentPart(part, index))}
        </div>
      );
    }

    return <div className="text-sm text-red-600">Invalid content format</div>;
  };

  return <div className="message-content">{renderContent()}</div>;
};

export default MessageContentRenderer;
