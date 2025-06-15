
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
import { EntityManagerContent } from './EntityManagerContent';

export function EntityManagerDrawer() {
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
      <DrawerContent className="h-[80vh] bg-[#0a0a0d] border-[#1a1b23]">
        <DrawerHeader className="border-b border-[#1a1b23]">
          <DrawerTitle className="text-primary">Entity Manager</DrawerTitle>
        </DrawerHeader>
        <EntityManagerContent />
      </DrawerContent>
    </Drawer>
  );
}
