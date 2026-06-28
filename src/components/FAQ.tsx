"use client";

import { FAQItem } from "@/lib/seo/faq";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface FAQProps {
  items: FAQItem[];
  title?: string;
  className?: string;
  containerClassName?: string;
}

export function FAQ({ items, title, className, containerClassName }: FAQProps) {
  return (
    <section
      className={cn(
        "px-4 sm:px-5 md:px-8 lg:px-12 max-w-screen-2xl mx-auto relative z-10",
        containerClassName
      )}
    >
      <div className="max-w-4xl">
        {title && (
          <h2 className="text-xl sm:text-2xl font-bold text-text-teal font-heading mb-5 text-left pt-0">
            {title}
          </h2>
        )}
        <div className={cn("space-y-4", className)}>
          {items.map((item) => (
            <details
              key={item.question}
              className="bg-white/70 backdrop-blur-sm border border-primary-yellow/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 group"
            >
              <summary className="cursor-pointer font-semibold text-text-teal font-body list-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  <span className="flex-1">{item.question}</span>
                  <ChevronDown
                    className="w-5 h-5 text-primary-yellow flex-shrink-0 transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </span>
              </summary>
              <p className="mt-3 text-text-teal/80 font-body">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
