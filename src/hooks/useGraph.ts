
import { useState, useEffect, useCallback } from 'react';
import { Graph } from '@/services/Graph';
import { GraphInterface } from '@/services/GraphInterface';
import { Note, Nest } from '@/types/note';

export function useGraph() {
  const [graph] = useState(() => new Graph());
  const [graphInterface] = useState(() => new GraphInterface(graph));
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize graph with existing data from localStorage
  useEffect(() => {
    const initializeGraph = async () => {
      try {
        // Create root structure
        graphInterface.initialize();

        // Migrate existing notes from localStorage
        const savedNotes = localStorage.getItem('notes');
        const savedNests = localStorage.getItem('nests');

        if (savedNotes) {
          const notes: Note[] = JSON.parse(savedNotes).map((note: any) => ({
            ...note,
            type: note.type || 'note',
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt)
          }));

          // Import notes into graph
          for (const note of notes) {
            if (!note.nestId) {
              // Notes in the standard folder structure
              graphInterface.createNote(
                note.title,
                note.content,
                note.type as 'note' | 'folder',
                note.parentId || undefined,
                note.id
              );
            }
          }
        }

        if (savedNests) {
          const nests: Nest[] = JSON.parse(savedNests).map((nest: any) => ({
            ...nest,
            createdAt: new Date(nest.createdAt),
            updatedAt: new Date(nest.updatedAt)
          }));

          // Import nests and their notes
          for (const nest of nests) {
            graphInterface.createNest(nest.name, nest.description, nest.id);

            // Import notes that belong to this nest
            if (savedNotes) {
              const notes: Note[] = JSON.parse(savedNotes).map((note: any) => ({
                ...note,
                type: note.type || 'note',
                createdAt: new Date(note.createdAt),
                updatedAt: new Date(note.updatedAt)
              }));

              const nestNotes = notes.filter(note => note.nestId === nest.id);
              for (const note of nestNotes) {
                graphInterface.createNoteInNest(
                  nest.id,
                  note.title,
                  note.content,
                  note.type as 'note' | 'folder',
                  note.parentId || undefined,
                  note.id
                );
              }
            }
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize graph:', error);
        setIsInitialized(true); // Still mark as initialized to prevent hanging
      }
    };

    initializeGraph();
  }, [graphInterface]);

  return {
    graph,
    graphInterface,
    isInitialized
  };
}
