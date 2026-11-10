/**
 * Safely extracts human-readable error messages and field-level validation errors
 * from AgriChain standard error envelope:
 * {
 *   error: {
 *     code: string,
 *     message: string,
 *     details: any,
 *     field_errors: Record<string, string>,
 *     request_id: string
 *   }
 * }
 */
export function getApiError(err, fallback = 'An unexpected error occurred') {
  if (!err) return { message: fallback, code: 'UNKNOWN_ERROR', fieldErrors: {} }

  // Axios response error envelope
  const data = err.response?.data
  if (data?.error) {
    const { code, message, details, field_errors, request_id } = data.error
    return {
      message: message || (typeof details === 'string' ? details : fallback),
      code: code || 'API_ERROR',
      fieldErrors: field_errors || {},
      requestId: request_id || null,
      details,
    }
  }

  // FastAPI default fallback { detail: ... }
  if (data?.detail) {
    if (typeof data.detail === 'string') {
      return { message: data.detail, code: 'API_ERROR', fieldErrors: {} }
    }
    if (Array.isArray(data.detail)) {
      const fieldErrors = {}
      const msgs = data.detail.map((d) => {
        const field = d.loc && d.loc.length > 0 ? d.loc[d.loc.length - 1] : 'field'
        fieldErrors[field] = d.msg
        return `${field}: ${d.msg}`
      })
      return {
        message: msgs.join(', '),
        code: 'VALIDATION_ERROR',
        fieldErrors,
      }
    }
  }

  // Standard JS Error or Axios message
  if (err.message) {
    return { message: err.message, code: 'CLIENT_ERROR', fieldErrors: {} }
  }

  return { message: fallback, code: 'UNKNOWN_ERROR', fieldErrors: {} }
}

export function formatApiErrorMessage(err, fallback) {
  return getApiError(err, fallback).message
}
