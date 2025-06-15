
import { Database } from 'lucide-react';
import {
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { RightSidebar as RightSidebarWrapper } from './RightSidebarProvider';

const RightSidebar = () => {
  return (
    <RightSidebarWrapper className="border-l border-border/50 backdrop-blur-sm">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Right Panel</h2>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-auto p-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="p-4 text-center text-muted-foreground">
              <p>Additional content can be placed here</p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </RightSidebarWrapper>
  );
};

export default RightSidebar;
