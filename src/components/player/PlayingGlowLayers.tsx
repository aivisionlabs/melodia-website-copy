import { cn } from "@/lib/utils";

interface PlayingGlowLayersProps {
  active: boolean;
  rounded?: "full" | "lg";
  className?: string;
}

export function PlayingGlowLayers({
  active,
  rounded = "full",
  className,
}: PlayingGlowLayersProps) {
  if (!active) return null;

  const roundedClass = rounded === "full" ? "rounded-full" : "rounded-lg";

  return (
    <>
      <div
        className={cn(
          "absolute inset-0 bg-primary-yellow/40 blur-3xl animate-pulse scale-110 duration-1000",
          roundedClass,
          className,
        )}
        aria-hidden
      />
      <div
        className={cn(
          "absolute inset-0 bg-accent-coral/30 blur-2xl animate-pulse delay-75 scale-125 duration-2000",
          roundedClass,
          className,
        )}
        aria-hidden
      />
    </>
  );
}
