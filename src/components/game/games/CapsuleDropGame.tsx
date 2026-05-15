'use client'

/**
 * Capsule Drop — color-matching puzzle game
 * Drop 2-color capsules, match 4+ same-color cells to score or eliminate viruses.
 * Win by reaching the points target OR eliminating all viruses.
 */

import { useEffect, useRef, useCallback } from 'react'
import type { GameResult } from '@/components/game/MinigameShell'

// ─── Board constants ──────────────────────────────────────────────────────────

const COLS        = 12
const ROWS        = 12
const CELL        = 36
const BOARD_X     = Math.floor((720 - COLS * CELL) / 2)   // 144
const BOARD_Y     = Math.floor((540 - ROWS * CELL) / 2)   // 54
const VIRUS_ROW   = 5      // viruses placed from row 5 down
const MATCH_MIN   = 4
const DAS_DELAY   = 150
const DAS_REPEAT  = 50

// ─── Colors ───────────────────────────────────────────────────────────────────

type Color = 'R' | 'B' | 'Y' | 'G'

const ALL_COLORS: Color[] = ['R', 'B', 'Y', 'G']

const COLOR_HEX: Record<Color, string> = {
  R: '#ef4444',
  B: '#3b82f6',
  Y: '#fbbf24',
  G: '#22c55e',
}
const COLOR_LIGHT: Record<Color, string> = {
  R: '#fca5a5',
  B: '#93c5fd',
  Y: '#fde68a',
  G: '#86efac',
}

// ─── Difficulty ───────────────────────────────────────────────────────────────

interface DiffConfig {
  fallMs:        number   // ms per auto-fall row
  virusCount:    number   // viruses on board (= virus win target)
  colorCount:    number   // how many colors available (1-4 of ALL_COLORS)
}

const DIFF: Record<number, DiffConfig> = {
  1: { fallMs: 900, virusCount: 2, colorCount: 2 },
  2: { fallMs: 700, virusCount: 3, colorCount: 2 },
  3: { fallMs: 500, virusCount: 4, colorCount: 3 },
  4: { fallMs: 300, virusCount: 4, colorCount: 4 },
}

// ─── Cell types ───────────────────────────────────────────────────────────────

type CellKind = 'empty' | 'virus' | 'pill'
interface Cell    { kind: CellKind; color: Color | null }
interface Capsule { x: number; y: number; colorA: Color; colorB: Color; vertical: boolean }

// ─── Board helpers ────────────────────────────────────────────────────────────

function empty(): Cell { return { kind: 'empty', color: null } }

function emptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, empty))
}

function randColor(palette: Color[]): Color {
  return palette[Math.floor(Math.random() * palette.length)]
}

function runLen(board: Cell[][], r: number, c: number, dr: number, dc: number, col: Color): number {
  let n = 0, nr = r + dr, nc = c + dc
  while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].color === col) {
    n++; nr += dr; nc += dc
  }
  return n
}

function buildBoard(virusCount: number, palette: Color[]): Cell[][] {
  const b = emptyBoard()
  let placed = 0, tries = 0
  while (placed < virusCount && tries < 20000) {
    tries++
    const r   = VIRUS_ROW + Math.floor(Math.random() * (ROWS - VIRUS_ROW))
    const c   = Math.floor(Math.random() * COLS)
    if (b[r][c].kind !== 'empty') continue
    const col = randColor(palette)
    if (runLen(b, r, c, 0, -1, col) + runLen(b, r, c, 0, 1, col) >= 2) continue
    if (runLen(b, r, c, -1, 0, col) + runLen(b, r, c, 1, 0, col) >= 2) continue
    b[r][c] = { kind: 'virus', color: col }
    placed++
  }
  return b
}

function capsuleCells(cap: Capsule): [number, number, Color][] {
  if (cap.vertical) return [[cap.y, cap.x, cap.colorA], [cap.y + 1, cap.x, cap.colorB]]
  return [[cap.y, cap.x, cap.colorA], [cap.y, cap.x + 1, cap.colorB]]
}

function isValid(board: Cell[][], cap: Capsule): boolean {
  for (const [r, c] of capsuleCells(cap)) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false
    if (board[r][c].kind !== 'empty') return false
  }
  return true
}

