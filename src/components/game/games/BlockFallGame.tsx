'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { GameResult } from '@/components/game/MinigameShell'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLS = 10
const ROWS = 20
const CELL = 24           // px per cell
const BOARD_X = 228       // canvas x offset for board (centers in 720px canvas)
const BOARD_Y = 28        // canvas y offset

// Fall speed (ms per row) by difficulty
const FALL_MS: Record<number, number> = { 1: 800, 2: 580, 3: 380, 4: 220 }

// DAS (Delayed Auto-Shift): hold key timings
const DAS_DELAY  = 150   // ms before repeat starts
const DAS_REPEAT = 50    // ms between repeats

// ─── Pieces ───────────────────────────────────────────────────────────────────

const SHAPES: Record<string, number[][]> = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  L: [[1,0],[1,0],[1,1]],
  J: [[0,1],[0,1],[1,1]],
}
const COLORS: Record<string, string> = {
  I: '#06b6d4', O: '#fbbf24', T: '#a855f7',
  S: '#22c55e', Z: '#ef4444', L: '#f97316', J: '#3b82f6',
}
const TYPES = Object.keys(SHAPES)

// ─── Types ────────────────────────────────────────────────────────────────────

type Cell  = string | 0
interface Piece { type: string; shape: number[][]; x: number; y: number }

interface State {
  board:      Cell[][]
  current:    Piece
  next:       Piece
  score:      number
  lastFall:   number
  dasKey:     string | null   // key being held for auto-shift
  dasStart:   number          // when DAS key was first pressed
  dasLast:    number          // last DAS repeat
  touchStartX: number | null
  touchStartY: number | null
  lastTap:    number
  keys:       Set<string>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rotate(shape: number[][]): number[][] {
  return shape[0].map((_, c) => shape.map(row => row[c]).reverse())
}

function randomPiece(): Piece {
  const type  = TYPES[Math.floor(Math.random() * TYPES.length)]
  const shape = SHAPES[type]
  return { type, shape, x: Math.floor((COLS - shape[0].length) / 2), y: 0 }
}

function isValid(board: Cell[][], shape: number[][], x: number, y: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue
      const nx = x + c, ny = y + r
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false
      if (ny >= 0 && board[ny][nx] !== 0) return false
    }
  }
  return true
}

function lockPiece(board: Cell[][], piece: Piece): Cell[][] {
  const b = board.map(row => [...row])
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c] && piece.y + r >= 0)
        b[piece.y + r][piece.x + c] = COLORS[piece.type]
  return b
}

function clearLines(board: Cell[][]): { board: Cell[][]; lines: number } {
  const kept  = board.filter(row => row.some(c => c === 0))
  const lines = ROWS - kept.length
  while (kept.length < ROWS) kept.unshift(new Array(COLS).fill(0))
  return { board: kept, lines }
}

function ghostY(board: Cell[][], piece: Piece): number {
  let gy = piece.y
  while (isValid(board, piece.shape, piece.x, gy + 1)) gy++
  return gy
}

