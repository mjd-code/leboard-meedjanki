/**
 * Account & Profile section of the Unified Settings Hub.
 * Authentication status, profile details, plan/tier, API keys and session controls.
 */

import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, ShieldCheck, Sparkles, User } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Separator } from '@/shared/ui/separator';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ProfileSettings } from '@/features/profile/components/ProfileSettings';
import { AvatarUpload } from '@/features/profile/components/AvatarUpload';

export function AccountSettings() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return <p className="py-12 text-sm text-muted-foreground">Checking your session…</p>;
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4" /> Not signed in
          </CardTitle>
          <CardDescription>
            Sign in to sync vaults across devices, manage API keys and use collaboration features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="gap-2" onClick={() => navigate('/auth')}>
            <LogIn className="w-4 h-4" />
            Sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Session</CardTitle>
          <CardDescription>Who you are signed in as on this device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <AvatarUpload size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {profile?.display_name || profile?.email || user.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant={profile?.email_verified ? 'default' : 'outline'} className="text-xs">
              <ShieldCheck className="mr-1 h-3 w-3" />
              {profile?.email_verified ? 'Verified' : 'Unverified email'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="mr-1 h-3 w-3" />
              Free tier
            </Badge>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Signing out keeps local vaults on this device, but stops cloud sync.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile fields, password, API keys, account deletion */}
      <ProfileSettings />
    </div>
  );
}
