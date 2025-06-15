
import { Node } from '@tiptap/core';

export const Backlink = Node.create({
  name: 'backlink',

  group: 'inline',

  inline: true,

  addAttributes() {
    return {
      target: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-target]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { target } = HTMLAttributes;
    return ['span', { 
      'data-target': target,
      class: 'bg-gray-100 text-gray-700 px-1 rounded text-sm font-medium border inline-block mx-1',
      ...HTMLAttributes 
    }, `<<${target}>>`];
  },

  addNodeView() {
    return ({ HTMLAttributes }) => {
      const span = document.createElement('span');
      const { target } = HTMLAttributes;
      span.className = 'bg-gray-100 text-gray-700 px-1 rounded text-sm font-medium border inline-block mx-1';
      span.setAttribute('data-target', target);
      span.textContent = `<<${target}>>`;
      return {
        dom: span,
      };
    };
  },
});
