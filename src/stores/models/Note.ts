
import { types, flow, getSnapshot } from "mobx-state-tree";

export const Note = types
  .model("Note", {
    id: types.identifier,
    title: types.string,
    content: types.string,
    type: types.enumeration("NoteType", ["note", "folder"]),
    parentId: types.maybe(types.string),
    nestId: types.maybe(types.string),
    isExpanded: types.optional(types.boolean, false),
    createdAt: types.Date,
    updatedAt: types.Date,
  })
  .views((self) => ({
    get isFolder() {
      return self.type === "folder";
    },
    get isNote() {
      return self.type === "note";
    },
    get hierarchyPath(): string[] {
      // Will be implemented when we have access to parent store
      return [self.title];
    },
    // Cached searchable content to avoid recomputation
    get searchableContent() {
      return `${self.title} ${self.content}`.toLowerCase();
    },
  }))
  .actions((self) => ({
    setTitle(title: string) {
      if (self.title !== title) {
        self.title = title;
        self.updatedAt = new Date();
      }
    },
    setContent(content: string) {
      if (self.content !== content) {
        self.content = content;
        self.updatedAt = new Date();
      }
    },
    toggleExpanded() {
      if (self.type === "folder") {
        self.isExpanded = !self.isExpanded;
      }
    },
    update(updates: Partial<typeof self>) {
      let hasChanges = false;
      
      // Only update if values actually changed
      Object.entries(updates).forEach(([key, value]) => {
        if (key in self && (self as any)[key] !== value) {
          (self as any)[key] = value;
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        self.updatedAt = new Date();
      }
    },
  }));

export type INoteModel = typeof Note.Type;
