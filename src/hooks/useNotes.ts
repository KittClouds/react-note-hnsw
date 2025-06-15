
import { useState, useEffect } from 'react';
import { Note } from '@/types/note';

export function useActiveNote(): Note | null {
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  useEffect(() => {
    // Get the currently selected note from localStorage or context
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      const notes = JSON.parse(savedNotes);
      const firstNote = notes.find((note: Note) => note.type === 'note');
      if (firstNote) {
        setActiveNote(firstNote);
      }
    }
  }, []);

  return activeNote;
}

export function useNotes(): Note[] {
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
    }
  }, []);

  return notes;
}
