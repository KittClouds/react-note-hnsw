
import { Entity, Triple } from './parsingUtils';

export interface DocumentConnections {
  tags: string[];
  mentions: string[];
  links: string[];
  entities: Entity[];
  triples: Triple[];
  backlinks: string[]; // Add backlinks support
}

/**
 * Parse connections directly from TipTap document structure
 * This eliminates the race condition by reading from canonical inline content specs
 */
export function parseNoteConnectionsFromDocument(document: any): DocumentConnections {
  const connections: DocumentConnections = {
    tags: [],
    mentions: [],
    links: [],
    entities: [],
    triples: [],
    backlinks: []
  };

  const walkNode = (node: any) => {
    // Process node content based on TipTap structure
    if (node.type) {
      // Check for custom node types that might contain connection data
      switch (node.type) {
        case 'tag':
          if (node.attrs?.text || node.attrs?.tag) {
            connections.tags.push(node.attrs.text || node.attrs.tag);
          }
          break;
          
        case 'mention':
          if (node.attrs?.text || node.attrs?.mention) {
            connections.mentions.push(node.attrs.text || node.attrs.mention);
          }
          break;
          
        case 'wikilink':
          if (node.attrs?.text || node.attrs?.link) {
            connections.links.push(node.attrs.text || node.attrs.link);
          }
          break;
          
        case 'backlink':
          if (node.attrs?.text || node.attrs?.backlink) {
            connections.backlinks.push(node.attrs.text || node.attrs.backlink);
          }
          break;
          
        case 'entity':
          if (node.attrs?.kind && node.attrs?.label) {
            connections.entities.push({
              kind: node.attrs.kind,
              label: node.attrs.label,
              attributes: node.attrs.attributes ? JSON.parse(node.attrs.attributes) : undefined
            });
          }
          break;
          
        case 'triple':
          if (node.attrs?.subjectKind && node.attrs?.subjectLabel && 
              node.attrs?.predicate && node.attrs?.objectKind && node.attrs?.objectLabel) {
            connections.triples.push({
              subject: {
                kind: node.attrs.subjectKind,
                label: node.attrs.subjectLabel
              },
              predicate: node.attrs.predicate,
              object: {
                kind: node.attrs.objectKind,
                label: node.attrs.objectLabel
              }
            });
          }
          break;
          
        case 'text':
          // Fallback: still detect raw syntax in plain text for migration
          const text = node.text || '';
          
          // Extract raw tags
          const tagMatches = text.match(/#(\w+)/g);
          if (tagMatches) {
            tagMatches.forEach((match: string) => {
              const tag = match.slice(1);
              if (!connections.tags.includes(tag)) {
                connections.tags.push(tag);
              }
            });
          }
          
          // Extract raw mentions
          const mentionMatches = text.match(/@(\w+)/g);
          if (mentionMatches) {
            mentionMatches.forEach((match: string) => {
              const mention = match.slice(1);
              if (!connections.mentions.includes(mention)) {
                connections.mentions.push(mention);
              }
            });
          }
          
          // Extract raw wiki links
          const linkMatches = text.match(/\[\[\s*([^\]\s|][^\]|]*?)\s*(?:\|[^\]]*)?\]\]/g);
          if (linkMatches) {
            linkMatches.forEach((match: string) => {
              const linkMatch = match.match(/\[\[\s*([^\]\s|][^\]|]*?)\s*(?:\|[^\]]*)?\]\]/);
              if (linkMatch) {
                const link = linkMatch[1].trim();
                if (!connections.links.includes(link)) {
                  connections.links.push(link);
                }
              }
            });
          }
          
          // Extract raw backlinks
          const backlinkMatches = text.match(/<<\s*([^>\s|][^>|]*?)\s*(?:\|[^>]*)?>>/g);
          if (backlinkMatches) {
            backlinkMatches.forEach((match: string) => {
              const backlinkMatch = match.match(/<<\s*([^>\s|][^>|]*?)\s*(?:\|[^>]*)?>>/);
              if (backlinkMatch) {
                const backlink = backlinkMatch[1].trim();
                if (!connections.backlinks.includes(backlink)) {
                  connections.backlinks.push(backlink);
                }
              }
            });
          }
          break;
      }
    }
    
    // Recursively process content array (nested nodes)
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(walkNode);
    }
  };

  // Walk through the document content
  if (document && document.content && Array.isArray(document.content)) {
    document.content.forEach(walkNode);
  }
  
  // Remove duplicates
  connections.tags = [...new Set(connections.tags)];
  connections.mentions = [...new Set(connections.mentions)];
  connections.links = [...new Set(connections.links)];
  connections.backlinks = [...new Set(connections.backlinks)];
  
  return connections;
}

/**
 * Check if a TipTap document contains any raw (unconverted) entity syntax
 */
export function hasRawEntitySyntax(document: any): boolean {
  if (!document || !document.content || !Array.isArray(document.content)) return false;
  
  const checkNode = (node: any): boolean => {
    if (node.type === 'text' && node.text) {
      const text = node.text;
      // Check for any raw entity patterns
      if (
        /\[[\w]+\|[^\]]+\]/.test(text) ||           // Entity syntax
        /\[\[\s*[^\]]+\s*\]\]/.test(text) ||        // Wiki links
        /<<\s*[^>]+\s*>>/.test(text) ||             // Backlinks
        /#\w+/.test(text) ||                        // Tags
        /@\w+/.test(text) ||                        // Mentions
        /\[[\w]+\|[^\]]+\]\s*\([^)]+\)\s*\[[\w]+\|[^\]]+\]/.test(text) // Triples
      ) {
        return true;
      }
    }
    
    // Check nested content
    if (node.content && Array.isArray(node.content)) {
      return node.content.some(checkNode);
    }
    
    return false;
  };
  
  return document.content.some(checkNode);
}
