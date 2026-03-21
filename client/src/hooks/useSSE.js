import { useEffect, useRef, useCallback } from 'react';

export function useSSE(sessionId, handlers) {
  const eventSourceRef = useRef(null);
  const retriesRef = useRef(0);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/sse/${sessionId}`);
    eventSourceRef.current = es;

    es.onopen = () => { retriesRef.current = 0; };

    es.addEventListener('session:start', (e) => {
      handlersRef.current.onSessionStart?.(JSON.parse(e.data));
    });
    es.addEventListener('stage:change', (e) => {
      handlersRef.current.onStageChange?.(JSON.parse(e.data));
    });
    es.addEventListener('session:pause', (e) => {
      handlersRef.current.onSessionPause?.(JSON.parse(e.data));
    });
    es.addEventListener('session:complete', (e) => {
      handlersRef.current.onSessionComplete?.(JSON.parse(e.data));
    });
    es.addEventListener('team:joined', (e) => {
      handlersRef.current.onTeamJoined?.(JSON.parse(e.data));
    });
    es.addEventListener('response:received', (e) => {
      handlersRef.current.onResponseReceived?.(JSON.parse(e.data));
    });

    es.onerror = () => {
      es.close();
      retriesRef.current++;
      const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30000);
      setTimeout(connect, delay);
    };
  }, [sessionId]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);
}
