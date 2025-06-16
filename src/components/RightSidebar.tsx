
import React from 'react';
import { Database } from 'lucide-react';
import {
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { RightSidebar as RightSidebarWrapper } from './RightSidebarProvider';
import { EntityAttributePanel } from './entity-attributes/EntityAttributePanel';
import { ParsedConnections } from '@/utils/parsingUtils';

interface RightSidebarProps {
  connections?: ParsedConnections | null;
}

const RightSidebar = ({ connections }: RightSidebarProps) => {
  return (
    <RightSidebarWrapper className="border-l border-border/50 backdrop-blur-sm">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Entity Attributes</h2>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-auto p-0">
        <EntityAttributePanel connections={connections} />
      </SidebarContent>
    </RightSidebarWrapper>
  );
};

export default RightSidebar;
