import { useEffect, useRef, useCallback } from 'react';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Storage } from '../utils/storage';

type Topic = string;
type Handler = (data: any) => void;

export function useWebSocket(accountId: string | null) {
  const clientRef = useRef<Client | null>(null);
  const subsRef   = useRef<Map<Topic, StompSubscription>>(new Map());
  const handlersRef = useRef<Map<Topic, Set<Handler>>>(new Map());
  const connectedRef = useRef(false);

  const connect = useCallback(async () => {
    if (connectedRef.current || !accountId) return;

    const baseUrl = await Storage.getBaseUrl();
    const token   = await Storage.getToken();

    const client = new Client({
      webSocketFactory: () => new (SockJS as any)(`${baseUrl}/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      reconnectDelay: 5000,
      onConnect: () => {
        connectedRef.current = true;
        // Resubscribe after reconnect
        handlersRef.current.forEach((_, topic) => {
          if (!subsRef.current.has(topic)) {
            const sub = client.subscribe(topic, (msg) => {
              try {
                const data = JSON.parse(msg.body);
                handlersRef.current.get(topic)?.forEach(h => h(data));
              } catch { /* ignore */ }
            });
            subsRef.current.set(topic, sub);
          }
        });
      },
      onDisconnect: () => {
        connectedRef.current = false;
        subsRef.current.clear();
      },
    });

    client.activate();
    clientRef.current = client;
  }, [accountId]);

  useEffect(() => {
    connect();
    return () => {
      clientRef.current?.deactivate();
      connectedRef.current = false;
    };
  }, [connect]);

  const subscribe = useCallback((topic: Topic, handler: Handler) => {
    if (!handlersRef.current.has(topic)) {
      handlersRef.current.set(topic, new Set());
    }
    handlersRef.current.get(topic)!.add(handler);

    // Subscribe immediately if already connected
    if (connectedRef.current && clientRef.current && !subsRef.current.has(topic)) {
      const sub = clientRef.current.subscribe(topic, (msg) => {
        try {
          const data = JSON.parse(msg.body);
          handlersRef.current.get(topic)?.forEach(h => h(data));
        } catch { /* ignore */ }
      });
      subsRef.current.set(topic, sub);
    }

    return () => {
      handlersRef.current.get(topic)?.delete(handler);
      if (handlersRef.current.get(topic)?.size === 0) {
        subsRef.current.get(topic)?.unsubscribe();
        subsRef.current.delete(topic);
        handlersRef.current.delete(topic);
      }
    };
  }, []);

  return { subscribe };
}
