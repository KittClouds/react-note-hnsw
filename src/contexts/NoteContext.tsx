
import React, { createContext, useContext } from 'react';
import { Note } from '@/types/note';

interface NoteContextType {
  selectedNote: Note | null;
  setSelectedNote: (note: Note | null) => void;
  notes: Note[];
  setNotes: (notes: Note[]) => void;
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
  selectedNote: Note | null;
  setSelectedNote: (note: Note | null) => void;
  notes: Note[];
  setNotes: (notes: Note[]) => void;
}

export function NoteProvider({ 
  children, 
  selectedNote, 
  setSelectedNote, 
  notes, 
  setNotes 
}: NoteProviderProps) {
  const contextValue = {
    selectedNote,
    setSelectedNote,
    notes,
    setNotes,
  };

  return (
    <NoteContext.Provider value={contextValue}>
      {children}
    </NoteContext.Provider>
  );
}
