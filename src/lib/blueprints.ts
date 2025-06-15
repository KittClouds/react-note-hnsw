
import { EntityBlueprint } from '@/types/blueprints';
import { generateNodeId } from './utils/ids';

export const MOCK_BLUEPRINTS: EntityBlueprint[] = [
  {
    id: generateNodeId(),
    name: 'Character Sheet',
    entityKind: 'CHARACTER',
    description: 'A standard character sheet for player characters or NPCs.',
    templates: [
      { id: generateNodeId(), name: 'Level', type: 'Number', defaultValue: 1 },
      { id: generateNodeId(), name: 'Class', type: 'Text', defaultValue: 'Adventurer' },
      { id: generateNodeId(), name: 'HP', type: 'ProgressBar', defaultValue: { current: 10, maximum: 10 } },
      { id: generateNodeId(), name: 'Stats', type: 'StatBlock' },
      { id: generateNodeId(), name: 'Bio', type: 'Text' },
    ],
  },
  {
    id: generateNodeId(),
    name: 'Location',
    entityKind: 'LOCATION',
    description: 'A blueprint for cities, towns, or dungeons.',
    templates: [
      { id: generateNodeId(), name: 'Population', type: 'Number', defaultValue: 1000 },
      { id: generateNodeId(), name: 'Government', type: 'Text' },
      { id: generateNodeId(), name: 'Map URL', type: 'URL' },
    ],
  },
  {
    id: generateNodeId(),
    name: 'Quest',
    entityKind: 'QUEST',
    description: 'A blueprint for tracking quests.',
    templates: [
      { id: generateNodeId(), name: 'Giver', type: 'EntityLink' },
      { id: generateNodeId(), name: 'Status', type: 'Text', defaultValue: 'Not Started' },
      { id: generateNodeId(), name: 'Reward', type: 'Text' },
    ]
  }
];
