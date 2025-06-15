
import React, { createContext, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { useNotesStore, useUIStore } from '@/stores/StoreProvider';
import { INoteModel } from '@/stores/models/Note';

interface NoteContextType {
  selectedNote: INoteModel | null;
  setSelectedNote: (note: INoteModel | null) => void;
  notes: INoteModel[];
  setNotes: (notes: INoteModel[]) => void;
}

const NoteContext = createContext<NoteContextType | undefined>(undefined);

export function useNoteContext() {
  const context = useContext(NoteContext);
  if (!context) {
    throw new Error('useNoteContext must be used within a NoteProvider');
  }
  return context;
}

interface NoteProviderProps {
  children: React.ReactNode;
}

export const NoteProvider = observer(({ children }: NoteProviderProps) => {
  const notesStore = useNotesStore();
  const uiStore = useUIStore();

  const selectedNote = uiStore.selectedNoteId 
    ? notesStore.notes.get(uiStore.selectedNoteId) || null 
    : null;

  const contextValue = {
    selectedNote,
    setSelectedNote: (note: INoteModel | null) => {
      uiStore.setSelectedNote(note?.id || null);
    },
    notes: notesStore.allNotes,
    setNotes: (notes: INoteModel[]) => {
      // This is kept for compatibility but MST handles this automatically
      console.warn('setNotes called but MST manages notes automatically');
    },
  };

  return (
    <NoteContext.Provider value={contextValue}>
      {children}
    </NoteContext.Provider>
  );
});
