import { UserIcon } from "@/icons";

const SIZE_CLASSES = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
} as const;

const ICON_CLASSES = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-7 h-7",
} as const;

export default function StaffAvatar({
  src,
  name,
  size = "md",
  className = "",
}: {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = SIZE_CLASSES[size];
  const iconClass = ICON_CLASSES[size];
  const hasRound = /\brounded-(full|xl|lg|md|sm)\b/.test(className);
  const shape = hasRound ? "" : "rounded-full";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} ${shape} object-cover ring-2 ring-gray-100 dark:ring-gray-800 flex-shrink-0 ${className}`}
      />
    );
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={`${sizeClass} ${shape} bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center ring-2 ring-gray-100 dark:ring-gray-800 flex-shrink-0 ${className}`}
    >
      {initials ? (
        <span className={`${size === "xs" ? "text-[9px]" : size === "sm" ? "text-[10px]" : "text-xs"} font-bold text-purple-600 dark:text-purple-400`}>
          {initials}
        </span>
      ) : (
        <UserIcon className={`${iconClass} text-purple-600 dark:text-purple-400`} />
      )}
    </div>
  );
}
