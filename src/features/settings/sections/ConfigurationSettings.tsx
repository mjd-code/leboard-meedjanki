/**
 * Configuration vault panel — sync status, export/import and reset for every
 * saved setting in the app.
 */

import { useRef, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { toast } from 'sonner';
import { Check, CloudOff, Download, Loader2, RotateCcw, TriangleAlert, Upload } from 'lucide-react';
import { configService, listConfigSections, useConfigSyncState } from '@/core/config';

function statusLabel(status: string) {
  switch (status) {
    case 'saving':
      return { text: 'Saving…', icon: Loader2, spin: true };
    case 'saved':
      return { text: 'Saved', icon: Check, spin: false };
    case 'offline':
      return { text: 'Offline — will sync later', icon: CloudOff, spin: false };
    case 'error':
      return { text: 'Sync issue — will retry', icon: TriangleAlert, spin: false };
    default:
      return { text: 'Up to date', icon: Check, spin: false };
  }
}

export function ConfigurationSettings() {
  const state = useConfigSyncState();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const badge = statusLabel(state.status);
  const sections = listConfigSections();

  const handleExport = () => {
    const payload = configService.exportConfig();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obmap-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Configuration exported');
  };

  const handleImport = async (file: File) => {
    setBusy(true);
    try {
      const parsed = JSON.parse(await file.text());
      const applied = await configService.importConfig(parsed);
      toast.success(`Restored ${applied.length} settings sections`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read that file');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      await configService.resetAll();
      toast.success('All settings restored to defaults');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1.5">
          <badge.icon className={`w-3.5 h-3.5 ${badge.spin ? 'animate-spin' : ''}`} />
          {badge.text}
        </Badge>
        {state.lastSyncedAt && (
          <span className="text-xs text-muted-foreground">
            Last synced {new Date(state.lastSyncedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Your graph styling, layout engine, theme, editor, workspace, features and schema are saved on
        this device and, when you are signed in, to your account — so they come back after a refresh.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={busy}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export configuration
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Import configuration
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReset} disabled={busy}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset to defaults
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImport(file);
          }}
        />
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {sections.map((section) => (
          <div key={section.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-sm">{section.label}</span>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {section.scope === 'vault' ? 'Per vault' : 'Account-wide'} · v{section.version}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
