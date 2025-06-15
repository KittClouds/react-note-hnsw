
import React, { createContext, useContext } from 'react';
import { Note } from '@/types/note';
import { ParsedConnections } from '@/utils/parsingUtils';

interface NoteContextType {
  selectedNote: Note | null;
  setSelectedNote: (note: Note | null) => void;
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  // New multi-tab related fields
  activeNotes: Map<string, Note>;
  noteConnections: Map<string, ParsedConnections>;
  updateNoteConnections: (noteId: string, connections: ParsedConnections) => void;
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
  activeNotes?: Map<string, Note>;
  noteConnections?: Map<string, ParsedConnections>;
  updateNoteConnections?: (noteId: string, connections: ParsedConnections) => void;
}

export function NoteProvider({ 
  children, 
  selectedNote, 
  setSelectedNote, 
  notes, 
  setNotes,
  activeNotes = new Map(),
  noteConnections = new Map(),
  updateNoteConnections = () => {}
}: NoteProviderProps) {
  const contextValue = {
    selectedNote,
    setSelectedNote,
    notes,
    setNotes,
    activeNotes,
    noteConnections,
    updateNoteConnections,
  };

  return (
    <NoteContext.Provider value={contextValue}>
      {children}
    </NoteContext.Provider>
  );
}
