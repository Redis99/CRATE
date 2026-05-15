'use client'

/**
 * Capsule Drop — Dr. Mario-style color-matching game
 * Drop 2-color capsules to match 4+ same-color cells (horizontally or vertically)
 * and eliminate all viruses on the board.
 */

import { useEffect, useRef, useCallback } from 'react'
import type { GameResult } from '@/components/game/MinigameShell'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLS          = 8
const ROWS          = 16
const CELL          = 28
const BOARD_X       = Math.floor((720 - COLS * CELL) / 2)   // 248
const BOARD_Y       = Math.floor((540 - ROWS * CELL) / 2)   // 46
const VIRUS_ROW_MIN = 4       // viruses only from row 4 down
const MATCH_MIN     = 4       // minimum run for a match
const DAS_DELAY     = 150
const DAS_REPEAT    = 50

// ─── Types ────────────────────────────────────────────────────────────────────

type Color    = 'R' | 'B' | 'Y'
type CellKind = 'empty' | 'virus' | 'pill'

interface Cell    { kind: CellKind; color: Color | null }
interface Capsule { x: number; y: number; colorA: Color; colorB: Color; vertical: boolean }

interface DiffConfig {
  fallMs:     number   // ms per auto-fall row
  virusCount: number   // initial viruses (= winTarget for the level)
}

const DIFF: Record<number, DiffConfig> = {
  1: { fallMs: 900, virusCount: 6  },
  2: { fallMs: 700, virusCount: 8  },
  3: { fallMs: 500, virusCount: 10 },
  4: { fallMs: 300, virusCount: 13 },
}

const COLORS:      Color[]               = ['R', 'B', 'Y']
const COLOR_HEX:   Record<Color, string> = { R: '#ef4444', B: '#3b82f6', Y: '#fbbf24' }
const COLOR_LIGHT: Record<Color, string> = { R: '#fca5a5', B: '#93c5fd', Y: '#fde68a' }

// ─── Board helpers ────────────────────────────────────────────────────────────

function randColor(): Color { return COLORS[Math.floor(Math.random() * 3)] }
function empty(): Cell { return { kind: 'empty', color: null } }
function emptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, empty))
}

/** Count same-color consecutive cells in one direction, excluding the origin */
function runLen(board: Cell[][], r: number, c: number, dr: number, dc: number, col: Color): number {
  let n = 0, nr = r + dr, nc = c + dc
  while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].color === col) {
    n++; nr += dr; nc += dc
  }
  return n
}

/** Place viruses randomly, ensuring no 3-in-a-row is pre-formed */
function buildBoard(count: number): Cell[][] {
  const b = emptyBoard()
  let placed = 0, attempts = 0
  while (placed < count && attempts < 20000) {
    attempts++
    const r   = VIRUS_ROW_MIN + Math.floor(Math.random() * (ROWS - VIRUS_ROW_MIN))
    const c   = Math.floor(Math.random() * COLS)
    if (b[r][c].kind !== 'empty') continue
    const col = randColor()
    // Reject if would create 3-in-a-row
    if (runLen(b, r, c, 0, -1, col) + runLen(b, r, c, 0, 1, col) >= 2) continue
    if (runLen(b, r, c, -1, 0, col) + runLen(b, r, c, 1, 0, col) >= 2) continue
    b[r][c] = { kind: 'virus', color: col }
    placed++
  }
  return b
}

/** Cells occupied by capsule: [row, col, colorA/B] */
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
  if (!cap.vertical) {
    // horizontal → vertical: top=colorA, bottom=colorB
    return { ...cap, vertical: true }
  } else {
    // vertical → horizontal: left=colorA, right=colorB
    return { ...cap, vertical: false }
  }
}

function lockCapsule(board: Cell[][], cap: Capsule): Cell[][] {
  const b = board.map(row => [...row])
  for (const [r, c, col] of capsuleCells(cap)) {
    if (r >= 0 && r < ROWS) b[r][c] = { kind: 'pill', color: col }
  }
  return b
}

/** Find all cells in horizontal/vertical runs of MATCH_MIN+ same color */
function findMatches(board: Cell[][]): Set<string> {
  const toRemove = new Set<string>()

  for (let r = 0; r < ROWS; r++) {
    let start = 0
    for (let c = 1; c <= COLS; c++) {
      const same = c < COLS && board[r][c].color && board[r][c].color === board[r][start].color
      if (!same) {
        if (board[r][start].color && c - start >= MATCH_MIN)
          for (let k = start; k < c; k++) toRemove.add(`${r},${k}`)
        start = c
      }
    }
  }
  for (let c = 0; c < COLS; c++) {
    let start = 0
    for (let r = 1; r <= ROWS; r++) {
      const same = r < ROWS && board[r][c].color && board[r][c].color === board[start][c].color
      if (!same) {
        if (board[start][c].color && r - start >= MATCH_MIN)
          for (let k = start; k < r; k++) toRemove.add(`${k},${c}`)
        start = r
      }
    }
  }
  return toRemove
}

