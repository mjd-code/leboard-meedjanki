import { useEffect, useCallback, useRef } from 'react';

export interface PresenterSyncMessage {
  type: 'slide_change' | 'ping' | 'pong' | 'close';
  slideIndex?: number;
  timestamp?: number;
}

const CHANNEL_NAME = 'slideforge-presenter-sync';

export function usePresenterSync(
  onSlideChange?: (index: number) => void,
  onAudienceConnected?: () => void,
  onAudienceDisconnected?: () => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isConnectedRef = useRef(false);
  
  // Store callbacks in refs to avoid recreating the channel on callback changes
  const onSlideChangeRef = useRef(onSlideChange);
  const onAudienceConnectedRef = useRef(onAudienceConnected);
  const onAudienceDisconnectedRef = useRef(onAudienceDisconnected);
  
  // Keep refs updated
  useEffect(() => {
    onSlideChangeRef.current = onSlideChange;
    onAudienceConnectedRef.current = onAudienceConnected;
    onAudienceDisconnectedRef.current = onAudienceDisconnected;
  });

  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);

    const handleMessage = (event: MessageEvent<PresenterSyncMessage>) => {
      const { type, slideIndex } = event.data;

      switch (type) {
        case 'slide_change':
          if (slideIndex !== undefined && onSlideChangeRef.current) {
            onSlideChangeRef.current(slideIndex);
          }
          break;
        case 'ping':
          // Audience window is checking if presenter is alive
          channelRef.current?.postMessage({ type: 'pong' });
          break;
        case 'pong':
          // Presenter received response from audience
          if (!isConnectedRef.current) {
            isConnectedRef.current = true;
            onAudienceConnectedRef.current?.();
          }
          break;
        case 'close':
          isConnectedRef.current = false;
          onAudienceDisconnectedRef.current?.();
          break;
      }
    };

    channelRef.current.addEventListener('message', handleMessage);

    return () => {
      channelRef.current?.removeEventListener('message', handleMessage);
      channelRef.current?.close();
    };
  }, []); // Empty deps - channel created once

  const broadcastSlideChange = useCallback((index: number) => {
    channelRef.current?.postMessage({
      type: 'slide_change',
      slideIndex: index,
      timestamp: Date.now(),
    } as PresenterSyncMessage);
  }, []);

  const sendPing = useCallback(() => {
    channelRef.current?.postMessage({ type: 'ping' } as PresenterSyncMessage);
  }, []);

  const sendClose = useCallback(() => {
    channelRef.current?.postMessage({ type: 'close' } as PresenterSyncMessage);
  }, []);

  return {
    broadcastSlideChange,
    sendPing,
    sendClose,
  };
}
