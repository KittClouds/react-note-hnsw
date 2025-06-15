
import { useEffect, useRef } from 'react';
import { Graph } from '@/services/GraphInterface';
import { GraphSyncService, GraphSyncOptions } from '@/services/GraphSyncService';

export function useGraphSync(graph: Graph | null, options: Partial<GraphSyncOptions> = {}) {
  const syncServiceRef = useRef<GraphSyncService | null>(null);

  useEffect(() => {
    if (!graph) return;

    // Initialize sync service with options
    if (!syncServiceRef.current) {
      syncServiceRef.current = new GraphSyncService(graph, options);
      
      // Perform initial sync
      syncServiceRef.current.performSync();
      
      console.log('Graph sync service initialized with options:', options);
    }

    return () => {
      // Cleanup if needed
      if (syncServiceRef.current) {
        syncServiceRef.current.setEnabled(false);
      }
    };
  }, [graph]);

  // Return sync service for manual operations
  return {
    syncService: syncServiceRef.current,
    forceSync: () => syncServiceRef.current?.forcSync(),
    getSyncStatus: () => syncServiceRef.current?.getSyncStatus(),
    validateSync: () => syncServiceRef.current?.validateSync(),
    setEnabled: (enabled: boolean) => syncServiceRef.current?.setEnabled(enabled),
    enableBidirectionalSync: (enabled: boolean) => syncServiceRef.current?.enableBidirectionalSync(enabled),
    setSyncDirection: (direction: 'localStorage-to-graph' | 'graph-to-localStorage' | 'bidirectional') => 
      syncServiceRef.current?.setSyncDirection(direction),
    setConflictResolution: (strategy: { strategy: 'localStorage' | 'graph' | 'merge' | 'manual'; autoResolve: boolean }) => 
      syncServiceRef.current?.setConflictResolution(strategy),
    updateOptions: (newOptions: Partial<GraphSyncOptions>) => syncServiceRef.current?.updateOptions(newOptions)
  };
}
