
import { useEffect, useRef } from 'react';
import { Graph } from '@/services/GraphInterface';
import { GraphSyncService } from '@/services/GraphSyncService';

export function useGraphSync(graph: Graph | null) {
  const syncServiceRef = useRef<GraphSyncService | null>(null);

  useEffect(() => {
    if (!graph) return;

    // Initialize sync service
    if (!syncServiceRef.current) {
      syncServiceRef.current = new GraphSyncService(graph);
      
      // Perform initial sync
      syncServiceRef.current.performSync();
      
      console.log('Graph sync service initialized and initial sync performed');
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
    setEnabled: (enabled: boolean) => syncServiceRef.current?.setEnabled(enabled)
  };
}
