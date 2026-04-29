import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Task, Category } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Check, MoreVertical, Pencil, Trash2, Plus, Play, CheckCircle2, Circle, Code2, RefreshCw, Repeat, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORY_CONFIG } from "@/lib/constants";
import { TaskEditDialog } from "@/components/task-edit-dialog";
import {
  useUpdateTask,
  useDeleteTask,
  useIncrementTaskProgress,
  getListTasksQueryKey,
  getGetTodayStatsQueryKey,
  getGetWeeklyActivityQueryKey,
  getGetCategoryBreakdownQueryKey,
  getGetStreakQueryKey,
  getGetProfileQueryKey
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function TaskCard({
  task,
  index = 0,
  readOnly = false
}: {
  task: Task;
  index?: number;
  readOnly?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const incrementTask = useIncrementTaskProgress();

  const catConfig = CATEGORY_CONFIG[task.category as Category] || CATEGORY_CONFIG[Category.other];
  const Icon = catConfig.icon;

  const isQuantitative = task.targetCount > 1;
  const progressPct = isQuantitative ? Math.min(100, Math.round((task.progressCount / task.targetCount) * 100)) : 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ date: task.date }) });
    queryClient.invalidateQueries({ queryKey: getGetTodayStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetWeeklyActivityQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCategoryBreakdownQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetStreakQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
  };

  const handleToggleComplete = () => {
    if (readOnly) return;
    
    // Optimistic update logic could go here, but let's just use the mutation
    const newCompleted = !task.completed;
    
    updateTask.mutate(
      {
        id: task.id,
        data: {
          completed: newCompleted,
          // If completing a quantitative task, max out the progress
          // If uncompleting, let's just untoggle completed but leave progress alone, or reset? Let's leave alone
          ...(newCompleted && isQuantitative ? { progressCount: task.targetCount } : {})
        }
      },
      {
        onSuccess: () => invalidateAll(),
        onError: () => toast({ title: "Error", variant: "destructive" })
      }
    );
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly || task.completed) return;
    
    incrementTask.mutate(
      { id: task.id },
      {
        onSuccess: () => invalidateAll(),
        onError: () => toast({ title: "Error", variant: "destructive" })
      }
    );
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate(
        { id: task.id },
        {
          onSuccess: () => invalidateAll(),
          onError: () => toast({ title: "Error", variant: "destructive" })
        }
      );
    }
  };

  return (
    <>
      <Card 
        className={cn(
          "overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 border-l-4 group relative",
          task.completed ? "opacity-50 border-l-muted bg-muted/20" : "hover:border-l-primary bg-card",
        )}
        style={{ 
          borderLeftColor: task.completed ? undefined : `hsl(var(--${catConfig.colorClass.replace('text-', '')}))`,
          animationDelay: `${index * 50}ms` 
        }}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-4">
            
            {/* Completion Toggle */}
            <button
              onClick={handleToggleComplete}
              disabled={readOnly || updateTask.isPending}
              className={cn(
                "mt-1 shrink-0 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                task.completed ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-110",
                (readOnly || updateTask.isPending) && "opacity-50 cursor-not-allowed"
              )}
            >
              {task.completed ? (
                <CheckCircle2 className="h-6 w-6 fill-primary/20" />
              ) : (
                <Circle className="h-6 w-6" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge variant="secondary" className={cn("text-[10px] font-mono", catConfig.colorClass, catConfig.bgClass)}>
                  <Icon className="h-3 w-3 mr-1" />
                  {catConfig.label}
                </Badge>
                {task.linkedPlatform && (
                  <Badge variant="outline" className="text-[10px] font-mono bg-background text-muted-foreground border-primary/20 capitalize">
                    <Code2 className="h-3 w-3 mr-1 text-primary" />
                    {task.linkedPlatform}
                  </Badge>
                )}
                {task.recurring && (
                  <Badge variant="outline" className="text-[10px] font-mono bg-background text-muted-foreground border-primary/20">
                    <Repeat className="h-3 w-3 mr-1 text-primary" />
                    Daily
                  </Badge>
                )}
                {task.carryOverIncomplete && (
                  <Badge variant="outline" className="text-[10px] font-mono bg-background text-muted-foreground border-primary/20">
                    <ArrowRight className="h-3 w-3 mr-1 text-primary" />
                    Carry-over
                  </Badge>
                )}
                {task.notes && (
                  <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={task.notes}>
                    {task.notes}
                  </span>
                )}
              </div>
              
              <h3 className={cn(
                "font-medium text-base mb-2 transition-all duration-300",
                task.completed && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h3>

              {/* Quantitative Progress */}
              {isQuantitative && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>Progress: {task.progressCount} / {task.targetCount}</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={progressPct} className="h-2 flex-1" />
                    
                    {!readOnly && !task.completed && (
                      <div className="flex flex-col items-end gap-1">
                        {task.linkedPlatform && (
                          <div className="text-[9px] text-primary/70 font-mono flex items-center gap-1">
                            <RefreshCw className="h-2.5 w-2.5" /> Auto
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-12 px-0 shrink-0 font-mono text-xs border-primary/20 hover:border-primary/50 text-primary hover:bg-primary/10"
                          onClick={handleIncrement}
                          disabled={incrementTask.isPending}
                        >
                          +1
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {!readOnly && (
              <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 font-mono text-xs">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <TaskEditDialog
        task={task}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
