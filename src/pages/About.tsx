const lineup = [
  { role: 'Trumpet', name: 'Massimo Paparello' },
  { role: "Alto Saxophone & Flute", name: "Evan O'Brien" },
  { role: 'Piano', name: 'Sam Smylie' },
  { role: 'Bass', name: 'Adam Hernandez' },
  { role: 'Drums', name: 'Dante Newcombe-Kenealy' },
]

export default function About() {
  return (
    <>
      <section className="syn-section" style={{ paddingTop: 56 }}>
        <p className="syn-heading">About</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p className="syn-body">
            SYNDICATE is a Los Angeles-based jazz quintet led by trumpeter Massimo
            Paparello. The group performs original compositions shaped
            collectively by its members, drawing from a wide range of influences
            across modern jazz, bebop, and contemporary improvised music. Writing
            is shared within the ensemble, resulting in material that reflects
            multiple compositional voices rather than a single perspective.
          </p>
          <p className="syn-body">
            With instrumentation of trumpet, alto saxophone/flute, piano, bass,
            and drums, SYNDICATE emphasizes interactive ensemble playing, detailed
            arrangements, and open improvisation. The result is a repertoire that
            shifts between structured writing and spontaneous improvisation,
            highlighting the voice of each player within a cohesive identity.
          </p>
        </div>
      </section>

      <hr className="syn-rule" />

      <section className="syn-section">
        <p className="syn-heading">Lineup</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {lineup.map((m) => (
            <div key={m.role} className="syn-row">
              <span>{m.role}</span>
              <span style={{ color: 'rgba(255,255,255,0.9)' }}>{m.name}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
