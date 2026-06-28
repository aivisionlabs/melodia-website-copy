import { PenLine, Settings2, Sparkles, Music } from "lucide-react";

const steps = [
  {
    icon: PenLine,
    title: "Describe Your Song Idea",
    description: "Start by telling us what you want to create. Choose the mood, theme, language, and style, or simply write a short description of your song idea."
  },
  {
    icon: Settings2,
    title: "Choose Your Creation Mode",
    description: "Select how you want to generate your song. Create lyrics and music together, generate instrumental tracks, or let AI handle everything from scratch."
  },
  {
    icon: Sparkles,
    title: "Let AI Compose the Song",
    description: "Our AI processes your input and turns it into a complete song with melody, structure, and vocals, all generated in minutes."
  },
  {
    icon: Music,
    title: "Listen, Download, or Regenerate",
    description: "Preview your song instantly. Download it in high quality or regenerate until it feels just right. No limits on creativity."
  }
];

export function OccasionHowItWorks() {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div className="container px-4 mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-teal font-heading mb-4">
            How It Works?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-primary-yellow/20 h-full hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-accent-coral/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-accent-coral/20 transition-colors">
                  <span className="text-accent-coral font-bold text-lg">Step {index + 1}</span>
                </div>
                <h3 className="text-xl font-bold text-text-teal font-heading mb-3">
                  {step.title}
                </h3>
                <p className="text-text-teal/80 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

