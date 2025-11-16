import React from 'react';
import CompletionMessagePaper from '../../../../../components/messages/CompletionMessagePaper.tsx';
import type { DocumentItemDto } from '@loopstack/api-client';
import type { ModelMessage } from 'ai';
import MessageContentRenderer from './AiMessageContent.tsx';

interface DocumentMessageRendererProps {
  document: DocumentItemDto;
}

// const ToolCallCard = ({ tool, index }: { tool: any; index: number }) => {
//   const [isExpanded, setIsExpanded] = useState(false);
//
//   let parsedArgs = {};
//   try {
//     parsedArgs = JSON.parse(tool.function.arguments);
//   } catch (e) {
//     parsedArgs = { raw: tool.function.arguments };
//   }
//
//   const hasArgs = Object.keys(parsedArgs).length > 0;
//
//   return (
//     <Card className="mt-3 border border-gray-200 hover:border-gray-300 transition-colors">
//       <CardHeader style={{ containerType: 'normal' }}>
//         <div
//           className="flex items-center gap-3 cursor-pointer"
//           onClick={() => setIsExpanded(!isExpanded)}>
//           <div className="flex items-center gap-2 flex-1">
//             <span className="text-lg">🔧</span>
//             <div className="flex flex-col">
//               <span className="font-medium text-sm text-gray-900">{tool.function.name}</span>
//               <span className="text-xs text-gray-500">Tool call #{index + 1}</span>
//             </div>
//           </div>
//
//           {hasArgs ? (
//             <div className="flex items-center gap-2">
//               {isExpanded ? (
//                 <ChevronDown className="w-4 h-4 text-gray-400" />
//               ) : (
//                 <ChevronRight className="w-4 h-4 text-gray-400" />
//               )}
//             </div>
//           ) : (
//             ''
//           )}
//         </div>
//       </CardHeader>
//
//       {isExpanded && hasArgs && (
//         <CardContent className="pt-0 pb-3">
//           <div className="space-y-2">
//             {Object.entries(parsedArgs).map(([key, value]) => (
//               <div key={key} className="text-sm">
//                 <span className="font-medium text-gray-600">{key}:</span>
//                 <div className="mt-1 p-2 bg-gray-50 rounded border text-gray-800 font-mono text-xs break-all">
//                   {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </CardContent>
//       )}
//     </Card>
//   );
// };

const DocumentMessageRenderer: React.FC<DocumentMessageRendererProps> = ({ document }) => {
  const content = document.content as ModelMessage;

  return (
    <CompletionMessagePaper role={content.role} timestamp={new Date(document.createdAt)}>
      <div>
        <MessageContentRenderer message={content} />

        {/*{content.animation === 'loading' && (*/}
        {/*  <div className="flex items-center mb-3 text-blue-600">*/}
        {/*    <Loader2 className="inline w-5 h-5 mr-2 animate-spin" />*/}
        {/*    <span className="text-sm font-medium">Processing...</span>*/}
        {/*  </div>*/}
        {/*)}*/}
        {/*<MarkdownContent content={content.content} />*/}

        {/*{content.tool_calls && content.tool_calls.length > 0 && (*/}
        {/*  <div className="mt-4">*/}
        {/*    <div className="flex items-center gap-2 mb-3">*/}
        {/*      <Settings className="w-4 h-4 text-gray-600" />*/}
        {/*      <span className="text-sm font-semibold text-gray-700">*/}
        {/*        Tool Calls ({content.tool_calls.length})*/}
        {/*      </span>*/}
        {/*    </div>*/}

        {/*    <div className="space-y-2">*/}
        {/*      {content.tool_calls.map((tool: any, index: number) => (*/}
        {/*        <ToolCallCard key={tool.id || `tool-${index}`} tool={tool} index={index} />*/}
        {/*      ))}*/}
        {/*    </div>*/}
        {/*  </div>*/}
        {/*)}*/}
      </div>
    </CompletionMessagePaper>
  );
};

export default DocumentMessageRenderer;
