import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { Calendar as CalendarIcon, Info } from "lucide-react";
import {
  useListTasks,
  getListTasksQueryKey
} from "@workspace/api-client-react";

import { TaskCard } from "@/components/task-card";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function History() {
  const [date, setDate] = useState<Date>(subDays(new Date(), 1));
  const dateStr = format(date, "yyyy-MM-dd");

  const { data: tasks, isLoading } = useListTasks(
    { date: dateStr },
    { query: { queryKey: getListTasksQueryKey({ date: dateStr }) } }
  );

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
          <h1 className="text-3xl font-bold tracking-tight mb-1">Time Machine</h1>
          <p className="text-muted-foreground font-mono text-sm">
            Review your past objectives
          </p>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-mono font-normal border-primary/20",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => newDate && setDate(newDate)}
              initialFocus
              disabled={(d) => d > new Date()}
            />
          </PopoverContent>
        </Popover>
      </header>

      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">
          Objectives for {format(date, "MMM d, yyyy")}
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent">
            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Info className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No data found</h3>
              <p className="text-muted-foreground font-mono text-sm max-w-xs">
                There are no tasks recorded for this date.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task, idx) => (
              <TaskCard key={task.id} task={task} index={idx} readOnly={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
