
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Note, Nest } from '@/types/note';
import { useGraph } from '@/hooks/useGraph';

interface NoteContextType {
  selectedNote: Note | null;
  setSelectedNote: (note: Note | null) => void;
  notes: Note[];
  nests: Nest[];
  selectedNest: Nest | null;
  setSelectedNest: (nest: Nest | null) => void;
  // Graph-backed operations
  createNote: (title: string, content: string, type: 'note' | 'folder', parentId?: string, nestId?: string) => Note;
  createNest: (name: string, description?: string) => Nest;
  updateNote: (id: string, updates: Partial<Note>) => void;
  updateNest: (id: string, updates: Partial<Nest>) => void;
  deleteNote: (id: string) => void;
  deleteNest: (id: string) => void;
  moveNote: (noteId: string, newParentId?: string) => void;
  isInitialized: boolean;
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

export function NoteProvider({ children }: NoteProviderProps) {
  const { graphInterface, isInitialized } = useGraph();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedNest, setSelectedNest] = useState<Nest | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [nests, setNests] = useState<Nest[]>([]);

  // Sync notes and nests from graph
  const syncFromGraph = useCallback(() => {
    if (!isInitialized) return;

    try {
      const allNotes = graphInterface.getAllNotes();
      const allNests = graphInterface.getAllNests();
      
      setNotes(allNotes);
      setNests(allNests);

      // Auto-select first note if none selected
      if (!selectedNote && allNotes.length > 0) {
        const firstNote = allNotes.find(note => note.type === 'note');
        if (firstNote) {
          setSelectedNote(firstNote);
        }
      }
    } catch (error) {
      console.error('Failed to sync from graph:', error);
    }
  }, [graphInterface, isInitialized, selectedNote]);

  // Initial sync and setup event listeners
  useEffect(() => {
    if (!isInitialized) return;

    syncFromGraph();

    // Listen to graph events for reactive updates
    const handleGraphChange = () => {
      syncFromGraph();
    };

    // Subscribe to relevant graph events
    graphInterface.graph.on('node:added', handleGraphChange);
    graphInterface.graph.on('node:updated', handleGraphChange);
    graphInterface.graph.on('node:removed', handleGraphChange);
    graphInterface.graph.on('node:destroyed', handleGraphChange);

    return () => {
      graphInterface.graph.off('node:added', handleGraphChange);
      graphInterface.graph.off('node:updated', handleGraphChange);
      graphInterface.graph.off('node:removed', handleGraphChange);
      graphInterface.graph.off('node:destroyed', handleGraphChange);
    };
  }, [isInitialized, syncFromGraph, graphInterface]);

  // Graph-backed operations
  const createNote = useCallback((title: string, content: string, type: 'note' | 'folder', parentId?: string, nestId?: string): Note => {
    if (nestId) {
      return graphInterface.createNoteInNest(nestId, title, content, type, parentId);
    } else {
      return graphInterface.createNote(title, content, type, parentId);
    }
  }, [graphInterface]);

  const createNest = useCallback((name: string, description?: string): Nest => {
    return graphInterface.createNest(name, description);
  }, [graphInterface]);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    if (updates.title !== undefined) {
      graphInterface.updateNoteTitle(id, updates.title);
    }
    if (updates.content !== undefined) {
      graphInterface.updateNoteContent(id, updates.content);
    }
    // Trigger sync
    syncFromGraph();
  }, [graphInterface, syncFromGraph]);

  const updateNest = useCallback((id: string, updates: Partial<Nest>) => {
    if (updates.name !== undefined) {
      graphInterface.updateNestName(id, updates.name);
    }
    if (updates.description !== undefined) {
      graphInterface.updateNestDescription(id, updates.description);
    }
    // Trigger sync
    syncFromGraph();
  }, [graphInterface, syncFromGraph]);

  const deleteNote = useCallback((id: string) => {
    graphInterface.deleteNote(id);
  }, [graphInterface]);

  const deleteNest = useCallback((id: string) => {
    graphInterface.deleteNest(id);
  }, [graphInterface]);

  const moveNote = useCallback((noteId: string, newParentId?: string) => {
    graphInterface.moveNote(noteId, newParentId || null);
  }, [graphInterface]);

  const contextValue = {
    selectedNote,
    setSelectedNote,
    notes,
    nests,
    selectedNest,
    setSelectedNest,
    createNote,
    createNest,
    updateNote,
    updateNest,
    deleteNote,
    deleteNest,
    moveNote,
    isInitialized,
  };

  return (
    <NoteContext.Provider value={contextValue}>
      {children}
    </NoteContext.Provider>
  );
}
