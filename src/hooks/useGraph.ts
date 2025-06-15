
import { useEffect, useState } from 'react';
import { Graph } from '@/services/GraphInterface';

export function useGraph() {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize graph
    const graphInstance = new Graph();
    
    // Add event listeners for debugging
    graphInstance.on('node:added', (payload) => {
      console.log('Graph: Node added:', payload.node.id, payload.node.type);
    });
    
    graphInstance.on('node:updated', (payload) => {
      console.log('Graph: Node updated:', payload.node.id);
    });
    
    graphInstance.on('edge:added', (payload) => {
      console.log('Graph: Edge added:', payload.edge.type, payload.edge.from, '->', payload.edge.to);
    });

    setGraph(graphInstance);
    setIsInitialized(true);
    
    console.log('Graph initialized');
  }, []);

  return {
    graph,
    isInitialized
  };
}
