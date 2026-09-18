import { useState, useRef } from 'react';
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Camera, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';

interface AvatarUploadProps {
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarUpload({ size = 'lg' }: AvatarUploadProps) {
  const { profile, uploadAvatar } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    const { error } = await uploadAvatar(file);
    setIsUploading(false);

    if (error) {
      toast.error('Failed to upload avatar');
    } else {
      toast.success('Avatar updated!');
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const initials = profile?.display_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || profile?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="relative inline-block group">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || 'Avatar'} />
        <AvatarFallback className="text-lg">
          {initials || <User className="h-8 w-8" />}
        </AvatarFallback>
      </Avatar>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
