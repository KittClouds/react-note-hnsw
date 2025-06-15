
import { Extension } from '@tiptap/core';
import { markInputRule, nodeInputRule } from '@tiptap/pm/inputrules';

// Regex library - updated for TipTap input rules (must match at end of line)
const TAG_REGEX = /#([a-zA-Z0-9_]+)$/;
const MENTION_REGEX = /@([a-zA-Z0-9_]+)$/;
const LINK_REGEX = /\[\[\s*([^\]\s|][^\]|]*?)\s*(?:\|[^\]]*)?\]\]$/;
const ENTITY_REGEX = /\[([A-Za-z0-9_]+)\|([^\]]+?)(?:\|({.*?}))?\]$/;
const TRIPLE_REGEX = /\[([A-Za-z0-9_]+)\|([^\]]+?)(?:\|({.*?}))?\]\s*\(([A-Za-z0-9_]+)\)\s*\[([A-Za-z0-9_]+)\|([^\]]+?)(?:\|({.*?}))?\]$/;
const BACKLINK_REGEX = /<<\s*([^>\s|][^>|]*?)\s*(?:\|[^>]*)?>>$/;

export const NoteSyntax = Extension.create({
  name: 'noteSyntax',

  addInputRules() {
    const { schema } = this.editor;

    return [
      // 1️⃣ Triple patterns (must come first to avoid conflicts)
      nodeInputRule({
        find: TRIPLE_REGEX,
        type: schema.nodes.triple,
        getAttributes: (match) => {
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
          
          return { subject, predicate, object };
        },
      }),

      // 2️⃣ Entity patterns
      nodeInputRule({
        find: ENTITY_REGEX,
        type: schema.nodes.entity,
        getAttributes: (match) => ({
          kind: match[1],
          label: match[2],
          attributes: match[3] ? JSON.parse(match[3]) : undefined,
        }),
      }),

      // 3️⃣ #tags
      markInputRule({
        find: TAG_REGEX,
        type: schema.marks.tag,
        getAttributes: (match) => ({ tag: match[1] }),
      }),

      // 4️⃣ @mentions (reuse existing mention mark)
      markInputRule({
        find: MENTION_REGEX,
        type: schema.marks.mention,
        getAttributes: (match) => ({ id: match[1] }),
      }),

      // 5️⃣ [[Wiki Links]]
      markInputRule({
        find: LINK_REGEX,
        type: schema.marks.link,
        getAttributes: (match) => ({
          href: `/wiki/${encodeURIComponent(match[1])}`,
          target: '_blank',
        }),
      }),

      // 6️⃣ <<Backlinks>>
      markInputRule({
        find: BACKLINK_REGEX,
        type: schema.marks.backlink,
        getAttributes: (match) => ({ target: match[1] }),
      }),
    ];
  },
});
