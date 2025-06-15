
import React, { createContext, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { rootStore, IRootStore } from './RootStore';

const StoreContext = createContext<IRootStore>(rootStore);

export const StoreProvider = observer(({ children }: { children: React.ReactNode }) => {
  return (
    <StoreContext.Provider value={rootStore}>
      {children}
    </StoreContext.Provider>
  );
});

export const useStore = () => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return store;
};

export const useNotesStore = () => useStore().notesStore;
export const useUIStore = () => useStore().uiStore;
