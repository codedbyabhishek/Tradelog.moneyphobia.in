'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, UserRound, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';

const MAX_PROFILE_PHOTO_BYTES = 1024 * 1024;
const ALLOWED_PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ProfileResponse {
  profile: {
    name: string;
    email: string;
    photoDataUrl: string | null;
  };
}

export default function ProfileSettings() {
  const { user, updateProfileName } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || '');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile', { credentials: 'include', cache: 'no-store' });
        const payload = await response.json().catch(() => ({})) as Partial<ProfileResponse> & { error?: string };
        if (!response.ok || !payload.profile) {
          throw new Error(payload.error || 'Failed to load profile settings.');
        }
        setName(payload.profile.name);
        setPhotoDataUrl(payload.profile.photoDataUrl);
      } catch (error) {
        toast({
          title: 'Profile settings unavailable',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [toast]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_PROFILE_PHOTO_TYPES.includes(file.type)) {
      toast({
        title: 'Unsupported photo format',
        description: 'Choose a JPEG, PNG, or WebP image.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      toast({
        title: 'Photo is too large',
        description: 'Choose an image that is 1 MB or smaller.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPhotoDataUrl(reader.result);
    };
    reader.onerror = () => {
      toast({
        title: 'Photo could not be read',
        description: 'Choose another image and try again.',
        variant: 'destructive',
      });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, photoDataUrl }),
      });
      const payload = await response.json().catch(() => ({})) as Partial<ProfileResponse> & { error?: string };
      if (!response.ok || !payload.profile) {
        throw new Error(payload.error || 'Failed to save profile settings.');
      }

      setName(payload.profile.name);
      setPhotoDataUrl(payload.profile.photoDataUrl);
      updateProfileName(payload.profile.name);
      toast({ title: 'Profile updated', description: 'Your personal information has been saved.' });
    } catch (error) {
      toast({
        title: 'Profile not saved',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

  return (
    <Card className="border-border bg-card">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <form className="space-y-5" onSubmit={(event) => void handleSave(event)}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="size-20 border border-border">
              <AvatarImage src={photoDataUrl || undefined} alt={`${name || 'Profile'} profile photo`} />
              <AvatarFallback className="text-lg">{initials || <UserRound className="size-7" />}</AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isSaving}>
                <Camera className="mr-2 size-4" />
                Change photo
              </Button>
              {photoDataUrl && (
                <Button type="button" variant="ghost" onClick={() => setPhotoDataUrl(null)} disabled={isLoading || isSaving}>
                  <X className="mr-2 size-4" />
                  Remove photo
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
                aria-label="Choose profile photo"
              />
              <p className="w-full text-xs text-muted-foreground">JPEG, PNG, or WebP; maximum 1 MB.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-name" className="mb-2 block text-sm font-medium text-foreground">Name</label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                autoComplete="name"
                disabled={isLoading || isSaving}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="mb-2 block text-sm font-medium text-foreground">Email</label>
              <input
                id="profile-email"
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || isSaving || !name.trim()}>
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
