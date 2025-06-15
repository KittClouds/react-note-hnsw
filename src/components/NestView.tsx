import { useState } from 'react';
import { Database, Plus, FolderOpen, FileText, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Note, Nest } from '@/types/note';
import { cn } from '@/lib/utils';
import InlineRename from './InlineRename';

interface NestViewProps {
  nests: Nest[];
  notes: Note[];
  selectedNestId: string | null;
  selectedNoteId: string | null;
  onNestSelect: (nestId: string) => void;
  onNoteSelect: (noteId: string) => void;
  onNewNest: () => void;
  onNewNote: (nestId: string, parentId?: string) => void;
  onNewFolder: (nestId: string, parentId?: string) => void;
  onDeleteNest: (nestId: string) => void;
  onRenameNest: (nestId: string, newName: string) => void;
  onDeleteNote: (noteId: string) => void;
  onRenameNote: (noteId: string, newTitle: string) => void;
  onToggleFolder: (noteId: string) => void;
}

const NestView = ({
  nests,
  notes,
  selectedNestId,
  selectedNoteId,
  onNestSelect,
  onNoteSelect,
  onNewNest,
  onNewNote,
  onNewFolder,
  onDeleteNest,
  onRenameNest,
  onDeleteNote,
  onRenameNote,
  onToggleFolder,
}: NestViewProps) => {
  const [renamingNestId, setRenamingNestId] = useState<string | null>(null);
  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleRenameNest = (nestId: string, newName: string) => {
    onRenameNest(nestId, newName);
    setRenamingNestId(null);
  };

  const handleRenameNote = (noteId: string, newTitle: string) => {
    onRenameNote(noteId, newTitle);
    setRenamingNoteId(null);
  };

  const getNotesForNest = (nestId: string) => {
    return notes.filter(note => note.nestId === nestId && !note.parentId);
  };

  const getChildNotes = (parentId: string, nestId: string) => {
    return notes.filter(note => note.parentId === parentId && note.nestId === nestId);
  };

  const renderNoteTree = (nestNotes: Note[], nestId: string): React.ReactNode => {
    return nestNotes.map((note) => {
      const childNotes = getChildNotes(note.id, nestId);
      
      return (
        <div 
          key={note.id}
          className="ml-4 select-none relative"
          onMouseEnter={() => setHoveredId(note.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <div
            onClick={() => {
              if (note.type === 'folder') {
                onToggleFolder(note.id);
              } else {
                onNoteSelect(note.id);
              }
            }}
            className={cn(
              "flex items-center p-1 rounded cursor-pointer hover:bg-accent/50 transition-colors",
              selectedNoteId === note.id && note.type === 'note' && "bg-accent"
            )}
          >
            {note.type === 'folder' ? (
              <FolderOpen className="h-3 w-3 mr-2 text-blue-500" />
            ) : (
              <FileText className="h-3 w-3 mr-2 text-muted-foreground" />
            )}
            
            <div className="flex-1 min-w-0">
              {renamingNoteId === note.id ? (
                <InlineRename
                  initialValue={note.title}
                  onSave={(newTitle) => handleRenameNote(note.id, newTitle)}
                  onCancel={() => setRenamingNoteId(null)}
                  className="w-full"
                />
              ) : (
                <span className="text-xs text-foreground truncate">{note.title}</span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "transition-opacity p-0 h-auto w-4 ml-1",
                    hoveredId === note.id ? "opacity-100" : "opacity-0"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal size={10} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm">
                <DropdownMenuItem onClick={() => onNewNote(nestId, note.id)}>
                  <FileText className="mr-2 h-3 w-3" />
                  New Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNewFolder(nestId, note.id)}>
                  <FolderOpen className="mr-2 h-3 w-3" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setRenamingNoteId(note.id)}>
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
          
          {note.type === 'folder' && note.isExpanded && childNotes.length > 0 && (
            <div className="ml-2">
              {renderNoteTree(childNotes, nestId)}
            </div>
          )}
        </div>
      );
    });
  };

  if (nests.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-muted-foreground">
          <Database size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No nests yet</p>
          <p className="text-sm mb-4">Create isolated project workspaces to organize your domain-specific work.</p>
          <Button onClick={onNewNest} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus size={16} className="mr-2" />
            New Nest
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {nests.map((nest) => {
        const nestNotes = getNotesForNest(nest.id);
        const isSelected = selectedNestId === nest.id;
        
        return (
          <div 
            key={nest.id}
            className="border border-border/50 rounded-lg overflow-hidden"
            onMouseEnter={() => setHoveredId(nest.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              onClick={() => onNestSelect(nest.id)}
              className={cn(
                "flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors",
                isSelected && "bg-accent/50"
              )}
            >
              <div className="flex items-center flex-1 min-w-0">
                <Database className="h-4 w-4 mr-2 text-primary" />
                <div className="flex-1 min-w-0">
                  {renamingNestId === nest.id ? (
                    <InlineRename
                      initialValue={nest.name}
                      onSave={(newName) => handleRenameNest(nest.id, newName)}
                      onCancel={() => setRenamingNestId(null)}
                      className="w-full"
                    />
                  ) : (
                    <h3 className="font-medium text-sm text-foreground truncate">
                      {nest.name}
                    </h3>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Plus size={12} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onNewNote(nest.id)}>
                      <FileText className="mr-2 h-4 w-4" />
                      New Note
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNewFolder(nest.id)}>
                      <FolderOpen className="mr-2 h-4 w-4" />
                      New Folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "transition-opacity h-6 w-6 p-0",
                        hoveredId === nest.id ? "opacity-100" : "opacity-0"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal size={12} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setRenamingNestId(nest.id)}>
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDeleteNest(nest.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete Nest
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {isSelected && nestNotes.length > 0 && (
              <div className="border-t border-border/50 bg-background/50 p-2">
                {renderNoteTree(nestNotes, nest.id)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NestView;
