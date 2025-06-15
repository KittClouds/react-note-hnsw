
import { useState, useMemo } from 'react';
import { useActiveClusterEntities, ClusterEntity } from '@/components/entity-manager/useActiveClusterEntities';
import { useActiveNoteConnections } from './useLiveStore';
import { Entity } from '@/utils/parsingUtils';

export type EntityScope = 'note' | 'folder' | 'cluster' | 'vault';

export function useEntitiesForScope() {
  const [scope, setScope] = useState<EntityScope>('cluster');

  const clusterEntities = useActiveClusterEntities();
  const { entities: noteEntities } = useActiveNoteConnections();

  const scopeInfo = useMemo(() => {
    switch (scope) {
      case 'note': return { name: 'Current Note', description: 'Entities found only in the currently active note.' };
      case 'folder': return { name: 'Current Folder', description: 'Entities from all notes in the current folder.' };
      case 'cluster': return { name: 'Current Cluster', description: 'Entities from all notes in the same cluster as the active note.' };
      case 'vault': return { name: 'Entire Vault', description: 'All entities found across your entire vault.' };
      default: return { name: '', description: '' };
    }
  }, [scope]);

  const entities = useMemo(() => {
    switch (scope) {
      case 'note':
        return noteEntities;
      case 'cluster':
        return clusterEntities;
      // For now, folder and vault will show cluster entities as a fallback
      case 'folder':
      case 'vault':
        return clusterEntities;
      default:
        return [];
    }
  }, [scope, noteEntities, clusterEntities]);

  const entityGroups = useMemo(() => {
    return entities.reduce((acc, entity) => {
      const kind = entity.kind || 'UNTYPED';
      if (!acc[kind]) {
        acc[kind] = [];
      }
      acc[kind].push(entity);
      return acc;
    }, {} as Record<string, (Entity[] | ClusterEntity[])>);
  }, [entities]);

  return {
    scope,
    setScope,
    scopeInfo,
    entities,
    entityGroups,
  };
}
