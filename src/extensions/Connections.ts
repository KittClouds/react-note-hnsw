

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

          // Use setTimeout to emit event after transaction is complete
          setTimeout(() => {
            // Create a custom event on the editor's DOM element
            const event = new CustomEvent('connectionsUpdate', {
              detail: { ...this.storage }
            });
            this.editor.view.dom.dispatchEvent(event);
          }, 0);

          return null; // No transaction needed, just updating storage
        },
      }),
    ];
  },
});
