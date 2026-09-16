import type { User } from '@/types/user'
import { request } from './client'
import { parseList, parseSingle, parseUser } from '../validation/parse'

export async function fetchUsers(signal?: AbortSignal): Promise<User[]> {
  const payload = await request<unknown>('/users', { signal })
  return parseList(payload, parseUser)
}

export async function fetchUser(userId: number, signal?: AbortSignal): Promise<User | null> {
  const payload = await request<unknown>(`/user/${userId}`, { signal })
  return parseSingle(payload, parseUser)
}
