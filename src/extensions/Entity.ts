
import { Node } from '@tiptap/core';

export const Entity = Node.create({
  name: 'entity',

  group: 'inline',

  inline: true,

  addAttributes() {
    return {
      kind: {
        default: null,
      },
      label: {
        default: null,
      },
      attributes: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-entity]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { kind, label, attributes } = HTMLAttributes;
    const attrStr = attributes ? `|${JSON.stringify(attributes)}` : '';
    return ['span', { 
      'data-entity': kind,
      class: 'bg-green-100 text-green-800 px-1 rounded text-sm font-medium inline-block mx-1',
      ...HTMLAttributes 
    }, `[${kind}|${label}${attrStr}]`];
  },

  addNodeView() {
    return ({ HTMLAttributes }) => {
      const span = document.createElement('span');
      const { kind, label, attributes } = HTMLAttributes;
      const attrStr = attributes ? `|${JSON.stringify(attributes)}` : '';
      span.className = 'bg-green-100 text-green-800 px-1 rounded text-sm font-medium inline-block mx-1';
      span.setAttribute('data-entity', kind);
      span.textContent = `[${kind}|${label}${attrStr}]`;
      return {
        dom: span,
      };
    };
  },
});
