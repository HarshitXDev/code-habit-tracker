import { useMemo } from "react";
import { format } from "date-fns";
import { Loader2, Flame, Target, Trophy, Info, Award } from "lucide-react";
import {
  useListTasks,
  useGetTodayStats,
  useGetStreak,
  useGetProfile,
  getListTasksQueryKey,
  getGetTodayStatsQueryKey,
  getGetStreakQueryKey,
  getGetProfileQueryKey
} from "@workspace/api-client-react";

import { TaskCard } from "@/components/task-card";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Home() {
  const todayDate = format(new Date(), "yyyy-MM-dd");

  const { data: tasks, isLoading: isLoadingTasks } = useListTasks(
    { date: todayDate },
    { query: { queryKey: getListTasksQueryKey({ date: todayDate }) } }
  );

  const { data: stats, isLoading: isLoadingStats } = useGetTodayStats({
    query: { queryKey: getGetTodayStatsQueryKey() }
  });

  const { data: streak, isLoading: isLoadingStreak } = useGetStreak({
    query: { queryKey: getGetStreakQueryKey() }
  });

  const { data: profile, isLoading: isLoadingProfile } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() }
  });

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return [...tasks].sort((a, b) => {
      if (a.completed === b.completed) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return a.completed ? 1 : -1;
    });
  }, [tasks]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Command Deck</h1>
          <p className="text-muted-foreground font-mono text-sm">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-4">
          {isLoadingStreak ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-md border border-primary/20 font-mono font-bold">
              <Flame className="h-4 w-4" />
              <span>{streak?.currentStreak || 0} Day{streak?.currentStreak !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">COMPLETION</p>
              {isLoadingStats ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold font-mono leading-none">
                    {Math.round(stats?.completionPct || 0)}%
                  </span>
                  <span className="text-sm text-muted-foreground font-mono mb-0.5">
                    ({stats?.completedTasks || 0}/{stats?.totalTasks || 0})
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">TOTAL UNITS</p>
              {isLoadingStats ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold font-mono leading-none">
                    {stats?.progressUnits || 0}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono mb-0.5">
                    / {stats?.targetUnits || 0}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Award className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">POINTS</p>
              {isLoadingProfile ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <div className="flex items-end gap-2">
                  <span className={cn(
                    "text-2xl font-bold font-mono leading-none",
                    profile?.points && profile.points > 0 ? "text-green-500" : profile?.points && profile.points < 0 ? "text-red-500" : "text-muted-foreground"
                  )}>
                    {profile?.points && profile.points > 0 ? '+' : ''}{profile?.points || 0}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0" />
          <CardContent className="p-4 relative z-10 flex items-center justify-between h-full">
            <div>
              <p className="text-xs text-primary font-mono font-semibold mb-2">DAILY PROGRESS</p>
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-3xl font-bold font-mono leading-none text-primary">
                  {Math.round(stats?.completionPct || 0)}%
                </span>
              )}
            </div>
            
            <div className="relative h-16 w-16 shrink-0">
              <svg className="h-full w-full transform -rotate-90 drop-shadow-md">
                <circle
                  className="text-muted stroke-current"
                  strokeWidth="5"
                  cx="32"
                  cy="32"
                  r="28"
                  fill="transparent"
                />
                {!isLoadingStats && (
                  <circle
                    className="text-primary stroke-current transition-all duration-1000 ease-out"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={175.9}
                    strokeDashoffset={175.9 - (175.9 * (stats?.completionPct || 0)) / 100}
                    cx="32"
                    cy="32"
                    r="28"
                    fill="transparent"
                  />
                )}
              </svg>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Today's Objectives</h2>
          <div className="w-32">
            <CreateTaskDialog date={todayDate} />
          </div>
        </div>

        {isLoadingTasks ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent">
            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Info className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No objectives set</h3>
              <p className="text-muted-foreground font-mono text-sm max-w-xs mb-6">
                Your command deck is empty. Add some tasks to start your daily practice.
              </p>
              <div className="w-40">
                <CreateTaskDialog date={todayDate} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task, idx) => (
              <TaskCard key={task.id} task={task} index={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
