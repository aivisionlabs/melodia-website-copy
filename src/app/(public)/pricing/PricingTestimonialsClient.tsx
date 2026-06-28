"use client";

import { useState } from "react";
import Image from "next/image";
import { TestimonialModal } from "@/components/TestimonialModal";

export default function PricingTestimonialsClient({
  testimonials,
}: {
  testimonials: string[];
}) {
  const [selectedTestimonial, setSelectedTestimonial] = useState<string | null>(
    null
  );

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {testimonials.map((testimonial, index) => (
          <div
            key={index}
            className="group relative aspect-square overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            style={{
              animationDelay: `${index * 150}ms`,
              animation: "fadeInUp 0.6s ease-out forwards",
              opacity: 0,
            }}
            onClick={() => setSelectedTestimonial(testimonial)}
          >
            <Image
              src={testimonial}
              alt={`Testimonial ${index + 1}`}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </div>
        ))}
      </div>

      <TestimonialModal
        image={selectedTestimonial}
        onClose={() => setSelectedTestimonial(null)}
      />
    </>
  );
}

