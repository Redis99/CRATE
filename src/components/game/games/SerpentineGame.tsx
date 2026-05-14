'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { GameResult } from '@/components/game/MinigameShell'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLS     = 20
const ROWS     = 20
const CELL     = 26          // px per cell
const OFFSET_X = (720 - COLS * CELL) / 2   // center horizontally: (720-520)/2 = 100
const OFFSET_Y = (540 - ROWS * CELL) / 2   // center vertically:   (540-520)/2 = 10

// Move interval (ms) by difficulty — lower = faster snake
const MOVE_MS: Record<number, number> = { 1: 180, 2: 140, 3: 100, 4: 70 }

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vec2 { x: number; y: number }
type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

interface State {
  snake:       Vec2[]          // head first
  dir:         Dir
  nextDir:     Dir             // queued direction (prevents 180° turns)
  fruit:       Vec2
  score:       number
  lastMove:    number          // timestamp of last move
  touchStartX: number | null
  touchStartY: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomFruit(snake: Vec2[]): Vec2 {
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`))
  let pos: Vec2
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
  } while (occupied.has(`${pos.x},${pos.y}`))
  return pos
}

function opposite(d: Dir): Dir {
  if (d === 'UP') return 'DOWN'
  if (d === 'DOWN') return 'UP'
  if (d === 'LEFT') return 'RIGHT'
  return 'LEFT'
}

function move(head: Vec2, dir: Dir): Vec2 {
  if (dir === 'UP')    return { x: head.x,     y: head.y - 1 }
  if (dir === 'DOWN')  return { x: head.x,     y: head.y + 1 }
  if (dir === 'LEFT')  return { x: head.x - 1, y: head.y }
  return                      { x: head.x + 1, y: head.y }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  difficulty:   number
  winTarget:    number
  timeLimitSec: number
  running:      boolean
  onResult:     (r: GameResult) => void
}

export function SerpentineGame({ difficulty, winTarget, running, timeLimitSec, onResult }: Props) {
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

    // Initial snake: 3 cells in center, moving right
    const startX   = Math.floor(COLS / 2)
    const startY   = Math.floor(ROWS / 2)
    const initSnake = [
      { x: startX,     y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ]

    resultSent.current = false
    startMs.current    = Date.now()

    stateRef.current = {
      snake:       initSnake,
      dir:         'RIGHT',
      nextDir:     'RIGHT',
      fruit:       randomFruit(initSnake),
      score:       0,
      lastMove:    performance.now(),
      touchStartX: null,
      touchStartY: null,
    }

    const moveMs = MOVE_MS[difficulty] ?? MOVE_MS[1]

    // ── Keyboard ─────────────────────────────────────────────────────────────

    function onKeyDown(e: KeyboardEvent) {
      const s = stateRef.current; if (!s) return
      const map: Record<string, Dir> = {
        ArrowUp: 'UP', KeyW: 'UP',
        ArrowDown: 'DOWN', KeyS: 'DOWN',
        ArrowLeft: 'LEFT', KeyA: 'LEFT',
        ArrowRight: 'RIGHT', KeyD: 'RIGHT',
      }
      const newDir = map[e.code]
      if (newDir && newDir !== opposite(s.dir)) {
        s.nextDir = newDir
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    // ── Touch ─────────────────────────────────────────────────────────────────

    function toX(clientX: number) {
      return (clientX - cvs.getBoundingClientRect().left) * (cvs.width / cvs.getBoundingClientRect().width)
    }
    function toY(clientY: number) {
      return (clientY - cvs.getBoundingClientRect().top) * (cvs.height / cvs.getBoundingClientRect().height)
    }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault()
      const t = e.touches[0]; if (!t) return
      const s = stateRef.current; if (!s) return
      s.touchStartX = toX(t.clientX)
      s.touchStartY = toY(t.clientY)
    }

    function onTouchEnd(e: TouchEvent) {
      e.preventDefault()
      const s = stateRef.current; if (!s) return
      if (s.touchStartX === null || s.touchStartY === null) return
      const t = e.changedTouches[0]; if (!t) return
      const dx = toX(t.clientX) - s.touchStartX
      const dy = toY(t.clientY) - s.touchStartY
      if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return  // ignore taps

      let newDir: Dir
      if (Math.abs(dx) > Math.abs(dy)) {
        newDir = dx > 0 ? 'RIGHT' : 'LEFT'
      } else {
        newDir = dy > 0 ? 'DOWN' : 'UP'
      }
      if (newDir !== opposite(s.dir)) s.nextDir = newDir
      s.touchStartX = null; s.touchStartY = null
    }

    function onTouchMove(e: TouchEvent) { e.preventDefault() }

    cvs.addEventListener('touchstart',  onTouchStart,  { passive: false })
    cvs.addEventListener('touchend',    onTouchEnd,    { passive: false })
    cvs.addEventListener('touchmove',   onTouchMove,   { passive: false })

    // ── Render helpers ────────────────────────────────────────────────────────

    function cellPx(x: number, y: number) {
      return { px: OFFSET_X + x * CELL, py: OFFSET_Y + y * CELL }
    }

    function drawGame(s: State, timeLeft: number) {
      // Background
      c.fillStyle = '#07070e'
      c.fillRect(0, 0, 720, 540)

      // Board background
      c.fillStyle = '#0d0d1a'
      c.fillRect(OFFSET_X, OFFSET_Y, COLS * CELL, ROWS * CELL)

      // Grid lines
      c.strokeStyle = 'rgba(255,255,255,0.03)'
      c.lineWidth   = 1
      for (let r = 0; r <= ROWS; r++) {
        c.beginPath()
        c.moveTo(OFFSET_X, OFFSET_Y + r * CELL)
        c.lineTo(OFFSET_X + COLS * CELL, OFFSET_Y + r * CELL)
        c.stroke()
      }
      for (let col = 0; col <= COLS; col++) {
        c.beginPath()
        c.moveTo(OFFSET_X + col * CELL, OFFSET_Y)
        c.lineTo(OFFSET_X + col * CELL, OFFSET_Y + ROWS * CELL)
        c.stroke()
      }

      // Snake body
      s.snake.forEach((seg, i) => {
        const { px, py } = cellPx(seg.x, seg.y)
        const isHead     = i === 0
        const t          = 1 - i / s.snake.length  // brighter toward head
        c.fillStyle = isHead
          ? '#22c55e'
          : `rgba(34,197,94,${Math.max(0.3, t * 0.85)})`
        c.fillRect(px + 2, py + 2, CELL - 4, CELL - 4)

        if (isHead) {
          // Eyes
          const eyeOffset = s.dir === 'LEFT' || s.dir === 'RIGHT' ? 0 : 0
          c.fillStyle = '#052e16'
          if (s.dir === 'RIGHT') {
            c.fillRect(px + CELL - 7, py + 5,  3, 3)
            c.fillRect(px + CELL - 7, py + CELL - 8, 3, 3)
          } else if (s.dir === 'LEFT') {
            c.fillRect(px + 4, py + 5,  3, 3)
            c.fillRect(px + 4, py + CELL - 8, 3, 3)
          } else if (s.dir === 'UP') {
            c.fillRect(px + 5,        py + 4, 3, 3)
            c.fillRect(px + CELL - 8, py + 4, 3, 3)
          } else {
            c.fillRect(px + 5,        py + CELL - 7, 3, 3)
            c.fillRect(px + CELL - 8, py + CELL - 7, 3, 3)
          }
          void eyeOffset
        }
      })

      // Fruit
      const { px: fx, py: fy } = cellPx(s.fruit.x, s.fruit.y)
      const fc = fx + CELL / 2
      const fr = fy + CELL / 2
      // Glow
      const grad = c.createRadialGradient(fc, fr, 1, fc, fr, CELL * 0.6)
      grad.addColorStop(0, 'rgba(239,68,68,0.4)')
      grad.addColorStop(1, 'rgba(239,68,68,0)')
      c.fillStyle = grad
      c.fillRect(fx - CELL * 0.2, fy - CELL * 0.2, CELL * 1.4, CELL * 1.4)
      // Fruit circle
      c.fillStyle = '#ef4444'
      c.beginPath()
      c.arc(fc, fr, CELL * 0.38, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#fca5a5'
      c.beginPath()
      c.arc(fc - 3, fr - 3, CELL * 0.12, 0, Math.PI * 2)
      c.fill()

      // Board border
      c.strokeStyle = 'rgba(34,197,94,0.3)'
      c.lineWidth   = 2
      c.strokeRect(OFFSET_X, OFFSET_Y, COLS * CELL, ROWS * CELL)

      // HUD — score
      c.fillStyle = 'rgba(255,255,255,0.7)'
      c.font      = 'bold 14px monospace'
      c.fillText(`${s.score} / ${winTarget} fruits`, OFFSET_X, OFFSET_Y - 10)

      // HUD — timer (top right)
      const timeColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f97316' : 'rgba(255,255,255,0.6)'
      c.fillStyle = timeColor
      c.font      = 'bold 14px monospace'
      const tw = c.measureText(`${timeLeft}s`).width
      c.fillText(`${timeLeft}s`, OFFSET_X + COLS * CELL - tw, OFFSET_Y - 10)
    }

    // ── Game loop ─────────────────────────────────────────────────────────────

    function loop(ts: number) {
      const s = stateRef.current; if (!s) return

      const now      = Date.now()
      const elapsed  = (now - startMs.current) / 1000
      const timeLeft = Math.max(0, timeLimitSec - Math.floor(elapsed))
      if (timeLeft === 0) { endGame(false, s.score); return }

      // Move snake on interval
      if (ts - s.lastMove >= moveMs) {
        s.dir      = s.nextDir
        s.lastMove = ts

        const newHead = move(s.snake[0], s.dir)

        // Wall collision
        if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
          endGame(false, s.score); return
        }
        // Self collision
        if (s.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
          endGame(false, s.score); return
        }

        const ateFruit = newHead.x === s.fruit.x && newHead.y === s.fruit.y

        if (ateFruit) {
          s.snake = [newHead, ...s.snake]       // grow
          s.score++
          if (s.score >= winTarget) { endGame(true, s.score); return }
          s.fruit = randomFruit(s.snake)
        } else {
          s.snake = [newHead, ...s.snake.slice(0, -1)]  // move
        }
      }

      drawGame(s, timeLeft)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
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
      className="w-full h-full touch-none cursor-none"
      style={{ display: 'block' }}
    />
  )
}
