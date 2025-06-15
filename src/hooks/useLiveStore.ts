
import { useMemo } from 'react';
import { useNoteContext } from '@/contexts/NoteContext';
import { parseAllNotes } from '@/utils/parsingUtils';
import { TypedAttribute } from '@/types/attributes';

// Mock entity attributes store - in a real app this would be a proper store
const mockEntityAttributes: Array<{
  entityKind: string;
  entityLabel: string;
  attributes: TypedAttribute[];
}> = [];

export function useActiveNote() {
  const { selectedNote } = useNoteContext();
  return selectedNote;
}

export function useActiveNoteConnections() {
  const { selectedNote } = useNoteContext();

  const entities = useMemo(() => {
    if (!selectedNote) return [];
    
    const { entitiesMap } = parseAllNotes([selectedNote]);
    const noteEntities = entitiesMap.get(selectedNote.id) || [];
    
    return noteEntities.map(entity => ({
      ...entity,
      sourceNoteId: selectedNote.id,
      sourceNoteTitle: selectedNote.title
    }));
  }, [selectedNote]);

  return { entities };
}

export function useEntityAttributes() {
  return mockEntityAttributes;
}

export function useBlueprintsArray() {
  return [];
}
