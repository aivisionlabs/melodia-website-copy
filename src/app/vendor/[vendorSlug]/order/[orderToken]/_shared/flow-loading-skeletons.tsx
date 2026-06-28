import { Skeleton } from "@/components/ui/skeleton";

/** Custom song: long form (title, sections); optional fake bottom CTA strip for pending layout. */
export function CustomSongFlowSkeleton({
  showBottomCtaSkeleton = true,
}: {
  showBottomCtaSkeleton?: boolean;
}) {
  return (
    <>
      <main
        className={`flex-1 max-w-lg mx-auto w-full px-4 pt-6 ${showBottomCtaSkeleton ? "pb-36" : "pb-12"}`}
      >
        <div className="mb-6 space-y-3">
          <Skeleton className="h-9 w-[85%] max-w-sm rounded-xl bg-text-teal/10" />
          <Skeleton className="h-4 w-full max-w-md rounded-lg bg-text-teal/10" />
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-text-teal/10 bg-white/80 p-4 space-y-3">
            <Skeleton className="h-4 w-24 rounded-md bg-text-teal/10" />
            <Skeleton className="h-12 w-full rounded-xl bg-text-teal/10" />
          </div>
          <div className="rounded-2xl border border-text-teal/10 bg-white/80 p-4 space-y-3">
            <Skeleton className="h-4 w-28 rounded-md bg-text-teal/10" />
            <Skeleton className="h-24 w-full rounded-xl bg-text-teal/10" />
          </div>
          <div className="rounded-2xl border border-text-teal/10 bg-white/80 p-4 space-y-3">
            <Skeleton className="h-4 w-32 rounded-md bg-text-teal/10" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-20 rounded-full bg-text-teal/10" />
              <Skeleton className="h-9 w-24 rounded-full bg-text-teal/10" />
              <Skeleton className="h-9 w-16 rounded-full bg-text-teal/10" />
            </div>
          </div>
          <div className="rounded-2xl border border-text-teal/10 bg-white/80 p-4 space-y-3">
            <Skeleton className="h-4 w-36 rounded-md bg-text-teal/10" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="aspect-[4/3] w-full rounded-xl bg-text-teal/10" />
              <Skeleton className="aspect-[4/3] w-full rounded-xl bg-text-teal/10" />
            </div>
          </div>
        </div>
      </main>

      {showBottomCtaSkeleton ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-text-teal/10 bg-secondary-cream/96 px-4 py-4 backdrop-blur-md">
          <div className="mx-auto max-w-lg">
            <Skeleton className="mx-auto h-14 w-full max-w-lg rounded-full bg-text-teal/15" />
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Templated song: occasion + template picker grid (parent wraps `<main>`). */
export function TemplatedSongFlowSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-3">
        <Skeleton className="h-9 w-[70%] max-w-xs rounded-xl bg-text-teal/10" />
        <Skeleton className="h-4 w-full max-w-sm rounded-lg bg-text-teal/10" />
      </div>

      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-20 rounded-md bg-text-teal/10" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-28 rounded-full bg-text-teal/10" />
          <Skeleton className="h-10 w-32 rounded-full bg-text-teal/10" />
          <Skeleton className="h-10 w-24 rounded-full bg-text-teal/10" />
        </div>
      </div>

      <div className="mb-4">
        <Skeleton className="h-4 w-36 rounded-md bg-text-teal/10" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-2xl border border-text-teal/10 bg-white/80"
          >
            <Skeleton className="aspect-square w-full rounded-none bg-text-teal/10" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-full rounded-md bg-text-teal/10" />
              <Skeleton className="h-3 w-2/3 rounded-md bg-text-teal/10" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** RJ show: centered loading hero (parent wraps `<main>`). */
export function RjShowFlowSkeleton() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12">
      <Skeleton className="mb-6 h-20 w-20 shrink-0 rounded-full bg-primary-yellow/40" />
      <Skeleton className="mb-3 h-7 w-56 max-w-full rounded-lg bg-text-teal/15" />
      <Skeleton className="mb-2 h-4 w-full max-w-sm rounded-md bg-text-teal/10" />
      <Skeleton className="h-4 max-w-[260px] w-full rounded-md bg-text-teal/10" />
    </div>
  );
}