function toCanvasX(clientX: number, canvas: HTMLCanvasElement): number {
  return (clientX - canvas.getBoundingClientRect().left) * (canvas.width / canvas.getBoundingClientRect().width)
}
function toCanvasY(clientY: number, canvas: HTMLCanvasElement): number {
  return (clientY - canvas.getBoundingClientRect().top) * (canvas.height / canvas.getBoundingClientRect().height)
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
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const stateRef    = useRef<State | null>(null)
  const rafRef      = useRef<number>(0)
  const resultSent  = useRef(false)
  const startMs     = useRef(0)
  const lastFrameMs = useRef(0)

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
    const c = ctx as CanvasRenderingContext2D
    const cvs = canvas

    const emptyBoard = (): Cell[][] => Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
    const first  = randomPiece()
    const second = randomPiece()

    resultSent.current  = false
    startMs.current     = Date.now()
    lastFrameMs.current = 0

    stateRef.current = {
      board: emptyBoard(), current: first, next: second,
      score: 0, lastFall: performance.now(),
      dasKey: null, dasStart: 0, dasLast: 0,
      touchStartX: null, touchStartY: null, lastTap: 0,
      keys: new Set(),
    }

    const fallMs = FALL_MS[difficulty] ?? FALL_MS[1]

    // ── Input helpers ────────────────────────────────────────────────────────

    function tryMove(dx: number, dy: number): boolean {
      const s = stateRef.current!
      if (isValid(s.board, s.current.shape, s.current.x + dx, s.current.y + dy)) {
        s.current = { ...s.current, x: s.current.x + dx, y: s.current.y + dy }
        return true
      }
      return false
    }

    function tryRotate() {
      const s = stateRef.current!
      const rotated = rotate(s.current.shape)
      // Wall-kick: try offsets 0, -1, +1, -2, +2
      for (const kick of [0, -1, 1, -2, 2]) {
        if (isValid(s.board, rotated, s.current.x + kick, s.current.y)) {
          s.current = { ...s.current, shape: rotated, x: s.current.x + kick }
          return
        }
      }
    }

    function hardDrop() {
      const s = stateRef.current!
      const gy = ghostY(s.board, s.current)
      s.current = { ...s.current, y: gy }
      lockAndNext()
    }

    function lockAndNext() {
      const s = stateRef.current!
      const locked = lockPiece(s.board, s.current)
      const { board: cleared, lines } = clearLines(locked)
      s.board  = cleared
      s.score += lines * 10
      if (s.score >= winTarget) { endGame(true, s.score); return }
      const next = randomPiece()
      s.current  = s.next
      s.next     = next
      s.lastFall = performance.now()
      if (!isValid(s.board, s.current.shape, s.current.x, s.current.y))
        endGame(false, s.score)
    }

    // ── Keyboard ─────────────────────────────────────────────────────────────

    function onKeyDown(e: KeyboardEvent) {
      const s = stateRef.current; if (!s) return
      const key = e.code
      if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space','KeyX','KeyZ'].includes(key))
        e.preventDefault()
      s.keys.add(key)

      // Immediate action on first press
      if (key === 'ArrowLeft')  { tryMove(-1, 0); s.dasKey = 'L'; s.dasStart = Date.now(); s.dasLast = Date.now() }
      if (key === 'ArrowRight') { tryMove(1, 0);  s.dasKey = 'R'; s.dasStart = Date.now(); s.dasLast = Date.now() }
      if (key === 'ArrowDown')  tryMove(0, 1)
      if (key === 'ArrowUp' || key === 'KeyX') tryRotate()
      if (key === 'KeyZ') { // counter-rotate
        tryRotate(); tryRotate(); tryRotate()
      }
      if (key === 'Space') hardDrop()
    }
    function onKeyUp(e: KeyboardEvent) {
      const s = stateRef.current; if (!s) return
      s.keys.delete(e.code)
      if ((e.code === 'ArrowLeft' && s.dasKey === 'L') ||
          (e.code === 'ArrowRight' && s.dasKey === 'R')) {
        s.dasKey = null
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // ── Touch ─────────────────────────────────────────────────────────────────

    function onTouchStart(e: TouchEvent) {
      e.preventDefault()
      const s = stateRef.current; if (!s) return
      const t = e.touches[0]; if (!t) return
      s.touchStartX = toCanvasX(t.clientX, cvs)
      s.touchStartY = toCanvasY(t.clientY, cvs)
    }
    function onTouchEnd(e: TouchEvent) {
      e.preventDefault()
      const s = stateRef.current; if (!s) return
      if (s.touchStartX === null || s.touchStartY === null) return
      const t = e.changedTouches[0]; if (!t) return
      const dx = toCanvasX(t.clientX, cvs) - s.touchStartX
      const dy = toCanvasY(t.clientY, cvs) - s.touchStartY
      const adx = Math.abs(dx), ady = Math.abs(dy)
      const SWIPE = 30  // min px for swipe

      if (adx < SWIPE && ady < SWIPE) {
        // Tap → rotate
        tryRotate()
      } else if (adx > ady) {
        // Horizontal swipe
        const steps = Math.round(dx / (CELL * 0.8))
        for (let i = 0; i < Math.abs(steps); i++) tryMove(Math.sign(steps), 0)
      } else if (dy > SWIPE) {
        // Swipe down → hard drop
        hardDrop()
      }
      s.touchStartX = null; s.touchStartY = null
    }
    function onTouchMove(e: TouchEvent) { e.preventDefault() }

    cvs.addEventListener('touchstart',  onTouchStart,  { passive: false })
    cvs.addEventListener('touchend',    onTouchEnd,    { passive: false })
    cvs.addEventListener('touchmove',   onTouchMove,   { passive: false })

    // ── Render helpers ────────────────────────────────────────────────────────

    function drawCell(x: number, y: number, color: string, alpha = 1) {
      const px = BOARD_X + x * CELL
      const py = BOARD_Y + y * CELL
      c.globalAlpha = alpha
      c.fillStyle   = color
      c.fillRect(px + 1, py + 1, CELL - 2, CELL - 2)
      // Highlight top-left for 3D feel
      c.fillStyle = 'rgba(255,255,255,0.15)'
      c.fillRect(px + 1, py + 1, CELL - 2, 4)
      c.fillRect(px + 1, py + 1, 4, CELL - 2)
      c.globalAlpha = 1
    }

    function drawBoard(s: State) {
      // Background grid
      c.fillStyle = '#0a0a12'
      c.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL)
      c.strokeStyle = 'rgba(255,255,255,0.04)'
      c.lineWidth   = 1
      for (let r = 0; r <= ROWS; r++) {
        c.beginPath()
        c.moveTo(BOARD_X, BOARD_Y + r * CELL)
        c.lineTo(BOARD_X + COLS * CELL, BOARD_Y + r * CELL)
        c.stroke()
      }
      for (let col = 0; col <= COLS; col++) {
        c.beginPath()
        c.moveTo(BOARD_X + col * CELL, BOARD_Y)
        c.lineTo(BOARD_X + col * CELL, BOARD_Y + ROWS * CELL)
        c.stroke()
      }

      // Locked cells
      for (let r = 0; r < ROWS; r++)
        for (let col = 0; col < COLS; col++)
          if (s.board[r][col]) drawCell(col, r, s.board[r][col] as string)

      // Ghost piece
      const gy = ghostY(s.board, s.current)
      if (gy !== s.current.y) {
        for (let r = 0; r < s.current.shape.length; r++)
          for (let col = 0; col < s.current.shape[r].length; col++)
            if (s.current.shape[r][col])
              drawCell(s.current.x + col, gy + r, COLORS[s.current.type], 0.25)
      }

      // Current piece
      for (let r = 0; r < s.current.shape.length; r++)
        for (let col = 0; col < s.current.shape[r].length; col++)
          if (s.current.shape[r][col])
            drawCell(s.current.x + col, s.current.y + r, COLORS[s.current.type])

      // Board border
      c.strokeStyle = 'rgba(99,102,241,0.4)'
      c.lineWidth   = 2
      c.strokeRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL)
    }

    function drawPanel(s: State, timeLeft: number) {
      const panelColor = '#111118'
      const panelX = 30

      // Score panel
      c.fillStyle   = panelColor
      c.strokeStyle = 'rgba(255,255,255,0.08)'
      c.lineWidth   = 1
      const scoreBoxH = 80
      c.fillRect(panelX, BOARD_Y, 180, scoreBoxH)
      c.strokeRect(panelX, BOARD_Y, 180, scoreBoxH)
      c.fillStyle = 'rgba(255,255,255,0.4)'
      c.font = '11px monospace'
      c.fillText('SCORE', panelX + 10, BOARD_Y + 18)
      c.fillStyle = 'white'
      c.font = 'bold 26px monospace'
      c.fillText(String(s.score), panelX + 10, BOARD_Y + 48)
      c.fillStyle = 'rgba(255,255,255,0.3)'
      c.font = '11px monospace'
      c.fillText(`TARGET: ${winTarget}`, panelX + 10, BOARD_Y + 68)

      // Progress bar
      const prog = Math.min(1, s.score / winTarget)
      c.fillStyle = '#1f2937'
      c.fillRect(panelX, BOARD_Y + scoreBoxH + 8, 180, 6)
      c.fillStyle = prog >= 1 ? '#22c55e' : '#6366f1'
      c.fillRect(panelX, BOARD_Y + scoreBoxH + 8, 180 * prog, 6)

      // Time left
      const timeColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f97316' : 'rgba(255,255,255,0.5)'
      c.fillStyle = panelColor
      c.fillRect(panelX, BOARD_Y + scoreBoxH + 24, 180, 50)
      c.strokeRect(panelX, BOARD_Y + scoreBoxH + 24, 180, 50)
      c.fillStyle = 'rgba(255,255,255,0.4)'
      c.font = '11px monospace'
      c.fillText('TIME', panelX + 10, BOARD_Y + scoreBoxH + 40)
      c.fillStyle = timeColor
      c.font = `bold 22px monospace`
      c.fillText(`${timeLeft}s`, panelX + 10, BOARD_Y + scoreBoxH + 64)

      // Next piece preview
      const nextX = 510
      const nextY = BOARD_Y
      c.fillStyle   = panelColor
      c.fillRect(nextX, nextY, 180, 100)
      c.strokeRect(nextX, nextY, 180, 100)
      c.fillStyle = 'rgba(255,255,255,0.4)'
      c.font = '11px monospace'
      c.fillText('NEXT', nextX + 10, nextY + 18)

      const previewCELL = 22
      const pw = s.next.shape[0].length * previewCELL
      const ph = s.next.shape.length * previewCELL
      const ox = nextX + (180 - pw) / 2
      const oy = nextY + (100 - ph) / 2 + 10
      for (let r = 0; r < s.next.shape.length; r++)
        for (let col = 0; col < s.next.shape[r].length; col++)
          if (s.next.shape[r][col]) {
            c.fillStyle = COLORS[s.next.type]
            c.fillRect(ox + col * previewCELL + 1, oy + r * previewCELL + 1, previewCELL - 2, previewCELL - 2)
          }

      // Controls hint (first 5 seconds)
      const elapsed = (Date.now() - startMs.current) / 1000
      if (elapsed < 5) {
        const alpha = Math.max(0, 1 - elapsed / 5) * 0.5
        c.fillStyle = `rgba(255,255,255,${alpha})`
        c.font = '11px monospace'
        const isMobile = 'ontouchstart' in window
        if (isMobile) {
          c.fillText('Tap: rotate', nextX + 10, nextY + 130)
          c.fillText('Swipe ←→: move', nextX + 10, nextY + 148)
          c.fillText('Swipe ↓: drop', nextX + 10, nextY + 166)
        } else {
          c.fillText('← → : move', nextX + 10, nextY + 130)
          c.fillText('↑ / X: rotate', nextX + 10, nextY + 148)
          c.fillText('Space: hard drop', nextX + 10, nextY + 166)
        }
      }
    }

    // ── Game loop ─────────────────────────────────────────────────────────────

    function loop(ts: number) {
      const s = stateRef.current; if (!s) return

      // Time checks
      const now      = Date.now()
      const elapsed  = (now - startMs.current) / 1000
      const timeLeft = Math.max(0, timeLimitSec - Math.floor(elapsed))
      if (timeLeft === 0) { endGame(false, s.score); return }

      // DAS (Delayed Auto-Shift)
      if (s.dasKey && now - s.dasStart > DAS_DELAY && now - s.dasLast > DAS_REPEAT) {
        if (s.dasKey === 'L' && s.keys.has('ArrowLeft'))  tryMove(-1, 0)
        if (s.dasKey === 'R' && s.keys.has('ArrowRight')) tryMove(1, 0)
        if (s.keys.has('ArrowDown'))                       tryMove(0, 1)
        s.dasLast = now
      }

      // Auto-fall
      if (ts - s.lastFall >= fallMs) {
        if (!tryMove(0, 1)) lockAndNext()
        else s.lastFall = ts
      }

      // Render
      c.fillStyle = '#07070e'
      c.fillRect(0, 0, 720, 540)

      drawBoard(s)
      drawPanel(s, timeLeft)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      cvs.removeEventListener('touchstart', onTouchStart)
      cvs.removeEventListener('touchend',   onTouchEnd)
      cvs.removeEventListener('touchmove',  onTouchMove)
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
