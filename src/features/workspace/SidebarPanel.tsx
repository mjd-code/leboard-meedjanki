import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { X, ChevronRight, ChevronDown, Folder, FileText, FolderOpen, Image, Music, Video, GripVertical, FileArchive, FolderPlus, FilePlus, SortAsc, ChevronsUpDown } from "lucide-react";
import { ImportExportPanel } from "@/features/workspace/ImportExportPanel";
import { EditorSettingsPanel } from "@/features/editor/settings/EditorSettingsPanel";

import { useIsMobile } from "@/shared/hooks/useMobile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import type { RibbonTool } from "./IconRibbon";

interface Node {
  id: string;
  name: string;
  content: string;
  type: "folder" | "file" | "media";
  parentId: string | null;
  depth: number;
  tags: string[];
  mediaType?: "image" | "audio" | "video";
}

interface SidebarPanelProps {
  activeTool: RibbonTool | null;
  onClose: () => void;
  nodes: Node[];
  selectedNode: Node | null;
  onNodeSelect: (node: Node) => void;
  onNodeMove?: (nodeId: string, newParentId: string | null) => void;
  onAddNode?: (type: "folder" | "file") => void;
  isVaultMode: boolean;
  vaultName: string | null;
  vaultType?: "in-memory" | "local-folder";
  onCloseVault: () => void;
  graphConfigTrigger: React.ReactNode;
  onImportComplete?: (importedNodes: Node[], updatedNodes?: Node[]) => void;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 256;

export function SidebarPanel({
  activeTool,
  onClose,
  nodes,
  selectedNode,
  onNodeSelect,
  onNodeMove,
  onAddNode,
  isVaultMode,
  vaultName,
  onCloseVault,
  graphConfigTrigger,
  onImportComplete,
}: SidebarPanelProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [draggedNode, setDraggedNode] = useState<Node | null>(null);
  const [dragOverNode, setDragOverNode] = useState<string | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "type">("type");
  const [importExportOpen, setImportExportOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const toggleFolder = useCallback((folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleDragStart = (node: Node, e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedNode(node);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (node: Node, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (node.type === "folder" && draggedNode && draggedNode.id !== node.id) {
      setDragOverNode(node.id);
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverNode(null);
  };

  const handleDrop = (targetNode: Node, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverNode(null);

    if (!draggedNode || !onNodeMove) return;

    if (targetNode.type === "folder" && draggedNode.id !== targetNode.id) {
      let current: Node | undefined = targetNode;
      let isDescendant = false;

      while (current && current.parentId) {
        if (current.parentId === draggedNode.id) {
          isDescendant = true;
          break;
        }
        current = nodes.find((n) => n.id === current!.parentId);
      }

      if (!isDescendant) {
        onNodeMove(draggedNode.id, targetNode.id);
      }
    }

    setDraggedNode(null);
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverNode(null);

    if (draggedNode && onNodeMove) {
      onNodeMove(draggedNode.id, null);
    }

    setDraggedNode(null);
  };

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;
      const panelRect = panelRef.current.getBoundingClientRect();
      const newWidth = e.clientX - panelRect.left;
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [isResizing]);

  const getNodeIcon = (node: Node) => {
    if (node.type === "folder") {
      return <Folder className="w-4 h-4 shrink-0 text-yellow-500" />;
    }
    if (node.type === "media") {
      if (node.mediaType === "image") return <Image className="w-4 h-4 shrink-0 text-green-500" />;
      if (node.mediaType === "audio") return <Music className="w-4 h-4 shrink-0 text-purple-500" />;
      if (node.mediaType === "video") return <Video className="w-4 h-4 shrink-0 text-red-500" />;
    }
    return <FileText className="w-4 h-4 shrink-0 text-primary" />;
  };

  const buildHierarchy = () => {
    const rootNodes = nodes.filter((node) => node.parentId === null);

    const getChildren = (parentId: string): Node[] => {
      return nodes
        .filter((node) => node.parentId === parentId)
        .sort((a, b) => {
          if (sortBy === "type") {
            if (a.type === "folder" && b.type !== "folder") return -1;
            if (a.type !== "folder" && b.type === "folder") return 1;
          }
          return a.name.localeCompare(b.name);
        });
    };

    const renderNode = (node: Node, level: number = 0, isLastChild: boolean = true, parentLines: boolean[] = []): JSX.Element => {
      const children = getChildren(node.id);
      const hasChildren = children.length > 0;
      const isFolder = node.type === "folder";
      const isExpanded = expandedFolders.has(node.id);
      const isDragOver = dragOverNode === node.id;

      return (
        <div key={node.id} className="relative">
          {/* Tree lines */}
          {level > 0 && (
            <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
              {parentLines.map((showLine, idx) => (
                showLine && (
                  <div
                    key={idx}
                    className="absolute w-px bg-gradient-to-b from-border/60 to-border/20"
                    style={{
                      left: `${idx * 12 + 12}px`,
                      top: 0,
                      bottom: 0,
                    }}
                  />
                )
              ))}
              {/* Horizontal connector */}
              <div
                className="absolute h-px bg-gradient-to-r from-border/60 to-border/30"
                style={{
                  left: `${(level - 1) * 12 + 12}px`,
                  width: '10px',
                  top: '14px',
                }}
              />
              {/* Vertical connector to this node */}
              <div
                className={cn(
                  "absolute w-px bg-gradient-to-b from-border/60 to-border/20",
                  isLastChild && "to-transparent"
                )}
                style={{
                  left: `${(level - 1) * 12 + 12}px`,
                  top: 0,
                  height: isLastChild ? '14px' : '100%',
                }}
              />
            </div>
          )}

          <div
            className={cn("relative group", isDragOver && isFolder && "bg-accent/30 rounded-md")}
            draggable
            onDragStart={(e) => handleDragStart(node, e)}
            onDragOver={(e) => handleDragOver(node, e)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(node, e)}
          >
            <div
              onClick={() => onNodeSelect(node)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors cursor-pointer",
                "hover:bg-accent/50",
                selectedNode?.id === node.id && "bg-accent text-accent-foreground font-medium"
              )}
              style={{ paddingLeft: `${level * 12 + 8}px` }}
            >
              {isFolder && hasChildren && (
                <span onClick={(e) => toggleFolder(node.id, e)} className="p-0.5 hover:bg-accent rounded cursor-pointer">
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </span>
              )}
              {isFolder && !hasChildren && <span className="w-4" />}
              {getNodeIcon(node)}
              <span className="truncate flex-1 text-left">{node.name}</span>
              {node.tags.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                  {node.tags.length}
                </Badge>
              )}
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className="relative">
              {children.map((child, idx) => 
                renderNode(
                  child, 
                  level + 1, 
                  idx === children.length - 1,
                  [...parentLines, !isLastChild]
                )
              )}
            </div>
          )}
        </div>
      );
    };

    return rootNodes.map((node, idx) => renderNode(node, 0, idx === rootNodes.length - 1, []));
  };

  const folderCount = nodes.filter((n) => n.type === "folder").length;
  const fileCount = nodes.filter((n) => n.type === "file").length;

  const expandAll = () => {
    const allFolderIds = nodes.filter(n => n.type === "folder").map(n => n.id);
    setExpandedFolders(new Set(allFolderIds));
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  const panelTitles: Record<RibbonTool, string> = {
    files: "File Explorer",
    graph: "Graph Settings",
    editor: "Editor Settings",

    "import-export": "Import / Export",
    settings: "Settings",
    account: "Account",
    vaults: "Vault Manager",
  };

  if (!activeTool) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "h-full bg-sidebar border-r border-sidebar-border flex flex-col relative",
        "animate-in slide-in-from-left-2 duration-200 ease-out"
      )}
      style={{ width: `${width}px` }}
    >
      {/* Panel Header */}
      <div className="h-12 px-3 flex items-center justify-between border-b border-sidebar-border shrink-0">
        <span className="text-sm font-medium text-sidebar-foreground">{panelTitles[activeTool]}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTool === "files" && (
          <div className="h-full flex flex-col">
            {/* Vault Info */}
            {isVaultMode && (
              <div className="p-3 border-b border-sidebar-border bg-sidebar/50 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">{vaultName}</span>
                  </div>
                  <Button onClick={onCloseVault} variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{folderCount} folders</span>
                  <span>•</span>
                  <span>{fileCount} files</span>
                </div>
              </div>
            )}

            {/* File Explorer Toolbar */}
            <div className="p-2 border-b border-sidebar-border flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onAddNode?.("folder")}
                title="Add Folder"
              >
                <FolderPlus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onAddNode?.("file")}
                title="Add File"
              >
                <FilePlus className="w-4 h-4" />
              </Button>
              <div className="flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Sort">
                    <SortAsc className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("name")}>
                    Sort by Name {sortBy === "name" && "✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("type")}>
                    Sort by Type {sortBy === "type" && "✓"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={expandedFolders.size > 0 ? collapseAll : expandAll}
                title={expandedFolders.size > 0 ? "Collapse All" : "Expand All"}
              >
                <ChevronsUpDown className="w-4 h-4" />
              </Button>
            </div>

            {/* File Tree */}
            <ScrollArea className="flex-1">
              <div
                className="p-2"
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedNode) e.dataTransfer.dropEffect = "move";
                }}
                onDrop={handleDropOnRoot}
              >
                {nodes.length > 0 ? (
                  buildHierarchy()
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-xs">
                    No files yet. Import or create your first node.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {activeTool === "graph" && (
          <div className="p-3">
            <p className="text-xs text-muted-foreground mb-3">Configure graph visualization settings.</p>
            {graphConfigTrigger}
          </div>
        )}

        {activeTool === "editor" && (
          <div className="p-3">
            <p className="text-xs text-muted-foreground mb-3">Configure how the note editor looks and behaves.</p>
            <EditorSettingsPanel variant="compact" />
          </div>
        )}



        {activeTool === "import-export" && (
          <div className="p-3">
            <p className="text-xs text-muted-foreground mb-3">Import files or export your vault.</p>
            <Sheet open={importExportOpen} onOpenChange={setImportExportOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 w-full">
                  <FileArchive className="w-4 h-4" />
                  Open Import/Export
                </Button>
              </SheetTrigger>
              <SheetContent 
                side={isMobile ? "bottom" : "right"} 
                className={cn(
                  "overflow-y-auto",
                  isMobile ? "h-[85vh] rounded-t-xl" : "w-full sm:max-w-xl"
                )}
              >
                <SheetHeader>
                  <SheetTitle>Import / Export</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <ImportExportPanel 
                    nodes={nodes} 
                    onImportComplete={(imported, updated) => {
                      onImportComplete?.(imported, updated);
                      setImportExportOpen(false);
                    }} 
                    isSheet 
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}

        {activeTool === "settings" && (
          <div className="p-3">
            <p className="text-xs text-muted-foreground">Application settings coming soon.</p>
          </div>
        )}

        {activeTool === "vaults" && (
          <div className="p-3 space-y-3">
            <p className="text-xs text-muted-foreground">Manage your vaults and storage.</p>
            <Button onClick={() => navigate("/vaults")} variant="default" size="sm" className="w-full">
              Open Vault Manager
            </Button>
          </div>
        )}

        {activeTool === "account" && (
          <div className="p-3 space-y-3">
            <p className="text-xs text-muted-foreground">Manage your account and profile.</p>
            <Button onClick={() => navigate("/vaults")} variant="default" size="sm" className="w-full">
              Account Settings
            </Button>
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          "absolute top-0 right-0 w-1 h-full cursor-col-resize group",
          "hover:bg-primary/50 transition-colors",
          isResizing && "bg-primary/50"
        )}
        onMouseDown={handleResizeStart}
      >
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
