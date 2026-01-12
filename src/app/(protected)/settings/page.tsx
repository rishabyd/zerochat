"use client";
import { Palette, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SaveCustomInstructions } from "@/lib/actions/user-actions";

export default function SettingsPage() {
  const [customInstructions, setCustomInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/user/personalise");
        console.log(response);

        if (response.ok) {
          const data = await response.json();
          setCustomInstructions(data || "");
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);

    try {
      await SaveCustomInstructions({ text: customInstructions });
      toast.success("Instructions saved successfully");
    } catch (error) {
      console.error("Failed to update settings:", error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="container mx-auto h-full max-w-3xl overflow-y-auto px-4 py-8 md:px-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Settings</h1>
          <p className="mt-2 text-muted-foreground">Customize your chat experience</p>
        </div>

        <Separator />

        {/* Tabs */}
        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="personalization" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Personalization
            </TabsTrigger>
          </TabsList>

          {/* Appearance Tab */}
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

          {/* Personalization Tab */}
          <TabsContent value="personalization" className="space-y-4">
            <form onSubmit={handleSubmit}>
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
                    <p className="text-muted-foreground text-xs">
                      This helps the AI provide more relevant responses
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading || isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
