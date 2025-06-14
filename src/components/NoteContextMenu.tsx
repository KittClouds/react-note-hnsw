
import { useState } from 'react';
import { MoreHorizontal, Plus, FolderPlus, Edit2, Trash2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NoteContextMenuProps {
  noteId?: string;
  noteTitle?: string;
  isFolder?: boolean;
  onNewNote: () => void;
  onNewFolder?: () => void;
  onRename?: (newTitle: string) => void;
  onDelete?: () => void;
  className?: string;
}

export const NoteContextMenu = ({
  noteId,
  noteTitle,
  isFolder = false,
  onNewNote,
  onNewFolder,
  onRename,
  onDelete,
  className
}: NoteContextMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(noteTitle || '');

  const handleRename = () => {
    if (renameValue.trim() && onRename) {
      onRename(renameValue.trim());
      setIsRenaming(false);
      setIsOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenameValue(noteTitle || '');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-accent hover:text-accent-foreground",
            className
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
        >
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-1" 
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 px-2 text-sm"
            onClick={() => {
              onNewNote();
              setIsOpen(false);
            }}
          >
            <Plus className="h-3 w-3 mr-2" />
            New Note
          </Button>
          
          {onNewFolder && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-2 text-sm"
              onClick={() => {
                onNewFolder();
                setIsOpen(false);
              }}
            >
              <FolderPlus className="h-3 w-3 mr-2" />
              New Folder
            </Button>
          )}
          
          {noteId && onRename && (
            <>
              <div className="border-t my-1" />
              {isRenaming ? (
                <div className="p-2">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onBlur={handleRename}
                    className="h-7 text-xs"
                    placeholder="Enter name..."
                    autoFocus
                  />
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 px-2 text-sm"
                  onClick={() => {
                    setIsRenaming(true);
                    setRenameValue(noteTitle || '');
                  }}
                >
                  <Edit2 className="h-3 w-3 mr-2" />
                  Rename
                </Button>
              )}
            </>
          )}
          
          {noteId && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-2 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                onDelete();
                setIsOpen(false);
              }}
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
