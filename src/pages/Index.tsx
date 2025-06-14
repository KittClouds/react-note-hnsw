
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Moon, Sun, FileText, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import RichEditor from '@/components/RichEditor';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_CONTENT = '<h1>Welcome to Your Notes</h1><p>Start writing your thoughts here...</p>';

const NotesApp = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load notes from localStorage on component mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
    const savedDarkMode = localStorage.getItem('darkMode');
    
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      }));
      setNotes(parsedNotes);
      
      // Select the first note if available
      if (parsedNotes.length > 0) {
        setSelectedNoteId(parsedNotes[0].id);
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

  const createNewNote = useCallback(() => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: DEFAULT_CONTENT,
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

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(note => 
      note.id === id 
        ? { ...note, ...updates, updatedAt: new Date() }
        : note
    ));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const filtered = prev.filter(note => note.id !== id);
      // If we deleted the selected note, select the first remaining note
      if (selectedNoteId === id) {
        setSelectedNoteId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
    toast({
      title: "Note deleted",
      description: "The note has been removed.",
    });
  }, [selectedNoteId]);

  const handleContentChange = useCallback((content: string) => {
    if (selectedNoteId) {
      // Extract title from content (first heading or first line)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const firstHeading = tempDiv.querySelector('h1, h2, h3, h4, h5, h6');
      const title = firstHeading 
        ? firstHeading.textContent?.trim() || 'Untitled Note'
        : tempDiv.textContent?.trim().split('\n')[0] || 'Untitled Note';
      
      updateNote(selectedNoteId, { 
        content, 
        title: title.substring(0, 100) // Limit title length
      });
    }
  }, [selectedNoteId, updateNote]);

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedNote = notes.find(note => note.id === selectedNoteId);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            createNewNote();
            break;
          case 'f':
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

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <NoteSidebar
            notes={filteredNotes}
            selectedNoteId={selectedNoteId}
            onSelectNote={setSelectedNoteId}
            onCreateNote={createNewNote}
            onDeleteNote={deleteNote}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
          />
          
          <main className="flex-1 flex flex-col">
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <SidebarTrigger />
                  <h1 className="text-lg font-semibold">
                    {selectedNote?.title || 'Select a note'}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDarkMode(prev => !prev)}
                  >
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-hidden">
              {selectedNote ? (
                <div className="h-full p-4">
                  <RichEditor
                    content={selectedNote.content}
                    onChange={handleContentChange}
                    isDarkMode={isDarkMode}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No note selected</h2>
                    <p className="text-muted-foreground mb-4">
                      Select a note from the sidebar or create a new one
                    </p>
                    <Button onClick={createNewNote}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Note
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};

interface NoteSidebarProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const NoteSidebar = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  searchQuery,
  onSearchChange,
  isDarkMode,
  onToggleDarkMode
}: NoteSidebarProps) => {
  const { collapsed } = useSidebar();

  const getPreview = (content: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-80"} collapsible>
      <SidebarHeader className="p-4">
        {!collapsed && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Notes</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleDarkMode}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={onCreateNote} className="w-full mb-4">
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-input"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <ScrollArea className="h-[calc(100vh-200px)]">
                {notes.length === 0 ? (
                  !collapsed && (
                    <div className="p-4 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No notes yet</p>
                    </div>
                  )
                ) : (
                  notes.map((note) => (
                    <SidebarMenuItem key={note.id}>
                      <SidebarMenuButton
                        onClick={() => onSelectNote(note.id)}
                        className={`
                          w-full justify-start text-left p-3 h-auto
                          ${selectedNoteId === note.id ? 'bg-accent text-accent-foreground' : ''}
                        `}
                      >
                        <div className="flex items-start justify-between w-full">
                          <div className="flex-1 min-w-0">
                            {collapsed ? (
                              <FileText className="h-4 w-4" />
                            ) : (
                              <>
                                <div className="font-medium text-sm truncate mb-1">
                                  {note.title}
                                </div>
                                <div className="text-xs text-muted-foreground truncate mb-1">
                                  {getPreview(note.content)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(note.updatedAt)}
                                </div>
                              </>
                            )}
                          </div>
                          {!collapsed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteNote(note.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </ScrollArea>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default NotesApp;
