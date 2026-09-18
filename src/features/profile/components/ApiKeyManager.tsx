import { useState, useEffect } from 'react';
import { apiKeyService, type ApiKey, type ApiKeyPermission } from '@/features/profile/services/ApiKeyService';
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
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
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PERMISSION_OPTIONS: { value: ApiKeyPermission; label: string; description: string }[] = [
  { value: 'read', label: 'Read', description: 'View vault data' },
  { value: 'write', label: 'Write', description: 'Create and update data' },
  { value: 'delete', label: 'Delete', description: 'Delete vault data' },
  { value: 'admin', label: 'Admin', description: 'Full access including API key management' },
];

export function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // Create form state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<ApiKeyPermission[]>(['read']);
  const [newKeyExpiresDays, setNewKeyExpiresDays] = useState<string>('');

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setIsLoading(true);
    const { data, error } = await apiKeyService.getApiKeys();
    if (error) {
      toast.error('Failed to load API keys');
    } else {
      setApiKeys(data || []);
    }
    setIsLoading(false);
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setIsCreating(true);
    const expiresInDays = newKeyExpiresDays ? parseInt(newKeyExpiresDays) : undefined;
    
    const { data, error } = await apiKeyService.createApiKey(
      newKeyName.trim(),
      newKeyPermissions,
      expiresInDays
    );

    if (error) {
      toast.error('Failed to create API key');
    } else if (data) {
      setNewKeySecret(data.secret);
      setApiKeys(prev => [data, ...prev]);
      toast.success('API key created successfully');
    }

    setIsCreating(false);
  };

  const handleCopySecret = () => {
    if (newKeySecret) {
      navigator.clipboard.writeText(newKeySecret);
      toast.success('API key copied to clipboard');
    }
  };

  const handleCloseCreateDialog = () => {
    setShowCreateDialog(false);
    setNewKeyName('');
    setNewKeyPermissions(['read']);
    setNewKeyExpiresDays('');
    setNewKeySecret(null);
    setShowSecret(false);
  };

  const handleDeleteKey = async (keyId: string) => {
    const { error } = await apiKeyService.deleteApiKey(keyId);
    if (error) {
      toast.error('Failed to delete API key');
    } else {
      setApiKeys(prev => prev.filter(k => k.id !== keyId));
      toast.success('API key deleted');
    }
  };

  const handleTogglePermission = (permission: ApiKeyPermission) => {
    setNewKeyPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Manage API keys for programmatic access to your vaults
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {newKeySecret ? 'API Key Created' : 'Create New API Key'}
                </DialogTitle>
                <DialogDescription>
                  {newKeySecret
                    ? 'Copy this key now. You won\'t be able to see it again.'
                    : 'Create a new API key with specific permissions.'}
                </DialogDescription>
              </DialogHeader>

              {newKeySecret ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm break-all">
                        {showSecret ? newKeySecret : '•'.repeat(40)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopySecret}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button onClick={handleCloseCreateDialog} className="w-full">
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Name</Label>
                    <Input
                      id="key-name"
                      placeholder="e.g., Production API Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="space-y-2">
                      {PERMISSION_OPTIONS.map((permission) => (
                        <div key={permission.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`perm-${permission.value}`}
                            checked={newKeyPermissions.includes(permission.value)}
                            onCheckedChange={() => handleTogglePermission(permission.value)}
                          />
                          <label
                            htmlFor={`perm-${permission.value}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {permission.label}
                            <span className="text-muted-foreground ml-2">
                              - {permission.description}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expires-days">Expires in (days, optional)</Label>
                    <Input
                      id="expires-days"
                      type="number"
                      placeholder="Leave empty for no expiration"
                      value={newKeyExpiresDays}
                      onChange={(e) => setNewKeyExpiresDays(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleCreateKey} 
                    className="w-full"
                    disabled={isCreating}
                  >
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create API Key
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {apiKeys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No API keys yet</p>
            <p className="text-sm">Create an API key to access your vaults programmatically</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{key.name}</span>
                    {!key.is_active && (
                      <Badge variant="destructive">Revoked</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <code>{key.key_prefix}</code>
                    <span>•</span>
                    <span>Created {format(new Date(key.created_at), 'MMM d, yyyy')}</span>
                    {key.expires_at && (
                      <>
                        <span>•</span>
                        <span>Expires {format(new Date(key.expires_at), 'MMM d, yyyy')}</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {key.permissions.map((perm) => (
                      <Badge key={perm} variant="secondary" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the API key "{key.name}". 
                        Any applications using this key will stop working.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteKey(key.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
