
import { Extension } from '@tiptap/core';
import { InputRule } from '@tiptap/core';

// Fixed regex patterns - removed $ anchors that cause issues
const TAG_REGEX = /#([a-zA-Z0-9_]+)\s/;
const MENTION_REGEX = /@([a-zA-Z0-9_]+)\s/;
const LINK_REGEX = /\[\[\s*([^\]\s|][^\]|]*?)\s*(?:\|[^\]]*)?\]\]\s/;
const ENTITY_REGEX = /\[([A-Za-z0-9_]+)\|([^\]]+?)(?:\|({.*?}))?\]\s/;
const TRIPLE_REGEX = /\[([A-Za-z0-9_]+)\|([^\]]+?)(?:\|({.*?}))?\]\s*\(([A-Za-z0-9_]+)\)\s*\[([A-Za-z0-9_]+)\|([^\]]+?)(?:\|({.*?}))?\]\s/;
const BACKLINK_REGEX = /<<\s*([^>\s|][^>|]*?)\s*(?:\|[^>]*?)?>>\s/;

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
          const tr = state.tr.replaceRangeWith(range.from, range.to - 1, node);
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
          const tr = state.tr.replaceRangeWith(range.from, range.to - 1, node);
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
          const tr = state.tr.replaceRangeWith(range.from, range.to - 1, node);
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

      // 5️⃣ [[Wiki Links]]
      new InputRule({
        find: LINK_REGEX,
        handler: ({ state, range, match }) => {
          const markType = schema.marks.link;
          if (!markType) return null;

          const mark = markType.create({
            href: `/wiki/${encodeURIComponent(match[1])}`,
            target: '_blank',
          });
          const tr = state.tr
            .addMark(range.from, range.to - 1, mark);
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
          const tr = state.tr.replaceRangeWith(range.from, range.to - 1, node);
          return tr;
        },
      }),
    ];
  },
});
