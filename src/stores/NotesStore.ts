
import { types, flow, getSnapshot, applySnapshot } from "mobx-state-tree";
import { Note, INoteModel } from "./models/Note";
import { Nest, INestModel } from "./models/Nest";

export const NotesStore = types
  .model("NotesStore", {
    notes: types.map(Note),
    nests: types.map(Nest),
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
    getChildNotes(parentId: string) {
      return this.allNotes.filter(note => note.parentId === parentId);
    },
    searchNotes(query: string) {
      if (!query.trim()) return this.allNotes;
      const searchTerm = query.toLowerCase();
      return this.allNotes.filter(note => 
        note.searchableContent.includes(searchTerm)
      );
    },
  }))
  .actions((self) => ({
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
    },
    updateNote(id: string, updates: Partial<INoteModel>) {
      const note = self.notes.get(id);
      if (note) {
        note.update(updates);
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
