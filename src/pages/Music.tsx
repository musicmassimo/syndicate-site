// youtu.be/M0e5tfIwKMU with the ?t=371 timestamp preserved as ?start=
const VIDEO_EMBED = 'https://www.youtube.com/embed/M0e5tfIwKMU?start=371'

const tracks = [
  { title: 'Rosebush', credit: 'Massimo Paparello', src: '/audio/rosebush.m4a' },
  { title: 'PAI', credit: 'Sam Smylie', src: '/audio/pai.m4a' },
]

export default function Music() {
  return (
    <>
      <section className="syn-section" style={{ paddingTop: 56 }}>
        <p className="syn-heading">Featured Video</p>
        <div className="syn-video">
          <iframe
            src={VIDEO_EMBED}
            title="SYNDICATE — Live at Jazz Fest in The Backyard"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
        <p
          style={{
            marginTop: 16,
            fontSize: 11,
            lineHeight: 1.7,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Featured Live Video — SYNDICATE, Live at Jazz Fest in The Backyard
          (6/27/2026), filmed on Super 8 film.
        </p>
      </section>

      <hr className="syn-rule" />

      <section className="syn-section">
        <p className="syn-heading">Music</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {tracks.map((t) => (
            <div key={t.src}>
              <div className="syn-row">
                <span>{t.title}</span>
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {t.credit}
                </span>
              </div>
              {/* preload="none" so nothing is fetched until play is pressed. */}
              <audio className="syn-audio" controls preload="none" src={t.src}>
                Your browser does not support the audio element.
              </audio>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
