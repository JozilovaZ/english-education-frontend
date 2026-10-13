import type { Group, StatusA5aEnum } from '@/shared/api/generated/model'

/** Bu holatlarga o'tgach guruhni boshqa o'zgartirib bo'lmaydi (backend) */
export const FINAL: StatusA5aEnum[] = ['completed', 'cancelled']

export const isClosedGroup = (g: Pick<Group, 'status'>) => FINAL.includes(g.status as StatusA5aEnum)
