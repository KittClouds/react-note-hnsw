
import { useMemo } from 'react';
import { useNotes, useActiveClusterId, useActiveNoteConnections } from '@/hooks/useLiveStore';
import { Entity } from '@/utils/parsingUtils';

export interface ClusterEntity extends Entity {
  sourceNoteIds: string[];
  referenceCount: number;
}

export function useActiveClusterEntities(): ClusterEntity[] {
  const notes = useNotes();
  const [activeClusterId] = useActiveClusterId();
  const { entities: noteEntitiesMap } = useActiveNoteConnections();

  return useMemo(() => {
    // Get all notes in the current cluster
    const clusterNotes = Array.isArray(notes) ? notes.filter(note => note.nestId === activeClusterId) : [];
    
    const entityMap = new Map<string, ClusterEntity>();
    
    clusterNotes.forEach(note => {
      // For this simplified version, we'll use the active note connections
      // In a full implementation, you'd want to parse each note individually
      const noteEntities = Array.isArray(noteEntitiesMap) ? noteEntitiesMap : [];
      
      noteEntities.forEach(entity => {
        const entityKey = `${entity.kind}:${entity.label}`;
        
        if (entityMap.has(entityKey)) {
          const existing = entityMap.get(entityKey)!;
          if (!existing.sourceNoteIds.includes(note.id)) {
            existing.sourceNoteIds.push(note.id);
            existing.referenceCount++;
          }
        } else {
          entityMap.set(entityKey, {
            ...entity,
            sourceNoteIds: [note.id],
            referenceCount: 1
          });
        }
      });
    });
    
    return Array.from(entityMap.values());
  }, [notes, activeClusterId, noteEntitiesMap]);
}
