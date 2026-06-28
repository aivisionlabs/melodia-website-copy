'use server'

// Suno helpers for client: server-backed status to avoid exposing tokens
export async function getSunoModeAction(): Promise<{ useMock: boolean }> {
  try {
    const { shouldUseMockAPI } = await import('@/lib/config')
    return { useMock: shouldUseMockAPI() }
  } catch (error) {
    console.error('Error in getSunoModeAction:', error)
    // Default safe: assume real API in case of failure
    return { useMock: false }
  }
}

export async function getSunoRecordInfoAction(taskId: string) {
  try {
    const { SunoAPIFactory } = await import('@/lib/suno-api')
    const api = SunoAPIFactory.getAPI()
    const response = await api.getRecordInfo(taskId)
    return response
  } catch (error) {
    console.error('Error in getSunoRecordInfoAction:', error)
    return {
      code: 500,
      msg: 'Failed to fetch record info',
      data: {
        taskId,
        parentMusicId: '',
        param: '',
        response: { taskId, sunoData: [] },
        status: 'FAILED',
        type: 'generate',
        errorCode: 'INTERNAL_ERROR',
        errorMessage: 'Failed to fetch record info',
      }
    }
  }
}
