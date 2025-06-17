
import { useState, useMemo, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { formatDistanceToNow } from 'date-fns';
import { Search, Plus, FileText, Folder, FolderOpen, ChevronRight, MoreHorizontal, Database } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Note, Nest } from '@/types/note';
import { cn } from '@/lib/utils';
import InlineRename from './InlineRename';
import NestView from './NestView';
import { EnhancedSearchBar } from './EnhancedSearchBar';

interface NoteSidebarProps {
  notes: Note[];
  nests: Nest[];
  selectedNoteId: string | null;
  selectedNestId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNoteSelect: (id: string) => void;
  onNestSelect: (id: string) => void;
  onNewNote: (parentId?: string, nestId?: string) => void;
  onNewFolder: (parentId?: string, nestId?: string) => void;
  onNewNest: () => void;
  onDeleteNote: (id: string) => void;
  onDeleteNest: (id: string) => void;
  onRenameNote: (id: string, newTitle: string) => void;
  onRenameNest: (id: string, newName: string) => void;
  onToggleFolder: (id: string) => void;
}

const NoteSidebar = observer(({
  notes,
  nests,
  selectedNoteId,
  selectedNestId,
  searchQuery,
  onSearchChange,
  onNoteSelect,
  onNestSelect,
  onNewNote,
  onNewFolder,
  onNewNest,
  onDeleteNote,
  onDeleteNest,
  onRenameNote,
  onRenameNest,
  onToggleFolder,
}: NoteSidebarProps) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('folders');

  // Memoized filtered notes - only recalculate when notes or search changes
  const { folderNotes, nestNotes } = useMemo(() => {
    const folders = notes.filter(note => !note.nestId);
    const nests = notes.filter(note => note.nestId);
    return { folderNotes: folders, nestNotes: nests };
  }, [notes]);

  // Memoized search results
  const filteredFolderNotes = useMemo(() => {
    if (!searchQuery.trim()) return folderNotes;
    const searchTerm = searchQuery.toLowerCase();
    return folderNotes.filter(note => 
      note.title.toLowerCase().includes(searchTerm) ||
      note.content.toLowerCase().includes(searchTerm)
    );
  }, [folderNotes, searchQuery]);

  // Build tree structure preserving original note references for MobX reactivity
  const treeNotes = useMemo(() => {
    const noteMap = new Map<string, Note & { children: Note[] }>();
    const rootNotes: (Note & { children: Note[] })[] = [];

    // Create map of all notes with children arrays - preserve original note references
    filteredFolderNotes.forEach(note => {
      noteMap.set(note.id, { ...note, children: [] });
    });

    // Build tree structure efficiently
    filteredFolderNotes.forEach(note => {
      const nodeNote = noteMap.get(note.id)!;
      if (note.parentId) {
        const parent = noteMap.get(note.parentId);
        if (parent) {
          parent.children.push(nodeNote);
        } else {
          rootNotes.push(nodeNote);
        }
      } else {
        rootNotes.push(nodeNote);
      }
    });

    return rootNotes;
  }, [filteredFolderNotes]);

  // Memoized text truncation
  const truncateText = useCallback((text: string, length: number = 60) => {
    const plainText = text.replace(/<[^>]*>/g, '');
    return plainText.length > length ? plainText.substring(0, length) + '...' : plainText;
  }, []);

  // Memoized rename handler
  const handleRename = useCallback((noteId: string, newTitle: string) => {
    onRenameNote(noteId, newTitle);
    setRenamingId(null);
  }, [onRenameNote]);

  // Optimized tree renderer - now checks live note state for isExpanded
  const renderNoteTree = useCallback((treeNotes: (Note & { children: Note[] })[], level: number = 0, isLast: boolean[] = []): React.ReactNode => {
    return treeNotes.map((note, index) => {
      const isLastItem = index === treeNotes.length - 1;
      const currentIsLast = [...isLast, isLastItem];
      
      // Find the original note for live state checking
      const liveNote = notes.find(n => n.id === note.id);
      
      const noteContent = (
        <div 
          key={note.id} 
          className="select-none relative"
          onMouseEnter={() => setHoveredId(note.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {level > 0 && (
            <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
              {isLast.map((isLastAtLevel, levelIndex) => (
                <div
                  key={levelIndex}
                  className={cn(
                    "absolute top-0 bottom-0 w-px bg-border/40",
                    !isLastAtLevel && "block",
                    isLastAtLevel && "hidden"
                  )}
                  style={{ left: `${(levelIndex * 16) + 8}px` }}
                />
              ))}
              
              <div
                className="absolute top-3 w-2 h-px bg-border/40"
                style={{ left: `${(level - 1) * 16 + 8}px` }}
              />
              
              <div
                className={cn(
                  "absolute w-px bg-border/40",
                  isLastItem ? "top-0 h-3" : "top-0 bottom-0"
                )}
                style={{ left: `${(level - 1) * 16 + 8}px` }}
              />
            </div>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                if (note.type === 'folder') {
                  onToggleFolder(note.id);
                } else {
                  onNoteSelect(note.id);
                }
              }}
              className={cn(
                "flex items-center p-2 h-8 hover:bg-accent/50 transition-all duration-200 relative",
                selectedNoteId === note.id && note.type === 'note' && "bg-accent/30 shadow-sm",
                note.type === 'folder' && "hover:bg-accent/30"
              )}
              style={{ paddingLeft: `${(level * 16) + 8}px` }}
            >
              <div className="flex items-center flex-1 min-w-0">
                {note.type === 'folder' ? (
                  <div className="flex items-center mr-2">
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 text-muted-foreground transition-transform duration-200",
                        liveNote?.isExpanded && "transform rotate-90"
                      )}
                    />
                    {liveNote?.isExpanded ? (
                      <FolderOpen className="h-4 w-4 ml-1 text-blue-500" />
                    ) : (
                      <Folder className="h-4 w-4 ml-1 text-blue-500" />
                    )}
                  </div>
                ) : (
                  <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                )}
                
                <div className="flex-1 min-w-0">
                  {renamingId === note.id ? (
                    <InlineRename
                      initialValue={note.title}
                      onSave={(newTitle) => handleRename(note.id, newTitle)}
                      onCancel={() => setRenamingId(null)}
                      className="w-full"
                    />
                  ) : (
                    <h3 className="font-medium text-sm text-foreground truncate">
                      {note.title}
                    </h3>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "transition-opacity p-1 h-auto ml-2",
                        hoveredId === note.id ? "opacity-100" : "opacity-0"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm">
                    <DropdownMenuItem onClick={() => onNewNote(note.id)}>
                      <FileText className="mr-2 h-4 w-4" />
                      New Note
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewFolder(note.id)}>
                      <Folder className="mr-2 h-4 w-4" />
                      New Folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setRenamingId(note.id)}>
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDeleteNote(note.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {note.type === 'folder' && liveNote?.isExpanded && note.children && note.children.length > 0 && (
            <div className="animate-fade-in">
              {renderNoteTree(note.children, level + 1, currentIsLast)}
            </div>
          )}
        </div>
      );

      if (note.type === 'note') {
        return (
          <HoverCard key={note.id}>
            <HoverCardTrigger asChild>
              {noteContent}
            </HoverCardTrigger>
            <HoverCardContent className="w-80 bg-background/95 backdrop-blur-sm">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">{note.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {truncateText(note.content) || 'No content'}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      }

      return noteContent;
    });
  }, [selectedNoteId, hoveredId, renamingId, onToggleFolder, onNoteSelect, onNewNote, onNewFolder, onDeleteNote, handleRename, truncateText, notes]);

  return (
    <Sidebar className="border-r border-border/50 backdrop-blur-sm">
      <SidebarHeader className="p-4 border-b border-border/50">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="folders" className="text-xs">Folders</TabsTrigger>
            <TabsTrigger value="nests" className="text-xs">Nests</TabsTrigger>
            <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
          </TabsList>

          <div className="flex items-center justify-between mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus size={16} className="mr-2" />
                  New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm">
                {activeTab === 'folders' ? (
                  <>
                    <DropdownMenuItem onClick={() => onNewNote()}>
                      <FileText className="mr-2 h-4 w-4" />
                      New Note
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewFolder()}>
                      <Folder className="mr-2 h-4 w-4" />
                      New Folder
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={onNewNest}>
                    <Database className="mr-2 h-4 w-4" />
                    New Nest
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Tabs>
      </SidebarHeader>

      <SidebarContent className="overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="folders" className="mt-0">
            {treeNotes.length === 0 ? (
              <div className="p-8 text-center">
                <div className="cursor-pointer hover:bg-accent/20 rounded-lg p-4 transition-colors">
                  <div className="text-muted-foreground">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No notes yet</p>
                    <p className="text-sm">Use the "New" button above to create your first note or folder!</p>
                  </div>
                </div>
              </div>
            ) : (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1 p-2">
                    {renderNoteTree(treeNotes)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </TabsContent>
          
          <TabsContent value="nests" className="mt-0">
            <NestView
              nests={nests}
              notes={nestNotes}
              selectedNestId={selectedNestId}
              selectedNoteId={selectedNoteId}
              onNestSelect={onNestSelect}
              onNoteSelect={onNoteSelect}
              onNewNest={onNewNest}
              onNewNote={(nestId, parentId) => onNewNote(parentId, nestId)}
              onNewFolder={(nestId, parentId) => onNewFolder(parentId, nestId)}
              onDeleteNest={onDeleteNest}
              onRenameNest={onRenameNest}
              onDeleteNote={onDeleteNote}
              onRenameNote={onRenameNote}
              onToggleFolder={onToggleFolder}
            />
          </TabsContent>

          <TabsContent value="search" className="mt-0">
            <div className="p-4">
              <EnhancedSearchBar
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                notes={notes}
                onNoteSelect={onNoteSelect}
              />
            </div>
          </TabsContent>
        </Tabs>
      </SidebarContent>
    </Sidebar>
  );
});

export default NoteSidebar;
