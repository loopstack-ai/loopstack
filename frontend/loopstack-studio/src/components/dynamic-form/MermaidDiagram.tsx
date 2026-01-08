import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
  },
});

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, className }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      const element = ref.current;
      if (!element) return;

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        element.innerHTML = '';
        const { svg } = await mermaid.render(id, chart);

        if (ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error);

        if (ref.current) {
          ref.current.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
              <strong>Mermaid Diagram Error:</strong> Failed to render diagram
              <pre class="mt-2 text-xs bg-red-100 p-2 rounded overflow-x-auto">${chart}</pre>
            </div>
          `;
        }
      }
    };

    renderDiagram();
  }, [chart]);

  return <div ref={ref} className={`my-4 flex justify-center ${className || ''}`} />;
};

export default MermaidDiagram;
