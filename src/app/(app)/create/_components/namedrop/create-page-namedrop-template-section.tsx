"use client";

import type { ReactNode, RefObject } from "react";
import Image from "next/image";
import { CheckCircle2, Loader2 } from "lucide-react";
import { InlineSongPlayer } from "@/components/create-song-request/InlineSongPlayer";
import { components, transitions } from "@/lib/design-system";
import { CreatePageRecipientSection } from "../create-page-recipient-section";

export type NameDropTemplate = {
  id: number;
  title: string;
  slug: string;
  language?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  previewAudioUrl?: string | null;
  templateLyrics?: string | null;
};

export function CreatePageNameDropTemplateSection({
  loading,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  effectiveOccasion,
  recipientRef,
  recipientDetails,
  onRecipientChange,
  recipientFocused,
  onRecipientFocus,
  onRecipientBlur,
  recipientError,
  renderSelectedAction,
  onUpgradeToFullCustom,
}: {
  loading: boolean;
  templates: NameDropTemplate[];
  selectedTemplateId: number | null;
  onSelectTemplate: (id: number) => void;
  effectiveOccasion?: string;
  recipientRef?: RefObject<HTMLInputElement | null>;
  recipientDetails?: string;
  onRecipientChange?: (value: string) => void;
  recipientFocused?: boolean;
  onRecipientFocus?: () => void;
  onRecipientBlur?: () => void;
  recipientError?: string;
  /** Custom action rendered below the selected template. When provided, replaces the default CreatePageRecipientSection. */
  renderSelectedAction?: (templateId: number) => ReactNode;
  /** e.g. switch to Fully Custom on the public create page */
  onUpgradeToFullCustom?: () => void;
}) {
  return (
    <div className="mb-5">
      <section
        className="bg-white border border-text-teal/10"
        style={{
          borderRadius: components.card.borderRadius,
          padding: components.card.padding,
          boxShadow: components.card.shadow,
        }}
      >
      <h3 className="text-sm font-bold text-text-teal mb-3">
        Choose a song and make it yours.
      </h3>

      {loading ? (
        <div className="flex items-center gap-2 text-text-teal/70 text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-text-teal/60">
          No NameDrop templates are available for this occasion yet.
        </p>
      ) : (
        <div className="space-y-7">
          {templates.map((template) => {
            const isSelected = template.id === selectedTemplateId;
            return (
              <div key={template.id} className="space-y-0">
                <div
                  className={`w-full text-left rounded-xl border p-3 transition-all ${
                    isSelected
                      ? "border-primary-yellow bg-primary-yellow/10"
                      : "border-text-teal/10 hover:border-primary-yellow/40 bg-white"
                  }`}
                  style={{
                    borderRadius: components.card.borderRadius,
                    transitionDuration: transitions.duration.fast,
                    transitionTimingFunction: transitions.timing.smooth,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary-cream shrink-0">
                      {template.imageUrl ? (
                        <Image
                          src={template.imageUrl}
                          alt={template.title}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-text-teal line-clamp-2 flex-1 min-w-0 pr-1">
                          {template.title}
                        </p>
                        {isSelected ? (
                          <CheckCircle2
                            className="w-5 h-5 text-primary-yellow shrink-0 mt-0.5"
                            aria-hidden
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectTemplate(template.id)}
                            className="shrink-0 inline-flex items-center rounded-lg border border-accent-coral/35 bg-accent-coral/10 px-2.5 py-1 text-xs font-semibold text-accent-coral transition-colors hover:bg-accent-coral/16 hover:border-accent-coral/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral/40 focus-visible:ring-offset-1"
                          >
                            Select
                          </button>
                        )}
                      </div>
                      {template.description ? (
                        <p className="text-xs text-text-teal/50 mt-0.5 line-clamp-3">
                          {template.description}
                        </p>
                      ) : null}
                      {template.language ? (
                        <span className="inline-flex items-center rounded-full bg-text-teal/8 border border-text-teal/15 px-2 py-0.5 text-[10px] font-medium text-text-teal/70 mt-1.5">
                          {template.language}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2">
                    <InlineSongPlayer
                      song={{
                        id: template.id,
                        title: template.title,
                        imageUrl: template.imageUrl || null,
                        slug: template.slug,
                        song_url: template.previewAudioUrl || null,
                        service_provider: "Template",
                        lyrics: template.templateLyrics || null,
                      }}
                      mode="embedded"
                    />
                  </div>
                </div>

                {isSelected ? (
                  renderSelectedAction ? (
                    renderSelectedAction(template.id)
                  ) : (
                    <CreatePageRecipientSection
                      recipientRef={recipientRef!}
                      effectiveOccasion={effectiveOccasion!}
                      recipientDetails={recipientDetails!}
                      onRecipientChange={onRecipientChange!}
                      recipientFocused={recipientFocused!}
                      onRecipientFocus={onRecipientFocus!}
                      onRecipientBlur={onRecipientBlur!}
                      recipientError={recipientError}
                      nameOnlyRecipient
                      embedded
                      autoFocus
                    />
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {!loading && templates.length > 0 && selectedTemplateId === null ? (
        <div className="mt-3 rounded-xl border border-dashed border-text-teal/20 bg-white/60 p-4">
          <p className="text-sm text-text-teal/70">
            Select a template first, then add the recipient name.
          </p>
        </div>
      ) : null}
      </section>

      {onUpgradeToFullCustom && !loading && (
        <p className="mt-3 text-center text-xs leading-relaxed text-text-teal/55">
          Not the song you need?{" "}
          <button
            type="button"
            onClick={onUpgradeToFullCustom}
            className="font-semibold text-accent-coral hover:text-accent-coral/90 underline decoration-accent-coral/30 underline-offset-2 transition-colors"
          >
            Upgrade to Full Custom Song
          </button>
        </p>
      )}
    </div>
  );
}
