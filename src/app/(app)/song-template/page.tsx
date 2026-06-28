"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { TemplateSongPicker } from "@/components/TemplateSongPicker";
import Link from "next/link";
import { Loader2, Check, Headphones, Clock } from "lucide-react";

interface TemplatedInstance {
  id: number;
  slug: string;
  status: string;
  song_title: string;
  recipient_name: string;
  created_at: string;
  template_title: string | null;
}

export default function TemplatedSongsPage() {
  const router = useRouter();
  const [instances, setInstances] = useState<TemplatedInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    const loadInstances = async () => {
      try {
        setLoadingInstances(true);
        const res = await fetch("/api/templated-songs/my-instances", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setInstances(data.instances ?? []);
      } catch {
        setInstances([]);
      } finally {
        setLoadingInstances(false);
      }
    };
    loadInstances();
  }, []);

  const handleGenerate = async (templateId: number, name: string) => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/templated-songs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      if (data.slug) {
        router.push(`/song-template/song/${data.slug}`);
        return;
      }
      setGenerateError("No slug returned");
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-text mb-2">
          Templated Songs
        </h1>
        <p className="text-text/80 font-body mb-6">
          Pick a template, enter a name, and generate your personalized song.
        </p>

        {/* My generated songs */}
        <section className="mb-10" aria-label="My generated songs">
          <h2 className="text-xl font-display font-bold text-text mb-3 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary-yellow" />
            My generated songs
          </h2>
          {loadingInstances ? (
            <div className="flex items-center gap-2 text-text/70 font-body py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : instances.length === 0 ? (
            <p className="text-text/70 font-body text-sm py-2">
              You haven’t generated any songs from templates yet. Pick a
              template below and create one.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {instances.map((inst) => {
                const isProcessing =
                  inst.status === "processing" || inst.status === "queued";
                const isFailed =
                  inst.status === "failed" || inst.status === "error";
                return (
                  <li key={inst.id}>
                    <Link
                      href={`/song-template/song/${inst.slug}`}
                      className="block rounded-xl border border-border bg-white/90 p-4 shadow-sm hover:shadow-md hover:border-primary-yellow/30 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p
                            className="font-heading font-semibold text-text truncate"
                            title={inst.recipient_name}
                          >
                            {inst.recipient_name}
                          </p>
                          <p className="text-text/70 text-sm font-body mt-0.5">
                            {inst.song_title}
                          </p>
                          {inst.template_title && (
                            <p className="text-text/50 text-xs font-body mt-1">
                              From: {inst.template_title}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            isProcessing
                              ? "bg-amber-100 text-amber-800"
                              : isFailed
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {isProcessing ? (
                            <>
                              <Clock className="w-3 h-3" />
                              In progress
                            </>
                          ) : isFailed ? (
                            <>Failed</>
                          ) : (
                            <>
                              <Check className="w-3 h-3" />
                              Ready
                            </>
                          )}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Template picker */}
        <TemplateSongPicker
          onGenerate={handleGenerate}
          isGenerating={generating}
          error={generateError}
        />
      </main>
      <Footer />
    </div>
  );
}
