import { motion, useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface StreamingTextProps {
  text: string;
  className?: string;
}

export function StreamingText({ text, className }: StreamingTextProps) {
  const reduceMotion = useReducedMotion();

  const tokens = useMemo(() => text.match(/\S+\s*|\s+/g) ?? (text ? [text] : []), [text]);

  if (reduceMotion) {
    return <span className={cn('whitespace-pre-wrap', className)}>{text}</span>;
  }

  return (
    <span className={cn('whitespace-pre-wrap', className)}>
      {tokens.map((token, index) => {
        const isLatest = index === tokens.length - 1;

        return (
          <motion.span
            key={index}
            initial={isLatest ? { opacity: 0, y: 2 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {token}
          </motion.span>
        );
      })}
    </span>
  );
}
