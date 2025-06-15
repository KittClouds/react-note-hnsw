
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Link } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EntityItem } from './EntityItem';

interface EntityGroupProps {
  kind: string;
  entities: any[];
  onEntityUpdate?: (entityId: string, updates: any) => void;
}

export function EntityGroup({ kind, entities, onEntityUpdate }: EntityGroupProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card className="bg-card border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full p-4 flex items-center justify-between hover:bg-accent rounded-none"
          >
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">{kind}</span>
              <Badge variant="secondary" className="text-xs">
                {entities.length}
              </Badge>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="p-4 pt-0 space-y-2">
            {entities.map((entity, index) => (
              <EntityItem
                key={`${entity.kind}-${entity.label}-${index}`}
                entity={entity}
                onEntityUpdate={onEntityUpdate}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
