
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FileText, Folder, Edit, Trash2 } from 'lucide-react';
import { Note } from '@/types/note';

interface NoteContextMenuProps {
  note?: Note;
  children: React.ReactNode;
  onAddNote: (parentId?: string) => void;
  onAddFolder: (parentId?: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  isRoot?: boolean;
}

const NoteContextMenu = ({
  note,
  children,
  onAddNote,
  onAddFolder,
  onRename,
  onDelete,
  isRoot = false
}: NoteContextMenuProps) => {
  const handleAddNote = (e: Event) => {
    e.preventDefault();
    onAddNote(note?.id);
  };

  const handleAddFolder = (e: Event) => {
    e.preventDefault();
    onAddFolder(note?.id);
  };

  const handleRename = (e: Event) => {
    e.preventDefault();
    if (note) {
      onRename(note.id);
    }
  };

  const handleDelete = (e: Event) => {
    e.preventDefault();
    if (note) {
      onDelete(note.id);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-background/95 backdrop-blur-sm">
        <ContextMenuItem onSelect={handleAddNote}>
          <FileText className="mr-2 h-4 w-4" />
          New Note
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleAddFolder}>
          <Folder className="mr-2 h-4 w-4" />
          New Folder
        </ContextMenuItem>
        
        {!isRoot && note && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={handleRename}>
              <Edit className="mr-2 h-4 w-4" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem 
              onSelect={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default NoteContextMenu;
