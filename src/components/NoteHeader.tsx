
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Note } from '@/types/note';

interface NoteHeaderProps {
  selectedNote: Note | null;
  notes: Note[];
}

const NoteHeader = ({ selectedNote, notes }: NoteHeaderProps) => {
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

  const breadcrumbs = buildBreadcrumbs(selectedNote);

  return (
    <header className="h-12 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3 h-full">
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
      </div>
    </header>
  );
};

export default NoteHeader;
