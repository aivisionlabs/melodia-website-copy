"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// iOS Audio Context type declaration
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface IOSAudioState {
  isIOS: boolean;
  iosAudioUnlocked: boolean;
}

interface IOSAudioActions {
  unlockIOSAudio: () => Promise<void>;
}

export function useIOSAudio(): IOSAudioState & IOSAudioActions {
  const [iosAudioUnlocked, setIosAudioUnlocked] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Check if we're on iOS (improved detection)
  const isIOS = typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)); // iPad on iOS 13+

  // iOS Audio unlock mechanism
  const unlockIOSAudio = useCallback(async () => {
    if (!isIOS || iosAudioUnlocked) {
      console.log("🔓 iOS unlock skip:", { isIOS, iosAudioUnlocked });
      return;
    }

    console.log("🔓 Starting iOS audio unlock...");

    try {
      // Method 1: Create a simple audio context and resume it
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        if (audioContext.state === "suspended") {
          await audioContext.resume();
          console.log("✅ Audio context resumed");
        }
      } catch (contextError) {
        console.warn(`⚠️ Audio context error: ${contextError}`);
      }

      // Method 2: Try to play a minimal audio element
      try {
        const testAudio = document.createElement("audio");
        testAudio.src =
          "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT";
        testAudio.volume = 0;
        testAudio.preload = "none";

        await testAudio.play();
        testAudio.pause();

        console.log("✅ Test audio played successfully");
        setIosAudioUnlocked(true);
      } catch (minimalError) {
        console.warn(`⚠️ Minimal audio error: ${minimalError}`);

        // Last resort: just mark as unlocked and hope for the best
        setIosAudioUnlocked(true);
      }
    } catch (error) {
      console.warn(`❌ iOS audio unlock failed: ${error}`);
      // Even if unlock fails, mark as unlocked to prevent repeated attempts
      setIosAudioUnlocked(true);
    }
  }, [isIOS, iosAudioUnlocked]);

  // iOS Audio Context initialization
  useEffect(() => {
    const initializeAudioContext = async () => {
      if (isIOS) {
        try {
          // Create a simple audio context
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          const audioContext = new AudioContextClass();
          audioContextRef.current = audioContext;

          // Resume audio context on user interaction
          const resumeAudioContext = async () => {
            if (audioContext.state === "suspended") {
              await audioContext.resume();
            }

            // Try to unlock iOS audio on any interaction
            if (!iosAudioUnlocked) {
              await unlockIOSAudio();
            }

            // Remove event listeners after first interaction
            document.removeEventListener("touchstart", resumeAudioContext);
            document.removeEventListener("touchend", resumeAudioContext);
            document.removeEventListener("click", resumeAudioContext);
          };

          document.addEventListener("touchstart", resumeAudioContext);
          document.addEventListener("touchend", resumeAudioContext);
          document.addEventListener("click", resumeAudioContext);
        } catch (error) {
          console.warn(`Failed to initialize iOS Audio Context: ${error}`);
        }
      }
    };

    initializeAudioContext();
  }, [isIOS, iosAudioUnlocked, unlockIOSAudio]);

  return {
    isIOS,
    iosAudioUnlocked,
    unlockIOSAudio,
  };
}



