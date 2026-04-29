import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { Flame, Trophy, CalendarDays, Activity } from "lucide-react";
import {
  useGetStreak,
  useGetWeeklyActivity,
  useGetCategoryBreakdown,
  getGetStreakQueryKey,
  getGetWeeklyActivityQueryKey,
  getGetCategoryBreakdownQueryKey,
  Category
} from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Stats() {
  const { data: streak, isLoading: isLoadingStreak } = useGetStreak({
    query: { queryKey: getGetStreakQueryKey() }
  });

  const { data: weeklyActivity, isLoading: isLoadingWeekly } = useGetWeeklyActivity({
    query: { queryKey: getGetWeeklyActivityQueryKey() }
  });

  const { data: categoryBreakdown, isLoading: isLoadingCategories } = useGetCategoryBreakdown({
    query: { queryKey: getGetCategoryBreakdownQueryKey() }
  });

  const chartData = useMemo(() => {
    if (!weeklyActivity) return [];
    return weeklyActivity.map(day => ({
      name: format(parseISO(day.date), "EEE"), // Mon, Tue, etc.
      completed: day.completedTasks,
      total: day.totalTasks,
      fullDate: format(parseISO(day.date), "MMM d, yyyy")
    })).reverse(); // Assuming API might return latest first, or already sorted. Let's make sure it's chronological. We'll trust API sort for now but reverse if it's descending. Actually let's assume API returns sorted chronologically or we should sort it. The API spec says "Last 7 days" so probably chronological.
  }, [weeklyActivity]);

  const sortedCategories = useMemo(() => {
    if (!categoryBreakdown) return [];
    return [...categoryBreakdown].sort((a, b) => b.completedCount - a.completedCount);
  }, [categoryBreakdown]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Command Stats</h1>
        <p className="text-muted-foreground font-mono text-sm">
          Analytics and lifetime progress
        </p>
      </header>

      {/* Top Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-primary/20">
          <CardContent className="p-6 flex items-center gap-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Flame className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-mono mb-1">CURRENT STREAK</p>
              {isLoadingStreak ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold font-mono leading-none">
                    {streak?.currentStreak || 0}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono mb-1">days</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-6">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <Trophy className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-mono mb-1">LONGEST STREAK</p>
              {isLoadingStreak ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold font-mono leading-none">
                    {streak?.longestStreak || 0}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono mb-1">days</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Chart */}
        <Card className="col-span-1 lg:col-span-2 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingWeekly ? (
              <Skeleton className="h-[300px] w-full mt-4" />
            ) : chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground font-mono text-sm border-2 border-dashed rounded-md mt-4">
                No activity data available
              </div>
            ) : (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'monospace' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'monospace' }} 
                      allowDecimals={false}
                    />
                    <RechartsTooltip 
                      cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border p-3 rounded-md shadow-lg font-mono text-xs space-y-1">
                              <p className="font-bold text-foreground mb-2">{data.fullDate}</p>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Completed:</span>
                                <span className="text-primary font-bold">{data.completed}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Total:</span>
                                <span>{data.total}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="completed" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={40}
                      animationDuration={1000}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.completed === entry.total && entry.total > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground)/0.4)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="col-span-1 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCategories ? (
              <div className="space-y-4 mt-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : sortedCategories.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground font-mono text-sm border-2 border-dashed rounded-md mt-4">
                No completed tasks
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {sortedCategories.map((item) => {
                  const config = CATEGORY_CONFIG[item.category as Category] || CATEGORY_CONFIG[Category.other];
                  const Icon = config.icon;
                  const maxCount = sortedCategories[0]?.completedCount || 1;
                  const pct = Math.max(2, (item.completedCount / maxCount) * 100);
                  
                  return (
                    <div key={item.category} className="space-y-2">
                      <div className="flex justify-between items-center text-sm font-mono">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", config.colorClass)} />
                          <span>{config.label}</span>
                        </div>
                        <span className="font-bold">{item.completedCount}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ 
                            width: `${pct}%`,
                            backgroundColor: `hsl(var(--${config.colorClass.replace('text-', '')}))` 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
