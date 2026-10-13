import type { AxiosError, AxiosRequestConfig } from 'axios'

import { http } from './http'

// orval yaratgan barcha hooklar shu funksiya orqali so'rov yuboradi.
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => http({ ...config, ...options }).then(({ data }) => data)

export type ErrorType<Error> = AxiosError<Error>
export type BodyType<BodyData> = BodyData
