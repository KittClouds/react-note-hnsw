
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
import { NoteProvider, useNoteContext } from '@/contexts/NoteContext';

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
  const {
    notes,
    nests,
    selectedNote,
    setSelectedNote,
    selectedNest,
    setSelectedNest,
    createNote,
    createNest,
    updateNote,
    updateNest,
    deleteNote,
    deleteNest,
    moveNote,
    isInitialized
  } = useNoteContext();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNestId, setSelectedNestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [noteConnections, setNoteConnections] = useState<Map<string, ParsedConnections>>(new Map());
  
  const [connectionsPanelOpen, setConnectionsPanelOpen] = useState(false);

  // Load dark mode preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    
    if (savedDarkMode === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Sync selected note/nest with context
  useEffect(() => {
    if (selectedNoteId) {
      const note = notes.find(n => n.id === selectedNoteId);
      setSelectedNote(note || null);
    }
  }, [selectedNoteId, notes, setSelectedNote]);

  useEffect(() => {
    if (selectedNestId) {
      const nest = nests.find(n => n.id === selectedNestId);
      setSelectedNest(nest || null);
    }
  }, [selectedNestId, nests, setSelectedNest]);

  const createNewNote = useCallback((parentId?: string, nestId?: string) => {
    if (!isInitialized) return;
    
    try {
      const newNote = createNote('Untitled Note', DEFAULT_CONTENT, 'note', parentId, nestId);
      setSelectedNoteId(newNote.id);
      toast({
        title: "New note created",
        description: "Start writing your thoughts!",
      });
    } catch (error) {
      console.error('Failed to create note:', error);
      toast({
        title: "Error",
        description: "Failed to create note.",
        variant: "destructive"
      });
    }
  }, [createNote, isInitialized]);

  const createNewFolder = useCallback((parentId?: string, nestId?: string) => {
    if (!isInitialized) return;
    
    try {
      createNote('New Folder', '', 'folder', parentId, nestId);
      toast({
        title: "New folder created",
        description: "Organize your notes!",
      });
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast({
        title: "Error",
        description: "Failed to create folder.",
        variant: "destructive"
      });
    }
  }, [createNote, isInitialized]);

  const createNewNest = useCallback(() => {
    if (!isInitialized) return;
    
    try {
      const newNest = createNest('New Nest', '');
      setSelectedNestId(newNest.id);
      toast({
        title: "New nest created",
        description: "Organize your domain-specific work!",
      });
    } catch (error) {
      console.error('Failed to create nest:', error);
      toast({
        title: "Error",
        description: "Failed to create nest.",
        variant: "destructive"
      });
    }
  }, [createNest, isInitialized]);

  const handleUpdateNote = useCallback((id: string, updates: Partial<Note>) => {
    if (!isInitialized) return;
    updateNote(id, updates);
  }, [updateNote, isInitialized]);

  const handleDeleteNote = useCallback((id: string) => {
    if (!isInitialized) return;
    
    try {
      deleteNote(id);
      
      // If we deleted the selected note, clear selection
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
      }
      
      toast({
        title: "Note deleted",
        description: "The note has been removed.",
      });
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note.",
        variant: "destructive"
      });
    }
  }, [deleteNote, selectedNoteId, isInitialized]);

  const handleDeleteNest = useCallback((id: string) => {
    if (!isInitialized) return;
    
    try {
      deleteNest(id);
      
      // Clear selections if this nest was selected
      if (selectedNestId === id) {
        setSelectedNestId(null);
        setSelectedNoteId(null);
      }
      
      toast({
        title: "Nest deleted",
        description: "The nest and all its contents have been removed.",
      });
    } catch (error) {
      console.error('Failed to delete nest:', error);
      toast({
        title: "Error",
        description: "Failed to delete nest.",
        variant: "destructive"
      });
    }
  }, [deleteNest, selectedNestId, isInitialized]);

  const renameNote = useCallback((id: string, newTitle: string) => {
    handleUpdateNote(id, { title: newTitle });
  }, [handleUpdateNote]);

  const renameNest = useCallback((id: string, newName: string) => {
    if (!isInitialized) return;
    updateNest(id, { name: newName });
  }, [updateNest, isInitialized]);

  const toggleFolder = useCallback((id: string) => {
    // This functionality needs to be implemented in the graph
    // For now, we'll handle it in the UI state
    console.log('Toggle folder:', id);
  }, []);

  const handleContentChange = useCallback((content: string) => {
    if (selectedNoteId && isInitialized) {
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
      
      handleUpdateNote(selectedNoteId, { 
        content, 
        title: title.substring(0, 100) // Limit title length
      });
    }
  }, [selectedNoteId, handleUpdateNote, isInitialized]);

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
    handleUpdateNote(noteId, { title: newTitle });
  }, [handleUpdateNote]);

  const handleEntityUpdate = useCallback((entityId: string, updates: any) => {
    console.log('Entity updated:', entityId, updates);
    // TODO: Implement entity persistence logic here
    toast({
      title: "Entity updated",
      description: `Entity ${entityId} has been modified.`,
    });
  }, []);

  // Show loading while graph initializes
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
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
            onDeleteNote={handleDeleteNote}
            onDeleteNest={handleDeleteNest}
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
  );
};

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <NoteProvider>
        <NotesApp />
      </NoteProvider>
    </div>
  );
};

export default App;
