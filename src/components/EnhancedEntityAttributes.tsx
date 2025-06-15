
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Edit2, Check, XCircle } from 'lucide-react';
import { TypedAttribute, AttributeType, AttributeValue, ENTITY_SCHEMAS } from '@/types/attributes';
import { TypedAttributeInput } from './TypedAttributeInput';

interface EnhancedEntityAttributesProps {
  attributes: TypedAttribute[];
  onAttributesChange: (attributes: TypedAttribute[]) => void;
  entityKind: string;
  entityLabel: string;
}

export function EnhancedEntityAttributes({ 
  attributes, 
  onAttributesChange, 
  entityKind, 
  entityLabel 
}: EnhancedEntityAttributesProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAttribute, setNewAttribute] = useState({
    name: '',
    type: 'Text' as AttributeType,
    value: '' as AttributeValue,
    unit: ''
  });

  // Get schema for this entity kind
  const entitySchema = useMemo(() => {
    return ENTITY_SCHEMAS.find(schema => schema.kind === entityKind);
  }, [entityKind]);

  // Organize attributes by schema vs custom
  const { schemaAttributes, customAttributes } = useMemo(() => {
    const schemaAttrNames = new Set(entitySchema?.attributes.map(a => a.name) || []);
    
    const schemaAttrs: TypedAttribute[] = [];
    const customAttrs: TypedAttribute[] = [];
    
    if (entitySchema) {
      // Sort schema attributes by schema order
      entitySchema.attributes.forEach(schemaAttr => {
        const attr = attributes.find(a => a.name === schemaAttr.name);
        if (attr) {
          schemaAttrs.push(attr);
        }
      });
    }
    
    // Add custom attributes
    attributes.forEach(attr => {
      if (!schemaAttrNames.has(attr.name)) {
        customAttrs.push(attr);
      }
    });
    
    return { schemaAttributes: schemaAttrs, customAttributes: customAttrs };
  }, [attributes, entitySchema]);

  const getDefaultValueForType = (type: AttributeType): AttributeValue => {
    switch (type) {
      case 'ProgressBar': return { current: 100, maximum: 100 };
      case 'StatBlock': return { 
        strength: 10, dexterity: 10, constitution: 10, 
        intelligence: 10, wisdom: 10, charisma: 10 
      };
      case 'Relationship': return { entityId: '', entityLabel: '', relationshipType: '' };
      case 'Text': return '';
      case 'Number': return 0;
      case 'Boolean': return false;
      case 'Date': return new Date().toISOString();
      case 'List': return [];
      case 'URL': return '';
      default: return '';
    }
  };

  const handleAddAttribute = () => {
    if (!newAttribute.name.trim()) return;

    const attribute: TypedAttribute = {
      id: `attr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newAttribute.name.trim(),
      type: newAttribute.type,
      value: newAttribute.value,
      unit: newAttribute.unit || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onAttributesChange([...attributes, attribute]);
    setNewAttribute({ name: '', type: 'Text', value: '', unit: '' });
    setIsAddingNew(false);
  };

  const handleUpdateAttribute = (id: string, updates: Partial<TypedAttribute>) => {
    const updatedAttributes = attributes.map(attr => 
      attr.id === id 
        ? { ...attr, ...updates, updatedAt: new Date().toISOString() }
        : attr
    );
    onAttributesChange(updatedAttributes);
    setEditingId(null);
  };

  const handleDeleteAttribute = (id: string) => {
    onAttributesChange(attributes.filter(attr => attr.id !== id));
  };

  const getTypeColor = (type: AttributeType): string => {
    const colors = {
      Text: 'bg-blue-500/20 text-blue-400',
      Number: 'bg-green-500/20 text-green-400',
      Boolean: 'bg-purple-500/20 text-purple-400',
      Date: 'bg-orange-500/20 text-orange-400',
      List: 'bg-yellow-500/20 text-yellow-400',
      EntityLink: 'bg-pink-500/20 text-pink-400',
      URL: 'bg-cyan-500/20 text-cyan-400',
      ProgressBar: 'bg-emerald-500/20 text-emerald-400',
      StatBlock: 'bg-indigo-500/20 text-indigo-400',
      Relationship: 'bg-rose-500/20 text-rose-400'
    };
    return colors[type];
  };

  const formatAttributeValue = (attribute: TypedAttribute): string => {
    switch (attribute.type) {
      case 'Boolean':
        return attribute.value ? 'true' : 'false';
      case 'Date':
        return new Date(attribute.value as string).toLocaleDateString();
      case 'List':
        return (attribute.value as string[]).join(', ');
      case 'EntityLink':
        const ref = attribute.value as any;
        return ref?.label || 'Invalid Reference';
      case 'ProgressBar':
        const progress = attribute.value as any;
        return `${progress?.current || 0}/${progress?.maximum || 100}`;
      case 'StatBlock':
        const stats = attribute.value as any;
        return `STR:${stats?.strength || 10}`;
      case 'Relationship':
        const rel = attribute.value as any;
        return `${rel?.entityLabel || 'Unknown'} (${rel?.relationshipType || 'related'})`;
      default:
        return String(attribute.value);
    }
  };

  const renderAttributeCard = (attribute: TypedAttribute, isSchema: boolean = false) => (
    <Card key={attribute.id} className="bg-background/50 border-border/50">
      <CardContent className="p-2">
        {editingId === attribute.id ? (
          <div className="space-y-2">
            <Input
              value={attribute.name}
              onChange={(e) => handleUpdateAttribute(attribute.id, { name: e.target.value })}
              className="h-6 text-xs"
              placeholder="Attribute name"
              disabled={isSchema}
            />
            <div className="flex gap-2">
              <Select
                value={attribute.type}
                onValueChange={(type: AttributeType) => 
                  handleUpdateAttribute(attribute.id, { type, value: getDefaultValueForType(type) })
                }
                disabled={isSchema}
              >
                <SelectTrigger className="h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Text">Text</SelectItem>
                  <SelectItem value="Number">Number</SelectItem>
                  <SelectItem value="Boolean">Boolean</SelectItem>
                  <SelectItem value="Date">Date</SelectItem>
                  <SelectItem value="List">List</SelectItem>
                  <SelectItem value="EntityLink">Entity Link</SelectItem>
                  <SelectItem value="URL">URL</SelectItem>
                  <SelectItem value="ProgressBar">Progress Bar</SelectItem>
                  <SelectItem value="StatBlock">Stat Block</SelectItem>
                  <SelectItem value="Relationship">Relationship</SelectItem>
                </SelectContent>
              </Select>
              {attribute.type === 'Number' && (
                <Input
                  value={attribute.unit || ''}
                  onChange={(e) => handleUpdateAttribute(attribute.id, { unit: e.target.value })}
                  className="h-6 text-xs w-20"
                  placeholder="Unit"
                />
              )}
            </div>
            <TypedAttributeInput
              type={attribute.type}
              value={attribute.value}
              onChange={(value) => handleUpdateAttribute(attribute.id, { value })}
              entityKind={entityKind}
              entityLabel={entityLabel}
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={() => setEditingId(null)}
                className="h-5 px-2 text-xs"
              >
                <Check className="h-2 w-2" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingId(null)}
                className="h-5 px-2 text-xs hover:bg-destructive/20 hover:text-destructive"
              >
                <XCircle className="h-2 w-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1">
                <Badge className={`text-xs ${getTypeColor(attribute.type)}`}>
                  {attribute.type}
                </Badge>
                {isSchema && (
                  <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                    Schema
                  </Badge>
                )}
                <span className="text-xs font-medium">
                  {attribute.name}
                  {attribute.unit && ` (${attribute.unit})`}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatAttributeValue(attribute)}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingId(attribute.id)}
                className="h-5 w-5 p-0 hover:bg-primary/20 hover:text-primary"
              >
                <Edit2 className="h-2 w-2" />
              </Button>
              {!isSchema && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteAttribute(attribute.id)}
                  className="h-5 w-5 p-0 hover:bg-destructive/20 hover:text-destructive"
                >
                  <X className="h-2 w-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-2">
      {/* Schema Attributes */}
      {schemaAttributes.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-purple-300 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
              Schema Attributes
            </Badge>
          </h5>
          {schemaAttributes.map((attribute) => renderAttributeCard(attribute, true))}
        </div>
      )}

      {/* Custom Attributes */}
      {customAttributes.length > 0 && (
        <div className="space-y-2">
          {schemaAttributes.length > 0 && (
            <h5 className="text-xs font-medium text-blue-300 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-300">
                Custom Attributes
              </Badge>
            </h5>
          )}
          {customAttributes.map((attribute) => renderAttributeCard(attribute, false))}
        </div>
      )}

      {/* Add New Attribute */}
      {isAddingNew ? (
        <Card className="border-dashed border-primary/50">
          <CardContent className="p-2 space-y-2">
            <Input
              value={newAttribute.name}
              onChange={(e) => setNewAttribute({ ...newAttribute, name: e.target.value })}
              className="h-6 text-xs"
              placeholder="Attribute name"
            />
            <div className="flex gap-2">
              <Select
                value={newAttribute.type}
                onValueChange={(type: AttributeType) => 
                  setNewAttribute({ ...newAttribute, type, value: getDefaultValueForType(type) })
                }
              >
                <SelectTrigger className="h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Text">Text</SelectItem>
                  <SelectItem value="Number">Number</SelectItem>
                  <SelectItem value="Boolean">Boolean</SelectItem>
                  <SelectItem value="Date">Date</SelectItem>
                  <SelectItem value="List">List</SelectItem>
                  <SelectItem value="EntityLink">Entity Link</SelectItem>
                  <SelectItem value="URL">URL</SelectItem>
                  <SelectItem value="ProgressBar">Progress Bar</SelectItem>
                  <SelectItem value="StatBlock">Stat Block</SelectItem>
                  <SelectItem value="Relationship">Relationship</SelectItem>
                </SelectContent>
              </Select>
              {newAttribute.type === 'Number' && (
                <Input
                  value={newAttribute.unit}
                  onChange={(e) => setNewAttribute({ ...newAttribute, unit: e.target.value })}
                  className="h-6 text-xs w-20"
                  placeholder="Unit"
                />
              )}
            </div>
            <TypedAttributeInput
              type={newAttribute.type}
              value={newAttribute.value}
              onChange={(value) => setNewAttribute({ ...newAttribute, value })}
              entityKind={entityKind}
              entityLabel={entityLabel}
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={handleAddAttribute}
                disabled={!newAttribute.name.trim()}
                className="h-5 px-2 text-xs"
              >
                <Check className="h-2 w-2 mr-1" />
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewAttribute({ name: '', type: 'Text', value: '', unit: '' });
                }}
                className="h-5 px-2 text-xs hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="h-2 w-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="ghost"
          onClick={() => setIsAddingNew(true)}
          className="w-full h-6 border-dashed border hover:bg-primary/10 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-2 w-2 mr-1" />
          Add Custom Attribute
        </Button>
      )}
    </div>
  );
}
