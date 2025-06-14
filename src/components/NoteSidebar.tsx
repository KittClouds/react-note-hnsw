
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, Plus, FileText, Folder, FolderOpen, ChevronRight, MoreHorizontal } from 'lucide-react';
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Note } from '@/types/note';
import { cn } from '@/lib/utils';
import NoteContextMenu from './NoteContextMenu';
import InlineRename from './InlineRename';

interface NoteSidebarProps {
  notes: Note[];
  selectedNoteId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNoteSelect: (id: string) => void;
  onNewNote: (parentId?: string) => void;
  onNewFolder: (parentId?: string) => void;
  onDeleteNote: (id: string) => void;
  onRenameNote: (id: string, newTitle: string) => void;
  onToggleFolder: (id: string) => void;
}

const NoteSidebar = ({
  notes,
  selectedNoteId,
  searchQuery,
  onSearchChange,
  onNoteSelect,
  onNewNote,
  onNewFolder,
  onDeleteNote,
  onRenameNote,
  onToggleFolder,
}: NoteSidebarProps) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const truncateText = (text: string, length: number = 60) => {
    const plainText = text.replace(/<[^>]*>/g, '');
    return plainText.length > length ? plainText.substring(0, length) + '...' : plainText;
  };

  const buildTree = (notes: Note[]): Note[] => {
    const noteMap = new Map<string, Note>();
    const rootNotes: Note[] = [];

    // Create map of all notes
    notes.forEach(note => {
      noteMap.set(note.id, { ...note, children: [] });
    });

    // Build tree structure
    notes.forEach(note => {
      const nodeNote = noteMap.get(note.id)!;
      if (note.parentId) {
        const parent = noteMap.get(note.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(nodeNote);
        } else {
          rootNotes.push(nodeNote);
        }
      } else {
        rootNotes.push(nodeNote);
      }
    });

    return rootNotes;
  };

  const handleRename = (noteId: string, newTitle: string) => {
    onRenameNote(noteId, newTitle);
    setRenamingId(null);
  };

  const renderNoteTree = (treeNotes: Note[], level: number = 0, isLast: boolean[] = []): React.ReactNode => {
    return treeNotes.map((note, index) => {
      const isLastItem = index === treeNotes.length - 1;
      const currentIsLast = [...isLast, isLastItem];
      
      const noteContent = (
        <div key={note.id} className="select-none relative">
          {/* Tree lines */}
          {level > 0 && (
            <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
              {/* Vertical lines for parent levels */}
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
              
              {/* Horizontal line for current item */}
              <div
                className="absolute top-3 w-2 h-px bg-border/40"
                style={{ left: `${(level - 1) * 16 + 8}px` }}
              />
              
              {/* Vertical line for current level (stops at last item) */}
              <div
                className={cn(
                  "absolute w-px bg-border/40",
                  isLastItem ? "top-0 h-3" : "top-0 bottom-0"
                )}
                style={{ left: `${(level - 1) * 16 + 8}px` }}
              />
            </div>
          )}

          <NoteContextMenu
            note={note}
            onAddNote={onNewNote}
            onAddFolder={onNewFolder}
            onRename={(id) => setRenamingId(id)}
            onDelete={onDeleteNote}
          >
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
                  "flex items-center p-2 h-8 hover:bg-accent/50 group transition-all duration-200 relative",
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
                          note.isExpanded && "transform rotate-90"
                        )}
                      />
                      {note.isExpanded ? (
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

                  {note.type === 'note' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm">
                        <DropdownMenuItem onClick={() => setRenamingId(note.id)}>
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDeleteNote(note.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </NoteContextMenu>
          
          {note.type === 'folder' && note.isExpanded && note.children && note.children.length > 0 && (
            <div className="animate-fade-in">
              {renderNoteTree(note.children, level + 1, currentIsLast)}
            </div>
          )}
        </div>
      );

      // Wrap notes (not folders) with hover card for extra details
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
  };

  const treeNotes = buildTree(notes);

  return (
    <Sidebar className="border-r border-border/50 backdrop-blur-sm">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Notes</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={16} className="mr-2" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm">
              <DropdownMenuItem onClick={() => onNewNote()}>
                <FileText className="mr-2 h-4 w-4" />
                New Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNewFolder()}>
                <Folder className="mr-2 h-4 w-4" />
                New Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search-input"
            placeholder="Search notes... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-background/50 border-input/50 focus:bg-background focus:border-primary/50 transition-all"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-auto">
        {treeNotes.length === 0 ? (
          <div className="p-8 text-center">
            <NoteContextMenu
              onAddNote={onNewNote}
              onAddFolder={onNewFolder}
              onRename={() => {}}
              onDelete={() => {}}
              isRoot
            >
              <div className="cursor-pointer hover:bg-accent/20 rounded-lg p-4 transition-colors">
                <div className="text-muted-foreground">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No notes yet</p>
                  <p className="text-sm">Right-click to create your first note or folder!</p>
                </div>
              </div>
            </NoteContextMenu>
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
      </SidebarContent>
    </Sidebar>
  );
};

export default NoteSidebar;
