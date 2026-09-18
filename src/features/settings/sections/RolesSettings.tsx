/**
 * User roles — placeholder surface. Role storage and protected fields land with
 * the collaborative workflow phase.
 */

import { Badge } from '@/shared/ui/badge';
import { ShieldCheck } from 'lucide-react';

const ROLES = [
  { name: 'Admin', description: 'Full control: schema, roles and publishing.' },
  { name: 'Editor', description: 'Reviews drafts and approves changes into the public graph.' },
  { name: 'Contributor', description: 'Writes drafts; cannot change protected properties.' },
  { name: 'Reader', description: 'Sees published entries only.' },
];

export function RolesSettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3">
        <ShieldCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Roles are defined here now and become enforceable once the collaborative workspace is
          switched on.
        </p>
      </div>

      <div className="space-y-2">
        {ROLES.map((role) => (
          <div
            key={role.name}
            className="flex items-start justify-between gap-4 rounded-lg border border-border p-3"
          >
            <div>
              <p className="text-sm font-medium">{role.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
            </div>
            <Badge variant="outline" className="text-[10px] flex-shrink-0">
              Coming soon
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
