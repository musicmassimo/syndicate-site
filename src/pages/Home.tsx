import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

// Small backing store, stretched to fill by CSS — cheap noise, fuzzy analog look.
const W = 320
const H = 180

const prefersReducedMotion = () =>
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function Home() {
  const heroRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Power-on intro plays once; skipped outright for reduced motion.
  const [introDone, setIntroDone] = useState(prefersReducedMotion)

  // Power-on intro (once, skipped for reduced motion): hold on black, lift the
  // overlay, then run a code-cracking scramble on the title — each slot
  // flickers through random glyphs until it locks to its final letter, left to
  // right, 0.7s apart. gsap.context().revert() tears the timeline down; there
  // are no timers of our own to clear.
  useEffect(() => {
    if (prefersReducedMotion() || !heroRef.current) return
    const titles =
      heroRef.current.querySelectorAll<HTMLElement>('.syn-hero-title')
    const WORD = 'SYNDICATE'
    const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>*'
    const p = { locked: 0 }
    let lastFlip = 0
    // Each glyph goes in a fixed-width slot so the block can't reflow as
    // characters cycle — only the glyph inside each slot changes.
    const esc = (c: string) =>
      c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c
    const scramble = () => {
      const now = performance.now()
      if (now - lastFlip < 80) return // ~12 glyph changes/sec, not per-frame
      lastFlip = now
      let html = ''
      for (let i = 0; i < WORD.length; i++) {
        const c = i < p.locked ? WORD[i] : POOL[(Math.random() * POOL.length) | 0]
        html += `<span class="syn-slot">${esc(c)}</span>`
      }
      titles.forEach((el) => (el.innerHTML = html))
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          titles.forEach((el) => (el.textContent = WORD))
          setIntroDone(true)
        },
      })
      tl.set('.syn-hero-intro', { autoAlpha: 1 })
        .to('.syn-hero-intro', {
          autoAlpha: 0,
          duration: 1.3,
          ease: 'power2.inOut',
          delay: 0.45,
        })
        .to(
          p,
          {
            locked: WORD.length,
            duration: WORD.length * 0.7,
            ease: `steps(${WORD.length})`,
            onUpdate: scramble,
          },
          0.6,
        )
    }, heroRef)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    // Dark-biased grayscale noise. `range` flickers a little each frame.
    const drawNoise = () => {
      const img = ctx.createImageData(W, H)
      const d = img.data
      // Kept dark so the `lighten` blend barely touches the photo in the
      // letters; against the near-black surround it still reads as static.
      const range = 80 * (0.7 + Math.random() * 0.3)
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * range) | 0
        d[i] = d[i + 1] = d[i + 2] = v
        d[i + 3] = 255
      }
      ctx.putImageData(img, 0, 0)
    }

    // Reduced motion: one still frame of noise, no loop.
    if (prefersReducedMotion()) {
      drawNoise()
      return
    }

    const FRAME = 1000 / 18 // ~18fps is plenty for convincing static
    let raf = 0
    let last = 0
    let glitchUntil = 0
    let nextGlitch = performance.now() + 2000 + Math.random() * 4000

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < FRAME) return
      last = now

      drawNoise()

      if (now > nextGlitch) {
        glitchUntil = now + 60 + Math.random() * 120 // < 200ms
        nextGlitch = now + 2500 + Math.random() * 5000
      }
      if (now < glitchUntil) {
        // Horizontal tear: grab a band and shove it sideways, plus a bright jump line.
        const y = (Math.random() * H) | 0
        const h = Math.min(4 + ((Math.random() * 20) | 0), H - y)
        const dx = ((Math.random() - 0.5) * 60) | 0
        ctx.putImageData(ctx.getImageData(0, y, W, h), dx, y)
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fillRect(0, y, W, 2)
      }
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      {/* Stencil header — the photo blends through the letterforms. */}
      <section className="syn-hero" ref={heroRef}>
        <img
          className="syn-hero-img"
          src="/images/syndicate-header.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
        />
        <div className="syn-hero-plate">
          <h1 className="syn-hero-title">Syndicate</h1>
        </div>
        <canvas
          ref={canvasRef}
          className="syn-hero-static"
          width={W}
          height={H}
          aria-hidden="true"
        />
        <div className="syn-hero-scanlines" aria-hidden="true" />
        {/* Definition-only copy: crisp light outline, no fill, no glow — sits
            above the static so the letterforms stay legible over dark photo. */}
        <div className="syn-hero-plate syn-hero-plate--edge" aria-hidden="true">
          <h1 className="syn-hero-title">Syndicate</h1>
        </div>
        {!introDone && <div className="syn-hero-intro" aria-hidden="true" />}
      </section>

      <hr className="syn-rule" />

      <section className="syn-section" style={{ textAlign: 'center' }}>
        <p className="syn-heading" style={{ marginInline: 'auto' }}>
          Los Angeles Jazz Quintet — led by Massimo Paparello
        </p>
      </section>
    </>
  )
}
