
export type AttributeType =
  | 'Text'
  | 'Number'
  | 'Boolean'
  | 'Date'
  | 'List'
  | 'EntityLink'
  | 'URL'
  | 'ProgressBar'
  | 'StatBlock'
  | 'Relationship';

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

export type AttributeValue =
  | string
  | number
  | boolean
  | string[]
  | ProgressBarValue
  | StatBlockValue
  | EntityReference
  | RelationshipValue;

export interface TypedAttribute {
  id: string;
  name: string;
  type: AttributeType;
  value: AttributeValue;
  unit?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnhancedEntityAttributes {
  id: string; // Composite key: `${entityKind}:${entityLabel}`
  entityKind: string;
  entityLabel: string;
  attributes: TypedAttribute[];
  metadata: {
    version: number;
    lastUpdated: string;
  };
}
