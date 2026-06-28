"use client";

import { X } from "lucide-react";
import Image from "next/image";

interface TestimonialModalProps {
  image: string | null;
  onClose: () => void;
}

export const TestimonialModal = ({ image, onClose }: TestimonialModalProps) => {
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>
        <Image
          src={image}
          alt="Testimonial"
          fill
          className="object-contain"
          sizes="100vw"
        />
      </div>
    </div>
  );
};
