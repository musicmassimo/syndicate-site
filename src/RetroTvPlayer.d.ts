// Type surface for the plain-JSX RetroTvPlayer so .tsx files can import it.
import type { ComponentType } from 'react'

export function getYouTubeId(url?: string | null): string | null

declare const RetroTvPlayer: ComponentType<{ videoUrl?: string }>
export default RetroTvPlayer
