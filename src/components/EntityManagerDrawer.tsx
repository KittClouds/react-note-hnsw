
import React, { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';
import { EntityManager } from './EntityManager';
import { Note } from '@/types/note';

interface EntityManagerDrawerProps {
  selectedNote: Note | null;
  notes: Note[];
  onEntityUpdate?: (entityId: string, updates: any) => void;
}

export function EntityManagerDrawer({ selectedNote, notes, onEntityUpdate }: EntityManagerDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Entity Manager"
        >
          <Database className="h-4 w-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[80vh] bg-background border">
        <DrawerHeader className="border-b">
          <DrawerTitle className="text-foreground">Entity Manager</DrawerTitle>
        </DrawerHeader>
        <EntityManager
          selectedNote={selectedNote}
          notes={notes}
          onEntityUpdate={onEntityUpdate}
        />
      </DrawerContent>
    </Drawer>
  );
}
