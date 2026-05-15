'use client'

/**
 * Space Bot — deliver the CRATE across the hazard zone and return.
 * If hit during delivery, the CRATE stays at the impact point.
 * Robot must retrieve it before continuing.
 */

import { useEffect, useRef, useCallback } from 'react'
import type { GameResult } from '@/components/game/MinigameShell'

// ─── Grid constants ───────────────────────────────────────────────────────────

const COLS      = 12
const ROWS      = 10
const CELL      = 44
const BOARD_X   = Math.floor((720 - COLS * CELL) / 2)  // 96
const BOARD_Y   = Math.floor((540 - ROWS * CELL) / 2)  // 50
const BOARD_W   = COLS * CELL

const START_ROW = ROWS - 1   // 9  — base (bottom)
const DEST_ROW  = 0          // 0  — destination (top)
const START_COL = Math.floor(COLS / 2) - 1  // 5 — center column

const SAFE_ROWS = new Set([0, ROWS - 2, ROWS - 1])  // rows with no obstacles

const MAX_HP        = 3
const INVINCIBLE_MS = 1200
const HOP_COOLDOWN  = 130   // ms min between hops

// ─── Lane config per difficulty ───────────────────────────────────────────────

interface LaneConfig {
  row:   number
  dir:   1 | -1
  speed: number   // px/s
  w:     number   // obstacle width px
  gap:   number   // gap between obstacles px
}

