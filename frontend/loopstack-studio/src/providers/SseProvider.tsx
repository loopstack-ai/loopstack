import { useEffect, useRef } from 'react';
// import { SseClientEvents } from '@/events';
import { useMe } from '../hooks/useAuth.ts';
import { eventBus } from '../services';
import { useStudio } from './StudioProvider.tsx';

export function SseProvider() {
  const { environment } = useStudio();
  const { data: user, isSuccess: isAuthenticated } = useMe();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (environment.url && isAuthenticated && user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      const sseUrl = `${environment.url}/api/v1/sse/stream`;

      const es = new EventSource(sseUrl, {
        withCredentials: true,
      });
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log('SSE connection established');
        // eventBus.emit(SseClientEvents.SSE_CONNECTED);
      };

      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) {
          console.warn('SSE connection closed. Refresh the page if it does not recover.');
        }
      };

      const eventTypes = [
        'workflow.created',
        'workflow.updated',
        'document.created',
        'pipeline.updated',
        'workspace.updated',
      ];

      eventTypes.forEach((eventType) => {
        es.addEventListener(eventType, (event: MessageEvent<string>) => {
          try {
            const payload = JSON.parse(event.data) as { type: string };
            eventBus.emit(payload.type, payload);
          } catch (error) {
            console.error(`Error parsing SSE event [${eventType}]:`, error);
          }
        });
      });

      return () => {
        es.close();
        eventSourceRef.current = null;
      };
    }
  }, [environment.url, isAuthenticated, user]);

  return null;
}
