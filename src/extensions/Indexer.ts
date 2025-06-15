
import { Extension } from '@tiptap/core';
import debounce from 'lodash.debounce';
import { semanticSearchService } from '@/lib/embedding/SemanticSearchService';

export const Indexer = Extension.create({
  name: 'indexer',

  addOptions() {
    return {
      debounce: 600, // ms
      getId: (editor: any) => editor.storage.noteId || crypto.randomUUID(),
      getTitle: (editor: any) => editor.storage.noteTitle || 'Untitled',
    };
  },

  addStorage() {
    return {
      noteId: null,
      noteTitle: null,
    };
  },

  // Index once when the editor mounts
  onCreate() {
    if (this.storage.noteId) {
      this.indexNote(this.editor);
    }
  },

  // Index on every content change (debounced)
  onUpdate: debounce(function(this: any) {
    if (this.storage.noteId) {
      this.indexNote(this.editor);
    }
  }, 600),

  indexNote(editor: any) {
    const noteId = this.options.getId(editor);
    const title = this.options.getTitle(editor);
    const text = editor.getText();

    if (noteId && title && text.trim()) {
      // Create a mock note object for the semantic search service
      const mockNote = {
        id: noteId,
        title: title,
        content: JSON.stringify(editor.getJSON()),
        type: 'note' as const,
        updatedAt: new Date(),
      };

      // Index the note asynchronously
      semanticSearchService.syncNote(mockNote).catch(console.error);
    }
  },
});
