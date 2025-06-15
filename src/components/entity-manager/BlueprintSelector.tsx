
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Zap, Info } from 'lucide-react';
import { EntityBlueprint } from '@/types/blueprints';

interface BlueprintSelectorProps {
  entityKind: string;
  availableBlueprints: EntityBlueprint[];
  onApplyBlueprint: (blueprint: EntityBlueprint) => void;
  onSkip: () => void;
}

export function BlueprintSelector({ 
  entityKind, 
  availableBlueprints, 
  onApplyBlueprint, 
  onSkip 
}: BlueprintSelectorProps) {
  const [selectedBlueprintId, setSelectedBlueprintId] = React.useState<string>('');
  
  const selectedBlueprint = availableBlueprints.find(b => b.id === selectedBlueprintId);

  if (availableBlueprints.length === 0) {
    return (
      <div className="p-3 bg-[#12141f] border border-[#1a1b23] rounded-md">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Info className="h-3 w-3" />
          No blueprints available for {entityKind} entities
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onSkip}
          className="mt-2 h-6 text-xs"
        >
          Continue without template
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3 bg-[#12141f] border border-[#1a1b23] rounded-md space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-medium text-white">Apply Blueprint</span>
        <Badge variant="outline" className="text-xs">{entityKind}</Badge>
      </div>
      
      <Select value={selectedBlueprintId} onValueChange={setSelectedBlueprintId}>
        <SelectTrigger className="h-8 text-xs bg-[#0a0a0d] border-[#1a1b23]">
          <SelectValue placeholder="Choose a blueprint" />
        </SelectTrigger>
        <SelectContent>
          {availableBlueprints.map(blueprint => (
            <SelectItem key={blueprint.id} value={blueprint.id}>
              <div className="flex items-center gap-2">
                <span>{blueprint.name}</span>
                <Badge variant="outline" className="text-xs">
                  {blueprint.templates.length} attrs
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedBlueprint && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            This blueprint will add:
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedBlueprint.templates.map(template => (
              <Badge
                key={template.id}
                variant="secondary"
                className="text-xs bg-[#1a1b23] hover:bg-[#22242f]"
              >
                {template.name} ({template.type})
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => selectedBlueprint && onApplyBlueprint(selectedBlueprint)}
          disabled={!selectedBlueprint}
          className="h-6 text-xs"
        >
          Apply Blueprint
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onSkip}
          className="h-6 text-xs"
        >
          Skip
        </Button>
      </div>
    </div>
  );
}
