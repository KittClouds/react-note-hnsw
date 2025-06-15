
import { MOCK_BLUEPRINTS } from './blueprints';
import { EntityBlueprint } from '@/types/blueprints';

export function getBlueprintForEntityKind(entityKind: string): EntityBlueprint | undefined {
  return MOCK_BLUEPRINTS.find(b => b.entityKind === entityKind);
}
