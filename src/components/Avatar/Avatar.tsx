import { memo } from 'react'
import styles from './Avatar.module.css'

const AVATAR_GRADIENTS = [
  ['#b42318', '#821911'],
  ['#b54708', '#823306'],
  ['#7a5a00', '#584100'],
  ['#2f6b3e', '#224d2d'],
  ['#0f6b6b', '#0b4d4d'],
  ['#1755b8', '#113d84'],
  ['#5b3ab8', '#422a84'],
  ['#a03070', '#732351'],
] as const

function gradientFor(seed: number): string {
  const [from, to] = AVATAR_GRADIENTS[Math.abs(Math.trunc(seed)) % AVATAR_GRADIENTS.length]
  return `linear-gradient(140deg, ${from}, ${to})`
}

function initialFor(nickname: string): string {
  const trimmed = nickname.trim()
  if (trimmed === '') return '?'
  return Array.from(trimmed)[0].toUpperCase()
}

interface AvatarProps {
  nickname: string
  seed: number
}

export const Avatar = memo(function Avatar({ nickname, seed }: AvatarProps) {
  return (
    <span
      className={styles.avatar}
      style={{ backgroundImage: gradientFor(seed) }}
      aria-hidden="true"
    >
      {initialFor(nickname)}
    </span>
  )
})
