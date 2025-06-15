import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@livestore/react';
import { useEntityAttributes, useBlueprintsArray } from '@/hooks/useLiveStore';
import { events } from '@/livestore/schema';
import { Entity } from '@/lib/utils/parsingUtils';
import { ClusterEntity } from './useActiveClusterEntities';
import { AttributeEditor } from './AttributeEditor';
import { TypedAttribute, AttributeType, AttributeValue } from '@/types/attributes';
import { getBlueprintForEntityKind } from '@/lib/blueprintMatching';

interface EntityCardProps {
  entity: Entity | ClusterEntity;
  viewMode: 'note' | 'cluster';
}

export function EntityCard({ entity, viewMode }: EntityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [attributes, setAttributes] = useState<TypedAttribute[]>([]);
  const blueprints = useBlueprintsArray();
  const entityAttributes = useEntityAttributes();
  const { store } = useStore();

  React.useEffect(() => {
    if (isExpanded) {
      // Load existing attributes from LiveStore
      const existingAttrs = entityAttributes.find(attr => 
        attr.entityKind === entity.kind && attr.entityLabel === entity.label
      );
      
      let currentAttributes: TypedAttribute[] = [];
      
      if (existingAttrs && existingAttrs.attributes) {
        if (Array.isArray(existingAttrs.attributes)) {
          currentAttributes = existingAttrs.attributes;
        } else {
          // Migrate old format to new format
          currentAttributes = Object.entries(existingAttrs.attributes).map(([key, value]) => ({
            id: `migrated-${key}-${Date.now()}`,
            name: key,
            type: 'Text' as const,
            value: String(value),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
        }
      }

      // Get blueprint for this entity kind and merge with existing attributes
      const blueprint = getBlueprintForEntityKind(entity.kind);
      if (blueprint) {
        const blueprintAttributeNames = new Set(blueprint.templates.map(t => t.name));
        const existingAttributeNames = new Set(currentAttributes.map(a => a.name));
        
        // Add missing blueprint attributes
        const missingBlueprintAttrs = blueprint.templates
          .filter(template => !existingAttributeNames.has(template.name))
          .map((template): TypedAttribute => ({
            id: `blueprint-${entity.kind}-${entity.label}-${template.name}-${Date.now()}`,
            name: template.name,
            type: template.type,
            value: template.defaultValue || getDefaultValueForType(template.type),
            unit: template.unit,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));

        // Sort attributes: blueprint first (in blueprint order), then custom
        const blueprintAttrs = blueprint.templates.map(template => 
          currentAttributes.find(attr => attr.name === template.name) ||
          missingBlueprintAttrs.find(attr => attr.name === template.name)
        ).filter(Boolean) as TypedAttribute[];
        
        const customAttrs = currentAttributes.filter(attr => 
          !blueprintAttributeNames.has(attr.name)
        );

        const finalAttributes = [...blueprintAttrs, ...customAttrs];
        setAttributes(finalAttributes);
        
        // If we added missing blueprint attributes, save them
        if (missingBlueprintAttrs.length > 0) {
          handleAttributesChange(finalAttributes);
        }
      } else {
        setAttributes(currentAttributes);
      }
    }
  }, [entity.kind, entity.label, entityAttributes, isExpanded]);

  const getDefaultValueForType = (type: AttributeType): AttributeValue => {
    switch (type) {
      case 'ProgressBar': return { current: 100, maximum: 100 };
      case 'StatBlock': return { 
        strength: 10, dexterity: 10, constitution: 10, 
        intelligence: 10, wisdom: 10, charisma: 10 
      };
      case 'Relationship': return { entityId: '', entityLabel: '', relationshipType: '' };
      case 'Number': return 0;
      case 'Boolean': return false;
      case 'List': return [];
      case 'Date': return new Date().toISOString();
      default: return '';
    }
  };

  const handleAttributesChange = (newAttributes: TypedAttribute[]) => {
    setAttributes(newAttributes);
    
    const id = `${entity.kind}:${entity.label}`;
    store.commit(events.entityAttributesUpdated({
      id,
      entityKind: entity.kind,
      entityLabel: entity.label,
      attributes: newAttributes,
      metadata: {
        version: 2,
        lastUpdated: new Date().toISOString()
      }
    }));
  };

  const isClusterEntity = 'sourceNoteIds' in entity;

  return (
    <Card className="bg-[#1a1b23] border-[#22242f]">
      <CardContent className="p-0">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-[#22242f] rounded-none text-left"
        >
          <div className="flex items-center gap-2 flex-1">
            <span className="font-medium text-white">{entity.label}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {entity.kind.toLowerCase()}
            </Badge>
            {isClusterEntity && (
              <Badge variant="outline" className="text-xs">
                {(entity as ClusterEntity).referenceCount} refs
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 pt-0 space-y-3">
                {/* Source Notes (for cluster view) */}
                {viewMode === 'cluster' && isClusterEntity && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">
                      Found in notes:
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {(entity as ClusterEntity).sourceNoteIds.map(noteId => (
                        <Badge
                          key={noteId}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-[#2a2d3a]"
                        >
                          <ExternalLink className="h-2 w-2 mr-1" />
                          Note
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enhanced Attributes */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    Attributes:
                  </h4>
                  
                  <AttributeEditor
                    attributes={attributes}
                    onAttributesChange={handleAttributesChange}
                    entityKind={entity.kind}
                    entityLabel={entity.label}
                    availableBlueprints={blueprints}
                    showBlueprintSelector={false}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
