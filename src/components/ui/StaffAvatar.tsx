import { UserIcon } from "@/icons";

const SIZE_CLASSES = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
} as const;

function GenericAvatar({ sizeClass }: { sizeClass: string }) {
  return (
    <div className={`${sizeClass} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0`}>
      <svg viewBox="0 0 24 24" fill="none" className="w-[60%] h-[60%] text-gray-400 dark:text-gray-500">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .66.54 1.2 1.2 1.2h16.8c.66 0 1.2-.54 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" fill="currentColor" />
      </svg>
    </div>
  );
}

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

  return <GenericAvatar sizeClass={`${sizeClass} ${shape} ${className}`} />;
}

export { GenericAvatar };
