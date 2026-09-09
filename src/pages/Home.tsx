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
  // overlay, then a code-cracking scramble on THREE stacked "SYNDICATE" lines.
  // Each line flickers random glyphs, then locks its letters one at a time,
  // 0.7s apart, easing into place. The middle line locks left-to-right; the
  // top and bottom lock in randomised order. All three run the same nine
  // evenly-spaced locks off one clock, so they finish together.
  // gsap.context().revert() + killing the settle tweens is the whole cleanup.
  useEffect(() => {
    if (prefersReducedMotion() || !heroRef.current) return
    const WORD = 'SYNDICATE'
    const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>*'
    const N = WORD.length

    const shuffled = () => {
      const a = [...Array(N).keys()]
      for (let i = N; i-- > 1; ) {
        const j = (Math.random() * (i + 1)) | 0
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }
    // Persistent <span> per slot, so a locking letter can be tweened without a
    // per-flicker rebuild wiping it.
    const fill = (el: Element) => {
      el.textContent = ''
      return Array.from(WORD, () => {
        const s = document.createElement('span')
        s.className = 'syn-slot'
        return el.appendChild(s)
      })
    }

    // DOM order: stencil top/middle/bottom, then the outline copies top/middle/
    // bottom. Line i pairs stencil span-row i with outline span-row i+3.
    const titles = [
      ...heroRef.current.querySelectorAll<HTMLElement>('.syn-hero-title'),
    ]
    const orders = [shuffled(), [...Array(N).keys()], shuffled()]
    const lines = [0, 1, 2].map((i) => ({
      rows: [fill(titles[i]), fill(titles[i + 3])],
      order: orders[i],
      locked: new Set<number>(),
    }))

    const settles: ReturnType<typeof gsap.fromTo>[] = []
    const lockStep = (step: number) => {
      lines.forEach((ln) => {
        const idx = ln.order[step]
        ln.locked.add(idx)
        ln.rows.forEach((row) => {
          row[idx].textContent = WORD[idx]
          settles.push(
            gsap.fromTo(
              row[idx],
              { scale: 1.3, opacity: 0.4 },
              { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out' },
            ),
          )
        })
      })
    }

    const p = { step: 0 }
    let done = 0
    let lastFlip = 0
    const tick = () => {
      while (done < Math.round(p.step)) lockStep(done++)
      const now = performance.now()
      if (now - lastFlip < 80) return // ~12 glyph changes/sec, not per-frame
      lastFlip = now
      lines.forEach((ln) =>
        ln.rows.forEach((row) => {
          for (let k = 0; k < N; k++)
            if (!ln.locked.has(k))
              row[k].textContent = POOL[(Math.random() * POOL.length) | 0]
        }),
      )
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
          { step: N, duration: N * 0.7, ease: `steps(${N})`, onUpdate: tick },
          0.6,
        )
        .to({}, { duration: 0.4 }) // let the last letter's settle finish
    }, heroRef)
    return () => {
      ctx.revert()
      settles.forEach((t) => t.kill())
    }
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
          <span className="syn-hero-title" aria-hidden="true">
            Syndicate
          </span>
          <h1 className="syn-hero-title">Syndicate</h1>
          <span className="syn-hero-title" aria-hidden="true">
            Syndicate
          </span>
        </div>
        <canvas
          ref={canvasRef}
          className="syn-hero-static"
          width={W}
          height={H}
          aria-hidden="true"
        />
        <div className="syn-hero-scanlines" aria-hidden="true" />
        {/* Definition-only copies: crisp light outline, no fill, no glow — sit
            above the static so the letterforms stay legible over dark photo.
            One per stacked line, positioned to match the stencil copies. */}
        <div className="syn-hero-plate syn-hero-plate--edge" aria-hidden="true">
          <span className="syn-hero-title">Syndicate</span>
          <span className="syn-hero-title">Syndicate</span>
          <span className="syn-hero-title">Syndicate</span>
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
