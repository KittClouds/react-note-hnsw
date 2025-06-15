import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  SidebarProvider, 
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Moon, Sun, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import RichEditor from '@/components/RichEditor';
import NoteSidebar from '@/components/NoteSidebar';
import { ParsedConnections } from '@/utils/parsingUtils';
import { Note, Nest } from '@/types/note';

const DEFAULT_CONTENT = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Welcome to Your Notes' }]
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Start writing your thoughts here...' }]
    }
  ]
});
import NoteHeader from '@/components/NoteHeader';
import ConnectionsPanel from '@/components/ConnectionsPanel';
import RightSidebar from '@/components/RightSidebar';
import { RightSidebarProvider, RightSidebarTrigger } from '@/components/RightSidebarProvider';

const NotesApp = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [nests, setNests] = useState<Nest[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNestId, setSelectedNestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [noteConnections, setNoteConnections] = useState<Map<string, ParsedConnections>>(new Map());
  
  const [connectionsPanelOpen, setConnectionsPanelOpen] = useState(false);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
    const savedNests = localStorage.getItem('nests');
    const savedDarkMode = localStorage.getItem('darkMode');
    
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
        setSelectedNoteId(firstNote.id);
      }
    }

    if (savedNests) {
      const parsedNests = JSON.parse(savedNests).map((nest: any) => ({
        ...nest,
        createdAt: new Date(nest.createdAt),
        updatedAt: new Date(nest.updatedAt)
      }));
      setNests(parsedNests);
    }
    
    if (savedDarkMode === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Save data to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('nests', JSON.stringify(nests));
  }, [nests]);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const createNewNote = useCallback((parentId?: string, nestId?: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: DEFAULT_CONTENT,
      type: 'note',
      parentId,
      nestId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setNotes(prev => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
    toast({
      title: "New note created",
      description: "Start writing your thoughts!",
    });
  }, []);

  const createNewFolder = useCallback((parentId?: string, nestId?: string) => {
    const newFolder: Note = {
      id: Date.now().toString(),
      title: 'New Folder',
      content: '',
      type: 'folder',
      parentId,
      nestId,
      isExpanded: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setNotes(prev => [newFolder, ...prev]);
    toast({
      title: "New folder created",
      description: "Organize your notes!",
    });
  }, []);

  const createNewNest = useCallback(() => {
    const newNest: Nest = {
      id: Date.now().toString(),
      name: 'New Nest',
      description: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setNests(prev => [newNest, ...prev]);
    setSelectedNestId(newNest.id);
    toast({
      title: "New nest created",
      description: "Organize your domain-specific work!",
    });
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(note => 
      note.id === id 
        ? { ...note, ...updates, updatedAt: new Date() }
        : note
    ));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const noteToDelete = prev.find(note => note.id === id);
      if (!noteToDelete) return prev;

      // If deleting a folder, also delete all children
      const toDelete = new Set([id]);
      if (noteToDelete.type === 'folder') {
        const addChildrenToDelete = (parentId: string) => {
          prev.forEach(note => {
            if (note.parentId === parentId) {
              toDelete.add(note.id);
              if (note.type === 'folder') {
                addChildrenToDelete(note.id);
              }
            }
          });
        };
        addChildrenToDelete(id);
      }

      const filtered = prev.filter(note => !toDelete.has(note.id));
      
      // If we deleted the selected note, select the first remaining note
      if (selectedNoteId === id || toDelete.has(selectedNoteId || '')) {
        const firstNote = filtered.find(note => note.type === 'note');
        setSelectedNoteId(firstNote ? firstNote.id : null);
      }
      
      return filtered;
    });
    toast({
      title: "Note deleted",
      description: "The note has been removed.",
    });
  }, [selectedNoteId]);

  const deleteNest = useCallback((id: string) => {
    // Delete all notes in the nest
    setNotes(prev => prev.filter(note => note.nestId !== id));
    
    // Delete the nest
    setNests(prev => prev.filter(nest => nest.id !== id));
    
    // Clear selection if this nest was selected
    if (selectedNestId === id) {
      setSelectedNestId(null);
      setSelectedNoteId(null);
    }
    
    toast({
      title: "Nest deleted",
      description: "The nest and all its contents have been removed.",
    });
  }, [selectedNestId]);

  const renameNote = useCallback((id: string, newTitle: string) => {
    updateNote(id, { title: newTitle });
  }, [updateNote]);

  const renameNest = useCallback((id: string, newName: string) => {
    setNests(prev => prev.map(nest => 
      nest.id === id 
        ? { ...nest, name: newName, updatedAt: new Date() }
        : nest
    ));
  }, []);

  const toggleFolder = useCallback((id: string) => {
    setNotes(prev => prev.map(note => 
      note.id === id && note.type === 'folder'
        ? { ...note, isExpanded: !note.isExpanded }
        : note
    ));
  }, []);

  const handleContentChange = useCallback((content: string) => {
    if (selectedNoteId) {
      let title = 'Untitled Note';
      try {
        const jsonContent = typeof content === 'string' ? JSON.parse(content) : content;
        
        if (jsonContent.content && Array.isArray(jsonContent.content)) {
          for (const node of jsonContent.content) {
            if (node.type === 'heading' && node.content && node.content[0]?.text) {
              title = node.content[0].text.trim() || 'Untitled Note';
              break;
            } else if (node.type === 'paragraph' && node.content && node.content[0]?.text) {
              title = node.content[0].text.trim().split('\n')[0] || 'Untitled Note';
              break;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to parse content for title extraction:', error);
      }
      
      updateNote(selectedNoteId, { 
        content, 
        title: title.substring(0, 100) // Limit title length
      });
    }
  }, [selectedNoteId, updateNote]);

  const handleConnectionsChange = useCallback((connections: ParsedConnections) => {
    if (selectedNoteId) {
      setNoteConnections(prev => new Map(prev.set(selectedNoteId, connections)));
      console.log('Parsed connections for note:', selectedNoteId, connections);
    }
  }, [selectedNoteId]);

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedNote = notes.find(note => note.id === selectedNoteId && note.type === 'note');
  const selectedNoteConnections = selectedNoteId ? noteConnections.get(selectedNoteId) || null : null;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            createNewNote();
            break;
          case 'k':
            e.preventDefault();
            document.getElementById('search-input')?.focus();
            break;
          case 'd':
            e.preventDefault();
            setIsDarkMode(prev => !prev);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [createNewNote]);

  const handleTitleChange = useCallback((noteId: string, newTitle: string) => {
    updateNote(noteId, { title: newTitle });
  }, [updateNote]);

  const handleEntityUpdate = useCallback((entityId: string, updates: any) => {
    console.log('Entity updated:', entityId, updates);
    // TODO: Implement entity persistence logic here
    toast({
      title: "Entity updated",
      description: `Entity ${entityId} has been modified.`,
    });
  }, []);

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <SidebarProvider>
        <RightSidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <NoteSidebar
              notes={filteredNotes}
              nests={nests}
              selectedNoteId={selectedNoteId}
              selectedNestId={selectedNestId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onNoteSelect={setSelectedNoteId}
              onNestSelect={setSelectedNestId}
              onNewNote={createNewNote}
              onNewFolder={createNewFolder}
              onNewNest={createNewNest}
              onDeleteNote={deleteNote}
              onDeleteNest={deleteNest}
              onRenameNote={renameNote}
              onRenameNest={renameNest}
              onToggleFolder={toggleFolder}
            />
            
            <SidebarInset className="flex flex-col">
              <NoteHeader 
                selectedNote={selectedNote} 
                notes={notes} 
                onTitleChange={handleTitleChange}
                isDarkMode={isDarkMode}
                onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
                onEntityUpdate={handleEntityUpdate}
              />

              <div className="flex items-center justify-between px-4 py-1 border-b bg-background/50">
                <div></div>
                <div className="flex items-center gap-2">
                  <RightSidebarTrigger />
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                {selectedNote ? (
                  <>
                    <div className="flex-1 overflow-hidden p-4">
                      <RichEditor
                        content={selectedNote.content}
                        onChange={handleContentChange}
                        onConnectionsChange={handleConnectionsChange}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                    
                    <ConnectionsPanel
                      connections={selectedNoteConnections}
                      isOpen={connectionsPanelOpen}
                      onToggle={() => setConnectionsPanelOpen(prev => !prev)}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h2 className="text-xl font-semibold mb-2">No note selected</h2>
                      <p className="text-muted-foreground mb-4">
                        Select a note from the sidebar or create a new one
                      </p>
                      <Button onClick={() => createNewNote()}>
                        Create New Note
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </SidebarInset>

            <RightSidebar />
          </div>
        </RightSidebarProvider>
      </SidebarProvider>
    </div>
  );
};

export default NotesApp;
