// Client-side function to fetch timestamped lyrics from Suno API

export interface TimestampedLyricsResponse {
  success: boolean
  lyrics: Array<{
    index: number
    text: string
    start: number
    end: number
    success: boolean
    palign: number
  }>
  waveformData: number[]
  hootCer: number
  isStreamed: boolean
  error?: string
}

export async function fetchTimestampedLyrics(
  taskId: string,
  audioId: string,
  musicIndex: number = 0
): Promise<TimestampedLyricsResponse> {
  try {
    const response = await fetch('/api/suno-timestamped-lyrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        audioId,
        musicIndex
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        lyrics: [],
        waveformData: [],
        hootCer: 0,
        isStreamed: false,
        error: errorData.error || 'Failed to fetch timestamped lyrics'
      }
    }

    const data = await response.json()
    return data

  } catch (error) {
    console.error('Error fetching timestamped lyrics:', error)
    return {
      success: false,
      lyrics: [],
      waveformData: [],
      hootCer: 0,
      isStreamed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
