
import { Node } from '@tiptap/core';

export const Tag = Node.create({
  name: 'tag',

  group: 'inline',

  inline: true,

  addAttributes() {
    return {
      tag: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-tag]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { tag } = HTMLAttributes;
    return ['span', { 
      'data-tag': tag,
      class: 'bg-blue-100 text-blue-800 px-1 rounded text-sm font-medium inline-block mx-1',
      ...HTMLAttributes 
    }, `#${tag}`];
  },

  addNodeView() {
    return ({ HTMLAttributes }) => {
      const span = document.createElement('span');
      const { tag } = HTMLAttributes;
      span.className = 'bg-blue-100 text-blue-800 px-1 rounded text-sm font-medium inline-block mx-1';
      span.setAttribute('data-tag', tag);
      span.textContent = `#${tag}`;
      return {
        dom: span,
      };
    };
  },
});
