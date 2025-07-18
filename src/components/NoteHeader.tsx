
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from 'lucide-react';
import { Note } from '@/types/note';
import { EntityManagerDrawer } from './EntityManagerDrawer';

interface NoteHeaderProps {
  selectedNote: Note | null;
  notes: Note[];
  onTitleChange?: (noteId: string, newTitle: string) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onEntityUpdate?: (entityId: string, updates: any) => void;
}

const NoteHeader = ({ 
  selectedNote, 
  notes, 
  onTitleChange, 
  isDarkMode = false,
  onToggleDarkMode,
  onEntityUpdate
}: NoteHeaderProps) => {
  const buildBreadcrumbs = (note: Note | null): Note[] => {
    if (!note) return [];
    
    const breadcrumbs: Note[] = [];
    let current = note;
    
    while (current) {
      breadcrumbs.unshift(current);
      if (current.parentId) {
        current = notes.find(n => n.id === current.parentId) || null;
      } else {
        current = null;
      }
    }
    
    return breadcrumbs;
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNote && onTitleChange) {
      onTitleChange(selectedNote.id, e.target.value);
    }
  };

  const breadcrumbs = buildBreadcrumbs(selectedNote);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3 h-12">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          
          {breadcrumbs.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((breadcrumb, index) => (
                  <div key={breadcrumb.id} className="flex items-center">
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage className="font-medium">
                          {breadcrumb.title}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink className="text-muted-foreground hover:text-foreground transition-colors">
                          {breadcrumb.title}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
          
          {!selectedNote && (
            <span className="text-muted-foreground">No note selected</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <EntityManagerDrawer
            selectedNote={selectedNote}
            notes={notes}
            onEntityUpdate={onEntityUpdate}
          />
          {onToggleDarkMode && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleDarkMode}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
      
      {selectedNote && (
        <div className="px-4 pb-2">
          <Input
            value={selectedNote.title}
            onChange={handleTitleChange}
            className="text-lg font-semibold border-none bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Note title..."
          />
        </div>
      )}
    </header>
  );
};

export default NoteHeader;
