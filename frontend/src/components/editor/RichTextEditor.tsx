'use client';

import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Button from '@/components/ui/Button';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something...',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'tiptap-editor min-h-[180px] px-3 py-2.5 text-sm text-slate-800 focus:outline-none',
      },
    },
    onUpdate: ({ editor: tiptapEditor }) => {
      onChange(tiptapEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || '') !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  const toolbarButton = (label: string, active: boolean, onClick: () => void) => (
    <Button
      type="button"
      size="sm"
      variant={active ? 'primary' : 'outline'}
      className="min-w-[44px] px-2"
      onClick={onClick}
    >
      {label}
    </Button>
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-2">
        {toolbarButton('B', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {toolbarButton('I', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {toolbarButton('H2', editor.isActive('heading', { level: 2 }), () =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        )}
        {toolbarButton('UL', editor.isActive('bulletList'), () =>
          editor.chain().focus().toggleBulletList().run()
        )}
        {toolbarButton('OL', editor.isActive('orderedList'), () =>
          editor.chain().focus().toggleOrderedList().run()
        )}
        {toolbarButton('"', editor.isActive('blockquote'), () =>
          editor.chain().focus().toggleBlockquote().run()
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
