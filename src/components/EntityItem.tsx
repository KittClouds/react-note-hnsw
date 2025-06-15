
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EntityAttributes } from './EntityAttributes';

interface EntityItemProps {
  entity: any;
  onEntityUpdate?: (entityId: string, updates: any) => void;
}

export function EntityItem({ entity, onEntityUpdate }: EntityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAttributeUpdate = (attributes: Record<string, any>) => {
    if (onEntityUpdate) {
      const entityId = `${entity.kind}:${entity.label}`;
      onEntityUpdate(entityId, { ...entity, attributes });
    }
  };

  return (
    <Card className="bg-muted/50 border-border/50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full p-3 flex items-center justify-between hover:bg-accent rounded-none text-left"
          >
            <div className="flex items-center gap-2 flex-1">
              <span className="font-medium">{entity.label}</span>
              <Badge variant="outline" className="text-xs capitalize">
                {entity.kind.toLowerCase()}
              </Badge>
              {entity.sourceNoteTitle && (
                <Badge variant="outline" className="text-xs">
                  <ExternalLink className="h-2 w-2 mr-1" />
                  {entity.sourceNoteTitle}
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-3 pt-0">
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Attributes:
                </h4>
                <EntityAttributes
                  attributes={entity.attributes || {}}
                  onAttributesChange={handleAttributeUpdate}
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