const LANE_CONFIGS: Record<number, LaneConfig[]> = {
  1: [
    { row: 3, dir:  1, speed: 85,  w: 58, gap: 175 },
    { row: 5, dir: -1, speed: 78,  w: 65, gap: 185 },
    { row: 7, dir:  1, speed: 92,  w: 54, gap: 168 },
  ],
  2: [
    { row: 2, dir:  1, speed: 110, w: 62, gap: 152 },
    { row: 3, dir: -1, speed:  98, w: 58, gap: 145 },
    { row: 5, dir:  1, speed: 115, w: 68, gap: 138 },
    { row: 6, dir: -1, speed: 102, w: 60, gap: 148 },
    { row: 7, dir:  1, speed: 108, w: 64, gap: 140 },
  ],
  3: [
    { row: 1, dir: -1, speed: 130, w: 68, gap: 128 },
    { row: 2, dir:  1, speed: 118, w: 62, gap: 122 },
    { row: 3, dir: -1, speed: 138, w: 58, gap: 118 },
    { row: 4, dir:  1, speed: 125, w: 70, gap: 124 },
    { row: 5, dir: -1, speed: 120, w: 64, gap: 128 },
    { row: 6, dir:  1, speed: 132, w: 60, gap: 118 },
    { row: 7, dir: -1, speed: 135, w: 68, gap: 112 },
  ],
  4: [
    { row: 1, dir: -1, speed: 168, w: 72, gap: 108 },
    { row: 2, dir:  1, speed: 155, w: 68, gap: 102 },
    { row: 3, dir: -1, speed: 172, w: 64, gap:  98 },
    { row: 4, dir:  1, speed: 162, w: 72, gap: 104 },
    { row: 5, dir: -1, speed: 165, w: 68, gap:  98 },
    { row: 6, dir:  1, speed: 170, w: 64, gap:  94 },
    { row: 7, dir: -1, speed: 175, w: 72, gap:  98 },
  ],
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lane extends LaneConfig { phase: number }  // phase grows with time

type GamePhase = 'going' | 'returning'

interface State {
  robotRow:     number
  robotCol:     number
  phase:        GamePhase
  hasPackage:   boolean                         // robot carries CRATE
  droppedCrate: { row: number; col: number } | null
  cycles:       number                          // completed cycles
  hp:           number
  invincible:   number                          // ms timestamp
  lanes:        Lane[]
  lastHop:      number                          // ms timestamp
  touchStartX:  number | null
  touchStartY:  number | null
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  difficulty:   number
  winTarget:    number
  timeLimitSec: number
  running:      boolean
  onResult:     (r: GameResult) => void
}

export function SpaceBotGame({ difficulty, winTarget, running, timeLimitSec, onResult }: Props) {
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
    const c   = ctx as CanvasRenderingContext2D
    const cvs = canvas

    const configs = LANE_CONFIGS[difficulty] ?? LANE_CONFIGS[1]

    resultSent.current  = false
    startMs.current     = Date.now()
    lastFrameMs.current = 0

    // Inicializa lanes com phase aleatório
    const lanes: Lane[] = configs.map(cfg => ({
      ...cfg,
      phase: Math.random() * (cfg.w + cfg.gap),
    }))

    stateRef.current = {
      robotRow:     START_ROW,
      robotCol:     START_COL,
      phase:        'going',
      hasPackage:   true,
      droppedCrate: null,
      cycles:       0,
      hp:           MAX_HP,
      invincible:   0,
      lanes,
      lastHop:      0,
      touchStartX:  null,
      touchStartY:  null,
    }

    // ── Movimento do robô ─────────────────────────────────────────────────────

    function tryHop(dr: number, dc: number) {
      const s = stateRef.current!
      const now = Date.now()
      if (now - s.lastHop < HOP_COOLDOWN) return
      s.lastHop = now

      const newRow = s.robotRow + dr
      const newCol = Math.max(0, Math.min(COLS - 1, s.robotCol + dc))
      if (newRow < 0 || newRow >= ROWS) return

      s.robotRow = newRow
      s.robotCol = newCol

      // Checar se pisou na CRATE caída (pegar)
      if (s.droppedCrate && s.robotRow === s.droppedCrate.row && s.robotCol === s.droppedCrate.col) {
        s.hasPackage  = true
        s.droppedCrate = null
      }

      // Chegou ao destino (topo) durante a ida
      if (s.phase === 'going' && s.robotRow === DEST_ROW) {
        if (s.hasPackage) {
          // Entrega bem-sucedida → começa a voltar
          s.hasPackage  = false
          s.phase       = 'returning'
          s.robotCol    = START_COL
        }
        // Se não tem a CRATE, não pode entregar — precisa voltar e pegá-la
      }

      // Chegou à base (baixo) durante a volta
      if (s.phase === 'returning' && s.robotRow === START_ROW) {
        s.cycles++
        if (s.cycles >= winTarget) { endGame(true, s.cycles); return }
        // Inicia próximo ciclo
        s.phase      = 'going'
        s.hasPackage = true
        s.robotCol   = START_COL
      }
    }

    // ── Colisão ───────────────────────────────────────────────────────────────

    function checkCollision(s: State): boolean {
      if (Date.now() < s.invincible) return false
      if (SAFE_ROWS.has(s.robotRow)) return false

      const robotLeft  = s.robotCol * CELL
      const robotRight = robotLeft + CELL
      const shrink     = 5

      for (const lane of s.lanes) {
        if (lane.row !== s.robotRow) continue
        const period = lane.w + lane.gap
        // Com phase normalizada, calcular quais k's cobrem a área visível ao robô
        const kMin = Math.floor((robotLeft - lane.phase - lane.w) / period) - 1
        const kMax = Math.ceil((robotRight - lane.phase) / period) + 1
        for (let k = kMin; k <= kMax; k++) {
          const obsX = lane.phase + k * period
          if (obsX + lane.w - shrink > robotLeft + shrink && obsX + shrink < robotRight - shrink) {
            return true
          }
        }
      }
      return false
    }

    function handleHit(s: State) {
      s.hp--
      s.invincible = Date.now() + INVINCIBLE_MS

      if (s.phase === 'going') {
        // CRATE cai no ponto do impacto (só se tiver a CRATE)
        if (s.hasPackage) {
          s.droppedCrate = { row: s.robotRow, col: s.robotCol }
          s.hasPackage   = false
        }
        // Robot volta para a base
        s.robotRow = START_ROW
        s.robotCol = START_COL
      } else {
        // Na volta: robot volta para o destino (topo)
        s.robotRow = DEST_ROW
        s.robotCol = START_COL
      }
    }

    // ── Teclado ───────────────────────────────────────────────────────────────

    function onKeyDown(e: KeyboardEvent) {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(e.code))
        e.preventDefault()
      if (e.code === 'ArrowUp'    || e.code === 'KeyW') tryHop(-1,  0)
      if (e.code === 'ArrowDown'  || e.code === 'KeyS') tryHop( 1,  0)
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') tryHop( 0, -1)
      if (e.code === 'ArrowRight' || e.code === 'KeyD') tryHop( 0,  1)
    }
    window.addEventListener('keydown', onKeyDown)

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
      const SWIPE = 25
      if (Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>SWIPE) tryHop(0, dx>0?1:-1)
      else if (Math.abs(dy)>SWIPE) tryHop(dy>0?1:-1, 0)
      s.touchStartX=null; s.touchStartY=null
    }
    cvs.addEventListener('touchstart', onTouchStart, { passive: false })
    cvs.addEventListener('touchend',   onTouchEnd,   { passive: false })
    cvs.addEventListener('touchmove',  (e)=>e.preventDefault(), { passive: false })

    // ── Render ────────────────────────────────────────────────────────────────

    function drawHeart(cx: number, cy: number, r: number, color: string) {
      c.fillStyle = color
      c.beginPath()
      c.moveTo(cx, cy+r*0.4)
      c.bezierCurveTo(cx, cy-r*0.2, cx-r*1.1, cy-r*0.2, cx-r*1.1, cy+r*0.5)
      c.bezierCurveTo(cx-r*1.1, cy+r*1.2, cx, cy+r*1.8, cx, cy+r*1.8)
      c.bezierCurveTo(cx, cy+r*1.8, cx+r*1.1, cy+r*1.2, cx+r*1.1, cy+r*0.5)
      c.bezierCurveTo(cx+r*1.1, cy-r*0.2, cx, cy-r*0.2, cx, cy+r*0.4)
      c.fill()
    }

    function drawBoard() {
      c.fillStyle = '#07070e'
      c.fillRect(0, 0, 720, 540)

      // Zona de destino (topo)
      c.fillStyle = 'rgba(6,182,212,0.12)'
      c.fillRect(BOARD_X, BOARD_Y, BOARD_W, CELL)
      c.strokeStyle = 'rgba(6,182,212,0.5)'
      c.lineWidth = 2
      c.strokeRect(BOARD_X, BOARD_Y, BOARD_W, CELL)

      // Zona de perigo (meio)
      for (let r = 1; r <= 7; r++) {
        const shade = r % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0)'
        c.fillStyle = shade
        c.fillRect(BOARD_X, BOARD_Y + r * CELL, BOARD_W, CELL)
      }

      // Zona segura / base (baixo)
      c.fillStyle = 'rgba(34,197,94,0.08)'
      c.fillRect(BOARD_X, BOARD_Y + (ROWS-2)*CELL, BOARD_W, CELL*2)

      // Estrelas de fundo
      c.fillStyle = 'rgba(255,255,255,0.14)'
      for (let i = 0; i < 50; i++) {
        c.fillRect(BOARD_X + (i*137+11)%BOARD_W, BOARD_Y + (i*83+7)%(ROWS*CELL), 1, 1)
      }

      // Grid lines
      c.strokeStyle = 'rgba(255,255,255,0.03)'
      c.lineWidth = 1
      for (let r = 0; r <= ROWS; r++) {
        c.beginPath(); c.moveTo(BOARD_X, BOARD_Y+r*CELL); c.lineTo(BOARD_X+BOARD_W, BOARD_Y+r*CELL); c.stroke()
      }
      for (let col = 0; col <= COLS; col++) {
        c.beginPath(); c.moveTo(BOARD_X+col*CELL, BOARD_Y); c.lineTo(BOARD_X+col*CELL, BOARD_Y+ROWS*CELL); c.stroke()
      }

      // Label destino
      c.fillStyle = 'rgba(6,182,212,0.7)'; c.font = 'bold 11px monospace'
      c.fillText('DELIVERY ZONE', BOARD_X+BOARD_W/2-52, BOARD_Y+CELL-8)

      // Label base
      c.fillStyle = 'rgba(34,197,94,0.7)'; c.font = 'bold 11px monospace'
      c.fillText('BASE', BOARD_X+BOARD_W/2-18, BOARD_Y+ROWS*CELL-8)

      // Borda do board
      c.strokeStyle = 'rgba(99,102,241,0.35)'; c.lineWidth = 2
      c.strokeRect(BOARD_X, BOARD_Y, BOARD_W, ROWS*CELL)
    }

    function drawObstacles(s: State, dtSec: number) {
      for (const lane of s.lanes) {
        lane.phase += lane.speed * dtSec * lane.dir
        const period = lane.w + lane.gap
        // Normaliza phase para [0, period) — garante spawn contínuo independente do tempo
        lane.phase = ((lane.phase % period) + period) % period
        const py = BOARD_Y + lane.row * CELL

        // k range cobre toda a área visível + margem de 1 período em cada lado
        const kMin = -1
        const kMax = Math.ceil(BOARD_W / period) + 1
        for (let k = kMin; k <= kMax; k++) {
          const obsX = lane.phase + k * period
          const px   = BOARD_X + obsX
          if (px + lane.w < BOARD_X - 20 || px > BOARD_X + BOARD_W + 20) continue

          // Nave inimiga: corpo + cockpit + motor
          const dir = lane.dir
          c.fillStyle = '#dc2626'
          c.beginPath()
          c.roundRect(px+2, py+6, lane.w-4, CELL-12, 4)
          c.fill()
          // Bico da nave (aponta na direção do movimento)
          c.fillStyle = '#fca5a5'
          c.beginPath()
          if (dir === 1) {
            c.moveTo(px+lane.w-2, py+CELL/2)
            c.lineTo(px+lane.w+8, py+CELL/2-5)
            c.lineTo(px+lane.w+8, py+CELL/2+5)
          } else {
            c.moveTo(px+2, py+CELL/2)
            c.lineTo(px-8, py+CELL/2-5)
            c.lineTo(px-8, py+CELL/2+5)
          }
          c.closePath(); c.fill()
          // Motor (lado oposto ao bico)
          c.fillStyle = 'rgba(251,146,60,0.8)'
          c.fillRect(dir===1?px+1:px+lane.w-5, py+CELL/2-4, 4, 8)
          // Janela
          c.fillStyle = '#93c5fd'
          c.beginPath(); c.arc(px+lane.w/2, py+CELL/2, 5, 0, Math.PI*2); c.fill()
        }
      }
    }

    function drawDroppedCrate(s: State, now: number) {
      if (!s.droppedCrate) return
      const px = BOARD_X + s.droppedCrate.col * CELL
      const py = BOARD_Y + s.droppedCrate.row * CELL
      const pulse = 0.75 + Math.sin(now / 300) * 0.25

      // Glow pulsante
      c.fillStyle = `rgba(251,191,36,${pulse * 0.25})`
      c.fillRect(px-4, py-4, CELL+8, CELL+8)

      // Caixa
      c.fillStyle = '#f59e0b'
      c.beginPath(); c.roundRect(px+4, py+4, CELL-8, CELL-8, 4); c.fill()
      c.fillStyle = '#fde68a'
      c.fillRect(px+4, py+4, CELL-8, 6)
      c.fillStyle = '#92400e'
      c.font = 'bold 10px monospace'
      c.fillText('CRATE', px+6, py+CELL/2+4)

      // Borda pulsante
      c.strokeStyle = `rgba(253,224,71,${pulse})`
      c.lineWidth = 2
      c.strokeRect(px+3, py+3, CELL-6, CELL-6)
    }

    function drawRobot(s: State, now: number) {
      const px  = BOARD_X + s.robotCol * CELL
      const py  = BOARD_Y + s.robotRow * CELL
      const inv = now < s.invincible

      if (inv && Math.floor(now/80)%2===0) return

      const cx = px + CELL/2, cy = py + CELL/2

      // Corpo do robô
      c.fillStyle = '#6366f1'
      c.beginPath(); c.roundRect(px+6, py+8, CELL-12, CELL-14, 5); c.fill()

      // Cabeça
      c.fillStyle = '#818cf8'
      c.beginPath(); c.roundRect(px+9, py+3, CELL-18, 12, 4); c.fill()

      // Olhos
      c.fillStyle = '#fff'
      c.beginPath(); c.arc(cx-5, py+9, 3, 0, Math.PI*2); c.fill()
      c.beginPath(); c.arc(cx+5, py+9, 3, 0, Math.PI*2); c.fill()
      c.fillStyle = '#06b6d4'
      c.beginPath(); c.arc(cx-5, py+9, 1.5, 0, Math.PI*2); c.fill()
      c.beginPath(); c.arc(cx+5, py+9, 1.5, 0, Math.PI*2); c.fill()

      // Braços
      c.fillStyle = '#6366f1'
      c.fillRect(px+2, py+12, 4, 10)
      c.fillRect(px+CELL-6, py+12, 4, 10)

      // CRATE carregada (acima do robô)
      if (s.hasPackage) {
        c.fillStyle = '#f59e0b'
        c.beginPath(); c.roundRect(px+8, py-14, CELL-16, 12, 3); c.fill()
        c.fillStyle = '#fde68a'
        c.fillRect(px+8, py-14, CELL-16, 4)
        c.fillStyle = '#92400e'; c.font = 'bold 7px monospace'
        c.fillText('CRATE', px+9, py-4)
      }

      // Propulsão (baixo do robô)
      c.fillStyle = `rgba(99,102,241,${0.4 + Math.sin(now/80)*0.3})`
      c.fillRect(px+10, py+CELL-6, CELL-20, 5)

      void cx; void cy
    }

    function drawHUD(s: State, timeLeft: number) {
      const now = Date.now()

      // Vidas (corações)
      for (let i = 0; i < MAX_HP; i++) {
        drawHeart(30 + i*28, 22, 7, i < s.hp ? '#ef4444' : '#374151')
      }

      // Ciclos
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = 'bold 13px monospace'
      c.fillText(`${s.cycles}/${winTarget}`, BOARD_X+BOARD_W/2-20, 24)
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.font = '10px monospace'
      c.fillText('deliveries', BOARD_X+BOARD_W/2-28, 36)

      // Timer
      const tc = timeLeft<=10?'#ef4444':timeLeft<=20?'#f97316':'rgba(255,255,255,0.6)'
      c.fillStyle = tc; c.font = 'bold 13px monospace'
      const tw = c.measureText(`${timeLeft}s`).width
      c.fillText(`${timeLeft}s`, 720-tw-14, 24)

      // Fase atual
      const phaseLabel = s.phase==='going'
        ? (s.hasPackage ? '📦 → DELIVER' : '🔍 → RETRIEVE')
        : '🏠 → RETURN'
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.font = '11px monospace'
      c.fillText(phaseLabel, 14, BOARD_Y-10)

      // CRATE dropped warning
      if (s.droppedCrate && !s.hasPackage && s.phase==='going') {
        const alpha = 0.6+Math.sin(now/200)*0.4
        c.fillStyle = `rgba(251,191,36,${alpha})`
        c.font = 'bold 11px monospace'
        c.fillText('⚠ Pick up CRATE first!', 14, BOARD_Y+ROWS*CELL+20)
      }
    }

    // ── Game loop ─────────────────────────────────────────────────────────────

    function loop(ts: number) {
      const s = stateRef.current; if (!s) return

      const dt       = lastFrameMs.current ? Math.min((ts-lastFrameMs.current)/(1000/60), 4) : 1
      lastFrameMs.current = ts
      const dtSec    = dt / 60

      const now      = Date.now()
      const elapsed  = (now-startMs.current)/1000
      const timeLeft = Math.max(0, timeLimitSec-Math.floor(elapsed))
      if (timeLeft===0) { endGame(false, s.cycles); return }

      // Colisão contínua (obstáculos se movem até o robô)
      if (checkCollision(s)) {
        handleHit(s)
        if (s.hp<=0) { endGame(false, s.cycles); return }
      }

      // Render
      drawBoard()
      drawObstacles(s, dtSec)
      drawDroppedCrate(s, now)
      drawRobot(s, now)
      drawHUD(s, timeLeft)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
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
      className="w-full h-full touch-none cursor-none"
      style={{ display: 'block' }}
    />
  )
}
