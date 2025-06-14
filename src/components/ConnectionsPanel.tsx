
import { useState } from 'react';
import { ChevronDown, ChevronRight, Link, Hash, AtSign, Database, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ParsedConnections } from '@/utils/parsingUtils';

interface ConnectionsPanelProps {
  connections: ParsedConnections | null;
  isOpen: boolean;
  onToggle: () => void;
}

const ConnectionsPanel = ({ connections, isOpen, onToggle }: ConnectionsPanelProps) => {
  const [entitiesExpanded, setEntitiesExpanded] = useState(true);
  const [relationshipsExpanded, setRelationshipsExpanded] = useState(true);

  const entityCount = connections?.entities.length || 0;
  const entityTypes = new Set(connections?.entities.map(e => e.kind) || []).size;
  const tripleCount = connections?.triples.length || 0;
  const linkCount = connections?.links.length || 0;
  const backlinkCount = connections?.backlinks.length || 0;

  return (
    <div className="border-t bg-background">
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-3 h-auto hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              <span className="font-medium">Connections</span>
              <span className="text-sm text-muted-foreground">
                {entityCount} entities, {entityTypes} types
              </span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="border-t">
          <div className="p-4 space-y-4">
            <Tabs defaultValue="links" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="links" className="flex items-center gap-1">
                  <Link className="h-3 w-3" />
                  Links ({linkCount})
                </TabsTrigger>
                <TabsTrigger value="backlinks" className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  Backlinks ({backlinkCount})
                </TabsTrigger>
                <TabsTrigger value="entities" className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  Entities ({entityCount})
                </TabsTrigger>
                <TabsTrigger value="related" className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Related ({tripleCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="links" className="mt-4">
                {connections?.links.length ? (
                  <div className="space-y-2">
                    {connections.links.map((link, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                        <Link className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{link}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No links found</p>
                    <p className="text-xs">Use [[link]] syntax to create links</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="backlinks" className="mt-4">
                {connections?.backlinks.length ? (
                  <div className="space-y-2">
                    {connections.backlinks.map((backlink, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                        <GitBranch className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{backlink}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No backlinks found</p>
                    <p className="text-xs">Use &lt;&lt;note&gt;&gt; syntax to reference other notes</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="entities" className="mt-4">
                <Collapsible open={entitiesExpanded} onOpenChange={setEntitiesExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span className="font-medium">Entities ({entityCount})</span>
                      </div>
                      {entitiesExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-2">
                    {connections?.entities.length ? (
                      <div className="space-y-2 pl-4">
                        {connections.entities.map((entity, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                            <span className="text-xs px-2 py-1 bg-muted rounded font-mono">
                              {entity.kind}
                            </span>
                            <span className="text-sm">{entity.label}</span>
                            {entity.attributes && (
                              <span className="text-xs text-muted-foreground">
                                {Object.keys(entity.attributes).length} attributes
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground pl-4">
                        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No entities found</p>
                        <p className="text-xs">Use [KIND|label] syntax to create entities</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>

              <TabsContent value="related" className="mt-4">
                <Collapsible open={relationshipsExpanded} onOpenChange={setRelationshipsExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        <span className="font-medium">Relationships ({tripleCount})</span>
                      </div>
                      {relationshipsExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-2">
                    {connections?.triples.length ? (
                      <div className="space-y-3 pl-4">
                        {connections.triples.map((triple, index) => (
                          <div key={index} className="p-3 rounded-md border bg-muted/20 hover:bg-muted/30">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-xs font-mono">
                                {triple.subject.kind}
                              </span>
                              <span className="font-medium">{triple.subject.label}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-xs px-2 py-1 bg-muted rounded">
                                {triple.predicate}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 rounded text-xs font-mono">
                                {triple.object.kind}
                              </span>
                              <span className="font-medium">{triple.object.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground pl-4">
                        <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No relationships found</p>
                        <p className="text-xs">Use [SUBJ|label] (predicate) [OBJ|label] syntax</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>
            </Tabs>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default ConnectionsPanel;
