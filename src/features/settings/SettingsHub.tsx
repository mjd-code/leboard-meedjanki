/**
 * Unified Settings Hub — one place for every app configuration, with a quiet
 * sidebar navigation instead of scattered sheets.
 */

import { useState } from 'react';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { cn } from '@/shared/lib/cn';
import { Cloud, Database, Network, Pencil, ShieldCheck, SlidersHorizontal, ToggleLeft, UserCircle, Users } from 'lucide-react';
import { EditorSettingsContent } from '@/features/editor/settings/EditorSettingsPanel';
import { FeatureTogglesPanel } from '@/features/settings/FeatureTogglesPanel';
import { SyncPanel } from '@/features/settings/SyncPanel';
import { SchemaSettings } from '@/features/settings/sections/SchemaSettings';
import { GraphEngineSettings } from '@/features/settings/sections/GraphEngineSettings';
import { RolesSettings } from '@/features/settings/sections/RolesSettings';
import { AccountSettings } from '@/features/settings/sections/AccountSettings';
import { VaultSettings } from '@/features/settings/sections/VaultSettings';
import { ConfigurationSettings } from '@/features/settings/sections/ConfigurationSettings';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/ui/sheet';
import { Menu } from 'lucide-react';

type SectionId =
  | 'account'
  | 'vaults'
  | 'system'
  | 'features'
  | 'editor'
  | 'schema'
  | 'graph'
  | 'configuration'
  | 'roles';

const SECTIONS: {
  id: SectionId;
  label: string;
  group: string;
  icon: typeof Cloud;
  description: string;
}[] = [
  {
    id: 'account',
    label: 'Account & Profile',
    group: 'Account & Profile',
    icon: UserCircle,
    description: 'Session, profile details, plan and API keys.',
  },
  {
    id: 'vaults',
    label: 'Vault Management',
    group: 'Vault Management',
    icon: Database,
    description: 'Active vault, storage adapter, backups, import and export.',
  },
  {
    id: 'system',
    label: 'System & Sync',
    group: 'System & Sync',
    icon: Cloud,
    description: 'Connection state, pending uploads and offline cache.',
  },
  {
    id: 'features',
    label: 'Features',
    group: 'System & Sync',
    icon: ToggleLeft,
    description: 'Turn parts of the app on or off.',
  },
  {
    id: 'editor',
    label: 'Editor',
    group: 'Editor & Schema',
    icon: Pencil,
    description: 'Typography, typing behaviour, assistance and toolbar.',
  },
  {
    id: 'schema',
    label: 'Properties & Schema',
    group: 'Editor & Schema',
    icon: ShieldCheck,
    description: 'Global property rules inherited by every note.',
  },
  {
    id: 'graph',
    label: 'Visual Graph Engine',
    group: 'Visual',
    icon: Network,
    description: 'Default layout, colours, link routing and depth rules.',
  },
  {
    id: 'configuration',
    label: 'Configuration Vault',
    group: 'System & Sync',
    icon: SlidersHorizontal,
    description: 'Where your settings are saved, plus export, import and reset.',
  },
  {
    id: 'roles',
    label: 'User Roles',
    group: 'Collaboration',
    icon: Users,
    description: 'Who can write, review and publish.',
  },
];

const GROUPS = [
  'Account & Profile',
  'Vault Management',
  'System & Sync',
  'Editor & Schema',
  'Visual',
  'Collaboration',
];


export function SettingsHub() {
  const [active, setActive] = useState<SectionId>('account');
  const section = SECTIONS.find((s) => s.id === active)!;
  const ActiveIcon = section.icon;

  const navigation = (onSelect?: () => void) => (
    <div className="space-y-4 p-3">
      {GROUPS.map((group) => (
        <div key={group} className="space-y-1">
          <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{group}</p>
          {SECTIONS.filter((item) => item.group === group).map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              onClick={() => { setActive(item.id); onSelect?.(); }}
              className={cn(
                'h-9 w-full justify-start gap-2 px-2 text-sm font-normal',
                active === item.id && 'bg-background text-foreground shadow-sm'
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </Button>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      {/* Sidebar */}
      <nav className="hidden flex-shrink-0 border-r border-border bg-muted/20 md:block md:w-56">
        <ScrollArea className="h-full">{navigation()}</ScrollArea>
      </nav>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-border px-3 py-3 sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 md:hidden" aria-label="Open settings menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(19rem,88vw)] p-0">
              <SheetHeader className="border-b border-border px-4 py-4 text-left">
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-4.5rem)]">{navigation()}</ScrollArea>
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ActiveIcon className="h-4 w-4 shrink-0 text-primary md:hidden" />
              <h1 className="truncate text-base font-semibold">{section.label}</h1>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{section.description}</p>
          </div>
        </header>

        {active === 'editor' ? (
          <EditorSettingsContent />
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
              {active === 'account' && <AccountSettings />}
              {active === 'vaults' && <VaultSettings />}
              {active === 'system' && <SyncPanel />}

              {active === 'features' && <FeatureTogglesPanel />}
              {active === 'schema' && <SchemaSettings />}
              {active === 'graph' && <GraphEngineSettings />}
              {active === 'configuration' && <ConfigurationSettings />}
              {active === 'roles' && <RolesSettings />}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
