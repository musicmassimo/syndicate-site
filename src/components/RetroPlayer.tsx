import { MediaPlayer } from 'win95-media-player'

// The two SYNDICATE tracks, in the Cassette playlist shape the player expects.
// Files are .m4a to match the rest of the project.
const playlist = [
  { url: '/audio/rosebush.m4a', title: 'Rosebush', artist: 'Massimo Paparello' },
  { url: '/audio/pai.m4a', title: 'PAI', artist: 'Sam Smylie' },
]

// Win95 chrome is left authentic; we only theme the outer window frame via
// className (.syn-player in index.css) to sit on the site's black strip.
export default function RetroPlayer() {
  return (
    <MediaPlayer
      className="syn-player"
      playlist={playlist}
      // Cassette defaults to a <video> element mounted in a display:none
      // container. iOS Safari silently refuses to play a hidden <video>, so
      // tapping Play did nothing on phones. An <audio> element plays fine
      // while hidden. (We never show video anyway.)
      createMediaElement={() => document.createElement('audio')}
      getDisplayText={(track) =>
        track ? `${track.title} — ${track.artist}` : 'SYNDICATE'
      }
    />
  )
}