/** Gravity: non-empty cells fall to lowest available row in each column */
function applyGravity(board: Cell[][]): Cell[][] {
  const b = board.map(row => [...row])
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][c].kind !== 'empty') {
        if (write !== r) { b[write][c] = { ...b[r][c] }; b[r][c] = empty() }
        write--
      }
    }
  }
  return b
}

/** Process all matches + gravity in cascade; returns viruses eliminated */
function processMatches(board: Cell[][]): { board: Cell[][]; removed: number } {
  let b = board, removed = 0
  while (true) {
    const m = findMatches(b)
    if (!m.size) break
    let v = 0
    b = b.map((row, r) => row.map((cell, c) => {
      if (!m.has(`${r},${c}`)) return cell
      if (cell.kind === 'virus') v++
      return empty()
    }))
    b = applyGravity(b)
    removed += v
  }
  return { board: b, removed }
}

function newCapsuleColors(): [Color, Color] { return [randColor(), randColor()] }

// ─── State ────────────────────────────────────────────────────────────────────

interface State {
  board:       Cell[][]
  capsule:     Capsule | null
  nextColors:  [Color, Color]
  score:       number         // viruses eliminated so far
  lastFall:    number         // performance.now() of last auto-fall
  dasKey:      string | null
  dasStart:    number
  dasLast:     number
  touchStartX: number | null
  touchStartY: number | null
  keys:        Set<string>
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  difficulty:   number
  winTarget:    number
  timeLimitSec: number
  running:      boolean
  onResult:     (r: GameResult) => void
}

