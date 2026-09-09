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
    // The "I" position cycles only narrow vertical-stroke glyphs so its slot
    // stays visually the same width all through the scramble.
    const NARROW = 'I1!|/\\:;'
    const N = WORD.length
    const poolAt = [...WORD].map((ch) => (ch === 'I' ? NARROW : POOL))

    // Persistent <span> per slot, so a locking letter can be tweened without a
    // per-flicker rebuild wiping it.
    const fill = (el: Element) => {
      el.textContent = ''
      return Array.from(WORD, (ch, i) => {
        const s = document.createElement('span')
        // The "I" slot is narrower (thin bar). The touching N/D pair is nudged
        // together (--nd on the D) and, in the outline layer only, their
        // adjoining edges are clipped (--nd-n on the N, --nd on the D) so the
        // two verticals read as one with no dividing stroke.
        s.className =
          ch === 'I'
            ? 'syn-slot syn-slot--i'
            : ch === 'D' && WORD[i - 1] === 'N'
              ? 'syn-slot syn-slot--nd'
              : ch === 'N' && WORD[i + 1] === 'D'
                ? 'syn-slot syn-slot--nd-n'
                : 'syn-slot'
        return el.appendChild(s)
      })
    }

    // Five stacked lines. DOM order: the five stencil copies, then the five
    // outline copies — line i pairs stencil span-row i with outline row i+LINES.
    const LINES = 5
    const titles = [
      ...heroRef.current.querySelectorAll<HTMLElement>('.syn-hero-title'),
    ]
    // Both the stencil plate and its outline copy — kept in row-gap sync.
    const plates = [
      ...heroRef.current.querySelectorAll<HTMLElement>('.syn-hero-plate'),
    ]
    const lines = Array.from({ length: LINES }, (_, i) => ({
      rows: [fill(titles[i]), fill(titles[i + LINES])],
      locked: new Set<number>(),
    }))

    const settles: ReturnType<typeof gsap.fromTo>[] = []
    // Lock one (row, position): write the final letter to its stencil + outline
    // span and run the settle tween over both at once, so they stay aligned.
    const lockSlot = (ln: (typeof lines)[number], k: number) => {
      ln.locked.add(k)
      const spans = ln.rows.map((row) => row[k])
      spans.forEach((s) => (s.textContent = WORD[k]))
      settles.push(
        gsap.fromTo(
          spans,
          { scale: 1.14, opacity: 0.55 },
          { scale: 1, opacity: 1, duration: 0.45, ease: 'power2.out' },
        ),
      )
    }

    let lastFlip = 0
    const throttled = () => {
      const now = performance.now()
      if (now - lastFlip < 80) return true // ~12 glyph changes/sec, not per-frame
      lastFlip = now
      return false
    }
    const write = (k: number, ln: (typeof lines)[number], ch: string) =>
      ln.rows.forEach((row) => (row[k].textContent = ch))
    // Flicker one (row, position) — stencil + outline span together. Only the
    // glyph changes; nothing about the letter layer moves.
    const flickOne = (ln: (typeof lines)[number], k: number) => {
      if (throttled()) return
      const pool = poolAt[k]
      write(k, ln, pool[(Math.random() * pool.length) | 0])
    }
    // Flicker every still-unlocked (row, position).
    const flick = () => {
      if (throttled()) return
      lines.forEach((ln) => {
        for (let k = 0; k < N; k++)
          if (!ln.locked.has(k)) {
            const pool = poolAt[k]
            write(k, ln, pool[(Math.random() * pool.length) | 0])
          }
      })
    }

    // PHASE 1: spell SYNDICATE once, left to right — exactly ONE position
    // scrambles at a time on an even cadence, then locks before the next
    // starts. Source rows: every row used once before any repeat, never the
    // same row twice consecutively, usage spread as evenly as 9-over-5 allows.
    const shuffle = (a: number[]) => {
      for (let i = a.length; i-- > 1; ) {
        const j = (Math.random() * (i + 1)) | 0
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }
    const rowFor: number[] = []
    while (rowFor.length < N)
      for (const r of shuffle([...Array(LINES).keys()])) {
        if (rowFor.length >= N) break
        if (r !== rowFor[rowFor.length - 1]) rowFor.push(r)
      }
    const p1 = { v: 0 }
    let spelled = 0
    const tickPhase1 = () => {
      while (spelled < Math.floor(p1.v)) {
        lockSlot(lines[rowFor[spelled]], spelled)
        spelled++
      }
      if (spelled < N) flickOne(lines[rowFor[spelled]], spelled)
    }

    // PHASE 2: every slot phase 1 didn't fill (the 4 other rows per position).
    // Collect the spans (to crossfade in) and the (row, position) pairs (to
    // resolve in a wave), shuffled so the fill reads as noise crystallising.
    const restSlots: Array<[(typeof lines)[number], number]> = []
    const p2spans: HTMLElement[] = []
    lines.forEach((ln, li) => {
      for (let k = 0; k < N; k++) {
        if (li === rowFor[k]) continue
        restSlots.push([ln, k])
        p2spans.push(ln.rows[0][k], ln.rows[1][k])
      }
    })
    for (let i = restSlots.length; i-- > 1; ) {
      const j = (Math.random() * (i + 1)) | 0
      ;[restSlots[i], restSlots[j]] = [restSlots[j], restSlots[i]]
    }
    const tickHold = () => flick()
    const pr = { v: 0 }
    let restDone = 0
    const lockRestWave = () => {
      const target = Math.round(pr.v * restSlots.length)
      while (restDone < target) {
        const [ln, k] = restSlots[restDone++]
        lockSlot(ln, k)
      }
    }

    // Rows start spread apart (row-gap 22px) and ease flush once locked. The
    // proxy + onUpdate guarantees a smooth interpolation; CSS gap 0 is the
    // reduced-motion / resting value.
    const gp = { v: 22 }
    const applyGap = () => plates.forEach((el) => (el.style.rowGap = `${gp.v}px`))
    applyGap()

    // Occasional post-settle glitch: every 2.2-2.4s, re-scramble one random
    // letter in one random row for <300ms, then set it back. One pending
    // timeout at a time (`timer`), cleared on unmount.
    let timer = 0
    const scheduleGlitch = () => {
      timer = window.setTimeout(runGlitch, 2200 + Math.random() * 200)
    }
    const runGlitch = () => {
      const ln = lines[(Math.random() * LINES) | 0]
      const k = (Math.random() * N) | 0
      const pool = poolAt[k]
      const spans = ln.rows.map((row) => row[k])
      let left = 4 + ((Math.random() * 3) | 0) // 4-6 frames * 45ms = 180-270ms
      const cycle = () => {
        if (left-- > 0) {
          const ch = pool[(Math.random() * pool.length) | 0]
          spans.forEach((s) => (s.textContent = ch))
          timer = window.setTimeout(cycle, 45)
        } else {
          spans.forEach((s) => (s.textContent = WORD[k]))
          scheduleGlitch()
        }
      }
      cycle()
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          setIntroDone(true)
          scheduleGlitch()
        },
      })
      tl.set('.syn-hero-intro', { autoAlpha: 1 })
        .set(p2spans, { opacity: 0 })
        .to('.syn-hero-intro', {
          autoAlpha: 0,
          duration: 1.3,
          ease: 'power2.out',
          delay: 0.45,
        })
        // Phase 1: spell the word once, one position at a time, even cadence.
        .to(
          p1,
          { v: N, duration: N * 0.6, ease: 'none', onUpdate: tickPhase1 },
          0.6,
        )
        // Hold: the spelled word sits completely static for 2s — no scramble.
        .to({}, { duration: 2 })
        // Phase 2: the remaining slots scramble for 2.5s, crossfading in.
        .addLabel('p2')
        .to({}, { duration: 2.5, onUpdate: tickHold }, 'p2')
        .to(
          p2spans,
          {
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out',
            stagger: { amount: 0.4, from: 'random' },
          },
          'p2',
        )
        // The remaining letters resolve in a quick eased wave...
        .to(pr, {
          v: 1,
          duration: 0.7,
          ease: 'power2.out',
          onUpdate: lockRestWave,
        })
        // ...flowing straight into the rows compressing to flush.
        .to(
          gp,
          { v: 0, duration: 0.7, ease: 'power2.out', onUpdate: applyGap },
          '>-0.35',
        )
    }, heroRef)
    return () => {
      clearTimeout(timer)
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
          {[0, 1, 2, 3, 4].map((i) =>
            i === 2 ? (
              <h1 key={i} className="syn-hero-title">
                Syndicate
              </h1>
            ) : (
              <span key={i} className="syn-hero-title" aria-hidden="true">
                Syndicate
              </span>
            ),
          )}
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
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="syn-hero-title">
              Syndicate
            </span>
          ))}
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
