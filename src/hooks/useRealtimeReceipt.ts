import { useState, useEffect, useCallback, useRef } from 'react';
import { BillSplitterState } from '@/types/index';
import { Receipt } from '@/lib/db';

interface UseRealtimeReceiptReturn {
  state: BillSplitterState;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  saveReceipt: () => Promise<void>;
  updateState: (newState: Partial<BillSplitterState>) => void;
  shareUrl: string | null;
}

export function useRealtimeReceipt(receiptId?: string): UseRealtimeReceiptReturn {
  const [state, setState] = useState<BillSplitterState>({
    people: [],
    items: [],
    taxRates: [
      { id: 1, name: 'GST', rate: 5.00 },
      { id: 2, name: 'PLT', rate: 10.00 }
    ],
    nextTaxId: 3,
    tipConfig: {
      isPercentage: true,
      value: 20.00
    },
    currentImageUrl: null,
    currentFileType: null
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const pendingSaveRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef(state);

  // Load receipt from database
  const loadReceipt = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/receipts/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load receipt');
      }

      const { receipt }: { receipt: Receipt } = await response.json();

      const newState = {
        people: receipt.people,
        items: receipt.items.map(item => ({
          ...item,
          applicableTaxes: item.applicable_taxes
        })),
        taxRates: receipt.tax_rates,
        nextTaxId: Math.max(...receipt.tax_rates.map(t => t.id), 0) + 1,
        tipConfig: {
          isPercentage: receipt.tip_config.is_percentage,
          value: receipt.tip_config.value
        },
        currentImageUrl: receipt.image_url || null,
        currentFileType: receipt.image_type || null
      };
      setState(newState);
      stateRef.current = newState;

      setShareUrl(`${window.location.origin}/share/${receipt.access_token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save receipt to database
  const saveReceipt = useCallback(async () => {
    try {
      setError(null);

      const receiptData = {
        name: `Receipt ${new Date().toLocaleString()}`,
        items: state.items.map(item => ({
          ...item,
          applicable_taxes: item.applicableTaxes
        })),
        people: state.people,
        tax_rates: state.taxRates,
        tip_config: {
          is_percentage: state.tipConfig.isPercentage,
          value: state.tipConfig.value
        },
        image_url: state.currentImageUrl,
        image_type: state.currentFileType
      };

      let response;
      if (receiptId) {
        response = await fetch(`/api/receipts/${receiptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(receiptData)
        });
      } else {
        response = await fetch('/api/receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(receiptData)
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save receipt');
      }

      const { receipt }: { receipt: Receipt } = await response.json();

      if (!receiptId) {
        // If this is a new receipt, redirect to the share page
        window.location.href = `/share/${receipt.access_token}`;
      }

      setShareUrl(`${window.location.origin}/share/${receipt.access_token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save receipt');
    }
  }, [state, receiptId]);

  // Auto-save with debouncing
  const debouncedSave = useCallback(() => {
    if (pendingSaveRef.current) {
      clearTimeout(pendingSaveRef.current);
    }

    pendingSaveRef.current = setTimeout(async () => {
      if (!receiptId) return;

      try {
        setError(null);
        const currentState = stateRef.current;

        const receiptData = {
          name: `Receipt ${new Date().toLocaleString()}`,
          items: currentState.items.map(item => ({
            ...item,
            applicable_taxes: item.applicableTaxes
          })),
          people: currentState.people,
          tax_rates: currentState.taxRates,
          tip_config: {
            is_percentage: currentState.tipConfig.isPercentage,
            value: currentState.tipConfig.value
          },
          image_url: currentState.currentImageUrl,
          image_type: currentState.currentFileType
        };

        const response = await fetch(`/api/receipts/${receiptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(receiptData)
        });

        if (!response.ok) {
          throw new Error('Failed to save receipt');
        }

        console.log('Receipt auto-saved successfully');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to auto-save receipt');
        console.error('Auto-save failed:', err);
      }
    }, 2000); // Save 2 seconds after last change
  }, [receiptId]);

  // Update state and broadcast via WebSocket
  const updateState = useCallback((newState: Partial<BillSplitterState>) => {
    setState(prev => {
      const updated = { ...prev, ...newState };
      stateRef.current = updated; // Keep ref in sync
      return updated;
    });
    lastUpdateRef.current = Date.now();

    // Broadcast change via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'state_update',
        receiptId,
        changes: newState,
        userId: 'user-' + Math.random().toString(36).substr(2, 9) // Simple user ID
      }));
    }

    // Auto-save if we have a receipt ID
    if (receiptId) {
      debouncedSave();
    }
  }, [receiptId, debouncedSave]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!receiptId) return;

    let isCancelled = false;
    let connectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/websocket?receiptId=${receiptId}`;

      try {
        // Close existing connection if any
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
          wsRef.current.close();
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCancelled) {
            ws.close();
            return;
          }
          setIsConnected(true);
          setError(null);
          console.log(`WebSocket connected for receipt ${receiptId}`);
        };

        ws.onmessage = (event) => {
          if (isCancelled) return;

          try {
            const message = JSON.parse(event.data);

            if (message.type === 'state_update' && message.receiptId === receiptId) {
              // Only apply changes if they're newer than our last update
              const messageTime = new Date(message.timestamp).getTime();
              if (messageTime > lastUpdateRef.current) {
                setState(prev => {
                  const updated = { ...prev, ...message.changes };
                  stateRef.current = updated; // Keep ref in sync
                  return updated;
                });
                lastUpdateRef.current = messageTime;
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          if (isCancelled) return;
          setIsConnected(false);
          // Don't log close events from React strict mode cleanup
          if (!isCancelled) {
            console.log(`WebSocket disconnected for receipt ${receiptId}`);
          }
        };

        ws.onerror = (error) => {
          if (isCancelled) return;
          // Only set error state if this isn't from React strict mode cleanup
          if (!isCancelled && wsRef.current === ws) {
            setError('WebSocket connection error');
            setIsConnected(false);
            console.error('WebSocket error:', error);
          }
        };

      } catch (error) {
        if (!isCancelled) {
          setError('Failed to connect to real-time service');
        }
      }
    };

    // Delay connection slightly to avoid React strict mode double connections
    connectTimeout = setTimeout(connectWebSocket, 100);

    return () => {
      isCancelled = true;
      if (connectTimeout) {
        clearTimeout(connectTimeout);
      }
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current);
      }
    };
  }, [receiptId]);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load receipt on mount
  useEffect(() => {
    if (receiptId) {
      loadReceipt(receiptId);
    }
  }, [receiptId, loadReceipt]);

  return {
    state,
    isLoading,
    isConnected,
    error,
    saveReceipt,
    updateState,
    shareUrl
  };
}