
import React, { createContext, useContext, useState, useEffect } from 'react';
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

export function NoteProvider({ children }: { children: React.ReactNode }) {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
        ...note,
        type: note.type || 'note',
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      }));
      setNotes(parsedNotes);
      
      // Select the first note if available
      const firstNote = parsedNotes.find((note: Note) => note.type === 'note');
      if (firstNote) {
        setSelectedNote(firstNote);
      }
    }
  }, []);

  return (
    <NoteContext.Provider value={{ selectedNote, setSelectedNote, notes, setNotes }}>
      {children}
    </NoteContext.Provider>
  );
}
