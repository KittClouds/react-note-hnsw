
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, FolderOpen, Database, Globe } from 'lucide-react';
import { EntityGroup } from './EntityGroup';
import { parseAllNotes } from '@/utils/parsingUtils';
import { Note } from '@/types/note';

interface EntityManagerProps {
  selectedNote: Note | null;
  notes: Note[];
  onEntityUpdate?: (entityId: string, updates: any) => void;
}

export function EntityManager({ selectedNote, notes, onEntityUpdate }: EntityManagerProps) {
  const [activeTab, setActiveTab] = useState('note');
  const [searchQuery, setSearchQuery] = useState('');

  // Parse entities from notes based on current scope
  const { scopedEntities, scopeInfo } = useMemo(() => {
    let relevantNotes: Note[] = [];
    let info = { name: '', description: '' };

    switch (activeTab) {
      case 'note':
        relevantNotes = selectedNote ? [selectedNote] : [];
        info = {
          name: selectedNote?.title || 'No Note Selected',
          description: 'Entities found in the current note'
        };
        break;
      case 'folder':
        // For now, treat as current note since we don't have folder structure in this context
        relevantNotes = selectedNote ? [selectedNote] : [];
        info = {
          name: 'Current Folder',
          description: 'Entities found in the current folder'
        };
        break;
      case 'cluster':
        // For now, show all notes as we don't have cluster concept here
        relevantNotes = notes.filter(note => note.type === 'note');
        info = {
          name: 'Current Cluster',
          description: 'Entities found in related notes'
        };
        break;
      case 'vault':
        relevantNotes = notes.filter(note => note.type === 'note');
        info = {
          name: 'Entire Vault',
          description: 'All entities in your vault'
        };
        break;
    }

    const { entitiesMap } = parseAllNotes(relevantNotes);
    const allEntities: any[] = [];
    
    entitiesMap.forEach((entities, noteId) => {
      entities.forEach(entity => {
        allEntities.push({
          ...entity,
          sourceNoteId: noteId,
          sourceNoteTitle: relevantNotes.find(n => n.id === noteId)?.title || 'Unknown'
        });
      });
    });

    return { scopedEntities: allEntities, scopeInfo: info };
  }, [activeTab, selectedNote, notes]);

  // Group entities by kind and filter by search
  const entityGroups = useMemo(() => {
    const filtered = scopedEntities.filter(entity =>
      entity.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.kind.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, any[]> = {};
    filtered.forEach(entity => {
      if (!groups[entity.kind]) {
        groups[entity.kind] = [];
      }
      groups[entity.kind].push(entity);
    });

    return groups;
  }, [scopedEntities, searchQuery]);

  const scopeConfig = {
    note: { icon: FileText, label: 'Current Note' },
    folder: { icon: FolderOpen, label: 'Current Folder' },
    cluster: { icon: Database, label: 'Current Cluster' },
    vault: { icon: Globe, label: 'Entire Vault' }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/50">
        <h2 className="text-xl font-semibold text-foreground mb-4">Entity Manager</h2>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="note" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Note
            </TabsTrigger>
            <TabsTrigger value="vault" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Vault
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mb-4 p-2 bg-muted rounded-md">
          <div className="text-sm font-medium">{scopeInfo.name}</div>
          <div className="text-xs text-muted-foreground">{scopeInfo.description}</div>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search entities..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {Object.keys(entityGroups).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No entities found in this scope.</p>
            <p className="mt-2 text-sm">
              Use <code className="bg-muted px-1 rounded">[TYPE|Label]</code> syntax to create entities.
            </p>
          </div>
        ) : (
          Object.entries(entityGroups).map(([kind, entities]) => (
            <EntityGroup
              key={kind}
              kind={kind}
              entities={entities}
              onEntityUpdate={onEntityUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
}
