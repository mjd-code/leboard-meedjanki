import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { 
  X, Trash2, Save, Folder, FileText, Eye, Code, Split, 
  Image, Music, Video, Link2, Play, Pause, Volume2, VolumeX, 
  Maximize2, MoreHorizontal, Clock, Hash, ChevronDown, ChevronRight,
  Maximize, Minimize, PenLine
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { MarkdownRenderer } from "@/features/graph/MarkdownRenderer";
import { MarkdownView } from "@/features/editor/MarkdownView";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Slider } from "@/shared/ui/slider";
import { cn } from "@/shared/lib";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";

interface Node {
  id: string;
  name: string;
  content: string;
  type: "folder" | "file" | "media";
  parentId: string | null;
  depth: number;
  tags: string[];
  mediaType?: "image" | "audio" | "video";
  dataUrl?: string;
  mimeType?: string;
}

interface Backlink {
  nodeId: string;
  nodeName: string;
  nodePath?: string;
  isWikilink: boolean;
}

interface NodePanelProps {
  node: Node | null;
  nodePath?: string;
  onClose: () => void;
  onUpdate: (node: Node) => void;
  onDelete: (nodeId: string) => void;
  backlinks?: Backlink[];
  onWikilinkClick?: (target: string) => void;
  onBacklinkClick?: (nodeId: string) => void;
  onTagClick?: (tag: string) => void;
  autoSaveDelay?: number;
}

