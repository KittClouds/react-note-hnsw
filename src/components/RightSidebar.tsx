
import { Database } from 'lucide-react';
import {
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { RightSidebar as RightSidebarWrapper } from './RightSidebarProvider';
import { EntityManager } from './EntityManager';
import { Note } from '@/types/note';

interface RightSidebarProps {
  selectedNote?: Note | null;
  notes?: Note[];
  onEntityUpdate?: (entityId: string, updates: any) => void;
}

const RightSidebar = ({ selectedNote = null, notes = [], onEntityUpdate }: RightSidebarProps) => {
  return (
    <RightSidebarWrapper className="border-l border-border/50 backdrop-blur-sm">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Entities</h2>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-auto p-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <EntityManager
              selectedNote={selectedNote}
              notes={notes}
              onEntityUpdate={onEntityUpdate}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </RightSidebarWrapper>
  );
};

export default RightSidebar;
