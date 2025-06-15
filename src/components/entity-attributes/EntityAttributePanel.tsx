
import React, { useState, useMemo, useEffect } from 'react';
import { useActiveNoteConnections, useActiveNote, useEntityAttributes, useBlueprintsArray } from '@/hooks/useLiveStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Save, Trash2, Database, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { SimpleLayout } from './layouts/SimpleLayout';
import { CharacterSheetLayout } from './layouts/CharacterSheetLayout';
import { FactionOverviewLayout } from './layouts/FactionOverviewLayout';
import { TypedAttribute, AttributeType, AttributeValue } from '@/types/attributes';

export function EntityAttributePanel() {
  const { entities } = useActiveNoteConnections();
  const activeNote = useActiveNote();
  const entityAttributes = useEntityAttributes();
  const blueprints = useBlueprintsArray();
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('simple');

  // Group entities by kind
  const entityGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    (Array.isArray(entities) ? entities : []).forEach(entity => {
      if (!groups[entity.kind]) {
        groups[entity.kind] = [];
      }
      groups[entity.kind].push(entity);
    });
    return groups;
  }, [entities]);

  // Auto-select the first entity when entities are available
  useEffect(() => {
    const entitiesArray = Array.isArray(entities) ? entities : [];
    
    // If no entities available, clear selection
    if (entitiesArray.length === 0) {
      setSelectedEntity(null);
      return;
    }

    // If no entity is currently selected, auto-select the first one
    if (!selectedEntity) {
      setSelectedEntity(entitiesArray[0]);
      return;
    }

    // If the currently selected entity is no longer in the list, select the first available one
    const isCurrentEntityStillValid = entitiesArray.some(
      entity => entity.kind === selectedEntity.kind && entity.label === selectedEntity.label
    );
    
    if (!isCurrentEntityStillValid) {
      setSelectedEntity(entitiesArray[0]);
    }
  }, [entities, selectedEntity]);

  // Get attributes for selected entity
  const selectedEntityAttributes = useMemo(() => {
    if (!selectedEntity) return null;
    return entityAttributes.find(
      attr => attr.entityKind === selectedEntity.kind && attr.entityLabel === selectedEntity.label
    );
  }, [selectedEntity, entityAttributes]);

  // Enhanced type detection function
  const detectAttributeType = (value: any): AttributeType => {
    if (value === null || value === undefined) return 'Text';
    
    // Check for complex object types first
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Progress Bar detection
      if ('current' in value && 'maximum' in value && typeof value.current === 'number' && typeof value.maximum === 'number') {
        return 'ProgressBar';
      }
      
      // Stat Block detection
      if ('strength' in value && 'dexterity' in value && 'constitution' in value && 
          'intelligence' in value && 'wisdom' in value && 'charisma' in value) {
        return 'StatBlock';
      }
      
      // Relationship detection
      if ('entityId' in value && 'relationshipType' in value) {
        return 'Relationship';
      }
      
      // Entity Link detection
      if ('entityId' in value && 'kind' in value && 'label' in value) {
        return 'EntityLink';
      }
    }
    
    // Array detection
    if (Array.isArray(value)) {
      return 'List';
    }
    
    // Date detection (ISO string format)
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return 'Date';
    }
    
    // URL detection
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return 'URL';
    }
    
    // Basic type detection
    if (typeof value === 'number') return 'Number';
    if (typeof value === 'boolean') return 'Boolean';
    
    return 'Text';
  };

  // Convert attributes object to typed attributes array with proper type detection
  const typedAttributes = useMemo(() => {
    if (!selectedEntityAttributes?.attributes) return [];
    
    // Handle both new format (array) and old format (object)
    if (Array.isArray(selectedEntityAttributes.attributes)) {
      return selectedEntityAttributes.attributes;
    }
    
    // Convert old format to new format with enhanced type detection
    return Object.entries(selectedEntityAttributes.attributes).map(([key, value]) => ({
      id: `${selectedEntity.kind}-${selectedEntity.label}-${key}`,
      name: key,
      type: detectAttributeType(value),
      value: value as AttributeValue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }, [selectedEntityAttributes, selectedEntity]);

  const renderEntityContent = () => {
    if (!selectedEntity) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Entity Selected</h3>
          <p className="text-muted-foreground">
            Select an entity from the list to view and edit its attributes
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">{selectedEntity.label}</h3>
            <Badge variant="secondary">{selectedEntity.kind}</Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="simple">Overview</TabsTrigger>
            <TabsTrigger value="character">Character</TabsTrigger>
            <TabsTrigger value="faction">Faction</TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4">
            <SimpleLayout
              attributes={typedAttributes}
              onAttributeClick={() => {}}
            />
          </TabsContent>

          <TabsContent value="character" className="space-y-4">
            <CharacterSheetLayout
              attributes={typedAttributes}
              onAttributeClick={() => {}}
            />
          </TabsContent>

          <TabsContent value="faction" className="space-y-4">
            <FactionOverviewLayout
              attributes={typedAttributes}
              onAttributeClick={() => {}}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Entity Attributes</h2>
          <Badge variant="outline">
            {Array.isArray(entities) ? entities.length : 0} entities
          </Badge>
        </div>

        {/* Entity List */}
        <div className="space-y-2">
          <Label>Select Entity</Label>
          <Select
            value={selectedEntity?.label || ''}
            onValueChange={(value) => {
              const entity = (Array.isArray(entities) ? entities : []).find(e => e.label === value);
              setSelectedEntity(entity || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose an entity..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(entityGroups).map(([kind, entityList]) => (
                <React.Fragment key={kind}>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted">
                    {kind}
                  </div>
                  {entityList.map((entity) => (
                    <SelectItem key={entity.label} value={entity.label}>
                      {entity.label}
                    </SelectItem>
                  ))}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Note Info */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span className="font-medium">Current Note:</span>
            <span className="text-muted-foreground truncate">
              {activeNote?.title || 'Untitled Note'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {renderEntityContent()}
      </div>
    </div>
  );
}
