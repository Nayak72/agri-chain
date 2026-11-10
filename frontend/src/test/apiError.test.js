import { describe, it, expect } from 'vitest'
import { getApiError, formatApiErrorMessage } from '../utils/apiError'

describe('getApiError', () => {
  it('extracts error from standard error envelope', () => {
    const error = {
      response: {
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Vehicle capacity insufficient',
            field_errors: { vehicle_id: 'Insufficient capacity' },
            request_id: 'req-123',
          },
        },
      },
    }
    const result = getApiError(error)
    expect(result.code).toBe('VALIDATION_ERROR')
    expect(result.message).toBe('Vehicle capacity insufficient')
    expect(result.fieldErrors.vehicle_id).toBe('Insufficient capacity')
    expect(result.requestId).toBe('req-123')
    expect(formatApiErrorMessage(error)).toBe('Vehicle capacity insufficient')
  })

  it('extracts error from FastAPI detail list', () => {
    const error = {
      response: {
        data: {
          detail: [
            { loc: ['body', 'estimated_shelf_life_days'], msg: 'Must be <= 3650' },
          ],
        },
      },
    }
    const result = getApiError(error)
    expect(result.code).toBe('VALIDATION_ERROR')
    expect(result.fieldErrors.estimated_shelf_life_days).toBe('Must be <= 3650')
  })

  it('handles fallback message for unknown errors', () => {
    const result = getApiError(null, 'Custom fallback')
    expect(result.message).toBe('Custom fallback')
    expect(result.code).toBe('UNKNOWN_ERROR')
  })
})

