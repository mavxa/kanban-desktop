import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Priority } from "./types";

interface TaskCardProps {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  tags: string[];
  onClick?: () => void;
}

interface TaskCardPreviewProps {
  title: string;
  description?: string;
  priority: Priority;
  tags: string[];
}

const priorityStyles: Record<Priority, string> = {
  low: "bg-surface-hover text-muted",
  medium: "bg-yellow-900/30 text-warning",
  high: "bg-red-900/30 text-danger",
};

function TaskCardContent({
  title,
  description,
  priority,
  tags,
}: TaskCardPreviewProps) {
  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase ${priorityStyles[priority]}`}
        >
          {priority}
        </span>
      </div>

      <h3 className="text-sm font-medium text-foreground transition-colors">
        {title}
      </h3>

      {description ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted">{description}</p>
      ) : null}

      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-border bg-surface-hover px-1.5 py-0.5 text-[10px] font-mono text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}

export function TaskCardPreview({
  title,
  description,
  priority,
  tags,
}: TaskCardPreviewProps) {
  return (
    <div className="group rounded-2xl border border-border bg-surface p-3 shadow-2xl shadow-black/50 ring-1 ring-accent/30">
      <TaskCardContent
        title={title}
        description={description}
        priority={priority}
        tags={tags}
      />
    </div>
  );
}

export function TaskCard({
  id,
  title,
  description,
  priority,
  tags,
  onClick,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="min-h-20 rounded-2xl border border-dashed border-accent/20 bg-surface/50 p-13"
      >
        <p className="flex items-center justify-center font-mono text-xs text-accent/50">
          Drag on
        </p>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group cursor-grab rounded-2xl border border-border bg-surface p-3 transition-all duration-200 hover:border-border-hover active:cursor-grabbing"
    >
      <TaskCardContent
        title={title}
        description={description}
        priority={priority}
        tags={tags}
      />
    </div>
  );
}
