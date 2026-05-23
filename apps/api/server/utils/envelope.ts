import { ResponseEnvelope } from '../types/http.js'

export const ok = <T>(data: T): ResponseEnvelope<T> => ({ success: true, data })
export const fail = (code: string, message: string): ResponseEnvelope =>
  ({ success: false, error: { code, message } })