// Minimal Media Player Component
const MediaPreview = ({ node }: { node: Node }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    const media = node.mediaType === "audio" ? audioRef.current : videoRef.current;
    if (media) {
      if (isPlaying) {
        media.pause();
      } else {
        media.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    const media = node.mediaType === "audio" ? audioRef.current : videoRef.current;
    if (media) {
      media.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    const media = node.mediaType === "audio" ? audioRef.current : videoRef.current;
    if (media) {
      setCurrentTime(media.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const media = node.mediaType === "audio" ? audioRef.current : videoRef.current;
    if (media) {
      setDuration(media.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    const media = node.mediaType === "audio" ? audioRef.current : videoRef.current;
    if (media) {
      media.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (container) {
      if (!document.fullscreenElement) {
        container.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  if (node.mediaType === "image") {
    return (
      <div className="rounded-lg overflow-hidden bg-muted/30">
        <img
          src={node.dataUrl}
          alt={node.name}
          className="w-full h-auto max-h-[50vh] object-contain"
        />
      </div>
    );
  }

  if (node.mediaType === "audio") {
    return (
      <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 p-8">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <Music className="w-10 h-10 text-primary" />
          </div>
          <audio
            ref={audioRef}
            src={node.dataUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          <div className="w-full max-w-sm space-y-4">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button size="icon" className="h-12 w-12 rounded-full" onClick={togglePlay}>
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (node.mediaType === "video") {
    return (
      <div className="relative rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={node.dataUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          className="w-full max-h-[50vh]"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full mb-3"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:text-white hover:bg-white/20" onClick={togglePlay}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:text-white hover:bg-white/20" onClick={toggleMute}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <span className="text-xs text-white/80">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:text-white hover:bg-white/20" onClick={handleFullscreen}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Node type icon helper
const getNodeIcon = (node: Node) => {
  if (node.type === "folder") return <Folder className="w-4 h-4 text-yellow-500" />;
  if (node.type === "media") {
    switch (node.mediaType) {
      case "image": return <Image className="w-4 h-4 text-emerald-500" />;
      case "audio": return <Music className="w-4 h-4 text-violet-500" />;
      case "video": return <Video className="w-4 h-4 text-rose-500" />;
    }
  }
  return <FileText className="w-4 h-4 text-primary" />;
};

// Backlinks Panel Component - Collapsible with full paths
const BacklinksSection = ({ 
  backlinks, 
  onBacklinkClick 
}: { 
  backlinks: Backlink[]; 
  onBacklinkClick: (nodeId: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const explicitLinks = backlinks.filter(b => b.isWikilink);
  const mentions = backlinks.filter(b => !b.isWikilink);

  if (backlinks.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-8 pt-6 border-t border-border/50">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Link2 className="w-4 h-4" />
          <span>Backlinks</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {backlinks.length}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        <div className="space-y-4">
          {explicitLinks.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Linked mentions ({explicitLinks.length})
              </h4>
              <div className="space-y-1">
                {explicitLinks.map((link) => (
                  <button
                    key={link.nodeId}
                    onClick={() => onBacklinkClick(link.nodeId)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                  >
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{link.nodeName}</span>
                      {link.nodePath && link.nodePath !== link.nodeName && (
                        <span className="text-xs text-muted-foreground truncate">{link.nodePath}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {mentions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Unlinked mentions ({mentions.length})
              </h4>
              <div className="space-y-1">
                {mentions.map((link) => (
                  <button
                    key={link.nodeId}
                    onClick={() => onBacklinkClick(link.nodeId)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left opacity-70 hover:opacity-100 group"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm truncate">{link.nodeName}</span>
                      {link.nodePath && link.nodePath !== link.nodeName && (
                        <span className="text-xs text-muted-foreground truncate">{link.nodePath}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const NodePanel = ({ 
  node, 
  nodePath,
  onClose, 
  onUpdate, 
  onDelete,
  backlinks = [],
  onWikilinkClick,
  onBacklinkClick,
  onTagClick,
  autoSaveDelay = 1500,
}: NodePanelProps) => {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [editorMode, setEditorMode] = useState<"source" | "live" | "preview" | "split">("live");
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"wide" | "narrow">("wide");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastNodeIdRef = useRef<string | null>(null);

  // Initialize state when node changes
  useEffect(() => {
    if (node) {
      // Only reset if it's a different node
      if (lastNodeIdRef.current !== node.id) {
        setName(node.name);
        setContent(node.content);
        setTags(node.tags || []);
        setHasChanges(false);
        lastNodeIdRef.current = node.id;
      }
    }
  }, [node?.id]);

  // Update from node prop when it changes externally (but same node)
  useEffect(() => {
    if (node && lastNodeIdRef.current === node.id && !hasChanges) {
      setName(node.name);
      setContent(node.content);
      setTags(node.tags || []);
    }
  }, [node]);

  // Track changes
  useEffect(() => {
    if (node && lastNodeIdRef.current === node.id) {
      const hasNameChange = name !== node.name;
      const hasContentChange = content !== node.content;
      const hasTagsChange = JSON.stringify(tags) !== JSON.stringify(node.tags || []);
      setHasChanges(hasNameChange || hasContentChange || hasTagsChange);
    }
  }, [name, content, tags, node]);

  // Auto-save with debounce
  useEffect(() => {
    if (hasChanges && node && autoSaveDelay > 0) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer for auto-save
      autoSaveTimerRef.current = setTimeout(() => {
        handleSave(true);
      }, autoSaveDelay);

      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
      };
    }
  }, [hasChanges, name, content, tags, autoSaveDelay]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  if (!node) return null;

  const handleSave = useCallback((isAutoSave = false) => {
    if (!node || isSaving) return;
    
    setIsSaving(true);
    onUpdate({
      ...node,
      name,
      content,
      tags,
    });
    setHasChanges(false);
    setIsSaving(false);
    
    if (!isAutoSave) {
      toast.success("Saved");
    }
  }, [node, name, content, tags, onUpdate, isSaving]);

  const handleDelete = () => {
    onDelete(node.id);
    onClose();
    toast.success("Deleted");
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const copyEmbedLink = () => {
    const embedSyntax = node.mediaType === "image" 
      ? `![[${node.name}]]`
      : `[[${node.name}]]`;
    navigator.clipboard.writeText(embedSyntax);
    toast.success("Link copied");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) handleSave(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, handleSave]);

  // Display path or fallback to node type
  const displayPath = nodePath || (node.type === "folder" ? "Folder" : node.type === "media" ? node.mediaType : "Note");

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Header with full path */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getNodeIcon(node)}
          <span className="text-xs text-muted-foreground truncate font-mono" title={displayPath}>
            {displayPath}
          </span>
          {hasChanges && (
            <span className="text-xs text-amber-500/80 shrink-0">• Unsaved</span>
          )}
          {isSaving && (
            <span className="text-xs text-muted-foreground/60 shrink-0">Saving...</span>
          )}
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          {/* Layout toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setLayoutMode(layoutMode === "wide" ? "narrow" : "wide")}
            title={layoutMode === "wide" ? "Switch to narrow layout" : "Switch to wide layout"}
          >
            {layoutMode === "wide" ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </Button>

          {node.type === "file" && (
            <div className="flex items-center border border-border/40 rounded-md p-0.5 ml-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs",
                  editorMode === "source" && "bg-secondary"
                )}
                onClick={() => setEditorMode("source")}
                title="Source mode"
              >
                <Code className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs",
                  editorMode === "live" && "bg-secondary"
                )}
                onClick={() => setEditorMode("live")}
                title="Live preview"
              >
                <PenLine className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs",
                  editorMode === "preview" && "bg-secondary"
                )}
                onClick={() => setEditorMode("preview")}
              >
                <Eye className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs",
                  editorMode === "split" && "bg-secondary"
                )}
                onClick={() => setEditorMode("split")}
              >
                <Split className="w-3 h-3" />
              </Button>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {node.type === "media" && (
                <DropdownMenuItem onClick={copyEmbedLink}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Copy embed link
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleSave(false)} disabled={!hasChanges}>
                <Save className="w-4 h-4 mr-2" />
                Save changes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <ScrollArea className="flex-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        <div className={cn(
          "mx-auto px-6 py-6 transition-all duration-200",
          layoutMode === "wide" ? "max-w-none" : "max-w-3xl"
        )}>
          {/* Title Input - Notion style */}
          <Input
            ref={titleInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={node.type === "folder" ? "Untitled folder" : "Untitled"}
            className="text-2xl font-semibold bg-transparent border-none shadow-none px-0 h-auto py-2 placeholder:text-muted-foreground/30 focus-visible:ring-0 focus:outline-none"
          />

          {/* Properties Section */}
          <Collapsible open={propertiesOpen} onOpenChange={setPropertiesOpen} className="mt-6">
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
              {propertiesOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Properties
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-4">
              <div className="space-y-4 text-sm">
                {/* Type & Depth */}
                <div className="flex items-center gap-6 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Level {node.depth}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-start gap-3">
                  <Hash className="w-4 h-4 text-muted-foreground mt-2" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs font-normal cursor-pointer hover:bg-destructive/20 transition-colors group px-2.5 py-1"
                          onClick={() => removeTag(tag)}
                        >
                          #{tag}
                          <X className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Badge>
                      ))}
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        onBlur={() => tagInput && addTag()}
                        placeholder={tags.length === 0 ? "Add tags..." : "+"}
                        className="h-7 w-24 text-xs bg-transparent border-none shadow-none px-2 focus-visible:ring-0 placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="h-px bg-border/40 my-6" />

          {/* Media Preview */}
          {node.type === "media" && node.dataUrl && (
            <div className="mb-8">
              <MediaPreview node={node} />
            </div>
          )}

          {/* Content Editor */}
          {node.type === "file" && (
            <div className="min-h-[50vh]">
              <MarkdownView
                value={content}
                onChange={setContent}
                showProperties

                mode={
                  editorMode === "preview"
                    ? "reading"
                    : editorMode === "live"
                      ? "live"
                      : "source"
                }
                sideBySide={editorMode === "split"}
                placeholder="Start writing..."
                onWikilinkClick={onWikilinkClick}
                onTagClick={onTagClick}
                onSave={() => handleSave(false)}
              />
            </div>
          )}

          {/* Folder Description */}
          {node.type === "folder" && (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a description for this folder..."
              className="w-full min-h-[200px] bg-transparent border-none shadow-none resize-none text-sm leading-relaxed placeholder:text-muted-foreground/30 focus:outline-none focus-visible:ring-0 focus-visible:outline-none px-1 py-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
            />
          )}

          {/* Media Notes */}
          {node.type === "media" && (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add notes about this media..."
              className="w-full min-h-[150px] bg-transparent border-none shadow-none resize-none text-sm leading-relaxed placeholder:text-muted-foreground/30 focus:outline-none focus-visible:ring-0 focus-visible:outline-none px-1 py-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
            />
          )}

          {/* Backlinks Section */}
          {(node.type === "file" || node.type === "media") && (
            <BacklinksSection 
              backlinks={backlinks}
              onBacklinkClick={onBacklinkClick || (() => {})}
            />
          )}
        </div>
      </ScrollArea>

      {/* Bottom Action Bar - Only show when there are changes */}
      {hasChanges && (
        <div className="px-6 py-4 border-t border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘S</kbd> to save
            </span>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (node) {
                    setName(node.name);
                    setContent(node.content);
                    setTags(node.tags || []);
                    setHasChanges(false);
                  }
                }}
              >
                Discard
              </Button>
              <Button size="sm" onClick={() => handleSave(false)}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
