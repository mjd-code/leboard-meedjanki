import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AvatarUpload } from './AvatarUpload';
import { ApiKeyManager } from './ApiKeyManager';
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Loader2, Save, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';

const profileSchema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  is_public: z.boolean(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(72),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export function ProfileSettings() {
  const { profile, updateProfile, updatePassword, deleteAccount } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile?.display_name || '',
      bio: profile?.bio || '',
      is_public: profile?.is_public ?? true,
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    setIsSaving(true);
    const { error } = await updateProfile(data);
    setIsSaving(false);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
    }
  };

  const handlePasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
    setIsChangingPassword(true);
    const { error } = await updatePassword(data.newPassword);
    setIsChangingPassword(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password changed successfully!');
      passwordForm.reset();
      setShowPasswordForm(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const { error } = await deleteAccount();
    setIsDeleting(false);

    if (error) {
      toast.error('Failed to delete account');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your public profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <AvatarUpload />
            <div>
              <h3 className="font-medium">{profile?.display_name || 'Your Name'}</h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <Separator />

          <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                placeholder="John Doe"
                {...profileForm.register('display_name')}
              />
              {profileForm.formState.errors.display_name && (
                <p className="text-xs text-destructive">
                  {profileForm.formState.errors.display_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                rows={3}
                {...profileForm.register('bio')}
              />
              {profileForm.formState.errors.bio && (
                <p className="text-xs text-destructive">
                  {profileForm.formState.errors.bio.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_public">Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Allow others to see your profile
                </p>
              </div>
              <Switch
                id="is_public"
                checked={profileForm.watch('is_public')}
                onCheckedChange={(checked) => profileForm.setValue('is_public', checked)}
              />
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* API Keys */}
      <ApiKeyManager />

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your password and account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPasswordForm ? (
            <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
              <Lock className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          ) : (
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...passwordForm.register('currentPassword')}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...passwordForm.register('newPassword')}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...passwordForm.register('confirmPassword')}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowPasswordForm(false);
                    passwordForm.reset();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove all of your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
