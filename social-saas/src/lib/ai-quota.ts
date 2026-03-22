/** Returned in JSON when monthly AI quota is exhausted (use with HTTP 429). */
export const AI_QUOTA_EXCEEDED_CODE = 'AI_QUOTA_EXCEEDED' as const

export function isAiQuotaExceededResponse(res: Response, data: { code?: string }): boolean {
  return res.status === 429 || data.code === AI_QUOTA_EXCEEDED_CODE
}
