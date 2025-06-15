
import { Mark } from '@tiptap/core';

export const Backlink = Mark.create({
  name: 'backlink',

  addAttributes() {
    return {
      target: {
        default: null,
        parseHTML: element => element.getAttribute('data-target'),
        renderHTML: attributes => {
          if (!attributes.target) {
            return {};
          }
          return {
            'data-target': attributes.target,
          };
        },
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
    return ['span', { 
      'data-target': HTMLAttributes.target,
      class: 'bg-gray-100 text-gray-700 px-1 rounded text-sm font-medium border',
      ...HTMLAttributes 
    }, `<<${HTMLAttributes.target}>>`];
  },
});
