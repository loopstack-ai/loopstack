import { useEffect, useRef } from 'react';
import { SseClientEvents } from '@/events';
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
        eventBus.emit(SseClientEvents.SSE_CONNECTED);
      };

      eventSource.onerror = () => {
        if (eventSource?.readyState === EventSource.CONNECTING) {
          return;
        }

        if (eventSource?.readyState === EventSource.CLOSED) {
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
        eventSource?.addEventListener(eventType, (event: MessageEvent<string>) => {
          try {
            const payload = JSON.parse(event.data) as { type: string };
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
