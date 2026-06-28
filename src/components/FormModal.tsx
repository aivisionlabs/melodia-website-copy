"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export const FormModal = ({ isOpen, onClose, title }: FormModalProps) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay that greys out the page */}
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
        <div className="bg-card border border-border rounded-lg p-5 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-elegant animate-fade-in">
          <div className="flex justify-between items-start mb-5 md:mb-6">
            <div className="flex items-center gap-3">
              <Image
                src="/images/melodia-logo.jpeg"
                alt="Melodia"
                width={40}
                height={40}
                className="h-8 w-8 md:h-10 md:w-10 rounded object-contain"
              />
              <h3 className="text-lg md:text-xl font-semibold text-foreground pr-4 leading-tight">
                {title}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-10 w-10 md:h-12 md:w-12 p-0 flex-shrink-0 hover:bg-gray-100 rounded-full"
            >
              ×
            </Button>
          </div>

          <div className="text-center py-8 md:py-10">
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Form fields will be implemented in the next prompt as requested.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
