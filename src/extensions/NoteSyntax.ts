import { Extension } from '@tiptap/core';
import { InputRule } from '@tiptap/core';
import {
  markPasteRule,
  nodePasteRule,
  PasteRule,
} from '@tiptap/core';

// Fixed regex patterns for input rules - removed $ anchors that cause issues
const TAG_REGEX = /#([a-zA-Z0-9_]+)\s/;
const MENTION_REGEX = /@([a-zA-Z0-9_]+)\s/;
const LINK_REGEX = /\[\[\s*([^\]\s|][^\]|]*?)\s*(?:\|[^\]]*)?\]\]\s/;
const ENTITY_REGEX = /\[([A-Za-z0-9_]+)\|([^\]]+?)(?:\|({.*?}))?\]\s/;
const TRIPLE_REGEX = /\[([A-Za-z0-9_]+)\|([^\]]+?)(?:\|({.*?}))?\]\s*\(([A-Za-z0-9_]+)\)\s*\[([A-Za-z0-9_]+)\|([^\]]+?)(?:\|({.*?}))?\]\s/;
const BACKLINK_REGEX = /<<\s*([^>\s|][^>|]*?)\s*(?:\|[^>]*?)?>>\s/;

// Regexes for PASTE – no whitespace at the end, global flag enabled
const TAG_PASTE = /#([a-zA-Z0-9_]+)/g;
const MENTION_PASTE = /@([a-zA-Z0-9_]+)/g;
const LINK_PASTE = /\[\[\s*([^\]\s|][^\]|]*?)\s*(?:\|[^\]]*)?\]\]/g;
const ENTITY_PASTE = /\[([A-Za-z0-9_]+)\|([^\]]+?)(?:\|({.*?}))?\]/g;
const TRIPLE_PASTE = /\[([A-Za-z0-9_]+)\|([^\]]+?)(?:\|({.*?}))?\]\s*\(([A-Za-z0-9_]+)\)\s*\[([A-Za-z0-9_]+)\|([^\]]+?)(?:\|({.*?}))?\]/g;
const BACKLINK_PASTE = /<<\s*([^>\s|][^>|]*?)\s*(?:\|[^>]*)?>>/g;

export const NoteSyntax = Extension.create({
  name: 'noteSyntax',

  addInputRules() {
    const { schema } = this.editor;

    return [
      // 1️⃣ Triple patterns (must come first to avoid conflicts)
      new InputRule({
        find: TRIPLE_REGEX,
        handler: ({ state, range, match }) => {
          const subject = {
            kind: match[1],
            label: match[2],
            attrs: match[3] ? JSON.parse(match[3]) : undefined,
          };
          const predicate = match[4];
          const object = {
            kind: match[5],
            label: match[6],
            attrs: match[7] ? JSON.parse(match[7]) : undefined,
          };
          
          const nodeType = schema.nodes.triple;
          if (!nodeType) return null;

          const node = nodeType.create({ subject, predicate, object });
          const tr = state.tr.replaceRangeWith(range.from, range.to, node);
          return tr;
        },
      }),

      // 2️⃣ Entity patterns
      new InputRule({
        find: ENTITY_REGEX,
        handler: ({ state, range, match }) => {
          const nodeType = schema.nodes.entity;
          if (!nodeType) return null;

          const node = nodeType.create({
            kind: match[1],
            label: match[2],
            attributes: match[3] ? JSON.parse(match[3]) : undefined,
          });
          const tr = state.tr.replaceRangeWith(range.from, range.to, node);
          return tr;
        },
      }),

      // 3️⃣ #tags
      new InputRule({
        find: TAG_REGEX,
        handler: ({ state, range, match }) => {
          const nodeType = schema.nodes.tag;
          if (!nodeType) return null;

          const node = nodeType.create({ tag: match[1] });
          const tr = state.tr.replaceRangeWith(range.from, range.to, node);
          return tr;
        },
      }),

      // 4️⃣ @mentions (reuse existing mention mark)
      new InputRule({
        find: MENTION_REGEX,
        handler: ({ state, range, match }) => {
          const markType = schema.marks.mention;
          if (!markType) return null;

          const mark = markType.create({ id: match[1] });
          const tr = state.tr
            .addMark(range.from, range.to - 1, mark);
          return tr;
        },
      }),

      // 5️⃣ [[Wiki Links]] - now using WikiLink node
      new InputRule({
        find: LINK_REGEX,
        handler: ({ state, range, match }) => {
          const nodeType = schema.nodes.wikilink;
          if (!nodeType) return null;

          const node = nodeType.create({ target: match[1] });
          const tr = state.tr.replaceRangeWith(range.from, range.to, node);
          return tr;
        },
      }),

      // 6️⃣ <<Backlinks>>
      new InputRule({
        find: BACKLINK_REGEX,
        handler: ({ state, range, match }) => {
          const nodeType = schema.nodes.backlink;
          if (!nodeType) return null;

          const node = nodeType.create({ target: match[1] });
          const tr = state.tr.replaceRangeWith(range.from, range.to, node);
          return tr;
        },
      }),
    ];
  },

  addPasteRules() {
    const { schema } = this.editor;

    return [
      // 1️⃣ Triples – most specific first
      nodePasteRule({
        find: TRIPLE_PASTE,
        type: schema.nodes.triple,
        getAttributes: match => ({
          subject: { 
            kind: match[1], 
            label: match[2], 
            attrs: match[3] ? JSON.parse(match[3]) : undefined 
          },
          predicate: match[4],
          object: { 
            kind: match[5], 
            label: match[6], 
            attrs: match[7] ? JSON.parse(match[7]) : undefined 
          },
        }),
      }),

      // 2️⃣ Entities
      nodePasteRule({
        find: ENTITY_PASTE,
        type: schema.nodes.entity,
        getAttributes: m => ({
          kind: m[1],
          label: m[2],
          attributes: m[3] ? JSON.parse(m[3]) : undefined,
        }),
      }),

      // 3️⃣ #tags
      nodePasteRule({
        find: TAG_PASTE,
        type: schema.nodes.tag,
        getAttributes: m => ({ tag: m[1] }),
      }),

      // 4️⃣ @mentions (mark)
      markPasteRule({
        find: MENTION_PASTE,
        type: schema.marks.mention,
        getAttributes: m => ({ id: m[1] }),
      }),

      // 5️⃣ [[WikiLinks]]
      nodePasteRule({
        find: LINK_PASTE,
        type: schema.nodes.wikilink,
        getAttributes: m => ({ target: m[1] }),
      }),

      // 6️⃣ <<backlinks>>
      nodePasteRule({
        find: BACKLINK_PASTE,
        type: schema.nodes.backlink,
        getAttributes: m => ({ target: m[1] }),
      }),
    ] as PasteRule[];
  },
});
