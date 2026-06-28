"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { textualTestimonials, TextualTestimonial } from "@/lib/textual-testimonials-data";

interface TestimonialsCarouselProps {
  testimonials?: TextualTestimonial[];
  autoPlayInterval?: number; // 0 or falsy = disabled
  showDots?: boolean;
  showArrows?: boolean;
}

export function TestimonialsCarousel({
  testimonials = textualTestimonials,
  autoPlayInterval = 5000,
  showDots = true,
  showArrows = true,
}: TestimonialsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset expanded state when slide changes
  useEffect(() => {
    setIsExpanded(false);
  }, [currentIndex]);

  // Auto-play — disabled when autoPlayInterval is 0 or falsy
  useEffect(() => {
    if (!autoPlayInterval) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlayInterval, testimonials.length]);

  const goToPrevious = () =>
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  const goToNext = () =>
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
          i < rating ? "fill-primary-yellow text-primary-yellow" : "fill-gray-200 text-gray-200"
        }`}
        aria-hidden="true"
      />
    ));

  return (
    <div className="w-full max-w-4xl">
      {/* Carousel slide */}
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {testimonials.map((testimonial, idx) => {
            const isLong = testimonial.text.length > 120;
            const expanded = isExpanded && idx === currentIndex;
            return (
            <div key={testimonial.id} className="min-w-full py-1">
              <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-primary-yellow/20">
                {/* Rating */}
                <div className="flex items-center gap-1 mb-2" aria-label={`${testimonial.rating} star rating`}>
                  {renderStars(testimonial.rating)}
                </div>

                {/* Text */}
                <blockquote>
                  <p className={`text-text-teal text-sm leading-relaxed mb-2 ${!expanded ? "line-clamp-3" : ""}`}>
                    {testimonial.text}
                  </p>
                  {isLong && !expanded && (
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="text-accent-coral text-xs font-semibold font-body mb-2 hover:underline"
                    >
                      Read more
                    </button>
                  )}

                  {/* Author */}
                  <footer className="flex items-center gap-3 mt-2">
                    <div
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-coral to-accent-coral/70 flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      aria-hidden="true"
                    >
                      {testimonial.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <cite className="not-italic font-semibold text-text-teal text-sm block">
                        {testimonial.name}
                      </cite>
                      {testimonial.handle && (
                        <p className="text-text-teal/55 text-xs">{testimonial.handle}</p>
                      )}
                    </div>
                  </footer>
                </blockquote>
              </div>
            </div>
          )})}
        </div>
      </div>

      {/* Bottom navigation — arrows at bottom, NOT floating in center */}
      {showArrows && testimonials.length > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-text-teal/40 text-xs font-body">
            {currentIndex + 1} / {testimonials.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={goToPrevious}
              className="w-9 h-9 rounded-full bg-white border border-primary-yellow/30 flex items-center justify-center text-text-teal hover:bg-primary-yellow/10 shadow-sm transition-all duration-200 active:scale-95"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNext}
              className="w-9 h-9 rounded-full bg-white border border-primary-yellow/30 flex items-center justify-center text-text-teal hover:bg-primary-yellow/10 shadow-sm transition-all duration-200 active:scale-95"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dots (optional) */}
      {showDots && testimonials.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? "w-8 h-2 bg-primary-yellow"
                  : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
