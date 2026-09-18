/**
 * Floating development-only quick login control.
 * Renders nothing in production builds.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { devQuickLogin, isDevAuthEnabled, DEV_CREDENTIALS } from './devAuth';

export function DevAuthBanner() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!isDevAuthEnabled) return null;

  const handleLogin = async () => {
    setBusy(true);
    const { error } = await devQuickLogin();
    setBusy(false);
    if (error) toast.error(`Dev login failed: ${error.message}`);
    else toast.success(`Signed in as ${DEV_CREDENTIALS.email}`);
  };

  return (
    <div className="fixed bottom-2 left-2 z-[100] pointer-events-auto">
      {user ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 bg-background/80 px-2 text-[11px] backdrop-blur"
          onClick={() => void signOut()}
        >
          <LogOut className="h-3 w-3" />
          <span className="max-w-[9rem] truncate">Dev: {user.email}</span>
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 bg-background/80 px-2 text-[11px] backdrop-blur"
          disabled={busy}
          onClick={handleLogin}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}
          Dev Quick Login
        </Button>
      )}
    </div>
  );
}
