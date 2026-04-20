'use client';
import { ThemeToggle } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { SaveCustomInstructions } from '@/lib/actions/user-actions';
import { Key, Palette, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [customInstructions, setCustomInstructions] = useState('');
  const [gatewayKey, setGatewayKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const [personaliseRes, gatewayRes] = await Promise.all([
          fetch('/api/user/personalise'),
          fetch('/api/user/gateway-key'),
        ]);

        if (personaliseRes.ok) {
          const data = await personaliseRes.json();
          setCustomInstructions(data || '');
        }

        if (gatewayRes.ok) {
          const gatewayData = await gatewayRes.json();
          if (gatewayData.hasKey) {
            setGatewayKey(gatewayData.masked || 'gw_***');
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  async function handleInstructionsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);

    try {
      await SaveCustomInstructions({ text: customInstructions });
      toast.success('Instructions saved successfully');
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGatewaySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);

    const keyInput = document.getElementById('gatewayKey') as HTMLInputElement;
    const key = keyInput?.value?.trim();

    if (!key) {
      toast.error('Please enter your API key');
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/user/gateway-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayKey: key }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to save key');
        return;
      }

      setGatewayKey(data.masked);
      toast.success('Gateway key saved');
    } catch (error) {
      console.error('Failed to save gateway key:', error);
      toast.error('Failed to save key');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 md:px-6 h-full overflow-y-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">Customize your chat experience</p>
        </div>

        <Separator />

        <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="personalization" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Personalization
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="space-y-4">
            <form onSubmit={handleGatewaySubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Vercel AI Gateway</CardTitle>
                  <CardDescription>
                    Enter your Vercel AI Gateway API key to enable chat
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      id="gatewayKey"
                      name="gatewayKey"
                      type="password"
                      placeholder="vck_xxxxxxxxxxxxxxxx"
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      Get your key from{' '}
                      <a
                        href="https://vercel.com/dashboard/ai-gateway/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        Vercel Dashboard
                      </a>
                    </p>
                    {gatewayKey && (
<p className="text-xs text-muted-foreground">
                        Current key: {gatewayKey}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Key'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="appearance" className="">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Choose your preferred theme mode</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personalization" className="space-y-4">
            <form onSubmit={handleInstructionsSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Custom Instructions</CardTitle>
                  <CardDescription>Tell the AI how you like it to respond</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Textarea
                      id="customInstructions"
                      name="customInstructions"
                      placeholder="e.g., I'm a software developer working with React and TypeScript..."
                      className="min-h-30 resize-none"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      This helps the AI provide more relevant responses
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading || isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
