import { Background, ReactFlow, type ReactFlowProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ReactNode } from 'react';
import { useTheme } from '@/providers/ThemeProvider.tsx';

type CanvasProps = ReactFlowProps & {
  children?: ReactNode;
};

export const Canvas = ({ children, ...props }: CanvasProps) => {
  const { theme } = useTheme();

  return (
    <ReactFlow
      colorMode={theme}
      deleteKeyCode={['Backspace', 'Delete']}
      fitView
      panOnDrag={false}
      panOnScroll
      selectionOnDrag={true}
      zoomOnDoubleClick={false}
      {...props}
    >
      <Background bgColor="var(--sidebar)" />
      {children}
    </ReactFlow>
  );
};