function rotateCapsule(cap: Capsule): Capsule {
  return { ...cap, vertical: !cap.vertical }
}

function lockCapsule(board: Cell[][], cap: Capsule): Cell[][] {
  const b = board.map(row => [...row])
  for (const [r, c, col] of capsuleCells(cap))
    if (r >= 0 && r < ROWS) b[r][c] = { kind: 'pill', color: col }
  return b
}

function findMatches(board: Cell[][]): Set<string> {
  const out = new Set<string>()
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    let s = 0
    for (let c = 1; c <= COLS; c++) {
      const same = c < COLS && board[r][c].color && board[r][c].color === board[r][s].color
      if (!same) {
        if (board[r][s].color && c - s >= MATCH_MIN)
          for (let k = s; k < c; k++) out.add(`${r},${k}`)
        s = c
      }
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    let s = 0
    for (let r = 1; r <= ROWS; r++) {
      const same = r < ROWS && board[r][c].color && board[r][c].color === board[s][c].color
      if (!same) {
        if (board[s][c].color && r - s >= MATCH_MIN)
          for (let k = s; k < r; k++) out.add(`${k},${c}`)
        s = r
      }
    }
  }
  return out
}

function applyGravity(board: Cell[][]): Cell[][] {
  const b = board.map(row => [...row])
  for (let c = 0; c < COLS; c++) {
    let w = ROWS - 1
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][c].kind !== 'empty') {
        if (w !== r) { b[w][c] = { ...b[r][c] }; b[r][c] = empty() }
        w--
      }
    }
  }
  return b
}

/**
 * Process all match+gravity cascades.
 * Each cascade iteration = 10 pts (regardless of how many cells matched).
 * Returns total points earned and viruses eliminated.
 */
function processMatches(board: Cell[][]): { board: Cell[][]; pts: number; viruses: number } {
  let b = board, pts = 0, viruses = 0
  while (true) {
    const m = findMatches(b)
    if (!m.size) break
    pts += 10
    b = b.map((row, r) => row.map((cell, c) => {
      if (!m.has(`${r},${c}`)) return cell
      if (cell.kind === 'virus') viruses++
      return empty()
    }))
    b = applyGravity(b)
  }
  return { board: b, pts, viruses }
}

// ─── State ────────────────────────────────────────────────────────────────────

interface State {
  board:             Cell[][]
  capsule:           Capsule | null
  nextColors:        [Color, Color]
  score:             number   // points accumulated
  virusesEliminated: number
  lastFall:          number
  dasKey:            string | null
  dasStart:          number
  dasLast:           number
  touchStartX:       number | null
  touchStartY:       number | null
  keys:              Set<string>
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  difficulty:   number
  winTarget:    number   // points target (40/60/80/100)
  timeLimitSec: number
  running:      boolean
  onResult:     (r: GameResult) => void
}

