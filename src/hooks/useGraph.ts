
import { useState, useEffect, useCallback } from 'react';
import { Graph } from '@/services/GraphInterface';
import { Note, Nest } from '@/types/note';

// Create a simple interface wrapper for the Graph class
class GraphInterface {
  constructor(public graph: Graph) {}

  initialize() {
    // Create root structure if not exists
    const rootNodes = this.graph.findNodes({ type: 'root' });
    if (rootNodes.length === 0) {
      const rootNode = this.graph.addNode('root', { title: 'Root' });
      const standardNode = this.graph.addNode('standard', { title: 'Standard' }, rootNode.id);
      const nestRootNode = this.graph.addNode('nest', { title: 'Nests' }, rootNode.id);
    }
  }

  createNote(title: string, content: string, type: 'note' | 'folder', parentId?: string, nodeId?: string): Note {
    const standardNodes = this.graph.findNodes({ type: 'standard' });
    const actualParentId = parentId || (standardNodes.length > 0 ? standardNodes[0].id : undefined);
    
    const noteNode = this.graph.addNode(type, {
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    }, actualParentId, nodeId);

    return {
      id: noteNode.id,
      title: noteNode.props.title,
      content: noteNode.props.content,
      type: type,
      parentId: actualParentId,
      createdAt: noteNode.props.createdAt,
      updatedAt: noteNode.props.updatedAt
    };
  }

  createNoteInNest(nestId: string, title: string, content: string, type: 'note' | 'folder', parentId?: string, nodeId?: string): Note {
    const noteNode = this.graph.addNode(type, {
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      nestId
    }, parentId, nodeId);

    return {
      id: noteNode.id,
      title: noteNode.props.title,
      content: noteNode.props.content,
      type: type,
      parentId,
      nestId,
      createdAt: noteNode.props.createdAt,
      updatedAt: noteNode.props.updatedAt
    };
  }

  createNest(name: string, description?: string, nodeId?: string): Nest {
    const nestRootNodes = this.graph.findNodes({ type: 'nest' });
    const nestRootId = nestRootNodes.length > 0 ? nestRootNodes[0].id : undefined;

    const nestNode = this.graph.addNode('subnest', {
      name,
      description: description || '',
      createdAt: new Date(),
      updatedAt: new Date()
    }, nestRootId, nodeId);

    return {
      id: nestNode.id,
      name: nestNode.props.name,
      description: nestNode.props.description,
      createdAt: nestNode.props.createdAt,
      updatedAt: nestNode.props.updatedAt
    };
  }

  getAllNotes(): Note[] {
    const noteNodes = this.graph.findNodes({ type: 'note' });
    const folderNodes = this.graph.findNodes({ type: 'folder' });
    
    return [...noteNodes, ...folderNodes].map(node => ({
      id: node.id,
      title: node.props.title,
      content: node.props.content,
      type: node.type as 'note' | 'folder',
      parentId: this.graph.getParent(node.id)?.id,
      nestId: node.props.nestId,
      createdAt: node.props.createdAt,
      updatedAt: node.props.updatedAt
    }));
  }

  getAllNests(): Nest[] {
    const nestNodes = this.graph.findNodes({ type: 'subnest' });
    
    return nestNodes.map(node => ({
      id: node.id,
      name: node.props.name,
      description: node.props.description,
      createdAt: node.props.createdAt,
      updatedAt: node.props.updatedAt
    }));
  }

  updateNoteTitle(id: string, title: string) {
    this.graph.updateNodeProps(id, { title, updatedAt: new Date() });
  }

  updateNoteContent(id: string, content: string) {
    this.graph.updateNodeProps(id, { content, updatedAt: new Date() });
  }

  updateNestName(id: string, name: string) {
    this.graph.updateNodeProps(id, { name, updatedAt: new Date() });
  }

  updateNestDescription(id: string, description: string) {
    this.graph.updateNodeProps(id, { description, updatedAt: new Date() });
  }

  deleteNote(id: string) {
    this.graph.removeNode(id);
  }

  deleteNest(id: string) {
    this.graph.removeNodeAndDescendants(id);
  }

  moveNote(noteId: string, newParentId: string | null) {
    this.graph.move(noteId, { parent: newParentId });
  }
}

export function useGraph() {
  const [graphInstance] = useState(() => new Graph());
  const [graphInterface] = useState(() => new GraphInterface(graphInstance));
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
    graph: graphInstance,
    graphInterface,
    isInitialized
  };
}
