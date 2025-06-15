
import { Node } from '@tiptap/core';

export const Triple = Node.create({
  name: 'triple',

  group: 'inline',

  inline: true,

  addAttributes() {
    return {
      subject: {
        default: null,
      },
      predicate: {
        default: null,
      },
      object: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-triple]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { subject, predicate, object } = HTMLAttributes;
    if (!subject || !predicate || !object) return ['span', {}];
    
    const subjectStr = `[${subject.kind}|${subject.label}${subject.attrs ? `|${JSON.stringify(subject.attrs)}` : ''}]`;
    const objectStr = `[${object.kind}|${object.label}${object.attrs ? `|${JSON.stringify(object.attrs)}` : ''}]`;
    
    return ['span', { 
      'data-triple': 'true',
      class: 'bg-purple-100 text-purple-800 px-1 rounded text-sm font-medium inline-block mx-1',
      ...HTMLAttributes 
    }, `${subjectStr} (${predicate}) ${objectStr}`];
  },

  addNodeView() {
    return ({ HTMLAttributes }) => {
      const span = document.createElement('span');
      const { subject, predicate, object } = HTMLAttributes;
      
      if (subject && predicate && object) {
        const subjectStr = `[${subject.kind}|${subject.label}${subject.attrs ? `|${JSON.stringify(subject.attrs)}` : ''}]`;
        const objectStr = `[${object.kind}|${object.label}${object.attrs ? `|${JSON.stringify(object.attrs)}` : ''}]`;
        span.textContent = `${subjectStr} (${predicate}) ${objectStr}`;
      }
      
      span.className = 'bg-purple-100 text-purple-800 px-1 rounded text-sm font-medium inline-block mx-1';
      span.setAttribute('data-triple', 'true');
      
      return {
        dom: span,
      };
    };
  },
});
