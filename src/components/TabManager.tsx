
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { NoteTab } from '@/hooks/useNoteTabs';

interface TabManagerProps {
  tabs: NoteTab[];
  activeTabId: string | null;
  onTabSwitch: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  children: (tabId: string) => React.ReactNode;
}

const TabManager = ({ 
  tabs, 
  activeTabId, 
  onTabSwitch, 
  onTabClose, 
  children 
}: TabManagerProps) => {
  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onTabClose(tabId);
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <Tabs value={activeTabId || undefined} onValueChange={onTabSwitch} className="h-full flex flex-col">
      <div className="border-b bg-background/50 backdrop-blur-sm">
        <TabsList className="h-10 bg-transparent p-0 justify-start rounded-none w-full overflow-x-auto">
          {tabs.map((tab) => (
            <div key={tab.id} className="relative group flex-shrink-0">
              <TabsTrigger
                value={tab.id}
                className={cn(
                  "rounded-none border-r border-border/50 px-4 py-2 h-10 data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary relative pr-8",
                  tab.isDirty && "italic"
                )}
              >
                <span className="truncate max-w-[120px] text-sm">
                  {tab.isDirty && '• '}{tab.title}
                </span>
              </TabsTrigger>
              
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-opacity"
                onClick={(e) => handleTabClose(e, tab.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </TabsList>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <TabsContent 
            key={tab.id} 
            value={tab.id} 
            className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col"
          >
            {children(tab.id)}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
};

export default TabManager;
