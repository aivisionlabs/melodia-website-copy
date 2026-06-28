# Lyrics Timestamp Conversion Guide

This guide explains how to convert word-level timestamps to line-level timestamps for better readability in your music player.

## Problem

When you have lyrics with word-level timestamps like this:
```javascript
const alignedWords = [
  { word: "In ", startS: 12.71809, endS: 12.76596 },
  { word: "the ", startS: 12.87234, endS: 13.24468 },
  { word: "dusty ", startS: 13.34441, endS: 14.12234 },
  // ... hundreds more words
];
```

It's difficult to display them in a readable format. You want line-level timestamps like this:
```javascript
const lyrics = [
  { index: 0, text: "In the dusty lanes where memories bloom", start: 12718, end: 18670 },
  { index: 1, text: "Underneath the Pakur afternoon", start: 18710, end: 23377 },
  // ... much more readable
];
```

## Solution

We've created a comprehensive solution with the following components:

### 1. Utility Functions (`src/lib/utils.ts`)

Contains the core conversion logic:
- `convertWordTimestampsToLines()` - Basic conversion
- `convertWordTimestampsToLinesAdvanced()` - Advanced conversion with better line detection

### 2. Lyrics Processor (`src/lib/lyrics-processor.ts`)

A comprehensive class for handling lyrics data:
- `LyricsProcessor.convertWordToLineTimestamps()` - Convert word timestamps to line timestamps
- `LyricsProcessor.validateLyrics()` - Clean and validate lyrics data
- `LyricsProcessor.findCurrentLine()` - Find current line based on playback time
- `LyricsProcessor.getDisplayLines()` - Get lines to display with context
- `LyricsProcessor.formatTime()` - Format time in MM:SS format

### 3. Conversion Script (`scripts/convert-lyrics.js`)

A reusable Node.js script for converting lyrics files:

```bash
# Convert a lyrics file
node scripts/convert-lyrics.js lyrics-timestamp-conversion.cjs src/lib/my-song-lyrics.ts
```

## How to Use

### Step 1: Prepare Your Word-Level Timestamps

Create a file with your word-level timestamps in this format:
```javascript
const alignedWords = [
  { word: "Hello", startS: 0.0, endS: 0.5, success: true, palign: 0 },
  { word: "world", startS: 0.6, endS: 1.2, success: true, palign: 0 },
  // ... more words
];
```

### Step 2: Convert to Line-Level Timestamps

Run the conversion script:
```bash
node scripts/convert-lyrics.js input-file.js output-file.ts
```

### Step 3: Use in Your Application

Import and use the converted lyrics:
```typescript
import { lyrics } from './my-song-lyrics';
import { LyricsProcessor } from './lyrics-processor';

// Find current line during playback
const currentTime = 15.5; // seconds
const currentLineIndex = LyricsProcessor.findCurrentLine(lyrics, currentTime);

// Get lines to display
const displayLines = LyricsProcessor.getDisplayLines(lyrics, currentLineIndex, 2);
```

## Line Detection Algorithm

The conversion algorithm uses several strategies to determine line breaks:

1. **Natural Breaks**: Words ending with `.`, `!`, or `?`
2. **Pauses**: Gaps longer than 0.8 seconds between words
3. **Section Markers**: Words like "(Verse 1)", "(Chorus)", etc.
4. **Length Limits**: Force breaks after 8-12 words for readability
5. **Punctuation**: Look for commas, semicolons as good break points

## Example Output

**Input (word-level):**
```javascript
[
  { word: "In ", startS: 12.71809, endS: 12.76596 },
  { word: "the ", startS: 12.87234, endS: 13.24468 },
  { word: "dusty ", startS: 13.34441, endS: 14.12234 },
  { word: "lanes ", startS: 14.17553, endS: 15.15957 },
  { word: "where ", startS: 15.2234, endS: 15.47872 },
  { word: "memories ", startS: 15.56848, endS: 16.35638 },
  { word: "bloom ", startS: 16.45213, endS: 18.67021 }
]
```

**Output (line-level):**
```javascript
[
  {
    index: 0,
    text: "In the dusty lanes where memories bloom",
    start: 12718,
    end: 18670
  }
]
```

## Tips for Best Results

1. **Clean Input**: Ensure your word-level timestamps are accurate
2. **Review Output**: Always review the converted lines for readability
3. **Adjust Algorithm**: Modify the conversion parameters if needed
4. **Test Playback**: Verify the timing works correctly with your audio

## Troubleshooting

### Lines Too Long
- Increase the word count limit in the conversion algorithm
- Add more punctuation detection rules

### Lines Too Short
- Decrease the word count limit
- Adjust the pause detection threshold

### Timing Issues
- Check that your input timestamps are in seconds
- Verify the conversion from seconds to milliseconds

## Files Created

- `src/lib/utils.ts` - Core conversion functions
- `src/lib/lyrics-processor.ts` - Lyrics processing utilities
- `src/lib/lyrics-data.ts` - Converted lyrics data
- `scripts/convert-lyrics.js` - Conversion script
- `converted-lyrics.json` - JSON output for reference