import { useEffect, useState } from 'react'
import './RetroTvPlayer.css'

const DEFAULT_VIDEO_ID = 'M0e5tfIwKMU'

// Pull the 11-char video ID out of a watch link (youtube.com/watch?v=ID),
// a share link (youtu.be/ID), or an embed link (youtube.com/embed/ID).
export function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(
    /(?:youtube\.com\/(?:.*[?&]v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  )
  return match ? match[1] : null
}

export default function RetroTvPlayer({ videoUrl }) {
  const [powerOn, setPowerOn] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const [videoId] = useState(() => getYouTubeId(videoUrl) || DEFAULT_VIDEO_ID)

  // Clear the channel-switch state 400ms after it's triggered.
  useEffect(() => {
    if (!isSwitching) return
    const timer = setTimeout(() => setIsSwitching(false), 400)
    return () => clearTimeout(timer)
  }, [isSwitching])

  // Ignore the power button while a channel switch is mid-flight.
  const togglePower = () => {
    if (isSwitching) return
    setPowerOn((on) => !on)
  }

  const embedSrc =
    `https://www.youtube.com/embed/${videoId}` +
    '?autoplay=1&mute=1&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3'

  return (
    <div className="retro-tv-wrapper">
      <div className="tv-cabinet">
        <div className="tv-screen-bezel">
          <div
            className={
              `tv-screen-glass ${powerOn ? 'is-on' : 'is-off'}` +
              (isSwitching ? ' is-switching' : '')
            }
          >
            {powerOn && !isSwitching && (
              <iframe
                className="tv-video"
                src={embedSrc}
                title="Retro TV video"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            )}
            {isSwitching && <div className="tv-static" aria-hidden="true" />}
            <div className="crt-scanlines" aria-hidden="true" />
            <div className="crt-flicker" aria-hidden="true" />
            <div className="screen-glare" aria-hidden="true" />
            <div className="screen-curve-shadow" aria-hidden="true" />
          </div>
        </div>

        <div className="tv-controls">
          <div className="tv-brand">SYNDICATE</div>
          <div className="tv-knob" />
          <div className="tv-knob" />
          <div className="speaker-grille" aria-hidden="true">
            <span className="grille-slat" />
            <span className="grille-slat" />
            <span className="grille-slat" />
            <span className="grille-slat" />
            <span className="grille-slat" />
            <span className="grille-slat" />
          </div>
          <button
            type="button"
            className="power-button"
            aria-label={powerOn ? 'Turn TV off' : 'Turn TV on'}
            onClick={togglePower}
          />
        </div>
      </div>
    </div>
  )
}
