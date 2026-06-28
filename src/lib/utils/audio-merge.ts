/**
 * Client-side audio merging utility using Web Audio API
 * This works entirely in the browser and is compatible with Vercel
 */

import * as lamejsModule from '@breezystack/lamejs';

export interface MergeAudioOptions {
  audioUrl1: string | File;
  audioUrl2: string | File;
  onProgress?: (progress: number) => void;
}

export async function mergeAudioFiles(
  options: MergeAudioOptions
): Promise<Blob> {
  const { audioUrl1, audioUrl2, onProgress } = options;

  // Create audio context
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    onProgress?.(10);

    // Helper function to get array buffer from File or URL
    const getArrayBuffer = async (source: string | File): Promise<ArrayBuffer> => {
      if (source instanceof File) {
        // If it's a File object, read it directly
        try {
          return await source.arrayBuffer();
        } catch (error: any) {
          throw new Error(`Failed to read file: ${error.message}. The file may be corrupted or inaccessible.`);
        }
      } else {
        // If it's a URL (including blob URLs), fetch it
        let response: Response;
        try {
          // For blob URLs, we don't need CORS mode
          const fetchOptions: RequestInit = source.startsWith('blob:')
            ? {}
            : { mode: 'cors' };

          response = await fetch(source, fetchOptions);
        } catch (error: any) {
          throw new Error(`Failed to fetch audio file: ${error.message}. Make sure the audio URL is accessible${source.startsWith('blob:') ? '' : ' and CORS is enabled'}.`);
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
        }

        try {
          return await response.arrayBuffer();
        } catch (error: any) {
          throw new Error(`Failed to read audio data: ${error.message}. The file may be corrupted.`);
        }
      }
    };

    onProgress?.(30);

    // Get array buffers from both sources (File or URL)
    const [arrayBuffer1, arrayBuffer2] = await Promise.all([
      getArrayBuffer(audioUrl1),
      getArrayBuffer(audioUrl2),
    ]);

    onProgress?.(50);

    // Decode audio data
    let audioBuffer1: AudioBuffer, audioBuffer2: AudioBuffer;

    // Helper to decode with better error messages
    const decodeAudio = async (arrayBuffer: ArrayBuffer, fileNumber: string): Promise<AudioBuffer> => {
      try {
        // Create a copy to avoid transferable issues
        const bufferCopy = arrayBuffer.slice(0);
        return await audioContext.decodeAudioData(bufferCopy);
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        console.error(`Audio decoding error for file ${fileNumber}:`, error);

        // Provide more helpful error messages
        if (errorMessage.includes('Unable to decode')) {
          throw new Error(
            `Failed to decode ${fileNumber} audio file. This usually means:\n` +
            `1. The audio format is not supported by your browser\n` +
            `2. The file is corrupted or incomplete\n` +
            `3. The file uses a codec that requires additional browser support\n\n` +
            `Try using a different audio file format (MP3, WAV, or OGG) or convert the file first.`
          );
        }

        throw new Error(`Failed to decode ${fileNumber} audio file: ${errorMessage}. Please ensure it's a valid, uncorrupted audio file.`);
      }
    };

    try {
      // Decode sequentially to get better error messages
      audioBuffer1 = await decodeAudio(arrayBuffer1, 'first');
      audioBuffer2 = await decodeAudio(arrayBuffer2, 'second');
    } catch (error: any) {
      // Re-throw the error (it's already formatted)
      throw error;
    }

    onProgress?.(70);

    // Use the first audio's sample rate (resampling the second if needed)
    const sampleRate = audioBuffer1.sampleRate;

    // Resample second audio if sample rates differ
    let audioBuffer2Resampled = audioBuffer2;
    if (audioBuffer2.sampleRate !== sampleRate) {
      // Simple resampling: adjust length based on sample rate ratio
      const ratio = sampleRate / audioBuffer2.sampleRate;
      const newLength = Math.floor(audioBuffer2.length * ratio);
      audioBuffer2Resampled = audioContext.createBuffer(
        audioBuffer2.numberOfChannels,
        newLength,
        sampleRate
      );

      // Linear interpolation resampling
      for (let channel = 0; channel < audioBuffer2.numberOfChannels; channel++) {
        const sourceData = audioBuffer2.getChannelData(channel);
        const targetData = audioBuffer2Resampled.getChannelData(channel);
        for (let i = 0; i < newLength; i++) {
          const sourceIndex = i / ratio;
          const index1 = Math.floor(sourceIndex);
          const index2 = Math.min(index1 + 1, sourceData.length - 1);
          const fraction = sourceIndex - index1;
          targetData[i] = sourceData[index1] * (1 - fraction) + sourceData[index2] * fraction;
        }
      }
    }

    // Calculate total length
    const totalLength = audioBuffer1.length + audioBuffer2Resampled.length;

    // Create a new audio buffer for the merged audio
    const mergedBuffer = audioContext.createBuffer(
      Math.max(audioBuffer1.numberOfChannels, audioBuffer2Resampled.numberOfChannels),
      totalLength,
      sampleRate
    );

    // Copy first audio
    for (let channel = 0; channel < audioBuffer1.numberOfChannels; channel++) {
      const channelData = audioBuffer1.getChannelData(channel);
      const mergedChannelData = mergedBuffer.getChannelData(channel);
      mergedChannelData.set(channelData, 0);
    }

    // Copy second audio after the first one
    for (let channel = 0; channel < audioBuffer2Resampled.numberOfChannels; channel++) {
      const channelData = audioBuffer2Resampled.getChannelData(channel);
      const mergedChannelData = mergedBuffer.getChannelData(
        Math.min(channel, mergedBuffer.numberOfChannels - 1)
      );
      mergedChannelData.set(channelData, audioBuffer1.length);
    }

    onProgress?.(90);

    // Convert AudioBuffer to MP3 format
    const mp3Blob = audioBufferToMp3(mergedBuffer);

    onProgress?.(100);

    return mp3Blob;
  } finally {
    // Clean up audio context
    await audioContext.close();
  }
}

