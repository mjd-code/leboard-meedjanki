import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { cn } from "@/shared/lib";

interface MarkdownRendererProps {
  content: string;
  onWikilinkClick?: (target: string) => void;
  onTagClick?: (tag: string) => void;
  className?: string;
}

export const MarkdownRenderer = ({ 
  content, 
  onWikilinkClick,
  onTagClick,
  className 
}: MarkdownRendererProps) => {
  
  // Process wikilinks
  const processedContent = content.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (match, target, alias) => {
      const displayText = alias || target;
      return `<span class="wikilink" data-target="${target.trim()}">${displayText}</span>`;
    }
  );

  // Process tags
  const processedWithTags = processedContent.replace(
    /#([\w-]+)/g,
    (match, tag) => {
      return `<span class="hashtag" data-tag="${tag}">${match}</span>`;
    }
  );

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Handle wikilink clicks
    if (target.classList.contains('wikilink')) {
      e.preventDefault();
      const linkTarget = target.getAttribute('data-target');
      if (linkTarget && onWikilinkClick) {
        onWikilinkClick(linkTarget);
      }
    }
    
    // Handle tag clicks
    if (target.classList.contains('hashtag')) {
      e.preventDefault();
      const tag = target.getAttribute('data-tag');
      if (tag && onTagClick) {
        onTagClick(tag);
      }
    }
  };

  return (
    <div 
      className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
      onClick={handleClick}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Custom checkbox rendering
          input: ({ node, ...props }) => {
            if (props.type === 'checkbox') {
              return (
                <input
                  {...props}
                  className="mr-2 rounded border-border"
                  disabled
                />
              );
            }
            return <input {...props} />;
          },
          // Custom link rendering
          a: ({ node, ...props }) => (
            <a 
              {...props} 
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          // Custom code block rendering
          code: ({ node, className, children, ...props }) => {
            const isInline = !className?.includes('language-');
            return isInline ? (
              <code {...props} className="bg-muted px-1.5 py-0.5 rounded text-sm">
                {children}
              </code>
            ) : (
              <code {...props} className="block bg-muted p-4 rounded-lg overflow-x-auto">
                {children}
              </code>
            );
          },
        }}
      >
        {processedWithTags}
      </ReactMarkdown>
    </div>
  );
};
