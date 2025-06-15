
import { types, onSnapshot, getSnapshot, applySnapshot } from "mobx-state-tree";
import { NotesStore, INotesStore } from "./NotesStore";
import { UIStore, IUIStore } from "./UIStore";

export const RootStore = types
  .model("RootStore", {
    notesStore: NotesStore,
    uiStore: UIStore,
  })
  .actions((self) => ({
    afterCreate() {
      // Load data from localStorage
      this.loadFromLocalStorage();
      
      // Set up auto-save
      onSnapshot(self.notesStore, (snapshot) => {
        localStorage.setItem('mst-notes', JSON.stringify(snapshot));
      });
      
      onSnapshot(self.uiStore, (snapshot) => {
        localStorage.setItem('mst-ui', JSON.stringify(snapshot));
      });
    },
    loadFromLocalStorage() {
      // Load notes
      const savedNotes = localStorage.getItem('mst-notes');
      if (savedNotes) {
        try {
          const notesSnapshot = JSON.parse(savedNotes);
          // Convert date strings back to Date objects
          if (notesSnapshot.notes) {
            Object.values(notesSnapshot.notes).forEach((note: any) => {
              note.createdAt = new Date(note.createdAt);
              note.updatedAt = new Date(note.updatedAt);
            });
          }
          if (notesSnapshot.nests) {
            Object.values(notesSnapshot.nests).forEach((nest: any) => {
              nest.createdAt = new Date(nest.createdAt);
              nest.updatedAt = new Date(nest.updatedAt);
            });
          }
          applySnapshot(self.notesStore, notesSnapshot);
        } catch (error) {
          console.error("Failed to load notes from localStorage:", error);
        }
      }
      
      // Load UI state
      const savedUI = localStorage.getItem('mst-ui');
      if (savedUI) {
        try {
          const uiSnapshot = JSON.parse(savedUI);
          applySnapshot(self.uiStore, uiSnapshot);
        } catch (error) {
          console.error("Failed to load UI state from localStorage:", error);
        }
      }
      
      // Load dark mode
      self.uiStore.loadFromLocalStorage();
    },
  }));

export type IRootStore = typeof RootStore.Type;

// Create store instance
export const rootStore = RootStore.create({
  notesStore: {},
  uiStore: {},
});
