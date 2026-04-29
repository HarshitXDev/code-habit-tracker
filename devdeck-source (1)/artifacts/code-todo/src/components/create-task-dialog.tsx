import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Check, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category, Platform } from "@workspace/api-client-react";
import {
  useCreateTask,
  getListTasksQueryKey,
  getGetTodayStatsQueryKey,
  getGetWeeklyActivityQueryKey,
  getGetCategoryBreakdownQueryKey,
  getGetStreakQueryKey,
  getGetProfileQueryKey
} from "@workspace/api-client-react";
import { CATEGORY_CONFIG } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.nativeEnum(Category),
  targetCount: z.coerce.number().min(1).optional().or(z.literal("")),
  notes: z.string().optional(),
  linkedPlatform: z.enum(["none", ...Object.values(Platform)]).optional().default("none"),
  recurring: z.boolean().default(false),
  carryOverIncomplete: z.boolean().default(false),
});

export function CreateTaskDialog({
  date = format(new Date(), "yyyy-MM-dd"),
  trigger
}: {
  date?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTask = useCreateTask();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: Category.dsa,
      targetCount: "",
      notes: "",
      linkedPlatform: "none",
      recurring: false,
      carryOverIncomplete: false,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
      ...values,
      targetCount: values.targetCount ? Number(values.targetCount) : 1,
      linkedPlatform: values.linkedPlatform === "none" ? null : (values.linkedPlatform as Platform),
      date,
    };

    createTask.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ date }) });
          queryClient.invalidateQueries({ queryKey: getGetTodayStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetWeeklyActivityQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetCategoryBreakdownQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStreakQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          
          toast({
            title: "Task created",
            description: "Successfully added to your deck.",
          });
          setOpen(false);
          form.reset();
        },
        onError: () => {
          toast({
            title: "Failed to create task",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full gap-2 font-mono">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] font-mono border-primary/20">
        <DialogHeader>
          <DialogTitle>New Task for {format(new Date(date + "T12:00:00"), "MMM d")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Solve 5 LeetCode problems..." {...field} className="bg-background/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(Category).map((cat) => {
                          const Icon = CATEGORY_CONFIG[cat].icon;
                          return (
                            <SelectItem key={cat} value={cat}>
                              <div className="flex items-center gap-2">
                                <Icon className={cn("h-4 w-4", CATEGORY_CONFIG[cat].colorClass)} />
                                <span>{CATEGORY_CONFIG[cat].label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target (Units)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="1 (Default)" {...field} className="bg-background/50" />
                    </FormControl>
                    <FormDescription className="text-[10px]">
                      e.g., 5 for 5 problems
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="linkedPlatform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to Platform</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {Object.values(Platform).map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-[10px]">
                    Auto-track problems during sync
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-background/50 p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Repeat daily</FormLabel>
                    <FormDescription className="text-[10px]">
                      A fresh copy is added to tomorrow's deck automatically.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="carryOverIncomplete"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-background/50 p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Carry over remaining</FormLabel>
                    <FormDescription className="text-[10px]">
                      If unfinished, the remaining amount rolls into tomorrow.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any specific context or links..." 
                      className="resize-none bg-background/50" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createTask.isPending} className="gap-2">
                {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Commit Task
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { cn } from "@/lib/utils";
