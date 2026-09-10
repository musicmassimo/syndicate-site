import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import RetroPlayer from '../components/RetroPlayer'
import RetroTvPlayer from '../RetroTvPlayer.jsx'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

// Small backing store, stretched to fill by CSS — cheap noise, fuzzy analog look.
const W = 320
const H = 180

// About reveal: full-bleed photos crossfaded after the bio, in this order.
// Web-optimised JPEGs (~1400px) of the multi-MB PNG originals so the scrubbed
// reveal stays smooth; the *.png originals stay in /public/images.
const ABOUT_PHOTOS = [
  '/images/syndicate-photo-9-web.jpg',
  '/images/syndicate-photo-4-web.jpg',
  '/images/syndicate-photo-5-web.jpg',
]

// Jukebox banner background: this strip of photos is rendered twice back to
// back and translated -50% on a CSS loop, so it scrolls right-to-left forever
// with no seam. Web-optimised JPEGs (~900px) of the multi-MB PNG originals.
const MARQUEE_PHOTOS = [
  '/images/syndicate-photo-2-web.jpg',
  '/images/syndicate-photo-6-web.jpg',
  '/images/syndicate-photo-7-web.jpg',
]

const prefersReducedMotion = () =>
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Old-TV static behind the hero stencil: dark-biased grayscale noise at ~18fps
// with an occasional horizontal tear. Kept dark so the `lighten` blend barely
// touches the photo in the letters. Returns a cleanup fn; reduced motion paints
// one still frame.
function runStatic(canvas: HTMLCanvasElement | null): () => void {
  const ctx = canvas?.getContext('2d')
  if (!ctx) return () => {}

  const draw = () => {
    const img = ctx.createImageData(W, H)
    const d = img.data
    const range = 80 * (0.7 + Math.random() * 0.3) // flickers a little
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * range) | 0
      d[i] = d[i + 1] = d[i + 2] = v
      d[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }

  if (prefersReducedMotion()) {
    draw()
    return () => {}
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

    draw()

    if (now > nextGlitch) {
      glitchUntil = now + 60 + Math.random() * 120 // < 200ms
      nextGlitch = now + 2500 + Math.random() * 5000
    }
    if (now < glitchUntil) {
      // Horizontal tear: grab a band, shove it sideways, add a bright jump line.
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
}

const EVENT_TYPES = [
  'Private event',
  'Wedding',
  'Festival',
  'Corporate',
  'Venue / club',
  'Other',
]

export default function Home() {
  const heroRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const aboutRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const jukeboxRef = useRef<HTMLElement>(null)
  const bookHeadingRef = useRef<HTMLParagraphElement>(null)
  // Power-on intro plays once; skipped outright for reduced motion.
  const [introDone, setIntroDone] = useState(prefersReducedMotion)
  // The banner video loads (and autoplays) only once the strip scrolls in.
  const [videoLive, setVideoLive] = useState(false)

  // Booking inquiry form, rendered below the jukebox/audio player banner.
  const [bookingForm, setBookingForm] = useState({
    name: '',
    email: '',
    eventType: EVENT_TYPES[0],
    eventDate: '',
    location: '',
    budget: '',
    details: '',
  })

  function updateBooking<K extends keyof typeof bookingForm>(
    key: K,
    value: string
  ) {
    setBookingForm((f) => ({ ...f, [key]: value }))
  }

  // Submit posts JSON to send-inquiry.php, which relays via Brevo server-side.
  // Falls back to a "email us directly" message on any failure.
  const [submit, setSubmit] = useState<{
    status: 'idle' | 'sending' | 'ok' | 'error'
    message?: string
  }>({ status: 'idle' })

  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmit({ status: 'sending' })
    try {
      const res = await fetch('/send-inquiry.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingForm),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setSubmit({
          status: 'ok',
          message: 'Thanks — your inquiry is on its way. We’ll be in touch soon.',
        })
        setBookingForm({
          name: '',
          email: '',
          eventType: EVENT_TYPES[0],
          eventDate: '',
          location: '',
          budget: '',
          details: '',
        })
      } else {
        setSubmit({
          status: 'error',
          message:
            data.error ||
            'Something went wrong. Please email syndicatebookings@massimopaparello.com directly.',
        })
      }
    } catch {
      setSubmit({
        status: 'error',
        message:
          'Network error. Please email syndicatebookings@massimopaparello.com directly.',
      })
    }
  }

  // Mount at the top so the hero intro plays from a clean slate and the About
  // ScrollTrigger measures its pin against an unscrolled layout. Reload
  // restoration is already suppressed in main.tsx; this also covers arriving
  // here by client-side navigation.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

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
    // Post-intro loop: convert the five rows top-to-bottom to these fixed names
    // (row i -> NAMES[i]), hold, then scramble every row back to SYNDICATE.
    // Each name is centred in the nine slots; unused slots collapse.
    const NAMES = ['MASSIMO', 'EVAN', 'ADAM', 'SAM', 'DANTE']
    const STEADY_SECONDS = 24 // dwell on SYNDICATE (with glitching) before looping
    const startFor = (word: string) => (N - word.length) >> 1

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
    // Every span (5 rows x 2 layers x 9 slots) for bulk width morphing.
    const allSlots = lines.flatMap((ln) => [...ln.rows[0], ...ln.rows[1]])

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

    // ---- Post-intro name cycle -----------------------------------------------
    // What each row currently shows (so the glitch restores the right letters).
    const rowWord: string[] = Array(LINES).fill(WORD)
    // Target width for slot k of a given word (collapsed outside the centred
    // word; SYNDICATE keeps its narrow "I", names use uniform slots).
    const slotWidth = (word: string, k: number) => {
      const start = startFor(word)
      if (k < start || k >= start + word.length) return '0em'
      return word === WORD && k === 4 ? '0.34em' : '0.66em'
    }
    // Scramble one row's active slots to random glyphs; blank the rest.
    // (Callers gate with throttled() so multi-row calls stay in one tick.)
    const flickRow = (ln: (typeof lines)[number], word: string) => {
      const start = startFor(word)
      const syn = word === WORD
      for (let k = 0; k < N; k++) {
        const active = k >= start && k < start + word.length
        if (!active) {
          write(k, ln, '')
          continue
        }
        const pool = syn ? poolAt[k] : POOL
        write(k, ln, pool[(Math.random() * pool.length) | 0])
      }
    }
    const tickRow = (ln: (typeof lines)[number], word: string) => {
      if (!throttled()) flickRow(ln, word)
    }
    const flickWord = (word: string) => {
      if (throttled()) return
      lines.forEach((ln) => flickRow(ln, word))
    }
    // Settle a word into one row, recording it and blanking unused slots.
    const landRow = (ln: (typeof lines)[number], li: number, word: string) => {
      const start = startFor(word)
      rowWord[li] = word
      for (let k = 0; k < N; k++) {
        const i = k - start
        write(k, ln, i >= 0 && i < word.length ? word[i] : '')
      }
    }
    const landWord = (word: string) =>
      lines.forEach((ln, li) => landRow(ln, li, word))
    // Ease one row's slot widths to fit `word`.
    const morphRow = (ln: (typeof lines)[number], word: string) =>
      gsap.to([...ln.rows[0], ...ln.rows[1]], {
        width: (i: number) => slotWidth(word, i % N),
        duration: 0.5,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    const morphSlots = (word: string) =>
      gsap.to(allSlots, {
        width: (i: number) => slotWidth(word, i % N),
        duration: 0.5,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    // Drop SYNDICATE's N/D seam clip + margin from one row (for names).
    const neutralizeRow = (ln: (typeof lines)[number]) =>
      gsap.set([...ln.rows[0], ...ln.rows[1]], {
        marginLeft: 0,
        clipPath: 'none',
      })

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

    // Glitch: while `glitchOn`, re-scramble one random letter of the word a
    // random row currently shows for <300ms, then restore it. `glitchNext`
    // gives the delay to the next one (slow steady state vs. the fast burst
    // during the names hold). One pending timeout at a time (`timer`).
    let timer = 0
    let glitchOn = false
    let glitchNext = () => 2200 + Math.random() * 200
    const scheduleGlitch = () => {
      timer = window.setTimeout(runGlitch, glitchNext())
    }
    const runGlitch = () => {
      const li = (Math.random() * LINES) | 0
      const word = rowWord[li]
      const start = startFor(word)
      const k = start + ((Math.random() * word.length) | 0)
      const ln = lines[li]
      const pool = word === WORD && k === 4 ? NARROW : POOL
      const spans = ln.rows.map((row) => row[k])
      const correct = word[k - start]
      let left = 4 + ((Math.random() * 3) | 0) // 4-6 frames * 45ms = 180-270ms
      const cycle = () => {
        if (left-- > 0) {
          const ch = pool[(Math.random() * pool.length) | 0]
          spans.forEach((s) => (s.textContent = ch))
          timer = window.setTimeout(cycle, 45)
        } else {
          spans.forEach((s) => (s.textContent = correct))
          if (glitchOn) scheduleGlitch()
        }
      }
      cycle()
    }

    const ctx = gsap.context(() => {
      // Looping post-intro sequence: convert row i -> NAMES[i] one at a time,
      // hold with a fast glitch burst, scramble every row back to SYNDICATE,
      // dwell there with slow glitching, then repeat.
      const cycleTl = gsap.timeline({ repeat: -1, paused: true })
      const nameRowStep = (word: string, i: number) => {
        cycleTl
          .call(() => {
            neutralizeRow(lines[i])
            morphRow(lines[i], word)
          })
          .to({}, { duration: 2, onUpdate: () => tickRow(lines[i], word) })
          .call(() => landRow(lines[i], i, word))
      }
      cycleTl
        .call(() => {
          glitchOn = false
          clearTimeout(timer)
        })
        .to({}, { duration: 1 }) // hold the settled SYNDICATE, no glitch
      NAMES.forEach((name, i) => nameRowStep(name, i))
      cycleTl
        .call(() => {
          glitchOn = true
          glitchNext = () => 800 // fast burst
          scheduleGlitch()
        })
        .to({}, { duration: 4 }) // hold the five names
        .call(() => {
          glitchOn = false
          clearTimeout(timer)
          gsap.set(allSlots, { clearProps: 'marginLeft,clipPath' })
        })
        // Scramble every row back to SYNDICATE together.
        .call(() => void morphSlots(WORD))
        .to({}, { duration: 2.2, onUpdate: () => flickWord(WORD) })
        .call(() => {
          landWord(WORD)
          glitchOn = true
          glitchNext = () => 2200 + Math.random() * 200 // back to sporadic
          scheduleGlitch()
        })
        .to({}, { duration: STEADY_SECONDS }) // dwell, sporadic glitching

      const tl = gsap.timeline({
        onComplete: () => {
          setIntroDone(true)
          cycleTl.play()
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
      gsap.killTweensOf(allSlots)
      settles.forEach((t) => t.kill())
    }
  }, [])

  // Old-TV static behind the stencil header.
  useEffect(() => runStatic(canvasRef.current), [])

  // About: pin the stage and scrub as the user scrolls — the bio scrambles in
  // over photos 7 and 4, then hands off to the lineup over photo 5, with the
  // photos crossfading underneath. Whichever text block is showing gets a
  // slow single-letter glitch. Skipped for reduced motion (CSS renders a
  // plain stacked layout instead).
  useEffect(() => {
    const about = aboutRef.current
    const stage = stageRef.current
    if (prefersReducedMotion() || !about || !stage) return

    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>*+=:·'
    const rnd = () => GLYPHS[(Math.random() * GLYPHS.length) | 0]
    const bioText = stage.querySelector<HTMLElement>('.syn-about-text--bio')!
    const lineupText = stage.querySelector<HTMLElement>('.syn-about-text--lineup')!
    const leavesIn = (g: HTMLElement) => [
      ...g.querySelectorAll<HTMLElement>('.syn-scramble'),
    ]
    const bioLeaves = leavesIn(bioText)
    const lineupLeaves = leavesIn(lineupText)
    const full = new Map<HTMLElement, string>()
    ;[...bioLeaves, ...lineupLeaves].forEach((el) =>
      full.set(el, el.textContent ?? ''),
    )

    // Paint one scramble frame: characters left of `p` (0..1 across the line)
    // are settled, the rest cycle random glyphs; p >= 1 snaps to real text.
    const paint = (leaves: HTMLElement[], p: number) => {
      leaves.forEach((el) => {
        const text = full.get(el)!
        if (p >= 1) {
          el.textContent = text
          return
        }
        const settled = p * text.length * 1.12
        let out = ''
        for (let i = 0; i < text.length; i++) {
          out += i <= settled || text[i] === ' ' ? text[i] : rnd()
        }
        el.textContent = out
      })
    }

    // Quick real-time scramble-in for a text block. Fired by a timeline
    // callback (not scrubbed) so a fast scroll past it can't leave the text
    // half-resolved; a short debounce stops rapid back-and-forth re-triggers.
    let lastReveal = 0
    const revealText = (leaves: HTMLElement[]) => {
      const now = performance.now()
      if (now - lastReveal < 450) return
      lastReveal = now
      const proxy = { p: 0 }
      gsap.to(proxy, {
        p: 1,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: () => paint(leaves, proxy.p),
        onComplete: () => paint(leaves, 1),
      })
    }

    let glitchTimer = 0
    const ctx = gsap.context(() => {
      const photos = [
        ...stage.querySelectorAll<HTMLElement>('.syn-about-photo'),
      ]

      const tl = gsap.timeline()
      // Bio: fade + scramble in, hold — stays up through photos 7 and 4.
      tl.fromTo(bioText, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 })
        .call(() => revealText(bioLeaves), undefined, '<')
        .to({}, { duration: 0.6 })
        // photo 7 rises behind the bio
        .fromTo(photos[0], { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 })
        .to({}, { duration: 0.6 })
        // photo 7 -> photo 4, bio stays on top
        .to(photos[0], { autoAlpha: 0, duration: 1 })
        .fromTo(photos[1], { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, '<')
        .to({}, { duration: 0.6 })
        // photo 4 -> photo 5, and bio -> lineup
        .to(photos[1], { autoAlpha: 0, duration: 1 })
        .fromTo(photos[2], { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, '<')
        .to(bioText, { autoAlpha: 0, duration: 0.7 }, '<')
        .fromTo(
          lineupText,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.5 },
          '<+=0.3',
        )
        .call(() => revealText(lineupLeaves), undefined, '<')
        .to({}, { duration: 1 })

      ScrollTrigger.create({
        trigger: about,
        start: 'top top',
        end: () => '+=' + Math.round(window.innerHeight * 4),
        pin: stage,
        // Tie the reveal exactly to scroll position — no catch-up lag, so
        // fast scrolling can't outrun the crossfade and unpin early.
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        animation: tl,
      })

      // One random letter flickers on whichever block is showing, ~1/s.
      const glitch = () => {
        const target =
          +gsap.getProperty(lineupText, 'opacity') > 0.6
            ? lineupLeaves
            : +gsap.getProperty(bioText, 'opacity') > 0.6
              ? bioLeaves
              : null
        if (target) {
          const el = target[(Math.random() * target.length) | 0]
          const text = full.get(el)!
          // only when the line is settled (not mid-scramble / prior glitch)
          if (text.length && el.textContent === text) {
            let i = (Math.random() * text.length) | 0
            while (text[i] === ' ') i = (i + 1) % text.length
            el.textContent = text.slice(0, i) + rnd() + text.slice(i + 1)
            window.setTimeout(() => {
              if (el.textContent !== text) el.textContent = text
            }, 90)
          }
        }
        glitchTimer = window.setTimeout(glitch, 850 + Math.random() * 500)
      }
      glitchTimer = window.setTimeout(glitch, 1200)
    }, about)

    return () => {
      window.clearTimeout(glitchTimer)
      ctx.revert()
    }
  }, [])

  // ScrollTrigger measures the pin's start/end at mount, but layout is still
  // moving then — the web font swaps in and the hero intro briefly spreads its
  // rows, both shifting this section down. Re-measure against the settled
  // layout once the intro finishes (this fires on mount for reduced motion,
  // where there's no ScrollTrigger to refresh — harmless).
  useEffect(() => {
    if (introDone) ScrollTrigger.refresh()
  }, [introDone])

  // Load the banner video the first time the strip scrolls into view.
  useEffect(() => {
    const strip = jukeboxRef.current
    if (!strip || videoLive) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVideoLive(true)
          io.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    io.observe(strip)
    return () => io.disconnect()
  }, [videoLive])

  // Scramble the "Book Syndicate" heading in over 2s, once it scrolls
  // into view. Same glyph-settle technique as the About/Lineup text.
  useEffect(() => {
    const el = bookHeadingRef.current
    if (prefersReducedMotion() || !el) return

    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>*+=:·'
    const text = el.textContent ?? ''
    const DURATION = 2000
    let raf = 0

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min((now - start) / DURATION, 1)
          if (p >= 1) {
            el.textContent = text
            return
          }
          const settled = p * text.length * 1.12
          let out = ''
          for (let i = 0; i < text.length; i++) {
            out +=
              i <= settled || text[i] === ' '
                ? text[i]
                : GLYPHS[(Math.random() * GLYPHS.length) | 0]
          }
          el.textContent = out
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  const reduced = prefersReducedMotion()

  return (
    <>
      {/* Stencil header — the photo blends through the letterforms. */}
      <section className="syn-hero" id="home" ref={heroRef}>
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

      {/* Pinned scroll-reveal: bio, then three full-bleed photos. */}
      <section
        className={`syn-about${reduced ? ' syn-about--static' : ''}`}
        id="about"
        ref={aboutRef}
      >
        <div className="syn-about-stage" ref={stageRef}>
          {ABOUT_PHOTOS.map((src) => (
            <img
              key={src}
              className="syn-about-photo"
              src={src}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
            />
          ))}
          {/* Bio — layered over photos 7 and 4. */}
          <div className="syn-about-text syn-about-text--bio">
            <div className="syn-about-panel">
              <p className="syn-heading syn-scramble">About</p>
              <p className="syn-body syn-scramble">
                SYNDICATE is a Los Angeles-based jazz quintet led by trumpeter
                Massimo Paparello. The group performs original compositions shaped
                collectively by its members, drawing from a wide range of
                influences across modern jazz, bebop, and contemporary improvised
                music. Writing is shared within the ensemble, resulting in
                material that reflects multiple compositional voices rather than a
                single perspective.
              </p>
              <p className="syn-body syn-scramble">
                With instrumentation of trumpet, alto saxophone/flute, piano,
                bass, and drums, SYNDICATE emphasizes interactive ensemble
                playing, detailed arrangements, and open improvisation. The
                result is a repertoire that shifts between structured writing and
                spontaneous improvisation, highlighting the voice of each player
                within a cohesive identity.
              </p>
            </div>
          </div>
          {/* Lineup — layered over the final photo (5) in place of the bio. */}
          <div className="syn-about-text syn-about-text--lineup">
            <div className="syn-about-panel">
              <p className="syn-heading syn-scramble">Lineup</p>
              <ul className="syn-lineup">
                <li className="syn-scramble">Trumpet — Massimo Paparello</li>
                <li className="syn-scramble">
                  Alto Saxophone &amp; Flute — Evan O&rsquo;Brien
                </li>
                <li className="syn-scramble">Piano — Sam Smylie</li>
                <li className="syn-scramble">Bass — Adam Hernandez</li>
                <li className="syn-scramble">Drums — Dante Newcombe-Kenealy</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Retro jukebox strip: right-to-left photo marquee background under a
          dark scrim; live video left, Win95 media player right. */}
      <section className="syn-jukebox" id="music" ref={jukeboxRef}>
        <div className="syn-jukebox-marquee" aria-hidden="true">
          <div className="syn-jukebox-marquee-track">
            {[...MARQUEE_PHOTOS, ...MARQUEE_PHOTOS].map((src, i) => (
              <img
                key={i}
                className="syn-jukebox-marquee-img"
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        </div>
        <div className="syn-jukebox-scrim" aria-hidden="true" />
        <div className="syn-jukebox-video">
          {videoLive && (
            <RetroTvPlayer videoUrl="https://www.youtube.com/watch?v=M0e5tfIwKMU" />
          )}
        </div>
        <div className="syn-jukebox-player">
          <RetroPlayer />
        </div>
      </section>

      <hr className="syn-rule" />

      <section className="syn-section" id="booking">
        <p className="syn-heading syn-heading--lg" ref={bookHeadingRef}>Booking</p>
        <form className="syn-form" onSubmit={handleBookingSubmit}>
          <div className="syn-field">
            <label className="syn-label" htmlFor="book-name">Name</label>
            <input
              id="book-name"
              className="syn-input"
              required
              value={bookingForm.name}
              onChange={(e) => updateBooking('name', e.target.value)}
            />
          </div>
          <div className="syn-field">
            <label className="syn-label" htmlFor="book-email">Email</label>
            <input
              id="book-email"
              type="email"
              className="syn-input"
              required
              value={bookingForm.email}
              onChange={(e) => updateBooking('email', e.target.value)}
            />
          </div>
          <div className="syn-field-row">
            <div className="syn-field">
              <label className="syn-label" htmlFor="book-type">Event type</label>
              <select
                id="book-type"
                className="syn-input"
                value={bookingForm.eventType}
                onChange={(e) => updateBooking('eventType', e.target.value)}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="syn-field">
              <label className="syn-label" htmlFor="book-date">Date</label>
              <input
                id="book-date"
                type="date"
                className="syn-input"
                value={bookingForm.eventDate}
                onChange={(e) => updateBooking('eventDate', e.target.value)}
              />
            </div>
          </div>
          <div className="syn-field-row">
            <div className="syn-field">
              <label className="syn-label" htmlFor="book-location">Venue / location</label>
              <input
                id="book-location"
                className="syn-input"
                value={bookingForm.location}
                onChange={(e) => updateBooking('location', e.target.value)}
              />
            </div>
            <div className="syn-field">
              <label className="syn-label" htmlFor="book-budget">Budget</label>
              <input
                id="book-budget"
                className="syn-input"
                placeholder="Optional"
                value={bookingForm.budget}
                onChange={(e) => updateBooking('budget', e.target.value)}
              />
            </div>
          </div>
          <div className="syn-field">
            <label className="syn-label" htmlFor="book-details">Details</label>
            <textarea
              id="book-details"
              className="syn-input syn-textarea"
              rows={4}
              required
              placeholder="Set length, timing, anything else we should know"
              value={bookingForm.details}
              onChange={(e) => updateBooking('details', e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="syn-btn"
            disabled={submit.status === 'sending'}
          >
            {submit.status === 'sending' ? 'Sending…' : 'Send inquiry'}
          </button>
          {submit.message && (
            <p
              className={`syn-form-msg syn-form-msg--${submit.status}`}
              role="status"
              aria-live="polite"
            >
              {submit.message}
            </p>
          )}
        </form>
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
