import {
  Music,
  Download,
  Wand2,
  Copyright,
  Mic2,
  PlayCircle,
} from "lucide-react";

const features = [
  {
    icon: Music,
    title: "Create songs in minutes",
    description:
      "Create AI songs in minutes. No need to wait for days for your song. Get your song ready in minutes.",
  },
  {
    icon: Wand2,
    title: "Get upto 2 song variations",
    description:
      "Get upto 2 song variations. Choose your favorite from two unique versions.",
  },
  {
    icon: PlayCircle,
    title: "Expert crafted songs",
    description:
      "Get our experts to craft your perfect lyrics and beautiful song for you.",
  },
  {
    icon: Copyright,
    title: "Copyright-Free & Original Music",
    description:
      "Every song you generate is original and safe to use. No copyright strikes, no licensing issues. Use your AI-generated music confidently anywhere.",
  },
  {
    icon: Mic2,
    title: "Studio-Quality Audio Output",
    description:
      "Get clean vocals, balanced instruments, and polished sound quality. Your AI-generated songs are ready to listen, share, or download instantly.",
  },
  {
    icon: Download,
    title: "Easy Download & Sharing",
    description:
      "Download your songs in high-quality audio formats and use them across platforms. Perfect for videos, social media, podcasts, and personal projects.",
  },
];

interface OccasionFeaturesProps {
  occasionName: string;
}

export function OccasionFeatures({ occasionName }: OccasionFeaturesProps) {
  return (
    <section className="py-16 sm:py-24 bg-white/50 relative overflow-hidden">
      <div className="container px-4 mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-teal font-heading mb-4">
            AI {occasionName} Song Generator Features
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-2xl shadow-lg border border-primary-yellow/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-primary-yellow/10 rounded-xl flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-accent-coral" />
              </div>
              <h3 className="text-xl font-bold text-text-teal font-heading mb-3">
                {feature.title}
              </h3>
              <p className="text-text-teal/80 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