export function CapsuleDropGame({ difficulty, winTarget, running, timeLimitSec, onResult }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const stateRef   = useRef<State | null>(null)
  const rafRef     = useRef<number>(0)
  const resultSent = useRef(false)
  const startMs    = useRef(0)

  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  const endGame = useCallback((won: boolean, score: number) => {
    if (resultSent.current) return
    resultSent.current = true
    cancelAnimationFrame(rafRef.current)
    onResultRef.current({ won, score })
  }, [])

  useEffect(() => {
    if (!running) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const c   = ctx as CanvasRenderingContext2D
    const cvs = canvas

    const cfg     = DIFF[difficulty] ?? DIFF[1]
    const palette = ALL_COLORS.slice(0, cfg.colorCount)

    resultSent.current = false
    startMs.current    = Date.now()

    const nc0: [Color, Color] = [randColor(palette), randColor(palette)]
    const initCap: Capsule = {
      x: Math.floor(COLS / 2) - 1, y: 0,
      colorA: nc0[0], colorB: nc0[1], vertical: false,
    }

    stateRef.current = {
      board:             buildBoard(cfg.virusCount, palette),
      capsule:           initCap,
      nextColors:        [randColor(palette), randColor(palette)],
      score:             0,
      virusesEliminated: 0,
      lastFall:          performance.now(),
      dasKey: null, dasStart: 0, dasLast: 0,
      touchStartX: null, touchStartY: null,
      keys: new Set(),
    }

    // ── Lock + spawn ──────────────────────────────────────────────────────────

    function lockAndNext(): boolean {
      const s = stateRef.current!
      if (!s.capsule) return false

      const locked = lockCapsule(s.board, s.capsule)
      const { board: newBoard, pts, viruses } = processMatches(locked)
      s.board             = newBoard
      s.score            += pts
      s.virusesEliminated += viruses

      // Points win
      if (s.score >= winTarget) { endGame(true, s.score); return true }
      // Virus win — send score = winTarget so server validation passes
      if (s.virusesEliminated >= cfg.virusCount) { endGame(true, Math.max(s.score, winTarget)); return true }

      // Spawn next capsule
      const next: Capsule = {
        x: Math.floor(COLS / 2) - 1, y: 0,
        colorA: s.nextColors[0], colorB: s.nextColors[1], vertical: false,
      }
      if (!isValid(s.board, next)) { endGame(false, s.score); return true }
      s.capsule    = next
      s.nextColors = [randColor(palette), randColor(palette)]
      s.lastFall   = performance.now()
      return false
    }

    // ── Input helpers ─────────────────────────────────────────────────────────

    function tryMove(dx: number, dy: number): boolean {
      const s = stateRef.current!
      if (!s.capsule) return false
      const moved = { ...s.capsule, x: s.capsule.x + dx, y: s.capsule.y + dy }
      if (!isValid(s.board, moved)) return false
      s.capsule = moved; return true
    }

    function tryRotate() {
      const s = stateRef.current!
      if (!s.capsule) return
      const rot = rotateCapsule(s.capsule)
      if (isValid(s.board, rot)) { s.capsule = rot; return }
      for (const kick of [-1, 1, -2, 2]) {
        const k = { ...rot, x: rot.x + kick }
        if (isValid(s.board, k)) { s.capsule = k; return }
      }
    }

    function hardDrop() {
      const s = stateRef.current!
      if (!s.capsule) return
      while (tryMove(0, 1)) { /* fall */ }
      lockAndNext()
    }

    // ── Keyboard ──────────────────────────────────────────────────────────────

    function onKeyDown(e: KeyboardEvent) {
      const s = stateRef.current; if (!s) return
      const key = e.code
      if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space','KeyX','KeyZ'].includes(key))
        e.preventDefault()
      s.keys.add(key)
      if (key === 'ArrowLeft')  { tryMove(-1,0); s.dasKey='L'; s.dasStart=Date.now(); s.dasLast=Date.now() }
      if (key === 'ArrowRight') { tryMove( 1,0); s.dasKey='R'; s.dasStart=Date.now(); s.dasLast=Date.now() }
      if (key === 'ArrowDown')  tryMove(0,1)
      if (key === 'ArrowUp' || key === 'KeyX') tryRotate()
      if (key === 'KeyZ') { tryRotate(); tryRotate(); tryRotate() }
      if (key === 'Space') hardDrop()
    }
    function onKeyUp(e: KeyboardEvent) {
      const s = stateRef.current; if (!s) return
      s.keys.delete(e.code)
      if ((e.code==='ArrowLeft'&&s.dasKey==='L')||(e.code==='ArrowRight'&&s.dasKey==='R')) s.dasKey=null
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    // ── Touch ─────────────────────────────────────────────────────────────────

    function toX(cl: number) { return (cl-cvs.getBoundingClientRect().left)*(720/cvs.getBoundingClientRect().width) }
    function toY(cl: number) { return (cl-cvs.getBoundingClientRect().top) *(540/cvs.getBoundingClientRect().height) }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault()
      const t = e.touches[0]; if (!t) return
      const s = stateRef.current; if (!s) return
      s.touchStartX = toX(t.clientX); s.touchStartY = toY(t.clientY)
    }
    function onTouchEnd(e: TouchEvent) {
      e.preventDefault()
      const s = stateRef.current; if (!s) return
      if (s.touchStartX===null||s.touchStartY===null) return
      const t = e.changedTouches[0]; if (!t) return
      const dx = toX(t.clientX)-s.touchStartX, dy = toY(t.clientY)-s.touchStartY
      if (Math.abs(dx)<20&&Math.abs(dy)<20) tryRotate()
      else if (Math.abs(dx)>Math.abs(dy)) {
        const steps = Math.round(dx/(CELL*0.8))
        for (let i=0;i<Math.abs(steps);i++) tryMove(Math.sign(steps),0)
      } else if (dy>30) hardDrop()
      s.touchStartX=null; s.touchStartY=null
    }
    cvs.addEventListener('touchstart', onTouchStart, { passive: false })
    cvs.addEventListener('touchend',   onTouchEnd,   { passive: false })
    cvs.addEventListener('touchmove',  (e)=>e.preventDefault(), { passive: false })

    // ── Render ────────────────────────────────────────────────────────────────

    function drawCell(col: number, r: number, color: Color, kind: CellKind) {
      const px = BOARD_X + col * CELL, py = BOARD_Y + r * CELL
      if (kind === 'virus') {
        c.fillStyle = COLOR_HEX[color]
        c.beginPath(); c.arc(px+CELL/2,py+CELL/2,CELL/2-3,0,Math.PI*2); c.fill()
        c.fillStyle = COLOR_LIGHT[color]
        c.beginPath(); c.arc(px+CELL/2-5,py+CELL/2-5,5,0,Math.PI*2); c.fill()
        c.fillStyle = '#0f172a'
        c.beginPath(); c.arc(px+CELL/2-5,py+CELL/2-2,3,0,Math.PI*2); c.fill()
        c.beginPath(); c.arc(px+CELL/2+5,py+CELL/2-2,3,0,Math.PI*2); c.fill()
        c.strokeStyle='#0f172a'; c.lineWidth=1.5
        c.beginPath(); c.arc(px+CELL/2,py+CELL/2+4,5,0.15*Math.PI,0.85*Math.PI); c.stroke()
      } else {
        c.fillStyle = COLOR_HEX[color]
        c.beginPath(); c.roundRect(px+2,py+2,CELL-4,CELL-4,7); c.fill()
        c.fillStyle = COLOR_LIGHT[color]
        c.fillRect(px+3,py+3,CELL-6,5)
      }
    }

    function drawCapsule(cap: Capsule, alpha=1) {
      c.globalAlpha = alpha
      for (const [r, col, color] of capsuleCells(cap))
        if (r>=0) drawCell(col,r,color,'pill')
      c.globalAlpha = 1
    }

    function drawGhost(s: State) {
      if (!s.capsule) return
      let g = { ...s.capsule }
      while (isValid(s.board,{...g,y:g.y+1})) g={...g,y:g.y+1}
      if (g.y!==s.capsule.y) drawCapsule(g, 0.2)
    }

    function drawPanel(s: State, timeLeft: number) {
      const lx = 14   // left panel x

      // Score (points)
      c.fillStyle='rgba(255,255,255,0.5)'; c.font='11px monospace'
      c.fillText('SCORE', lx, BOARD_Y+16)
      c.fillStyle='white'; c.font='bold 24px monospace'
      c.fillText(`${s.score}`, lx, BOARD_Y+44)
      c.fillStyle='rgba(255,255,255,0.3)'; c.font='11px monospace'
      c.fillText(`/ ${winTarget} pts`, lx, BOARD_Y+60)

      // Progress bar (points)
      const prog = Math.min(1, s.score/winTarget)
      c.fillStyle='#1f2937'; c.fillRect(lx,BOARD_Y+66,120,5)
      c.fillStyle=prog>0.8?'#22c55e':'#6366f1'; c.fillRect(lx,BOARD_Y+66,120*prog,5)

      // Viruses
      c.fillStyle='rgba(255,255,255,0.5)'; c.font='11px monospace'
      c.fillText('VIRUSES', lx, BOARD_Y+90)
      c.fillStyle=s.virusesEliminated>=cfg.virusCount?'#22c55e':'white'; c.font='bold 18px monospace'
      c.fillText(`${s.virusesEliminated} / ${cfg.virusCount}`, lx, BOARD_Y+112)

      // Timer
      const tc=timeLeft<=10?'#ef4444':timeLeft<=20?'#f97316':'rgba(255,255,255,0.5)'
      c.fillStyle='rgba(255,255,255,0.5)'; c.font='11px monospace'
      c.fillText('TIME', lx, BOARD_Y+138)
      c.fillStyle=tc; c.font='bold 22px monospace'
      c.fillText(`${timeLeft}s`, lx, BOARD_Y+162)

      // Right panel — next capsule
      const rx = BOARD_X + COLS*CELL + 16
      c.fillStyle='rgba(255,255,255,0.5)'; c.font='11px monospace'
      c.fillText('NEXT', rx, BOARD_Y+16)
      const [cA,cB] = s.nextColors
      c.fillStyle=COLOR_HEX[cA]; c.beginPath(); c.roundRect(rx,BOARD_Y+24,CELL-2,CELL-2,7); c.fill()
      c.fillStyle=COLOR_HEX[cB]; c.beginPath(); c.roundRect(rx+CELL,BOARD_Y+24,CELL-2,CELL-2,7); c.fill()

      // Colors available (dots)
      c.fillStyle='rgba(255,255,255,0.4)'; c.font='10px monospace'
      c.fillText('COLORS', rx, BOARD_Y+82)
      palette.forEach((col,i) => {
        c.fillStyle=COLOR_HEX[col]
        c.beginPath(); c.arc(rx+10+i*18,BOARD_Y+96,6,0,Math.PI*2); c.fill()
      })
    }

    // ── Game loop ─────────────────────────────────────────────────────────────

    function loop(ts: number) {
      const s = stateRef.current; if (!s) return

      const now      = Date.now()
      const elapsed  = (now-startMs.current)/1000
      const timeLeft = Math.max(0, timeLimitSec-Math.floor(elapsed))
      if (timeLeft===0) { endGame(false,s.score); return }

      // DAS
      if (s.dasKey && now-s.dasStart>DAS_DELAY && now-s.dasLast>DAS_REPEAT) {
        if (s.dasKey==='L'&&s.keys.has('ArrowLeft'))  tryMove(-1,0)
        if (s.dasKey==='R'&&s.keys.has('ArrowRight')) tryMove( 1,0)
        if (s.keys.has('ArrowDown')) tryMove(0,1)
        s.dasLast=now
      }

      // Auto-fall
      if (ts-s.lastFall>=cfg.fallMs) {
        if (!tryMove(0,1)) { if (lockAndNext()) return } else s.lastFall=ts
      }

      // ── Render ──────────────────────────────────────────────────────────────
      c.fillStyle='#07070e'; c.fillRect(0,0,720,540)
      c.fillStyle='#0d0d1a'; c.fillRect(BOARD_X,BOARD_Y,COLS*CELL,ROWS*CELL)

      // Grid
      c.strokeStyle='rgba(255,255,255,0.03)'; c.lineWidth=1
      for (let r=0;r<=ROWS;r++){c.beginPath();c.moveTo(BOARD_X,BOARD_Y+r*CELL);c.lineTo(BOARD_X+COLS*CELL,BOARD_Y+r*CELL);c.stroke()}
      for (let col=0;col<=COLS;col++){c.beginPath();c.moveTo(BOARD_X+col*CELL,BOARD_Y);c.lineTo(BOARD_X+col*CELL,BOARD_Y+ROWS*CELL);c.stroke()}

      // Board cells
      for (let r=0;r<ROWS;r++) for (let col=0;col<COLS;col++) {
        const cell=s.board[r][col]
        if (cell.kind!=='empty'&&cell.color) drawCell(col,r,cell.color,cell.kind)
      }

      if (s.capsule) { drawGhost(s); drawCapsule(s.capsule) }

      c.strokeStyle='rgba(99,102,241,0.4)'; c.lineWidth=2
      c.strokeRect(BOARD_X,BOARD_Y,COLS*CELL,ROWS*CELL)

      drawPanel(s, timeLeft)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      cvs.removeEventListener('touchstart', onTouchStart)
      cvs.removeEventListener('touchend',   onTouchEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  return (
    <canvas
      ref={canvasRef}
      width={720}
      height={540}
      className="w-full h-full touch-none"
      style={{ display: 'block' }}
    />
  )
}
