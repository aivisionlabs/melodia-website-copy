import Image from "next/image";

// Simple logo component for header (small size)
export const HeaderLogo: React.FC<{ className?: string; alt?: string }> = ({
  className = "",
  alt = "Melodia Logo",
}) => {
  return (
    <Image
      src="/images/melodia-logo-transparent.png"
      alt={alt}
      width={1080}
      height={608}
      className={`w-20 sm:w-24 md:w-28 lg:w-32 h-auto object-contain ${className}`}
      priority={true}
      sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 112px"
    />
  );
};

// Large logo component for center section
export const CenterLogo: React.FC<{ className?: string; alt?: string }> = ({
  className = "",
  alt = "Melodia Logo",
}) => {
  return (
    <Image
      src="/images/melodia-logo-transparent.png"
      alt={alt}
      width={300}
      height={300}
      className={`w-48 sm:w-40 md:w-48 lg:w-56 h-auto object-contain ${className}`}
      priority={true}
      sizes="(max-width: 640px) 96px, (max-width: 1024px) 128px, 224px"
    />
  );
};
