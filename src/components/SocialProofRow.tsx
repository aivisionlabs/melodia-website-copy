const stats = [
  {
    value: "India's 1st",
    label: "Custom Song Platform",
    sub: "Pioneering personalised music",
    emoji: "🏆",
    valueColor: "text-accent-coral",
    accentBg: "bg-accent-coral",
  },
  {
    value: "800+",
    label: "Songs Delivered",
    sub: "30+ influencer collabs",
    emoji: "🎵",
    valueColor: "text-text-teal",
    accentBg: "bg-primary-yellow",
  },
  {
    value: "5 ⭐",
    label: "Google Rating",
    sub: "From real happy customers",
    emoji: "❤️",
    valueColor: "text-primary-yellow",
    accentBg: "bg-accent-coral",
  },
  {
    value: "2M+",
    label: "People Reached",
    sub: "Across Instagram & more",
    emoji: "🌍",
    valueColor: "text-text-teal",
    accentBg: "bg-primary-yellow",
  },
];

export default function SocialProofRow() {
  return (
    <section className="py-4 sm:py-5 md:py-7" aria-label="Why Melodia?">
      <div className="px-4 sm:px-5 md:px-8 lg:px-12 mb-3 md:mb-4 max-w-screen-2xl mx-auto">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold font-heading text-text-teal leading-tight">
          Why Melodia?
        </h2>
        <p className="text-text-teal/60 text-xs sm:text-sm mt-0.5 font-body">
          Our story in numbers
        </p>
      </div>

      {/* 2×2 grid — always */}
      <div className="px-4 sm:px-5 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
            >
              {/* Colored top accent bar */}
              <div className={`h-1.5 w-full ${stat.accentBg}`} aria-hidden="true" />

              <div className="p-4 md:p-6">
                <div className="text-xl md:text-2xl mb-2" aria-hidden="true">
                  {stat.emoji}
                </div>
                <div className={`text-2xl sm:text-3xl md:text-4xl font-bold font-heading ${stat.valueColor} leading-none mb-1.5`}>
                  {stat.value}
                </div>
                <div className="text-text-teal font-semibold text-xs sm:text-sm font-heading leading-tight mb-1">
                  {stat.label}
                </div>
                <div className="text-text-teal/50 text-[11px] sm:text-xs font-body leading-snug">
                  {stat.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
