
import { types } from "mobx-state-tree";

export const UIStore = types
  .model("UIStore", {
    selectedNoteId: types.maybe(types.string),
    selectedNestId: types.maybe(types.string),
    searchQuery: types.optional(types.string, ""),
    isDarkMode: types.optional(types.boolean, false),
    connectionsPanelOpen: types.optional(types.boolean, false),
    showGraphControls: types.optional(types.boolean, false),
    leftSidebarCollapsed: types.optional(types.boolean, false),
    rightSidebarCollapsed: types.optional(types.boolean, false),
    activeTab: types.optional(types.string, "folders"),
  })
  .actions((self) => ({
    setSelectedNote(noteId: string | null) {
      self.selectedNoteId = noteId;
    },
    setSelectedNest(nestId: string | null) {
      self.selectedNestId = nestId;
    },
    setSearchQuery(query: string) {
      self.searchQuery = query;
    },
    toggleDarkMode() {
      self.isDarkMode = !self.isDarkMode;
      if (self.isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('darkMode', self.isDarkMode.toString());
    },
    toggleConnectionsPanel() {
      self.connectionsPanelOpen = !self.connectionsPanelOpen;
    },
    toggleGraphControls() {
      self.showGraphControls = !self.showGraphControls;
    },
    toggleLeftSidebar() {
      self.leftSidebarCollapsed = !self.leftSidebarCollapsed;
    },
    toggleRightSidebar() {
      self.rightSidebarCollapsed = !self.rightSidebarCollapsed;
    },
    setActiveTab(tab: string) {
      self.activeTab = tab;
    },
  }))
  .actions((self) => ({
    loadFromLocalStorage() {
      const savedDarkMode = localStorage.getItem('darkMode');
      if (savedDarkMode === 'true') {
        self.isDarkMode = true;
        document.documentElement.classList.add('dark');
      }
    },
  }));

export type IUIStore = typeof UIStore.Type;
