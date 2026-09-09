import mermaid from 'mermaid';
import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/providers/ThemeProvider.tsx';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const renderDiagram = async () => {
      const element = ref.current;
      if (!element) return;

      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
        },
      });

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
            <div class="bg-red-50 border border-red-200 rounded-md p-4 text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-300">
              <strong>Mermaid Diagram Error:</strong> Failed to render diagram
              <pre class="mt-2 text-xs bg-red-100 p-2 rounded overflow-x-auto dark:bg-red-900/40">${chart}</pre>
            </div>
          `;
        }
      }
    };

    void renderDiagram();
  }, [chart, theme]);

  return <div ref={ref} className={`my-4 flex justify-center ${className || ''}`} />;
};

export default MermaidDiagram;
