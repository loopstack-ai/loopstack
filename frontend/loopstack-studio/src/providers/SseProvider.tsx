import { useEffect, useRef } from 'react';
import { useMe } from '../hooks/useAuth.ts';
import { eventBus } from '../services';
import { useStudio } from './StudioProvider.tsx';

let eventSource: EventSource | null = null;

export function SseProvider() {
  const { environment } = useStudio();
  const { data: user, isSuccess: isAuthenticated } = useMe();
  const hasConnected = useRef(false);

  useEffect(() => {
    if (environment.url && isAuthenticated && user) {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      const sseUrl = `${environment.url}/api/v1/sse/stream`;

      eventSource = new EventSource(sseUrl, {
        withCredentials: true,
      });

      eventSource.onopen = () => {
        console.log('SSE connection established');
        hasConnected.current = true;
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        if (eventSource?.readyState === EventSource.CLOSED) {
          console.log('SSE connection closed');
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
        eventSource?.addEventListener(eventType, (event: MessageEvent) => {
          try {
            const payload: any = JSON.parse(event.data);
            eventBus.emit(payload.type, payload);
          } catch (error) {
            console.error(`Error parsing SSE event [${eventType}]:`, error);
          }
        });
      });

      return () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
      };
    }
  }, [environment.url, isAuthenticated, user]);

  return null;
}
