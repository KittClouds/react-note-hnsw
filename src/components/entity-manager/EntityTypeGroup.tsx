
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Link } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { EntityCard } from './EntityCard';
import { Entity } from '@/utils/parsingUtils';
import { ClusterEntity } from './useActiveClusterEntities';

interface EntityTypeGroupProps {
  kind: string;
  entities: (Entity | ClusterEntity)[];
  viewMode: 'note' | 'cluster';
}

export function EntityTypeGroup({ kind, entities, viewMode }: EntityTypeGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="bg-[#12141f] border-[#1a1b23]">
      <CardContent className="p-0">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#1a1b23] rounded-none"
        >
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary">{kind}</span>
            <Badge variant="secondary" className="bg-[#1a1b23] text-xs">
              {entities.length}
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
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
              <div className="p-4 pt-0 space-y-2">
                {entities.map((entity, index) => (
                  <EntityCard
                    key={`${entity.kind}-${entity.label}-${index}`}
                    entity={entity}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
