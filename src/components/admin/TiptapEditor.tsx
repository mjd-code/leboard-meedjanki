'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered, Quote, Undo, Redo, Link as LinkIcon, ImageIcon, X, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';

// Stub for storage service - In production, this would upload to Firebase Storage
async function uploadFileToStorage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new globalThis.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1200;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', 0.8));
        } else {
          resolve(event.target?.result as string);
        }
      };
      if (event.target?.result) img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Custom Extension to center image
const CenteredImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: 'mx-auto rounded-lg shadow-sm border border-border object-cover max-w-full',
      },
    };
  },
});

export function TiptapEditor({ content, onChange }: { content: string, onChange: (html: string) => void }) {
  const [showMediaManager, setShowMediaManager] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      CenteredImage,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Tulis ceritamu di sini...' })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      // Auto-save to localStorage
      localStorage.setItem('ppmh_insight_draft', editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4 bg-base-50 rounded-b-xl border-x border-b border-border'
      }
    }
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  const handleApplyMedia = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setShowMediaManager(false);
      setImageUrl('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const url = await uploadFileToStorage(file);
        setImageUrl(url);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const MenuBar = () => {
    return (
      <div className="flex flex-wrap items-center gap-1 p-2 bg-base-100 border border-border rounded-t-xl border-b-0 relative">
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-secondary' : ''}><Bold className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-secondary' : ''}><Italic className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'bg-secondary' : ''}><Strikethrough className="w-4 h-4" /></Button>
        <div className="w-[1px] h-6 bg-border mx-1" />
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'bg-secondary' : ''}><Heading1 className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'bg-secondary' : ''}><Heading2 className="w-4 h-4" /></Button>
        <div className="w-[1px] h-6 bg-border mx-1" />
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'bg-secondary' : ''}><List className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'bg-secondary' : ''}><ListOrdered className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'bg-secondary' : ''}><Quote className="w-4 h-4" /></Button>
        <div className="w-[1px] h-6 bg-border mx-1" />
        <Button variant="ghost" size="icon" onClick={() => {
            const url = window.prompt('URL Tautan:');
            if (url === null) return;
            if (url === '') editor.chain().focus().extendMarkRange('link').unsetLink().run();
            else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }} className={editor.isActive('link') ? 'bg-secondary' : ''}><LinkIcon className="w-4 h-4" /></Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowMediaManager(!showMediaManager)}
          className={showMediaManager ? 'bg-secondary' : ''}
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
        
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo className="w-4 h-4" /></Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full shadow-soft rounded-xl overflow-visible relative z-10">
      <MenuBar />
      {showMediaManager && (
        <div className="absolute top-14 left-4 right-4 bg-card border border-border shadow-2xl rounded-2xl p-4 z-50 flex flex-col gap-4 mx-auto max-w-sm">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm text-foreground">Media Manager</h4>
            <button onClick={() => setShowMediaManager(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <input 
              type="text" 
              placeholder="Paste Image URL here..." 
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring focus:ring-primary/50"
            />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">atau upload</span>
              </div>
            </div>
            <label className="flex items-center justify-center gap-2 w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors cursor-pointer border border-border border-dashed relative">
              {isUploading ? 'Uploading...' : <><Upload className="w-4 h-4"/> Pilih File Local</>}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </label>
          </div>
          <Button onClick={handleApplyMedia} disabled={!imageUrl || isUploading} className="w-full rounded-xl mt-1">
            Sisipkan Gambar
          </Button>
        </div>
      )}
      <EditorContent editor={editor} className="flex-1 min-h-[300px]" />
    </div>
  );
}
