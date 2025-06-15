
import { Mark } from '@tiptap/core';

export const Tag = Mark.create({
  name: 'tag',

  addAttributes() {
    return {
      tag: {
        default: null,
        parseHTML: element => element.getAttribute('data-tag'),
        renderHTML: attributes => {
          if (!attributes.tag) {
            return {};
          }
          return {
            'data-tag': attributes.tag,
          };
        },
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
    return ['span', { 
      'data-tag': HTMLAttributes.tag,
      class: 'bg-blue-100 text-blue-800 px-1 rounded text-sm font-medium',
      ...HTMLAttributes 
    }, `#${HTMLAttributes.tag}`];
  },
});
