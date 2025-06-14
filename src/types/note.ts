
export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'folder';
  parentId?: string;
  nestId?: string; // New field to associate notes with nests
  children?: Note[];
  isExpanded?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Nest {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
