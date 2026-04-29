import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Settings as SettingsIcon, Save, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

import {
  useGetProfile,
  useUpdateProfile,
  useSyncPlatforms,
  getGetProfileQueryKey,
  getListTasksQueryKey,
  getGetTodayStatsQueryKey,
  getGetStreakQueryKey,
  getGetWeeklyActivityQueryKey,
  getGetCategoryBreakdownQueryKey
} from "@workspace/api-client-react";

const profileFormSchema = z.object({
  leetcodeHandle: z.string().optional(),
  codeforcesHandle: z.string().optional(),
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: isProfileLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() }
  });

  const updateProfile = useUpdateProfile();
  const syncPlatforms = useSyncPlatforms();

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      leetcodeHandle: profile?.leetcodeHandle || "",
      codeforcesHandle: profile?.codeforcesHandle || "",
    },
    values: {
      leetcodeHandle: profile?.leetcodeHandle || "",
      codeforcesHandle: profile?.codeforcesHandle || "",
    }
  });

  function onSubmit(values: z.infer<typeof profileFormSchema>) {
    updateProfile.mutate(
      { data: { 
          leetcodeHandle: values.leetcodeHandle || null, 
          codeforcesHandle: values.codeforcesHandle || null 
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          toast({ title: "Profile updated" });
        },
        onError: () => {
          toast({ title: "Failed to update profile", variant: "destructive" });
        }
      }
    );
  }

  const handleSync = () => {
    syncPlatforms.mutate(undefined, {
      onSuccess: (data) => {
        // Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTodayStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStreakQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWeeklyActivityQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCategoryBreakdownQueryKey() });

        const lc = data.platforms.find(p => p.platform === 'leetcode');
        const cf = data.platforms.find(p => p.platform === 'codeforces');

        let message = "Synced successfully.";
        if (lc?.connected && cf?.connected) {
          message = `Synced — ${lc.solvedToday} problems solved today on LeetCode, ${cf.solvedToday} on Codeforces.`;
        } else if (lc?.connected) {
          message = `Synced — ${lc.solvedToday} problems solved today on LeetCode.`;
        } else if (cf?.connected) {
          message = `Synced — ${cf.solvedToday} problems solved today on Codeforces.`;
        }

        toast({ title: message });
      },
      onError: () => {
        toast({ title: "Failed to sync platforms", variant: "destructive" });
      }
    });
  };

  const lastSyncedText = profile?.lastSyncedAt 
    ? formatDistanceToNow(new Date(profile.lastSyncedAt), { addSuffix: true })
    : "Never synced";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground font-mono text-sm">
          Manage your integrations and preferences
        </p>
      </header>

      <div className="grid gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Platform Integrations</CardTitle>
            <CardDescription className="font-mono">
              Connect your coding profiles to automatically track solved problems.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-muted/50 border-primary/20 text-foreground font-mono">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertTitle>Supported Platforms</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-1">
                Currently we support LeetCode and Codeforces. HackerRank and CodeChef aren't supported because they don't expose public APIs for recent submissions.
              </AlertDescription>
            </Alert>

            {isProfileLoading ? (
              <div className="space-y-4">
                <div className="h-10 bg-muted animate-pulse rounded-md" />
                <div className="h-10 bg-muted animate-pulse rounded-md" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="leetcodeHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LeetCode Handle</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. neetcode" {...field} className="bg-background/50 font-mono" />
                        </FormControl>
                        <FormDescription className="text-xs">Leave blank to disconnect.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="codeforcesHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codeforces Handle</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. tourist" {...field} className="bg-background/50 font-mono" />
                        </FormControl>
                        <FormDescription className="text-xs">Leave blank to disconnect.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={updateProfile.isPending || !form.formState.isDirty} className="font-mono">
                    {updateProfile.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Handles
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
          <div className="px-6 pb-6 pt-0">
            <div className="bg-background/50 border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-medium text-sm mb-1 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  Manual Sync
                </h4>
                <p className="text-xs text-muted-foreground font-mono">
                  Last synced: <span className="text-foreground">{lastSyncedText}</span>
                </p>
              </div>
              <Button 
                variant="secondary" 
                onClick={handleSync} 
                disabled={syncPlatforms.isPending || isProfileLoading || (!profile?.leetcodeHandle && !profile?.codeforcesHandle)}
                className="font-mono shrink-0"
              >
                {syncPlatforms.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sync Now
              </Button>
            </div>
            {(!profile?.leetcodeHandle && !profile?.codeforcesHandle) && !isProfileLoading && (
              <p className="text-[10px] text-muted-foreground mt-2 font-mono text-center sm:text-right">
                Connect at least one platform to sync.
              </p>
            )}
            
            {/* Display platform statuses if any */}
            {syncPlatforms.data?.platforms && (
              <div className="mt-4 space-y-2">
                {syncPlatforms.data.platforms.map((p) => (
                  <div key={p.platform} className="text-xs font-mono p-3 bg-muted/30 rounded border border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {p.ok ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                      <span className="capitalize font-bold">{p.platform}</span>
                      {p.handle && <span className="text-muted-foreground">({p.handle})</span>}
                    </div>
                    <div className="text-right">
                      {p.ok ? (
                        <span>Solved today: <span className="text-primary font-bold">{p.solvedToday}</span></span>
                      ) : (
                        <span className="text-destructive">{p.error || "Failed"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
