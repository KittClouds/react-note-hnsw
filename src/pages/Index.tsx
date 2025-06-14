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
import { Note } from '@/types/note';

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

const NotesApp = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [noteConnections, setNoteConnections] = useState<Map<string, ParsedConnections>>(new Map());
  
  const [connectionsPanelOpen, setConnectionsPanelOpen] = useState(false);

  // Load notes from localStorage on component mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
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
    
    if (savedDarkMode === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const createNewNote = useCallback((parentId?: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: DEFAULT_CONTENT,
      type: 'note',
      parentId,
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

  const createNewFolder = useCallback((parentId?: string) => {
    const newFolder: Note = {
      id: Date.now().toString(),
      title: 'New Folder',
      content: '',
      type: 'folder',
      parentId,
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

  const renameNote = useCallback((id: string, newTitle: string) => {
    updateNote(id, { title: newTitle });
  }, [updateNote]);

  const toggleFolder = useCallback((id: string) => {
    setNotes(prev => prev.map(note => 
      note.id === id && note.type === 'folder'
        ? { ...note, isExpanded: !note.isExpanded }
        : note
    ));
  }, []);

  const handleContentChange = useCallback((content: string) => {
    if (selectedNoteId) {
      // Parse content to extract title
      let title = 'Untitled Note';
      try {
        const jsonContent = typeof content === 'string' ? JSON.parse(content) : content;
        
        // Extract title from first heading or first text content
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

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <NoteSidebar
            notes={filteredNotes}
            selectedNoteId={selectedNoteId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNoteSelect={setSelectedNoteId}
            onNewNote={createNewNote}
            onNewFolder={createNewFolder}
            onDeleteNote={deleteNote}
            onRenameNote={renameNote}
            onToggleFolder={toggleFolder}
          />
          
          <SidebarInset className="flex flex-col">
            <NoteHeader 
              selectedNote={selectedNote} 
              notes={notes} 
              onTitleChange={handleTitleChange}
            />

            <div className="flex items-center justify-end px-4 py-1 border-b bg-background/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDarkMode(prev => !prev)}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
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
        </div>
      </SidebarProvider>
    </div>
  );
};

export default NotesApp;
