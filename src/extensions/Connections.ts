
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { parseNoteConnections, ParsedConnections } from '@/utils/parsingUtils';

export const Connections = Extension.create({
  name: 'connections',

  addStorage() {
    return {
      tags: [],
      mentions: [],
      links: [],
      entities: [],
      triples: [],
      backlinks: []
    } as ParsedConnections;
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('connections'),
        appendTransaction: (transactions, oldState, newState) => {
          // Only recalculate if the document has changed
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged) return null;

          // Parse connections from the current document
          const json = this.editor.getJSON();
          const connections = parseNoteConnections(json);

          // Update storage
          this.storage.tags = connections.tags;
          this.storage.mentions = connections.mentions;
          this.storage.links = connections.links;
          this.storage.entities = connections.entities;
          this.storage.triples = connections.triples;
          this.storage.backlinks = connections.backlinks;

          // Emit event for React components to subscribe to
          this.editor.emit('connectionsUpdate', { ...this.storage });

          return null; // No transaction needed, just updating storage
        },
      }),
    ];
  },
});
