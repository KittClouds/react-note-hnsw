
import { FileText } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

const RightSidebar = () => {
  return (
    <Sidebar side="right" className="border-l border-border/50 backdrop-blur-sm">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Properties</h2>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-auto">
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="p-8 text-center">
              <div className="text-muted-foreground">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Coming Soon</p>
                <p className="text-sm">Note properties and metadata will appear here.</p>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default RightSidebar;
