// win95-media-player ships no types. Minimal surface for what we use — see its
// README: MediaPlayer takes a Cassette-style playlist plus className/style.
declare module 'win95-media-player' {
  import type { ComponentType, CSSProperties } from 'react'

  interface Win95Track {
    url: string
    title?: string
    artist?: string
    [key: string]: unknown
  }

  interface MediaPlayerProps {
    playlist: Win95Track[]
    className?: string
    style?: CSSProperties
    getDisplayText?: (track: Win95Track | undefined) => string
    showVideo?: boolean
    fullscreenEnabled?: boolean
    autoplay?: boolean
    loop?: boolean
    [key: string]: unknown
  }

  export const MediaPlayer: ComponentType<MediaPlayerProps>
  export const MediaPlayerUI: ComponentType<MediaPlayerProps>
}