/**
 * Convert AudioBuffer to MP3 Blob using lamejs
 */
function audioBufferToMp3(buffer: AudioBuffer): Blob {
  const sampleRate = buffer.sampleRate;
  const numberOfChannels = buffer.numberOfChannels;
  const length = buffer.length;

  // Convert float samples to 16-bit PCM
  const samples: Int16Array[] = [];
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    const pcmData = new Int16Array(length);
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    samples.push(pcmData);
  }

  // Get Mp3Encoder from the module - handle different export structures
  const lamejs = (lamejsModule as any).default || lamejsModule;
  const Mp3Encoder = lamejs.Mp3Encoder;

  if (!Mp3Encoder) {
    throw new Error('Mp3Encoder not found in lamejs. Please ensure @breezystack/lamejs is properly installed.');
  }

  const mp3encoder = new Mp3Encoder(
    numberOfChannels,
    sampleRate,
    128 // bitrate in kbps
  );

  // Encode audio data
  const mp3Data: Int8Array[] = [];
  const sampleBlockSize = 1152; // MP3 frame size

  if (numberOfChannels === 1) {
    // Mono
    for (let i = 0; i < length; i += sampleBlockSize) {
      const sampleChunk = samples[0].subarray(i, Math.min(i + sampleBlockSize, length));
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
  } else {
    // Stereo or more channels (use first two for stereo)
    const leftChannel = samples[0];
    const rightChannel = samples.length > 1 ? samples[1] : samples[0]; // Use left channel if only one exists

    for (let i = 0; i < length; i += sampleBlockSize) {
      const leftChunk = leftChannel.subarray(i, Math.min(i + sampleBlockSize, length));
      const rightChunk = rightChannel.subarray(i, Math.min(i + sampleBlockSize, length));
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
  }

  // Flush remaining data
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  // Combine all MP3 data chunks
  const totalLength = mp3Data.reduce((sum, chunk) => sum + chunk.length, 0);
  const combinedMp3 = new Int8Array(totalLength);
  let offset = 0;
  for (const chunk of mp3Data) {
    combinedMp3.set(chunk, offset);
    offset += chunk.length;
  }

  return new Blob([combinedMp3], { type: 'audio/mpeg' });
}

