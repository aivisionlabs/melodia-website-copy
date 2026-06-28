import { PACKAGES } from "@/app/(app)/create/_components/create-page-constants";
import BulkOrderCTA from "@/components/BulkOrderCTA";
import { FAQ } from "@/components/FAQ";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { PRICING_FAQ } from "@/lib/seo/faq";
import { testimonials as testimonialImageUrls } from "@/lib/testimonials-data";
import { ArrowRight, Check, X } from "lucide-react";
import Link from "next/link";
import { PricingPlanCard } from "./PricingPlanCard";
import PricingTestimonialsClient from "./PricingTestimonialsClient";
import PricingTrackingClient from "./PricingTrackingClient";
import { getPricingPlanUi, PRICING_PLAN_UI } from "./pricing-plan-ui";

function formatInr(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

/* ─── Feature comparison table data ─────────────────────────────────────── */
type CellVal = true | false | string;

const COMPARISON_ROWS: {
  label: string;
  sub?: string;
  vals: [CellVal, CellVal, CellVal];
}[] = [
  { label: "Custom Lyrics", vals: [false, true, true] },
  { label: "Instant delivery (<2 mins)", vals: [true, true, false] },
  { label: "Edit Lyrics", vals: [false, true, true] },
  { label: "Create music from scratch", vals: [false, true, true] },
  { label: "2 AI-generated audio versions", vals: [true, true, true] },
  { label: "Free song revisions", vals: [false, "1 revision", "2 revisions"] },
  { label: "Listen before Payment", vals: [true, false, false] },
  { label: "Crafted by Experts", vals: [false, false, true] },
  { label: "Edit lyrics after generation", vals: [false, false, true] },
  { label: "WhatsApp support", vals: [false, false, true] },
];

/* ─── Cell renderer ─────────────────────────────────────────────────────── */
function Cell({ val, recommended }: { val: CellVal; recommended?: boolean }) {
  if (val === true) {
    return (
      <div className="flex justify-center">
        <span className="sr-only">Included</span>
        <div
          className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm"
          aria-hidden
        >
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      </div>
    );
  }
  if (val === false) {
    return (
      <div className="flex justify-center">
        <span className="sr-only">Not included</span>
        <div
          className="w-5 h-5 rounded-full bg-red-50 border border-red-200 flex items-center justify-center"
          aria-hidden
        >
          <X className="w-3 h-3 text-red-400" strokeWidth={3} />
        </div>
      </div>
    );
  }
  return (
    <p
      className={`text-center text-xs font-semibold font-body ${recommended ? "text-accent-coral" : "text-text-teal"}`}
    >
      {val}
    </p>
  );
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sourceSongIdParamRaw = resolvedSearchParams?.sourceSongId;
  const sourceSongIdParam = Array.isArray(sourceSongIdParamRaw)
    ? sourceSongIdParamRaw[0]
    : sourceSongIdParamRaw;
  const hasTemplateSelection =
    !!sourceSongIdParam && Number.isFinite(parseInt(sourceSongIdParam, 10));

  const [p0, p1, p2] = PACKAGES;
  const u0 = PRICING_PLAN_UI[p0.id];
  const u1 = PRICING_PLAN_UI[p1.id];
  const u2 = PRICING_PLAN_UI[p2.id];

  const buildCreateRequestHref = (plan: string) => {
    const qs = new URLSearchParams();
    qs.set("plan", plan);
    if (hasTemplateSelection && sourceSongIdParam) {
      qs.set("sourceSongId", sourceSongIdParam);
    }
    return `/create?${qs.toString()}`;
  };

  return (
    <div className="bg-secondary-cream min-h-screen relative overflow-hidden">
      <PricingTrackingClient
        packages={PACKAGES.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
        }))}
      />

      {/* Subtle background decoration */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary-yellow/8 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full bg-accent-coral/6 blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 w-72 h-72 rounded-full bg-primary-yellow/5 blur-3xl" />
      </div>

      {/* Header */}
      <Header showCreateSongCTA />

      <main className="relative z-10 px-0 pt-10 pb-16 sm:pt-14">
        {/* ── Hero text ── */}
        <div className="text-center px-4 mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-text-teal mb-3 leading-tight">
            Create a Song They&apos;ll Never Forget
          </h1>
          <p className="text-text-teal/80 mb-1">
            Made in India, Loved by the World.
          </p>
        </div>

        {hasTemplateSelection ? (
          <div className="max-w-2xl mx-auto mb-6 rounded-2xl border border-primary-yellow/35 bg-primary-yellow/10 px-4 py-3 text-sm font-body text-text-teal/90 text-center leading-snug">
            You&apos;re continuing from a template.{" "}
            <span className="font-semibold text-text-teal">
              NameDrop isn&apos;t available
            </span>{" "}
            for this flow — use{" "}
            <span className="font-semibold">Fully Custom</span> or{" "}
            <span className="font-semibold">Pro Studio</span> below.
          </div>
        ) : null}

        <p className="lg:hidden text-center text-xs font-body text-text-teal/50 mb-3 px-6">
          Swipe to view 3 plans
        </p>

        {/* ── Pricing cards — horizontal scroll on mobile, 3-col on lg ── */}
        <div
          className="flex overflow-x-auto lg:grid lg:grid-cols-3 lg:overflow-visible lg:gap-6 lg:max-w-5xl lg:mx-auto lg:px-6 xl:px-0 [&::-webkit-scrollbar]:hidden"
          role="region"
          aria-label="Pricing plans"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            paddingLeft: "1.25rem",
            gap: "1rem",
          }}
        >
          {PACKAGES.map((pkg) => {
            const ui = getPricingPlanUi(pkg.id);
            if (!ui) return null;
            const disabled = hasTemplateSelection && pkg.id === "package_1";
            return (
              <PricingPlanCard
                key={pkg.id}
                pkg={pkg}
                ui={ui}
                href={buildCreateRequestHref(pkg.id)}
                disabled={disabled}
                disabledHint={
                  disabled
                    ? `Template selection not available in ${pkg.name}`
                    : undefined
                }
              />
            );
          })}

          {/* Right spacer — mobile scroll only */}
          <div className="flex-none lg:hidden w-4" aria-hidden="true" />
        </div>

        {/* ── Full Feature Comparison Table ── */}
        <div className="mt-14 sm:mt-16 max-w-5xl mx-auto px-3 sm:px-6">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-teal">
              Full Feature Comparison
            </h2>
            <p className="text-sm font-body text-text-teal/55 mt-1">
              See exactly what you get with each plan
            </p>
          </div>

          {/* Table — no horizontal scroll, all 4 cols fit */}
          <div className="rounded-2xl border border-text-teal/10 shadow-card bg-white overflow-hidden">
            <table className="w-full border-collapse">
              {/* Header */}
              <thead>
                <tr>
                  {/* Feature col header */}
                  <th
                    className="text-left px-2 py-3 text-[10px] font-semibold font-body text-text-teal/50 uppercase tracking-widest bg-gray-50/80 border-b border-text-teal/8"
                    style={{ width: "34%" }}
                  >
                    Feature
                  </th>

                  {/* NameDrop */}
                  <th
                    className="px-1.5 sm:px-3 py-3 sm:py-4 text-center bg-gray-50/80 border-b border-text-teal/8 border-l border-text-teal/8"
                    style={{ width: "22%" }}
                  >
                    <div className="text-[10px] sm:text-sm font-heading font-bold text-text-teal leading-tight">
                      {p0.name}
                    </div>
                    <div className="text-[9px] sm:text-xs font-body text-text-teal/50 mt-0.5">
                      {formatInr(p0.price)}
                    </div>
                  </th>

                  {/* Standard */}
                  <th
                    className="px-1.5 sm:px-3 py-3 sm:py-4 text-center bg-gray-50/80 border-b border-text-teal/8 border-l border-text-teal/8"
                    style={{ width: "22%" }}
                  >
                    <div className="text-[10px] sm:text-sm font-heading font-bold text-text-teal leading-tight">
                      {p1.name}
                    </div>
                    <div className="text-[9px] sm:text-xs font-body text-text-teal/50 mt-0.5">
                      {formatInr(p1.price)}
                    </div>
                  </th>

                  {/* Premium */}
                  <th
                    className="px-1.5 sm:px-3 py-3 sm:py-4 text-center bg-gray-50/80 border-b border-text-teal/8 border-l border-text-teal/8"
                    style={{ width: "22%" }}
                  >
                    <div className="text-[10px] sm:text-sm font-heading font-bold text-text-teal leading-tight">
                      {p2.name}
                    </div>
                    <div className="text-[9px] sm:text-xs font-body text-text-teal/50 mt-0.5">
                      {formatInr(p2.price)}
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row.label}
                    className={i % 2 === 0 ? "bg-white" : "bg-gray-50/60"}
                  >
                    {/* Feature name */}
                    <td className="px-2 sm:px-4 py-2.5 sm:py-3.5 text-[10px] sm:text-sm font-semibold font-body text-text-teal border-b border-text-teal/6 leading-tight">
                      {row.label}
                    </td>

                    {/* NameDrop value */}
                    <td className="px-1.5 py-2.5 sm:py-3.5 border-b border-text-teal/6 border-l border-text-teal/6">
                      <Cell val={row.vals[0]} />
                    </td>

                    {/* Standard value */}
                    <td className="px-1.5 py-2.5 sm:py-3.5 border-b border-text-teal/6 border-l border-text-teal/6">
                      <Cell val={row.vals[1]} />
                    </td>

                    {/* Premium value */}
                    <td className="px-1.5 py-2.5 sm:py-3.5 border-b border-text-teal/6 border-l border-text-teal/6">
                      <Cell val={row.vals[2]} />
                    </td>
                  </tr>
                ))}

                {/* CTA row */}
                <tr className="bg-gray-50/40">
                  <td className="px-2 sm:px-4 py-3 sm:py-4" />
                  <td className="px-1.5 py-3 sm:py-4 border-l border-text-teal/6 text-center">
                    {hasTemplateSelection ? (
                      <span className="text-[10px] font-body text-text-teal/40">
                        Not available
                      </span>
                    ) : (
                      <Link
                        href={buildCreateRequestHref(p0.id)}
                        data-pricing-analytics="package_select"
                        data-package-id={p0.id}
                        data-package-name={p0.name}
                        data-package-price={String(p0.price)}
                        aria-label={`${u0.ctaLabel}: ${p0.name}, ${formatInr(p0.price)}`}
                        className="inline-flex items-center gap-1 sm:gap-1.5 bg-primary-yellow text-text-teal text-[10px] sm:text-sm font-heading font-bold px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full hover:bg-primary-yellow/90 transition-all motion-safe:hover:scale-105 shadow-sm"
                      >
                        {u0.tableCtaLabel}{" "}
                        <ArrowRight
                          className="w-2.5 h-2.5 sm:w-4 sm:h-4 shrink-0"
                          aria-hidden
                        />
                      </Link>
                    )}
                  </td>
                  <td className="px-1.5 py-3 sm:py-4 border-l border-text-teal/6 text-center">
                    <Link
                      href={buildCreateRequestHref(p1.id)}
                      data-pricing-analytics="package_select"
                      data-package-id={p1.id}
                      data-package-name={p1.name}
                      data-package-price={String(p1.price)}
                      aria-label={`${u1.ctaLabel}: ${p1.name}, ${formatInr(p1.price)}`}
                      className="inline-flex items-center gap-1 sm:gap-1.5 bg-accent-coral text-white text-[10px] sm:text-sm font-heading font-bold px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full hover:bg-accent-coral/90 transition-all motion-safe:hover:scale-105 shadow-sm"
                    >
                      {u1.tableCtaLabel}{" "}
                      <ArrowRight
                        className="w-2.5 h-2.5 sm:w-4 sm:h-4 shrink-0"
                        aria-hidden
                      />
                    </Link>
                  </td>
                  <td className="px-1.5 py-3 sm:py-4 border-l border-text-teal/6 text-center">
                    <Link
                      href={buildCreateRequestHref(p2.id)}
                      data-pricing-analytics="package_select"
                      data-package-id={p2.id}
                      data-package-name={p2.name}
                      data-package-price={String(p2.price)}
                      aria-label={`${u2.ctaLabel}: ${p2.name}, ${formatInr(p2.price)}`}
                      className="inline-flex items-center gap-1 sm:gap-1.5 bg-primary-yellow text-text-teal text-[10px] sm:text-sm font-heading font-bold px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full hover:bg-primary-yellow/90 transition-all motion-safe:hover:scale-105 shadow-sm"
                    >
                      {u2.tableCtaLabel}{" "}
                      <ArrowRight
                        className="w-2.5 h-2.5 sm:w-4 sm:h-4 shrink-0"
                        aria-hidden
                      />
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="mt-14 sm:mt-16 max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-teal text-center mb-6">
            Common questions
          </h2>
          <FAQ items={PRICING_FAQ} />
        </div>

        <section
          className="mt-14 sm:mt-16 max-w-5xl mx-auto px-4 sm:px-6"
          aria-labelledby="pricing-loved-heading"
        >
          <h2
            id="pricing-loved-heading"
            className="text-center text-xl sm:text-2xl font-heading font-bold text-text-teal mb-2"
          >
            Loved by thousands
          </h2>
          <p className="text-center text-sm font-body text-text-teal/55 mb-8 max-w-lg mx-auto">
            Tap a photo to see the full story — real moments from Melodia
            customers
          </p>
          <PricingTestimonialsClient testimonials={testimonialImageUrls} />
        </section>

        {/* ── Bulk & Corporate ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-16 sm:mt-20">
          <BulkOrderCTA variant="pricing" />
        </div>
      </main>

      <Footer />
    </div>
  );
}
