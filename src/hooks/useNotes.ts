
import { useState, useEffect } from 'react';
import { Note } from '@/types/note';
import { useNoteContext } from '@/contexts/NoteContext';

export function useActiveNote(): Note | null {
  const { selectedNote } = useNoteContext();
  return selectedNote;
}

export function useNotes(): Note[] {
  const { notes } = useNoteContext();
  return notes;
}
