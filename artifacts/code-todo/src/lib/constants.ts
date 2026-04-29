import {
  Code2,
  BookOpen,
  Briefcase,
  Layout,
  MessageSquare,
  Network,
  CircleDashed
} from "lucide-react";
import { Category } from "@workspace/api-client-react";

export const CATEGORY_CONFIG: Record<
  Category,
  { label: string; icon: React.ElementType; colorClass: string; bgClass: string }
> = {
  [Category.dsa]: {
    label: "Data Structures & Algorithms",
    icon: Code2,
    colorClass: "text-chart-1",
    bgClass: "bg-chart-1/10",
  },
  [Category.project]: {
    label: "Side Project",
    icon: Briefcase,
    colorClass: "text-chart-2",
    bgClass: "bg-chart-2/10",
  },
  [Category.learning]: {
    label: "Learning",
    icon: BookOpen,
    colorClass: "text-chart-3",
    bgClass: "bg-chart-3/10",
  },
  [Category.reading]: {
    label: "Reading",
    icon: BookOpen,
    colorClass: "text-chart-4",
    bgClass: "bg-chart-4/10",
  },
  [Category.system_design]: {
    label: "System Design",
    icon: Network,
    colorClass: "text-chart-5",
    bgClass: "bg-chart-5/10",
  },
  [Category.interview]: {
    label: "Interview Prep",
    icon: MessageSquare,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
  },
  [Category.other]: {
    label: "Other",
    icon: CircleDashed,
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted",
  },
};
