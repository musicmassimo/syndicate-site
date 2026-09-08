export default function Contact() {
  return (
    <>
      <section className="syn-section" style={{ paddingTop: 56 }}>
        <p className="syn-heading">Contact</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="syn-row">
            <span>Bookings</span>
            <a
              className="syn-link"
              href="mailto:syndicatebookings@massimopaparello.com"
            >
              syndicatebookings@massimopaparello.com
            </a>
          </div>
          <div className="syn-row">
            <span>Instagram</span>
            <a
              className="syn-link"
              href="https://instagram.com/syndicatequintet"
              target="_blank"
              rel="noopener noreferrer"
            >
              @syndicatequintet
            </a>
          </div>
        </div>
      </section>

      <hr className="syn-rule" />

      <section className="syn-section">
        <p className="syn-heading">Press Kit</p>
        <a className="syn-btn" href="/syndicate-epk.pdf" download>
          Download EPK
        </a>
      </section>
    </>
  )
}
