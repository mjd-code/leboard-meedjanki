import { useState } from "react";
import { 
  HardDrive, 
  Zap, 
  Trash2, 
  Clock, 
  Network, 
  FileText, 
  Tag, 
  Link2, 
  AlertTriangle, 
  FolderOpen, 
  Cloud,
  Pencil,
  Check,
  X,
  History,
  Download
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { Separator } from "@/shared/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { StorageStrategy } from "@/core/vault/types";
import { StorageStrategySelector, StorageStrategyBadge } from "./StorageStrategySelector";

interface VaultCardProps {
  id: string;
  name: string;
  type: 'in-memory' | 'local-folder';
  storageStrategy: StorageStrategy;
  nodeCount: number;
  linkCount: number;
  lastModified: number;
  isActive: boolean;
  isAuthenticated?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename?: (newName: string) => void;
  onStorageStrategyChange?: (strategy: StorageStrategy) => void;
  onOpenBackups?: () => void;
  onExportToFileSystem?: () => void;
  backupCount?: number;
  stats?: {
    fileCount: number;
    folderCount: number;
    tagCount: number;
    orphanedNodes: number;
    avgConnections: number;
  };
}

export const VaultCard = ({
  name,
  type,
  storageStrategy,
  nodeCount,
  linkCount,
  lastModified,
  isActive,
  isAuthenticated = false,
  onSelect,
  onDelete,
  onRename,
  onStorageStrategyChange,
  onOpenBackups,
  onExportToFileSystem,
  backupCount = 0,
  stats,
}: VaultCardProps) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(name);

  const getVaultIcon = () => {
    if (storageStrategy === 'cloud') {
      return <Cloud className="w-5 h-5" />;
    }
    if (type === 'in-memory') {
      return <Zap className="w-5 h-5" />;
    }
    return <HardDrive className="w-5 h-5" />;
  };

  const getIconColorClass = () => {
    if (storageStrategy === 'cloud') return 'text-blue-400';
    if (type === 'in-memory') return 'text-amber-400';
    return 'text-primary';
  };

  const handleRename = () => {
    if (newName.trim() && newName !== name && onRename) {
      onRename(newName.trim());
    }
    setIsRenaming(false);
  };

  const handleCancelRename = () => {
    setNewName(name);
    setIsRenaming(false);
  };

  return (
    <div 
      className={`
        group relative overflow-hidden rounded-xl border bg-card 
        transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5
        ${isActive ? 'ring-2 ring-primary border-primary' : 'border-border'}
        flex flex-col
      `}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary" />
      )}

      {/* Main Content */}
      <div className="p-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`flex-shrink-0 p-2 rounded-lg bg-secondary ${getIconColorClass()}`}>
              {getVaultIcon()}
            </div>
            
            <div className="min-w-0 flex-1">
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleRename}>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelRename}>
                    <X className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground truncate">{name}</h3>
                  {onRename && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setIsRenaming(true)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-1">
                <StorageStrategyBadge strategy={storageStrategy} />
                {storageStrategy === 'memory' && (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Data may be lost if browser cache is cleared</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {isActive && (
                  <Badge className="text-[10px] h-5 bg-primary/20 text-primary border-0">Active</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
            <Network className="w-4 h-4 text-primary" />
            <div className="text-xs">
              <span className="font-semibold text-foreground">{nodeCount}</span>
              <span className="text-muted-foreground ml-1">nodes</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
            <Link2 className="w-4 h-4 text-primary" />
            <div className="text-xs">
              <span className="font-semibold text-foreground">{linkCount}</span>
              <span className="text-muted-foreground ml-1">links</span>
            </div>
          </div>
        </div>

        {/* Extended Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-2 mb-4 text-[10px]">
            <div className="flex flex-col items-center p-1.5 rounded bg-secondary/30">
              <FileText className="w-3 h-3 text-muted-foreground mb-0.5" />
              <span className="font-medium text-foreground">{stats.fileCount}</span>
            </div>
            <div className="flex flex-col items-center p-1.5 rounded bg-secondary/30">
              <FolderOpen className="w-3 h-3 text-muted-foreground mb-0.5" />
              <span className="font-medium text-foreground">{stats.folderCount}</span>
            </div>
            <div className="flex flex-col items-center p-1.5 rounded bg-secondary/30">
              <Tag className="w-3 h-3 text-muted-foreground mb-0.5" />
              <span className="font-medium text-foreground">{stats.tagCount}</span>
            </div>
            <div className="flex flex-col items-center p-1.5 rounded bg-secondary/30">
              <Network className="w-3 h-3 text-muted-foreground mb-0.5" />
              <span className="font-medium text-foreground">{stats.avgConnections.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* Storage Strategy Dropdown (inline) */}
        {type === 'in-memory' && onStorageStrategyChange && (
          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Storage
            </label>
            <StorageStrategySelector
              value={storageStrategy}
              onChange={onStorageStrategyChange}
              isAuthenticated={isAuthenticated}
              disabled={storageStrategy === 'filesystem'}
            />
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatDistanceToNow(lastModified, { addSuffix: true })}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={onDelete} 
              variant="ghost" 
              size="sm"
              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button 
              onClick={onSelect} 
              variant={isActive ? "secondary" : "default"}
              size="sm"
              className="h-7 px-3"
              disabled={isActive}
            >
              {isActive ? 'Current' : 'Open'}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer - Backups & Export */}
      {type === 'in-memory' && (onOpenBackups || onExportToFileSystem) && (
        <>
          <Separator />
          <div className="px-4 py-3 bg-muted/30 flex items-center gap-2">
            {onOpenBackups && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 gap-2 flex-1 text-xs hover:bg-secondary"
                onClick={onOpenBackups}
              >
                <History className="w-3.5 h-3.5" />
                <span>Backups</span>
                {backupCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {backupCount}
                  </Badge>
                )}
              </Button>
            )}
            {onExportToFileSystem && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 gap-2 flex-1 text-xs hover:bg-secondary"
                onClick={onExportToFileSystem}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
