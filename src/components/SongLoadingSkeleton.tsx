"use client";

export function SongLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5 flex flex-col">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-2 pb-1 text-white">
        <div className="flex items-center justify-between mb-1">
          <div className="h-8 w-32 bg-yellow-300/30 animate-pulse rounded"></div>
          <div className="h-6 w-16 bg-yellow-300/30 animate-pulse rounded"></div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 bg-gradient-to-b from-gray-50 to-white">
        <div className="h-[calc(100vh-200px)] overflow-y-auto px-6 md:px-12">
          {/* Top padding */}
          <div className="h-[calc(40vh-80px)]"></div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8 md:space-y-10">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="text-center transition-all duration-700 ease-out min-h-[4rem] md:min-h-[4.5rem] flex items-center justify-center"
                >
                  <div className="h-6 w-64 bg-gray-200 animate-pulse rounded"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom padding */}
          <div className="h-[calc(40vh-80px)]"></div>
        </div>
      </div>

      {/* Fixed Bottom Player Controls Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:p-6 shadow-lg z-50">
        {/* Song Info Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-200 animate-pulse rounded-lg flex-shrink-0"></div>
            <div className="min-w-0 flex-1">
              <div className="h-5 w-48 bg-gray-200 animate-pulse rounded"></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>

        {/* Controls Skeleton */}
        <div className="flex items-center gap-3 md:gap-4 mb-4 justify-center">
          <div className="h-10 w-10 md:h-12 md:w-12 bg-gray-200 animate-pulse rounded-full"></div>
          <div className="h-14 w-14 md:h-16 md:w-16 bg-gray-200 animate-pulse rounded-full"></div>
          <div className="h-10 w-10 md:h-12 md:w-12 bg-gray-200 animate-pulse rounded-full"></div>
        </div>

        {/* Progress Bar Skeleton */}
        <div className="space-y-2">
          <div className="w-full h-2 bg-gray-200 animate-pulse rounded"></div>
          <div className="flex justify-between">
            <div className="h-4 w-8 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 w-8 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
