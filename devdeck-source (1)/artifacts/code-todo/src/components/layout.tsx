import { Link, useLocation, useLocation as useWouterLocation } from "wouter";
import { useEffect, useRef } from "react";
import { CheckSquare, Calendar, BarChart3, Terminal, Settings as SettingsIcon, RefreshCw, Loader2, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSyncPlatforms,
  useRunRollover,
  useGetProfile,
  getListTasksQueryKey,
  getGetTodayStatsQueryKey,
  getGetStreakQueryKey,
  getGetWeeklyActivityQueryKey,
  getGetCategoryBreakdownQueryKey,
  getGetProfileQueryKey
} from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const syncPlatforms = useSyncPlatforms();
  const runRollover = useRunRollover();
  
  const rolloverAttempted = useRef(false);

  useEffect(() => {
    if (!rolloverAttempted.current) {
      rolloverAttempted.current = true;
      runRollover.mutate(undefined, {
        onSuccess: (data) => {
          if (data.rolledOver) {
            queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetTodayStatsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetStreakQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetWeeklyActivityQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetCategoryBreakdownQueryKey() });

            if (data.deductedTasks > 0 || data.createdTasks.length > 0 || data.pointsDelta !== 0) {
              toast({
                title: "Daily rollover completed",
                description: `${data.pointsDelta < 0 ? data.pointsDelta : '+' + data.pointsDelta} points for ${data.deductedTasks} unfinished, +${data.createdTasks.length} tasks carried over.`,
              });
            }
          }
        }
      });
    }
  }, [runRollover, queryClient, toast]);

  const { data: profile } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() }
  });

  const handleGlobalSync = () => {
    syncPlatforms.mutate(undefined, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTodayStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStreakQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWeeklyActivityQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCategoryBreakdownQueryKey() });

        const lc = data.platforms.find(p => p.platform === 'leetcode');
        const cf = data.platforms.find(p => p.platform === 'codeforces');

        if (!lc?.connected && !cf?.connected) {
          toast({
            title: "No platforms connected",
            description: "Go to Settings to connect LeetCode or Codeforces.",
            action: <Button variant="outline" size="sm" onClick={() => setLocation('/settings')}>Settings</Button>
          });
          return;
        }

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

  const navItems = [
    { href: "/", label: "Today", icon: CheckSquare },
    { href: "/history", label: "History", icon: Calendar },
    { href: "/stats", label: "Stats", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-mono text-sm selection:bg-primary/30 selection:text-primary">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex shrink-0">
        <div className="p-6 flex items-center gap-3 text-primary border-b border-border font-bold text-lg tracking-tight">
          <Terminal className="h-6 w-6" />
          <span>DevDeck</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-md transition-all cursor-pointer",
                  location === item.href
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border text-xs text-muted-foreground space-y-2">
          <div className="flex items-center justify-between">
            <span>Points</span>
            <span className={cn("flex items-center gap-1 font-bold font-mono", profile?.points && profile.points > 0 ? "text-green-500" : profile?.points && profile.points < 0 ? "text-red-500" : "")}>
              <Award className="h-3 w-3" />
              {profile?.points && profile.points > 0 ? '+' : ''}{profile?.points || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Status</span>
            <span className="text-green-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Online
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card flex justify-around p-2 z-50">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-md transition-all cursor-pointer",
                location === item.href
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-[10px]">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative pb-16 md:pb-0">
        <div className="sticky top-0 z-40 flex justify-end p-4 pointer-events-none">
          <Button 
            variant="secondary" 
            size="sm" 
            className="pointer-events-auto shadow-md font-mono border border-border bg-card hover:bg-muted"
            onClick={handleGlobalSync}
            disabled={syncPlatforms.isPending}
          >
            {syncPlatforms.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync Now
          </Button>
        </div>
        <div className="max-w-4xl mx-auto p-4 pt-0 md:p-8 md:pt-4">
          {children}
        </div>
      </main>
    </div>
  );
}
