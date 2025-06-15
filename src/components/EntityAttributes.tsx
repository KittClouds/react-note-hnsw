
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Edit2, Check, XCircle } from 'lucide-react';

interface EntityAttributesProps {
  attributes: Record<string, any>;
  onAttributesChange: (attributes: Record<string, any>) => void;
}

export function EntityAttributes({ attributes, onAttributesChange }: EntityAttributesProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newAttribute, setNewAttribute] = useState({ key: '', value: '' });

  const handleAddAttribute = () => {
    if (!newAttribute.key.trim()) return;

    const updatedAttributes = {
      ...attributes,
      [newAttribute.key.trim()]: newAttribute.value
    };

    onAttributesChange(updatedAttributes);
    setNewAttribute({ key: '', value: '' });
    setIsAddingNew(false);
  };

  const handleUpdateAttribute = (key: string, value: any) => {
    const updatedAttributes = { ...attributes };
    updatedAttributes[key] = value;
    onAttributesChange(updatedAttributes);
    setEditingKey(null);
  };

  const handleDeleteAttribute = (key: string) => {
    const updatedAttributes = { ...attributes };
    delete updatedAttributes[key];
    onAttributesChange(updatedAttributes);
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const getValueType = (value: any): string => {
    if (typeof value === 'boolean') return 'Boolean';
    if (typeof value === 'number') return 'Number';
    if (typeof value === 'object') return 'Object';
    return 'Text';
  };

  return (
    <div className="space-y-2">
      {Object.entries(attributes).map(([key, value]) => (
        <Card key={key} className="bg-background/50 border-border/50">
          <CardContent className="p-2">
            {editingKey === key ? (
              <div className="space-y-2">
                <Input
                  value={key}
                  disabled
                  className="h-6 text-xs bg-muted"
                  placeholder="Attribute name"
                />
                <Input
                  value={formatValue(value)}
                  onChange={(e) => handleUpdateAttribute(key, e.target.value)}
                  className="h-6 text-xs"
                  placeholder="Attribute value"
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => setEditingKey(null)}
                    className="h-5 px-2 text-xs"
                  >
                    <Check className="h-2 w-2" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingKey(null)}
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
                    <Badge className="text-xs bg-primary/20 text-primary">
                      {getValueType(value)}
                    </Badge>
                    <span className="text-xs font-medium">
                      {key}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatValue(value)}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingKey(key)}
                    className="h-5 w-5 p-0 hover:bg-primary/20 hover:text-primary"
                  >
                    <Edit2 className="h-2 w-2" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAttribute(key)}
                    className="h-5 w-5 p-0 hover:bg-destructive/20 hover:text-destructive"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {isAddingNew ? (
        <Card className="border-dashed border-primary/50">
          <CardContent className="p-2 space-y-2">
            <Input
              value={newAttribute.key}
              onChange={(e) => setNewAttribute({ ...newAttribute, key: e.target.value })}
              className="h-6 text-xs"
              placeholder="Attribute name"
            />
            <Input
              value={newAttribute.value}
              onChange={(e) => setNewAttribute({ ...newAttribute, value: e.target.value })}
              className="h-6 text-xs"
              placeholder="Attribute value"
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={handleAddAttribute}
                disabled={!newAttribute.key.trim()}
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
                  setNewAttribute({ key: '', value: '' });
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
          Add Attribute
        </Button>
      )}
    </div>
  );
}
