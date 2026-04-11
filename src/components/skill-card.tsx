import Link from "next/link";
import { MessageSquare, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  SKILL_TYPE_COLORS,
  SKILL_TYPE_LABELS,
  type Skill,
} from "@/lib/types";

type Props = {
  skill: Pick<
    Skill,
    | "slug"
    | "title"
    | "summary"
    | "type"
    | "tags"
    | "score"
    | "comments_count"
  >;
};

export function SkillCard({ skill }: Props) {
  return (
    <Link
      href={`/s/${skill.slug}`}
      className="group block rounded-xl border bg-background p-5 transition hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="mb-2 flex items-center gap-2">
        <Badge className={SKILL_TYPE_COLORS[skill.type]} variant="outline">
          {SKILL_TYPE_LABELS[skill.type]}
        </Badge>
      </div>
      <h3 className="text-base font-semibold leading-tight group-hover:underline">
        {skill.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
        {skill.summary}
      </p>
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" />
          {skill.score}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          {skill.comments_count}
        </span>
        {skill.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="font-mono">
            #{tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
