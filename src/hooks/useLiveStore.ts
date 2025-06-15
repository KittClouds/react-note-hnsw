
import { useState } from 'react';
import { MOCK_BLUEPRINTS } from '@/lib/blueprints';
import { EnhancedEntityAttributes } from '@/types/attributes';
import { Entity } from '@/utils/parsingUtils';
import { Note } from '@/types/note';

// Mock store
const mockStore = {
  commit: (event: any) => {
    console.log('Committing event:', event);
    // In a real scenario, this would update the central state.
    // For now, we'll have to manage state locally in components or with context.
  }
};

export const useStore = () => {
  return { store: mockStore };
};

// Mock hooks
export const useEntityAttributes = (): EnhancedEntityAttributes[] => {
  // This should fetch from a central store. For now, returns an empty array.
  // The state will be managed inside EntityCard for this implementation.
  const [attributes] = useState<EnhancedEntityAttributes[]>([]);
  return attributes;
};

export const useBlueprintsArray = () => {
  return MOCK_BLUEPRINTS;
};

export const useActiveClusterId = (): [string | null, (id: string | null) => void] => {
  const [activeId, setActiveId] = useState<string | null>('cluster-1');
  return [activeId, setActiveId];
};

export const useNotes = (): Note[] => {
  // Mock notes data
  const [notes] = useState<Note[]>(() => {
    try {
      const savedNotes = localStorage.getItem('notes');
      if (savedNotes) {
        return JSON.parse(savedNotes);
      }
    } catch(e) {
      console.error("Failed to parse notes from localStorage", e)
    }
    return [];
  });
  return notes;
};

export const useActiveNoteConnections = (): { entities: Entity[] } => {
  // For now, let's just create some mock entities
  return {
    entities: [
      { kind: 'CHARACTER', label: 'Aragorn' },
      { kind: 'LOCATION', label: 'Gondor' },
      { kind: 'ITEM', label: 'Anduril' },
    ]
  };
};
