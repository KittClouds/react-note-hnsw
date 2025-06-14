
export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'folder';
  parentId?: string;
  children?: Note[];
  isExpanded?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
