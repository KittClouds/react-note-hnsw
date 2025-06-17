import { useEffect, useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { v4 as uuidv4 } from 'uuid';
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
import { NoteProvider } from '@/contexts/NoteContext';
import { useGraph } from '@/hooks/useGraph';
import { useGraphSync } from '@/hooks/useGraphSync';
import { GraphSyncControls } from '@/components/GraphSyncControls';
import NoteHeader from '@/components/NoteHeader';
import ConnectionsPanel from '@/components/ConnectionsPanel';
import RightSidebar from '@/components/RightSidebar';
import { RightSidebarProvider } from '@/components/RightSidebarProvider';
import { useNotesStore, useUIStore } from '@/stores/StoreProvider';

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

const NotesApp = observer(() => {
  const notesStore = useNotesStore();
  const uiStore = useUIStore();
  
  // Add connections state
  const [connections, setConnections] = useState<ParsedConnections | null>(null);
  
  // Add graph initialization with feature flags
  const { graph, isInitialized: graphInitialized } = useGraph();
  
  // Add graph sync with feature flag options
  const { 
    syncService, 
    forceSync, 
    getSyncStatus, 
    validateSync,
    enableBidirectionalSync,
    setSyncDirection,
    setConflictResolution,
    updateOptions
  } = useGraphSync(graph, {
    enableBidirectionalSync: false,
    conflictResolution: {
      strategy: 'localStorage',
      autoResolve: true
    },
    syncDirection: 'localStorage-to-graph'
  });

  const createNewNote = useCallback((parentId?: string, nestId?: string) => {
    const newNote = notesStore.addNote({
      id: uuidv4(),
      title: 'Untitled Note',
      content: DEFAULT_CONTENT,
      type: 'note',
      parentId,
      nestId,
    });
    
    uiStore.setSelectedNote(newNote.id);
    toast({
      title: "New note created",
      description: "Start writing your thoughts!",
    });
  }, [notesStore, uiStore]);

  const createNewFolder = useCallback((parentId?: string, nestId?: string) => {
    notesStore.addNote({
      id: uuidv4(),
      title: 'New Folder',
      content: '',
      type: 'folder',
      parentId,
      nestId,
    });
    
    toast({
      title: "New folder created",
      description: "Organize your notes!",
    });
  }, [notesStore]);

  const createNewNest = useCallback(() => {
    const newNest = notesStore.addNest({
      id: uuidv4(),
      name: 'New Nest',
      description: '',
    });
    
    uiStore.setSelectedNest(newNest.id);
    toast({
      title: "New nest created",
      description: "Organize your domain-specific work!",
    });
  }, [notesStore, uiStore]);

  const deleteNote = useCallback((id: string) => {
    notesStore.removeNote(id);
    
    // If we deleted the selected note, select the first remaining note
    if (uiStore.selectedNoteId === id) {
      const firstNote = notesStore.allNotes.find(note => note.type === 'note');
      uiStore.setSelectedNote(firstNote ? firstNote.id : null);
    }
    
    toast({
      title: "Note deleted",
      description: "The note has been removed.",
    });
  }, [notesStore, uiStore]);

  const deleteNest = useCallback((id: string) => {
    notesStore.removeNest(id);
    
    // Clear selection if this nest was selected
    if (uiStore.selectedNestId === id) {
      uiStore.setSelectedNest(null);
      uiStore.setSelectedNote(null);
    }
    
    toast({
      title: "Nest deleted",
      description: "The nest and all its contents have been removed.",
    });
  }, [notesStore, uiStore]);

  const renameNote = useCallback((id: string, newTitle: string) => {
    notesStore.updateNote(id, { title: newTitle });
  }, [notesStore]);

  const renameNest = useCallback((id: string, newName: string) => {
    notesStore.updateNest(id, { name: newName });
  }, [notesStore]);

  const toggleFolder = useCallback((id: string) => {
    const note = notesStore.notes.get(id);
    if (note && note.type === 'folder') {
      note.toggleExpanded();
    }
  }, [notesStore]);

  const handleContentChange = useCallback((content: string) => {
    if (uiStore.selectedNoteId) {
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
      
      notesStore.updateNote(uiStore.selectedNoteId, { 
        content, 
        title: title.substring(0, 100)
      });
    }
  }, [notesStore, uiStore]);

  const handleConnectionsChange = useCallback((newConnections: ParsedConnections) => {
    setConnections(newConnections);
    if (uiStore.selectedNoteId) {
      console.log('Parsed connections for note:', uiStore.selectedNoteId, newConnections);
    }
  }, [uiStore.selectedNoteId]);

  // Clear connections when note selection changes
  useEffect(() => {
    if (!uiStore.selectedNoteId) {
      setConnections(null);
    }
  }, [uiStore.selectedNoteId]);

  const filteredNotes = notesStore.searchNotes(uiStore.searchQuery);
  const selectedNote = uiStore.selectedNoteId 
    ? notesStore.notes.get(uiStore.selectedNoteId) 
    : null;

  // Add keyboard shortcuts
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
            uiStore.toggleDarkMode();
            break;
          case 'g':
            e.preventDefault();
            uiStore.toggleGraphControls();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [createNewNote, uiStore]);

  const handleTitleChange = useCallback((noteId: string, newTitle: string) => {
    notesStore.updateNote(noteId, { title: newTitle });
  }, [notesStore]);

  const handleEntityUpdate = useCallback((entityId: string, updates: any) => {
    console.log('Entity updated:', entityId, updates);
    toast({
      title: "Entity updated",
      description: `Entity ${entityId} has been modified.`,
    });
  }, []);

  // Enhanced sync status logging
  useEffect(() => {
    if (syncService && graphInitialized) {
      console.log('Graph and sync service both ready');
      
      const interval = setInterval(() => {
        const status = getSyncStatus();
        const validation = validateSync();
        console.log('Sync status:', status);
        if (!validation?.isValid) {
          console.warn('Sync validation issues:', validation?.mismatches);
        }
      }, 15000);
      
      return () => clearInterval(interval);
    }
  }, [syncService, graphInitialized, getSyncStatus, validateSync]);

  return (
    <NoteProvider>
      <SidebarProvider>
        <RightSidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <NoteSidebar
              notes={filteredNotes}
              nests={notesStore.allNests}
              selectedNoteId={uiStore.selectedNoteId}
              selectedNestId={uiStore.selectedNestId}
              searchQuery={uiStore.searchQuery}
              onSearchChange={uiStore.setSearchQuery}
              onNoteSelect={uiStore.setSelectedNote}
              onNestSelect={uiStore.setSelectedNest}
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
                notes={notesStore.allNotes} 
                onTitleChange={handleTitleChange}
                isDarkMode={uiStore.isDarkMode}
                onToggleDarkMode={uiStore.toggleDarkMode}
                onEntityUpdate={handleEntityUpdate}
                showGraphControls={uiStore.showGraphControls}
                onToggleGraphControls={uiStore.toggleGraphControls}
              />

              {/* Graph Controls Panel */}
              {uiStore.showGraphControls && (
                <div className="p-4 border-b bg-muted/30">
                  <GraphSyncControls
                    syncService={syncService}
                    getSyncStatus={getSyncStatus}
                    validateSync={validateSync}
                    enableBidirectionalSync={enableBidirectionalSync}
                    setSyncDirection={setSyncDirection}
                    setConflictResolution={setConflictResolution}
                    forceSync={forceSync}
                  />
                </div>
              )}

              <div className="flex-1 flex flex-col overflow-hidden">
                {selectedNote && selectedNote.type === 'note' ? (
                  <>
                    <div className="flex-1 overflow-hidden p-4">
                      <RichEditor
                        key={selectedNote.id}
                        noteId={selectedNote.id}
                        content={selectedNote.content}
                        onChange={handleContentChange}
                        onConnectionsChange={handleConnectionsChange}
                        isDarkMode={uiStore.isDarkMode}
                      />
                    </div>
                    
                    <ConnectionsPanel
                      connections={connections}
                      isOpen={uiStore.connectionsPanelOpen}
                      onToggle={uiStore.toggleConnectionsPanel}
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
                      <div className="space-y-2">
                        <Button onClick={() => createNewNote()}>
                          Create New Note
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Press Ctrl+G to toggle graph sync controls
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </SidebarInset>

            <RightSidebar connections={connections} />
          </div>
        </RightSidebarProvider>
      </SidebarProvider>
    </NoteProvider>
  );
});

const App = observer(() => {
  const uiStore = useUIStore();

  return (
    <div className={uiStore.isDarkMode ? 'dark' : ''}>
      <NotesApp />
    </div>
  );
});

export default App;