export function BlockFallGame({ difficulty, winTarget, running, timeLimitSec, onResult }: Props) {
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

    const cfg = DIFF[difficulty] ?? DIFF[1]

    resultSent.current = false
    startMs.current    = Date.now()

    const initColors = newCapsuleColors()
    const initBoard  = buildBoard(winTarget)
    const initCap: Capsule = { x: Math.floor(COLS / 2) - 1, y: 0, colorA: initColors[0], colorB: initColors[1], vertical: false }

    stateRef.current = {
      board:       initBoard,
      capsule:     initCap,
      nextColors:  newCapsuleColors(),
      score:       0,
      lastFall:    performance.now(),
      dasKey:      null, dasStart: 0, dasLast: 0,
      touchStartX: null, touchStartY: null,
      keys:        new Set(),
    }

    // ── Lock capsule & spawn next ─────────────────────────────────────────────

    function lockAndNext(): boolean {
      // Returns true if game ended
      const s = stateRef.current!
      if (!s.capsule) return false

      let b = lockCapsule(s.board, s.capsule)
      const { board: newBoard, removed } = processMatches(b)
      s.board   = newBoard
      s.score  += removed
      if (s.score >= winTarget) { endGame(true, s.score); return true }

      // Spawn next capsule
      const nextCap: Capsule = {
        x: Math.floor(COLS / 2) - 1, y: 0,
        colorA: s.nextColors[0], colorB: s.nextColors[1],
        vertical: false,
      }
      if (!isValid(s.board, nextCap)) { endGame(false, s.score); return true }

      s.capsule    = nextCap
      s.nextColors = newCapsuleColors()
      s.lastFall   = performance.now()
      return false
    }

    // ── Input ─────────────────────────────────────────────────────────────────

    function tryMove(dx: number, dy: number): boolean {
      const s = stateRef.current!
      if (!s.capsule) return false
      const moved = { ...s.capsule, x: s.capsule.x + dx, y: s.capsule.y + dy }
      if (!isValid(s.board, moved)) return false
      s.capsule = moved
      return true
    }

    function tryRotate() {
      const s = stateRef.current!
      if (!s.capsule) return
      const rotated = rotateCapsule(s.capsule)
      if (isValid(s.board, rotated)) { s.capsule = rotated; return }
      // Wall-kick
      for (const kick of [-1, 1, -2, 2]) {
        const kicked = { ...rotated, x: rotated.x + kick }
        if (isValid(s.board, kicked)) { s.capsule = kicked; return }
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

      if (key === 'ArrowLeft')  { tryMove(-1, 0); s.dasKey = 'L'; s.dasStart = Date.now(); s.dasLast = Date.now() }
      if (key === 'ArrowRight') { tryMove( 1, 0); s.dasKey = 'R'; s.dasStart = Date.now(); s.dasLast = Date.now() }
      if (key === 'ArrowDown')  tryMove(0, 1)
      if (key === 'ArrowUp' || key === 'KeyX') tryRotate()
      if (key === 'KeyZ') { tryRotate(); tryRotate(); tryRotate() }
      if (key === 'Space') hardDrop()
    }
    function onKeyUp(e: KeyboardEvent) {
      const s = stateRef.current; if (!s) return
      s.keys.delete(e.code)
      if ((e.code === 'ArrowLeft' && s.dasKey === 'L') ||
          (e.code === 'ArrowRight' && s.dasKey === 'R')) s.dasKey = null
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    // ── Touch ─────────────────────────────────────────────────────────────────

    function toX(cl: number) { return (cl - cvs.getBoundingClientRect().left) * (720 / cvs.getBoundingClientRect().width) }
    function toY(cl: number) { return (cl - cvs.getBoundingClientRect().top)  * (540 / cvs.getBoundingClientRect().height) }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault()
      const s = stateRef.current; if (!s) return
      const t = e.touches[0]; if (!t) return
      s.touchStartX = toX(t.clientX); s.touchStartY = toY(t.clientY)
    }
    function onTouchEnd(e: TouchEvent) {
      e.preventDefault()
      const s = stateRef.current; if (!s) return
      if (s.touchStartX === null || s.touchStartY === null) return
      const t = e.changedTouches[0]; if (!t) return
      const dx = toX(t.clientX) - s.touchStartX
      const dy = toY(t.clientY) - s.touchStartY
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) tryRotate()
      else if (Math.abs(dx) > Math.abs(dy)) {
        const steps = Math.round(dx / (CELL * 0.8))
        for (let i = 0; i < Math.abs(steps); i++) tryMove(Math.sign(steps), 0)
      } else if (dy > 30) hardDrop()
      s.touchStartX = null; s.touchStartY = null
    }
    cvs.addEventListener('touchstart',  onTouchStart,  { passive: false })
    cvs.addEventListener('touchend',    onTouchEnd,    { passive: false })
    cvs.addEventListener('touchmove',   (e) => e.preventDefault(), { passive: false })

    // ── Render helpers ────────────────────────────────────────────────────────

    function drawCell(col: number, r: number, color: Color, kind: CellKind) {
      const px = BOARD_X + col * CELL
      const py = BOARD_Y + r   * CELL
      const inset = 2

      if (kind === 'virus') {
        // Círculo colorido com "cara"
        c.fillStyle = COLOR_HEX[color]
        c.beginPath()
        c.arc(px + CELL / 2, py + CELL / 2, CELL / 2 - inset, 0, Math.PI * 2)
        c.fill()
        // Highlight
        c.fillStyle = COLOR_LIGHT[color]
        c.beginPath()
        c.arc(px + CELL / 2 - 4, py + CELL / 2 - 4, 4, 0, Math.PI * 2)
        c.fill()
        // Olhos
        c.fillStyle = '#1e1e2e'
        c.beginPath(); c.arc(px + CELL / 2 - 4, py + CELL / 2 - 2, 2.5, 0, Math.PI * 2); c.fill()
        c.beginPath(); c.arc(px + CELL / 2 + 4, py + CELL / 2 - 2, 2.5, 0, Math.PI * 2); c.fill()
        // Boca
        c.strokeStyle = '#1e1e2e'; c.lineWidth = 1.5
        c.beginPath()
        c.arc(px + CELL / 2, py + CELL / 2 + 3, 4, 0.1 * Math.PI, 0.9 * Math.PI)
        c.stroke()
      } else {
        // Pílula: retângulo arredondado
        c.fillStyle = COLOR_HEX[color]
        c.beginPath()
        c.roundRect(px + inset, py + inset, CELL - inset * 2, CELL - inset * 2, 6)
        c.fill()
        c.fillStyle = COLOR_LIGHT[color]
        c.fillRect(px + inset, py + inset, CELL - inset * 2, 5)
      }
    }

    function drawCapsulePreview(cap: Capsule, alpha = 1) {
      c.globalAlpha = alpha
      for (const [r, col, color] of capsuleCells(cap)) {
        if (r >= 0) drawCell(col, r, color, 'pill')
      }
      c.globalAlpha = 1
    }

    function drawGhost(s: State) {
      if (!s.capsule) return
      let ghost = { ...s.capsule }
      while (isValid(s.board, { ...ghost, y: ghost.y + 1 })) ghost = { ...ghost, y: ghost.y + 1 }
      if (ghost.y !== s.capsule.y) drawCapsulePreview(ghost, 0.2)
    }

    function drawPanel(s: State, timeLeft: number) {
      // Score
      c.fillStyle = 'rgba(255,255,255,0.6)'
      c.font      = '11px monospace'
      c.fillText('SCORE', 20, BOARD_Y + 16)
      c.fillStyle = 'white'
      c.font      = 'bold 22px monospace'
      c.fillText(`${s.score}`, 20, BOARD_Y + 42)
      c.fillStyle = 'rgba(255,255,255,0.35)'
      c.font      = '11px monospace'
      c.fillText(`/ ${winTarget}`, 20, BOARD_Y + 58)

      // Progress bar
      const prog = Math.min(1, s.score / winTarget)
      c.fillStyle = '#1f2937'
      c.fillRect(20, BOARD_Y + 64, 130, 5)
      c.fillStyle = prog > 0.8 ? '#22c55e' : '#6366f1'
      c.fillRect(20, BOARD_Y + 64, 130 * prog, 5)

      // Timer
      const tc = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f97316' : 'rgba(255,255,255,0.5)'
      c.fillStyle = 'rgba(255,255,255,0.6)'
      c.font      = '11px monospace'
      c.fillText('TIME', 20, BOARD_Y + 90)
      c.fillStyle = tc
      c.font      = 'bold 20px monospace'
      c.fillText(`${timeLeft}s`, 20, BOARD_Y + 112)

      // Next capsule
      const nx = BOARD_X + COLS * CELL + 20
      c.fillStyle = 'rgba(255,255,255,0.6)'
      c.font      = '11px monospace'
      c.fillText('NEXT', nx, BOARD_Y + 16)

      const [cA, cB] = s.nextColors
      // Left half
      c.fillStyle = COLOR_HEX[cA]
      c.beginPath(); c.roundRect(nx, BOARD_Y + 24, CELL - 2, CELL - 2, 6); c.fill()
      // Right half
      c.fillStyle = COLOR_HEX[cB]
      c.beginPath(); c.roundRect(nx + CELL, BOARD_Y + 24, CELL - 2, CELL - 2, 6); c.fill()
    }

    // ── Game loop ─────────────────────────────────────────────────────────────

    function loop(ts: number) {
      const s = stateRef.current; if (!s) return

      const now      = Date.now()
      const elapsed  = (now - startMs.current) / 1000
      const timeLeft = Math.max(0, timeLimitSec - Math.floor(elapsed))
      if (timeLeft === 0) { endGame(false, s.score); return }

      // DAS
      if (s.dasKey && now - s.dasStart > DAS_DELAY && now - s.dasLast > DAS_REPEAT) {
        if (s.dasKey === 'L' && s.keys.has('ArrowLeft'))  tryMove(-1, 0)
        if (s.dasKey === 'R' && s.keys.has('ArrowRight')) tryMove( 1, 0)
        if (s.keys.has('ArrowDown')) tryMove(0, 1)
        s.dasLast = now
      }

      // Auto-fall
      if (ts - s.lastFall >= cfg.fallMs) {
        if (!tryMove(0, 1)) {
          if (lockAndNext()) return
        } else {
          s.lastFall = ts
        }
      }

      // ── Render ──────────────────────────────────────────────────────────────
      c.fillStyle = '#07070e'
      c.fillRect(0, 0, 720, 540)

      // Board background
      c.fillStyle = '#0d0d1a'
      c.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL)

      // Grid
      c.strokeStyle = 'rgba(255,255,255,0.03)'
      c.lineWidth   = 1
      for (let r = 0; r <= ROWS; r++) {
        c.beginPath(); c.moveTo(BOARD_X, BOARD_Y + r * CELL); c.lineTo(BOARD_X + COLS * CELL, BOARD_Y + r * CELL); c.stroke()
      }
      for (let col = 0; col <= COLS; col++) {
        c.beginPath(); c.moveTo(BOARD_X + col * CELL, BOARD_Y); c.lineTo(BOARD_X + col * CELL, BOARD_Y + ROWS * CELL); c.stroke()
      }

      // Board cells
      for (let r = 0; r < ROWS; r++)
        for (let col = 0; col < COLS; col++) {
          const cell = s.board[r][col]
          if (cell.kind !== 'empty' && cell.color) drawCell(col, r, cell.color, cell.kind)
        }

      // Ghost + active capsule
      if (s.capsule) {
        drawGhost(s)
        drawCapsulePreview(s.capsule)
      }

      // Border
      c.strokeStyle = 'rgba(99,102,241,0.4)'
      c.lineWidth   = 2
      c.strokeRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL)

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
