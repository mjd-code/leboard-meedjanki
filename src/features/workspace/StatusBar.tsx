/** Bottom bar: active file path, word count, sync and offline state. */

import { Cloud, CloudOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { useOfflineStore } from '@/shared/stores';
import { useVaultSession } from './VaultSessionContext';
import { useWorkspaceStore } from './store/useWorkspaceStore';

const statusIcon = {
  idle: Cloud,
  saving: Loader2,
  saved: Check,
  error: AlertCircle,
} as const;

export function StatusBar() {
  const { nodes, getNodePath, saveStatus, vaultName } = useVaultSession();
  const root = useWorkspaceStore((s) => s.root);
  const activeGroupId = useWorkspaceStore((s) => s.activeGroupId);
  const activeLeaf = useWorkspaceStore((s) => s.getActiveLeaf());
  const isOnline = useOfflineStore((s) => s.isOnline);

  // root/activeGroupId are read so the bar re-renders on layout changes.
  void root;
  void activeGroupId;

  const node = activeLeaf?.view.nodeId ? nodes.find((n) => n.id === activeLeaf.view.nodeId) : null;
  const words = node?.content ? node.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const StatusIcon = statusIcon[saveStatus] ?? Cloud;

  return (
    <div className="h-6 shrink-0 flex items-center gap-4 px-3 border-t border-border bg-muted/30 text-[11px] text-muted-foreground">
      <span className="truncate max-w-[40%]">
        {node ? getNodePath(node.id) : (vaultName ?? 'No vault')}
      </span>
      {node && <span>{words} words</span>}
      <div className="flex-1" />
      <span className="flex items-center gap-1">
        <StatusIcon className={saveStatus === 'saving' ? 'w-3 h-3 animate-spin' : 'w-3 h-3'} />
        {saveStatus}
      </span>
      <span className="flex items-center gap-1">
        {isOnline ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
