
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Plus, ExternalLink } from 'lucide-react';
import { AttributeType, AttributeValue, EntityReference, ProgressBarValue, StatBlockValue, RelationshipValue } from '@/types/attributes';

interface TypedAttributeInputProps {
  type: AttributeType;
  value: AttributeValue;
  onChange: (value: AttributeValue) => void;
  entityKind: string;
  entityLabel: string;
}

export function TypedAttributeInput({ 
  type, 
  value, 
  onChange, 
  entityKind, 
  entityLabel 
}: TypedAttributeInputProps) {
  const [listInput, setListInput] = useState('');

  const handleListAdd = () => {
    if (!listInput.trim()) return;
    const currentList = Array.isArray(value) ? value : [];
    onChange([...currentList, listInput.trim()]);
    setListInput('');
  };

  const handleListRemove = (index: number) => {
    const currentList = Array.isArray(value) ? value : [];
    onChange(currentList.filter((_, i) => i !== index));
  };

  const formatDateForInput = (dateValue: AttributeValue): string => {
    if (!dateValue) return '';
    const date = new Date(dateValue as string);
    return date.toISOString().split('T')[0];
  };

  switch (type) {
    case 'ProgressBar':
      const progressValue = (value as ProgressBarValue) || { current: 0, maximum: 100 };
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Current</label>
              <Input
                type="number"
                value={progressValue.current}
                onChange={(e) => onChange({
                  ...progressValue,
                  current: Number(e.target.value) || 0
                })}
                className="h-6 text-xs"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Maximum</label>
              <Input
                type="number"
                value={progressValue.maximum}
                onChange={(e) => onChange({
                  ...progressValue,
                  maximum: Number(e.target.value) || 100
                })}
                className="h-6 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Progress value={(progressValue.current / progressValue.maximum) * 100} className="h-2" />
            <div className="text-xs text-muted-foreground text-center">
              {progressValue.current}/{progressValue.maximum} ({Math.round((progressValue.current / progressValue.maximum) * 100)}%)
            </div>
          </div>
        </div>
      );

    case 'StatBlock':
      const statValue = (value as StatBlockValue) || { 
        strength: 10, dexterity: 10, constitution: 10, 
        intelligence: 10, wisdom: 10, charisma: 10 
      };
      return (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(statValue).map(([stat, val]) => (
            <div key={stat} className="space-y-1">
              <label className="text-xs text-muted-foreground capitalize">{stat}</label>
              <Input
                type="number"
                value={val}
                onChange={(e) => onChange({
                  ...statValue,
                  [stat]: Number(e.target.value) || 10
                })}
                className="h-6 text-xs"
                min={1}
                max={20}
              />
            </div>
          ))}
        </div>
      );

    case 'Relationship':
      const relationshipValue = (value as RelationshipValue) || { 
        entityId: '', entityLabel: '', relationshipType: '' 
      };
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">Entity</label>
            <Input
              value={relationshipValue.entityLabel}
              onChange={(e) => onChange({
                ...relationshipValue,
                entityLabel: e.target.value,
                entityId: `entity-${e.target.value.toLowerCase().replace(/\s+/g, '-')}`
              })}
              className="h-6 text-xs"
              placeholder="Entity name"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Relationship Type</label>
            <Input
              value={relationshipValue.relationshipType}
              onChange={(e) => onChange({
                ...relationshipValue,
                relationshipType: e.target.value
              })}
              className="h-6 text-xs"
              placeholder="ally, enemy, parent, etc."
            />
          </div>
        </div>
      );

    case 'Text':
      return (
        <Input
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 text-xs"
          placeholder="Enter text value"
        />
      );

    case 'Number':
      return (
        <Input
          type="number"
          value={String(value || '')}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-6 text-xs"
          placeholder="Enter number"
        />
      );

    case 'Boolean':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(Boolean(checked))}
          />
          <span className="text-xs text-muted-foreground">
            {Boolean(value) ? 'True' : 'False'}
          </span>
        </div>
      );

    case 'Date':
      return (
        <Input
          type="date"
          value={formatDateForInput(value)}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
          className="h-6 text-xs"
        />
      );

    case 'List':
      const currentList = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={listInput}
              onChange={(e) => setListInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleListAdd()}
              className="h-6 text-xs flex-1"
              placeholder="Add list item"
            />
            <Button
              size="sm"
              onClick={handleListAdd}
              disabled={!listInput.trim()}
              className="h-6 px-2"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {currentList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {currentList.map((item, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs flex items-center gap-1"
                >
                  {String(item)}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleListRemove(index)}
                    className="h-3 w-3 p-0 hover:bg-destructive/20 hover:text-destructive"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      );

    case 'EntityLink':
      const entityRef = value as EntityReference;
      return (
        <div className="space-y-2">
          <Input
            value={entityRef?.label || ''}
            onChange={(e) => onChange({
              entityId: `entity-${e.target.value.toLowerCase().replace(/\s+/g, '-')}`,
              kind: 'UNKNOWN',
              label: e.target.value
            } as EntityReference)}
            className="h-6 text-xs"
            placeholder="Entity name or reference"
          />
          {entityRef?.label && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              Links to: {entityRef.label}
            </div>
          )}
        </div>
      );

    case 'URL':
      return (
        <div className="space-y-1">
          <Input
            type="url"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            className="h-6 text-xs"
            placeholder="https://example.com"
          />
          {value && (
            <a
              href={String(value)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Open link
            </a>
          )}
        </div>
      );

    default:
      return (
        <Input
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 text-xs"
          placeholder="Enter value"
        />
      );
  }
}
