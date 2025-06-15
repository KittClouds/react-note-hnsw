
import { useState, useCallback, useRef, useEffect } from 'react';
import RichEditor from './RichEditor';
import { NoteTab } from '@/hooks/useNoteTabs';
import { Note } from '@/types/note';
import { ParsedConnections } from '@/utils/parsingUtils';

interface EditorState {
  content: string;
  lastSaved: Date;
  connections: ParsedConnections | null;
}

interface EditorContainerProps {
  tab: NoteTab;
  note: Note | null;
  isDarkMode: boolean;
  onContentChange: (noteId: string, content: string, title: string) => void;
  onConnectionsChange: (noteId: string, connections: ParsedConnections) => void;
  onTabDirtyChange: (tabId: string, isDirty: boolean) => void;
}

const EditorContainer = ({
  tab,
  note,
  isDarkMode,
  onContentChange,
  onConnectionsChange,
  onTabDirtyChange
}: EditorContainerProps) => {
  const [editorState, setEditorState] = useState<EditorState>(() => ({
    content: note?.content || '',
    lastSaved: note?.updatedAt || new Date(),
    connections: null
  }));

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedContentRef = useRef(note?.content || '');

  // Update editor state when note changes (e.g., external updates)
  useEffect(() => {
    if (note && note.content !== lastSavedContentRef.current) {
      setEditorState(prev => ({
        ...prev,
        content: note.content,
        lastSaved: note.updatedAt
      }));
      lastSavedContentRef.current = note.content;
      onTabDirtyChange(tab.id, false);
    }
  }, [note?.content, note?.updatedAt, tab.id, onTabDirtyChange]);

  const handleContentChange = useCallback((content: string) => {
    setEditorState(prev => ({ ...prev, content }));
    
    // Extract title from content
    let title = 'Untitled Note';
    try {
      const jsonContent = typeof content === 'string' ? JSON.parse(content) : content;
      
      if (jsonContent.content && Array.isArray(jsonContent.content)) {
        for (const node of jsonContent.content) {
          if (node.type === 'heading' && node.content && node.content[0]?.text) {
            title = node.content[0].text.trim() || 'Untitled Note';
            break;
          } else if (node.type === 'paragraph' && node.content && node.content[0]?.text) {
            title = node.content[0].text.trim().split('\n')[0] || 'Untitled Note';
            break;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse content for title extraction:', error);
    }

    // Mark tab as dirty
    const isDirty = content !== lastSavedContentRef.current;
    onTabDirtyChange(tab.id, isDirty);

    // Debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (note) {
        onContentChange(note.id, content, title.substring(0, 100));
        lastSavedContentRef.current = content;
        onTabDirtyChange(tab.id, false);
        setEditorState(prev => ({ ...prev, lastSaved: new Date() }));
      }
    }, 1000);
  }, [note, tab.id, onContentChange, onTabDirtyChange]);

  const handleConnectionsChange = useCallback((connections: ParsedConnections) => {
    setEditorState(prev => ({ ...prev, connections }));
    if (note) {
      onConnectionsChange(note.id, connections);
    }
  }, [note, onConnectionsChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Note not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden p-4">
        <RichEditor
          content={editorState.content}
          onChange={handleContentChange}
          onConnectionsChange={handleConnectionsChange}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
};

export default EditorContainer;
