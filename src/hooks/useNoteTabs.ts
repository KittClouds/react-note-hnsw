
import { useState, useCallback, useEffect } from 'react';
import { Note } from '@/types/note';

export interface NoteTab {
  id: string;
  noteId: string;
  title: string;
  isDirty: boolean;
  lastAccessed: Date;
}

interface UseNoteTabsReturn {
  tabs: NoteTab[];
  activeTabId: string | null;
  openTab: (note: Note) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  markTabDirty: (tabId: string, isDirty: boolean) => void;
  getActiveTab: () => NoteTab | null;
  isNoteOpen: (noteId: string) => boolean;
}

const MAX_TABS = 12;
const TABS_STORAGE_KEY = 'note-tabs';
const ACTIVE_TAB_STORAGE_KEY = 'active-tab';

export function useNoteTabs(): UseNoteTabsReturn {
  const [tabs, setTabs] = useState<NoteTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Load tabs from sessionStorage on mount
  useEffect(() => {
    const savedTabs = sessionStorage.getItem(TABS_STORAGE_KEY);
    const savedActiveTab = sessionStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    
    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs).map((tab: any) => ({
          ...tab,
          lastAccessed: new Date(tab.lastAccessed)
        }));
        setTabs(parsedTabs);
      } catch (error) {
        console.warn('Failed to load tabs from storage:', error);
      }
    }
    
    if (savedActiveTab) {
      setActiveTabId(savedActiveTab);
    }
  }, []);

  // Save tabs to sessionStorage when they change
  useEffect(() => {
    if (tabs.length > 0) {
      sessionStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    } else {
      sessionStorage.removeItem(TABS_STORAGE_KEY);
    }
  }, [tabs]);

  // Save active tab to sessionStorage when it changes
  useEffect(() => {
    if (activeTabId) {
      sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId);
    } else {
      sessionStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
    }
  }, [activeTabId]);

  const openTab = useCallback((note: Note) => {
    // Check if note is already open
    const existingTab = tabs.find(tab => tab.noteId === note.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Create new tab
    const newTab: NoteTab = {
      id: `tab-${note.id}-${Date.now()}`,
      noteId: note.id,
      title: note.title,
      isDirty: false,
      lastAccessed: new Date()
    };

    setTabs(prevTabs => {
      let updatedTabs = [...prevTabs, newTab];
      
      // Close oldest tab if we exceed max tabs
      if (updatedTabs.length > MAX_TABS) {
        const sortedTabs = updatedTabs.sort((a, b) => 
          a.lastAccessed.getTime() - b.lastAccessed.getTime()
        );
        updatedTabs = [sortedTabs[0], ...sortedTabs.slice(2)]; // Keep oldest + new tabs
      }
      
      return updatedTabs;
    });

    setActiveTabId(newTab.id);
  }, [tabs]);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const updatedTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // If closing active tab, switch to most recently accessed tab
      if (activeTabId === tabId && updatedTabs.length > 0) {
        const mostRecent = updatedTabs.sort((a, b) => 
          b.lastAccessed.getTime() - a.lastAccessed.getTime()
        )[0];
        setActiveTabId(mostRecent.id);
      } else if (updatedTabs.length === 0) {
        setActiveTabId(null);
      }
      
      return updatedTabs;
    });
  }, [activeTabId]);

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    
    // Update last accessed time
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId 
          ? { ...tab, lastAccessed: new Date() }
          : tab
      )
    );
  }, []);

  const updateTabTitle = useCallback((tabId: string, title: string) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId ? { ...tab, title } : tab
      )
    );
  }, []);

  const markTabDirty = useCallback((tabId: string, isDirty: boolean) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId ? { ...tab, isDirty } : tab
      )
    );
  }, []);

  const getActiveTab = useCallback(() => {
    return tabs.find(tab => tab.id === activeTabId) || null;
  }, [tabs, activeTabId]);

  const isNoteOpen = useCallback((noteId: string) => {
    return tabs.some(tab => tab.noteId === noteId);
  }, [tabs]);

  return {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    switchTab,
    updateTabTitle,
    markTabDirty,
    getActiveTab,
    isNoteOpen
  };
}
