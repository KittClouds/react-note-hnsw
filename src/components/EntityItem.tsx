
import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EnhancedEntityAttributes } from './EnhancedEntityAttributes';
import { TypedAttribute, ENTITY_SCHEMAS } from '@/types/attributes';

interface EntityItemProps {
  entity: any;
  onEntityUpdate?: (entityId: string, updates: any) => void;
}

export function EntityItem({ entity, onEntityUpdate }: EntityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Convert legacy attributes to typed attributes
  const typedAttributes = useMemo((): TypedAttribute[] => {
    if (!entity.attributes) return [];

    // If already typed attributes
    if (Array.isArray(entity.attributes)) {
      return entity.attributes;
    }

    // Convert legacy object format to typed attributes
    const entitySchema = ENTITY_SCHEMAS.find(schema => schema.kind === entity.kind);
    const attributes: TypedAttribute[] = [];

    Object.entries(entity.attributes).forEach(([key, value]) => {
      const schemaAttr = entitySchema?.attributes.find(attr => attr.name === key);
      
      attributes.push({
        id: `legacy-${key}-${Date.now()}`,
        name: key,
        type: schemaAttr?.type || 'Text',
        value: value as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    // Add missing schema attributes with default values
    if (entitySchema) {
      entitySchema.attributes.forEach(schemaAttr => {
        if (!attributes.find(attr => attr.name === schemaAttr.name)) {
          attributes.push({
            id: `schema-${schemaAttr.name}-${Date.now()}`,
            name: schemaAttr.name,
            type: schemaAttr.type,
            value: schemaAttr.defaultValue || '',
            unit: schemaAttr.unit,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      });
    }

    return attributes;
  }, [entity.attributes, entity.kind]);

  const handleAttributeUpdate = (attributes: TypedAttribute[]) => {
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
                  Enhanced Attributes:
                </h4>
                <EnhancedEntityAttributes
                  attributes={typedAttributes}
                  onAttributesChange={handleAttributeUpdate}
                  entityKind={entity.kind}
                  entityLabel={entity.label}
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
