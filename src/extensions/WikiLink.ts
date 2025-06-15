
import { Node } from '@tiptap/core';

export const WikiLink = Node.create({
  name: 'wikilink',

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
        tag: 'span[data-wikilink]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { target } = HTMLAttributes;
    return ['span', { 
      'data-wikilink': target,
      class: 'bg-purple-100 text-purple-800 px-1 rounded text-sm font-medium border inline-block mx-1 cursor-pointer hover:bg-purple-200',
      ...HTMLAttributes 
    }, `[[${target}]]`];
  },

  addNodeView() {
    return ({ HTMLAttributes }) => {
      const span = document.createElement('span');
      const { target } = HTMLAttributes;
      span.className = 'bg-purple-100 text-purple-800 px-1 rounded text-sm font-medium border inline-block mx-1 cursor-pointer hover:bg-purple-200';
      span.setAttribute('data-wikilink', target);
      span.textContent = `[[${target}]]`;
      return {
        dom: span,
      };
    };
  },
});
