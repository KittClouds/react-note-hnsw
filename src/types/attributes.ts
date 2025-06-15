
export type AttributeType = 
  | 'Text' 
  | 'URL' 
  | 'Number' 
  | 'Boolean'
  | 'Date'
  | 'List'
  | 'ProgressBar' 
  | 'StatBlock' 
  | 'EntityLink'
  | 'Relationship';

export type AttributeValue = 
  | string 
  | number 
  | boolean 
  | string[] 
  | ProgressBarValue 
  | StatBlockValue 
  | EntityReference
  | RelationshipValue;

export interface ProgressBarValue {
  current: number;
  maximum: number;
}

export interface StatBlockValue {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface EntityReference {
  entityId: string;
  kind: string;
  label: string;
}

export interface RelationshipValue {
  entityId: string;
  entityLabel: string;
  relationshipType: string;
}

export interface TypedAttribute {
  id: string;
  name: string;
  type: AttributeType;
  value: AttributeValue;
  unit?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttributeSchema {
  name: string;
  type: AttributeType;
  defaultValue?: AttributeValue;
  unit?: string;
  required?: boolean;
}

export interface EntityKindSchema {
  kind: string;
  attributes: AttributeSchema[];
}

// Predefined entity schemas
export const ENTITY_SCHEMAS: EntityKindSchema[] = [
  {
    kind: 'CHARACTER',
    attributes: [
      { name: 'Race', type: 'Text', defaultValue: '' },
      { name: 'Class', type: 'Text', defaultValue: '' },
      { name: 'Level', type: 'Number', defaultValue: 1 },
      { name: 'Health', type: 'ProgressBar', defaultValue: { current: 100, maximum: 100 } },
      { name: 'Mana', type: 'ProgressBar', defaultValue: { current: 50, maximum: 50 } },
      { name: 'Stats', type: 'StatBlock', defaultValue: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 } },
      { name: 'Portrait', type: 'URL', defaultValue: '' },
      { name: 'Background', type: 'Text', defaultValue: '' },
      { name: 'Alignment', type: 'Text', defaultValue: '' }
    ]
  },
  {
    kind: 'NPC',
    attributes: [
      { name: 'Race', type: 'Text', defaultValue: '' },
      { name: 'Location', type: 'EntityLink', defaultValue: { entityId: '', kind: 'LOCATION', label: '' } },
      { name: 'Relationships', type: 'List', defaultValue: [] },
      { name: 'Portrait', type: 'URL', defaultValue: '' },
      { name: 'Occupation', type: 'Text', defaultValue: '' }
    ]
  },
  {
    kind: 'LOCATION',
    attributes: [
      { name: 'Description', type: 'Text', defaultValue: '' },
      { name: 'Climate', type: 'Text', defaultValue: '' },
      { name: 'Population', type: 'Number', defaultValue: 0 },
      { name: 'Notable NPCs', type: 'List', defaultValue: [] },
      { name: 'Points of Interest', type: 'List', defaultValue: [] }
    ]
  },
  {
    kind: 'ITEM',
    attributes: [
      { name: 'Type', type: 'Text', defaultValue: '' },
      { name: 'Rarity', type: 'Text', defaultValue: 'Common' },
      { name: 'Value', type: 'Number', defaultValue: 0, unit: 'gp' },
      { name: 'Description', type: 'Text', defaultValue: '' },
      { name: 'Properties', type: 'List', defaultValue: [] }
    ]
  },
  {
    kind: 'SCENE',
    attributes: [
      { name: 'Location', type: 'EntityLink', defaultValue: { entityId: '', kind: 'LOCATION', label: '' } },
      { name: 'Characters', type: 'List', defaultValue: [] },
      { name: 'Description', type: 'Text', defaultValue: '' },
      { name: 'Mood', type: 'Text', defaultValue: '' }
    ]
  },
  {
    kind: 'QUEST',
    attributes: [
      { name: 'Status', type: 'Text', defaultValue: 'Not Started' },
      { name: 'Objectives', type: 'List', defaultValue: [] },
      { name: 'Rewards', type: 'List', defaultValue: [] },
      { name: 'Quest Giver', type: 'EntityLink', defaultValue: { entityId: '', kind: 'NPC', label: '' } }
    ]
  }
];
