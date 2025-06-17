import { types, flow, getSnapshot, applySnapshot } from "mobx-state-tree";
import { Note, INoteModel } from "./models/Note";
import { Nest, INestModel } from "./models/Nest";

export const NotesStore = types
  .model("NotesStore", {
    notes: types.map(Note),
    nests: types.map(Nest),
    // Add cache for parent-child relationships
    _parentChildCache: types.optional(types.map(types.array(types.string)), {}),
    _cacheVersion: types.optional(types.number, 0),
  })
  .views((self) => ({
    get allNotes() {
      return Array.from(self.notes.values());
    },
    get allNests() {
      return Array.from(self.nests.values());
    },
    get folderNotes() {
      return this.allNotes.filter(note => !note.nestId);
    },
    get nestNotes() {
      return this.allNotes.filter(note => note.nestId);
    },
    getNotesByNest(nestId: string) {
      return this.allNotes.filter(note => note.nestId === nestId);
    },
    // Optimized and cached getChildNotes
    getChildNotes(parentId: string) {
      // Use cache if available and current
      const cached = self._parentChildCache.get(parentId);
      if (cached) {
        return cached.map(id => self.notes.get(id)).filter(Boolean);
      }
      
      // Compute and cache
      const children = this.allNotes.filter(note => note.parentId === parentId);
      self._parentChildCache.set(parentId, children.map(c => c.id));
      return children;
    },
    // Optimized search with early termination
    searchNotes(query: string) {
      if (!query.trim()) return this.allNotes;
      const searchTerm = query.toLowerCase();
      const results: INoteModel[] = [];
      
      for (const note of this.allNotes) {
        if (note.searchableContent.includes(searchTerm)) {
          results.push(note);
          // Limit results for performance
          if (results.length >= 100) break;
        }
      }
      return results;
    },
    // New: Get tree structure efficiently
    getTreeStructure(notes?: INoteModel[]) {
      const notesToProcess = notes || this.folderNotes;
      const nodeMap = new Map<string, any>();
      const rootNodes: any[] = [];

      // First pass: create all nodes
      notesToProcess.forEach(note => {
        nodeMap.set(note.id, { ...note, children: [] });
      });

      // Second pass: build hierarchy
      notesToProcess.forEach(note => {
        const node = nodeMap.get(note.id)!;
        if (note.parentId) {
          const parent = nodeMap.get(note.parentId);
          if (parent) {
            if (!parent.children) parent.children = [];
            parent.children.push(node);
          } else {
            rootNodes.push(node);
          }
        } else {
          rootNodes.push(node);
        }
      });

      return rootNodes;
    },
  }))
  .actions((self) => ({
    // Clear cache when notes change
    _invalidateCache() {
      self._parentChildCache.clear();
      self._cacheVersion = self._cacheVersion + 1;
    },
    addNote(noteData: {
      id: string;
      title: string;
      content?: string;
      type: "note" | "folder";
      parentId?: string;
      nestId?: string;
    }) {
      const note = Note.create({
        ...noteData,
        content: noteData.content || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      self.notes.set(noteData.id, note);
      this._invalidateCache();
      return note;
    },
    removeNote(id: string) {
      const note = self.notes.get(id);
      if (!note) return;

      // If it's a folder, remove all children recursively
      if (note.isFolder) {
        const childIds = self.getChildNotes(id).map(child => child.id);
        childIds.forEach(childId => this.removeNote(childId));
      }

      self.notes.delete(id);
      this._invalidateCache();
    },
    updateNote(id: string, updates: Partial<INoteModel>) {
      const note = self.notes.get(id);
      if (note) {
        note.update(updates);
        // Only invalidate cache if hierarchy changed
        if (updates.parentId !== undefined) {
          this._invalidateCache();
        }
      }
    },
    addNest(nestData: {
      id: string;
      name: string;
      description?: string;
    }) {
      const nest = Nest.create({
        ...nestData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      self.nests.set(nestData.id, nest);
      return nest;
    },
    removeNest(id: string) {
      // Remove all notes in this nest
      const notesToRemove = self.getNotesByNest(id);
      notesToRemove.forEach(note => self.notes.delete(note.id));
      
      // Remove the nest
      self.nests.delete(id);
      this._invalidateCache();
    },
    updateNest(id: string, updates: { name?: string; description?: string }) {
      const nest = self.nests.get(id);
      if (nest) {
        if (updates.name) nest.setName(updates.name);
        if (updates.description !== undefined) nest.setDescription(updates.description);
      }
    },
  }))
  .actions((self) => ({
    // Persistence actions
    loadFromSnapshot: flow(function* (snapshot: any) {
      try {
        applySnapshot(self, snapshot);
        self._invalidateCache();
      } catch (error) {
        console.error("Failed to load notes from snapshot:", error);
      }
    }),
    saveToLocalStorage: flow(function* () {
      try {
        const snapshot = getSnapshot(self);
        localStorage.setItem('mst-notes', JSON.stringify(snapshot));
      } catch (error) {
        console.error("Failed to save notes to localStorage:", error);
      }
    }),
  }));

export type INotesStore = typeof NotesStore.Type;
