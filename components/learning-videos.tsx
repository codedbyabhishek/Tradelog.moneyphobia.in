'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Plus, Trash2, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LearningVideo } from '@/lib/types';

function parseYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, '');

    if (hostname === 'youtu.be') {
      return url.pathname.split('/').filter(Boolean)[0] || null;
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'music.youtube.com') {
      if (url.pathname === '/watch') {
        return url.searchParams.get('v');
      }

      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') {
        return parts[1] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function buildEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}`;
}

async function videosRequest(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const body = await res.json();
      message = body?.error || message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  return res;
}

export default function LearningVideos() {
  const { toast } = useToast();
  const [videos, setVideos] = useState<LearningVideo[]>([]);
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const res = await videosRequest('/api/learning-videos', { method: 'GET' });
        const data = await res.json();
        setVideos((data.videos || []) as LearningVideo[]);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load learning videos');
      } finally {
        setLoading(false);
      }
    };

    void loadVideos();
  }, []);

  const totalVideos = videos.length;
  const sortedVideos = useMemo(
    () =>
      [...videos].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [videos]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const videoId = parseYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      toast({
        title: 'Invalid YouTube link',
        description: 'Paste a valid YouTube watch, share, shorts, live, or embed URL.',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Give this learning video a short title so it is easy to find later.',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date().toISOString();
    const video: LearningVideo = {
      id: crypto.randomUUID(),
      title: title.trim(),
      url: youtubeUrl.trim(),
      videoId,
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now,
    };

    try {
      setIsSaving(true);
      setVideos((prev) => [video, ...prev]);

      await videosRequest('/api/learning-videos', {
        method: 'POST',
        body: JSON.stringify({ video }),
      });

      setTitle('');
      setYoutubeUrl('');
      setNotes('');
      setError(null);

      toast({
        title: 'Learning video saved',
        description: 'The YouTube video is now available in your learning library.',
      });
    } catch (err) {
      setVideos((prev) => prev.filter((item) => item.id !== video.id));
      setError(err instanceof Error ? err.message : 'Failed to save learning video');
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Failed to save learning video',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    const previous = videos;
    setVideos((prev) => prev.filter((video) => video.id !== videoId));

    try {
      await videosRequest(`/api/learning-videos/${encodeURIComponent(videoId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      setVideos(previous);
      const message = err instanceof Error ? err.message : 'Failed to delete learning video';
      setError(message);
      toast({
        title: 'Delete failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex-1 min-h-screen p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl lg:text-3xl">
                  <BookOpen className="h-6 w-6 text-primary" />
                  Learning Videos
                </CardTitle>
                <CardDescription className="mt-2 text-xs sm:text-sm">
                  Save your own YouTube learning videos here. Both listed and unlisted YouTube links work as long as the video allows embedding.
                </CardDescription>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Saved Videos</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{totalVideos}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Video Title*</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., ICT Liquidity Sweep Breakdown"
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">YouTube URL*</label>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What do you want to remember or practice from this video?"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
                Works with standard YouTube links, short links, shorts, embed links, and unlisted videos. Private or embedding-disabled videos will not play here.
              </div>

              <Button type="submit" disabled={isSaving}>
                <Plus className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Add Learning Video'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Video className="h-5 w-5 text-primary" />
              Your Video Library
            </CardTitle>
            <CardDescription>
              Open the original YouTube page, keep your notes, or remove videos you no longer need.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading learning videos...</div>
            ) : sortedVideos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-10 text-center">
                <p className="text-lg font-semibold text-foreground">No learning videos yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add your first listed or unlisted YouTube video above to build a focused study library inside the journal.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {sortedVideos.map((video) => (
                  <Card key={video.id} className="overflow-hidden border-border bg-card/70">
                    <CardContent className="p-0">
                      <div className="aspect-video w-full bg-black">
                        <iframe
                          src={buildEmbedUrl(video.videoId)}
                          title={video.title}
                          className="h-full w-full"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      </div>

                      <div className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">YouTube</Badge>
                          <Badge variant="secondary">{new Date(video.updatedAt).toLocaleDateString()}</Badge>
                        </div>

                        <div>
                          <p className="text-base font-semibold text-foreground">{video.title}</p>
                          {video.notes ? (
                            <p className="mt-2 text-sm text-muted-foreground">{video.notes}</p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="outline">
                            <a href={video.url} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open On YouTube
                            </a>
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleDelete(video.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
