
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FileText, FolderOpen, Database, Globe } from 'lucide-react';
import { EntityTypeGroup } from './EntityTypeGroup';
import { useEntitiesForScope, EntityScope } from '@/hooks/useEntitiesForScope';
import { Entity } from '@/utils/parsingUtils';

const scopeConfig = {
  note: { icon: FileText, label: 'Current Note' },
  folder: { icon: FolderOpen, label: 'Current Folder' },
  cluster: { icon: Database, label: 'Current Cluster' },
  vault: { icon: Globe, label: 'Entire Vault' }
};

export function EntityManagerContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const entitiesScope = useEntitiesForScope();
  
  const { scope, setScope, scopeInfo, entities, entityGroups } = entitiesScope;

  // Filter entities by search query
  const filteredEntityGroups = React.useMemo(() => {
    if (!searchQuery) return entityGroups;
    
    const filtered: Record<string, typeof entities> = {};
    Object.entries(entityGroups).forEach(([kind, entityList]) => {
      const matchingEntities = entityList.filter(entity => 
        entity.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (matchingEntities.length > 0) {
        filtered[kind] = matchingEntities;
      }
    });
    
    return filtered;
  }, [entityGroups, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Scope Mode Toggle */}
      <div className="p-4 border-b border-[#1a1b23]">
        <div className="flex gap-2 mb-4">
          {(Object.keys(scopeConfig) as EntityScope[]).map((scopeKey) => {
            const config = scopeConfig[scopeKey];
            const Icon = config.icon;
            return (
              <Button
                key={scopeKey}
                variant={scope === scopeKey ? 'default' : 'ghost'}
                onClick={() => setScope(scopeKey as EntityScope)}
                className="flex items-center gap-2"
                size="sm"
              >
                <Icon className="h-4 w-4" />
                {config.label}
              </Button>
            );
          })}
        </div>
        
        <div className="mb-4 p-2 bg-[#12141f] rounded-md border border-[#1a1b23]">
          <div className="text-sm font-medium text-primary">{scopeInfo.name}</div>
          <div className="text-xs text-muted-foreground">{scopeInfo.description}</div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search entities..."
            className="pl-8 bg-[#12141f] border-[#1a1b23]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Entity Groups */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {Object.keys(filteredEntityGroups).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No entities found in this {scope}.</p>
            <p className="mt-2 text-sm">
              Use <code className="bg-muted px-1 rounded">[TYPE|Label]</code> syntax to create entities.
            </p>
          </div>
        ) : (
          Object.entries(filteredEntityGroups).map(([kind, entityList]) => (
            <EntityTypeGroup
              key={kind}
              kind={kind}
              entities={entityList}
              viewMode={scope === 'note' ? 'note' : 'cluster'}
            />
          ))
        )}
      </div>
    </div>
  );
}
