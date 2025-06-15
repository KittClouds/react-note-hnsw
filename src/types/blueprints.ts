
import { AttributeType, AttributeValue } from './attributes';

export interface AttributeTemplate {
  id: string;
  name: string;
  type: AttributeType;
  defaultValue?: AttributeValue;
  unit?: string;
  description?: string;
}

export interface EntityBlueprint {
  id: string;
  name:string;
  entityKind: string;
  description?: string;
  templates: AttributeTemplate[];
}
