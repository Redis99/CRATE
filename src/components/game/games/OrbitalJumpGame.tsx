'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { GameResult } from '@/components/game/MinigameShell'

// ─── Constants ────────────────────────────────────────────────────────────────

const W          = 720
const H          = 540
const PLAYER_X   = 150    // posição horizontal fixa
const PLAYER_R   = 12     // raio do hitbox (menor que o visual = mais perdão)
const OBS_W      = 56     // largura da coluna de obstáculo
const MIN_GAP_Y  = 110    // gap center mínimo desde o topo
const JUMP_LIMIT    = 150    // ms mínimo entre pulos
const MAX_HP        = 3
const INVINCIBLE_MS = 1500   // ms de invencibilidade após levar dano

interface DiffConfig {
  gravityPps2: number  // aceleração gravitacional px/s²
  jumpVyPps:   number  // velocidade do pulo px/s (negativo = cima)
  speedPps:    number  // velocidade de scroll dos obstáculos px/s
  gapSize:     number  // altura do gap entre obstáculos px
  spawnEvery:  number  // segundos entre spawns de obstáculos
}

const DIFF: Record<number, DiffConfig> = {
  1: { gravityPps2: 680,  jumpVyPps: -355, speedPps: 135, gapSize: 205, spawnEvery: 2.5 },
  2: { gravityPps2: 730,  jumpVyPps: -370, speedPps: 180, gapSize: 178, spawnEvery: 2.2 },
  3: { gravityPps2: 790,  jumpVyPps: -388, speedPps: 230, gapSize: 150, spawnEvery: 2.0 },
  4: { gravityPps2: 860,  jumpVyPps: -410, speedPps: 290, gapSize: 120, spawnEvery: 1.8 },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Obstacle { x: number; gapY: number; passed: boolean }

interface State {
  playerY:         number
  playerVy:        number   // px/s
  obstacles:       Obstacle[]
  score:           number
  lastSpawnTime:   number   // ms timestamp
  lastJump:        number   // ms timestamp
  playerHp:        number   // vidas restantes (0 = game over)
  invincibleUntil: number   // ms timestamp
  keys:            Set<string>
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  difficulty:   number
  winTarget:    number
  timeLimitSec: number
  running:      boolean
  onResult:     (r: GameResult) => void
}

export function OrbitalJumpGame({ difficulty, winTarget, running, timeLimitSec, onResult }: Props) {
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

    const cfg = DIFF[difficulty] ?? DIFF[1]

    resultSent.current  = false
    startMs.current     = Date.now()
    lastFrameMs.current = 0

    stateRef.current = {
      playerY:         H / 2,
      playerVy:        0,
      obstacles:       [],
      score:           0,
      lastSpawnTime:   Date.now(),
      lastJump:        0,
      playerHp:        MAX_HP,
      invincibleUntil: 0,
      keys:            new Set(),
    }

    // ── Pulo ──────────────────────────────────────────────────────────────────

    function tryJump() {
      const s = stateRef.current; if (!s) return
      const now = Date.now()
      if (now - s.lastJump < JUMP_LIMIT) return
      s.playerVy = cfg.jumpVyPps
      s.lastJump = now
    }

    // ── Teclado ───────────────────────────────────────────────────────────────

    function onKeyDown(e: KeyboardEvent) {
      const s = stateRef.current; if (!s) return
      s.keys.add(e.code)
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault()
        tryJump()
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      stateRef.current?.keys.delete(e.code)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    // ── Mouse ─────────────────────────────────────────────────────────────────

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return
      tryJump()
    }
    canvas.addEventListener('mousedown', onMouseDown)

    // ── Touch ─────────────────────────────────────────────────────────────────

    function onTouchStart(e: TouchEvent) {
      e.preventDefault()
      tryJump()
    }
    cvs.addEventListener('touchstart', onTouchStart, { passive: false })
    cvs.addEventListener('touchmove',  (e) => e.preventDefault(), { passive: false })

    // ── Spawn obstáculo ───────────────────────────────────────────────────────

    function spawnObstacle(s: State) {
      const maxGapY = H - MIN_GAP_Y - cfg.gapSize
      const gapY    = MIN_GAP_Y + cfg.gapSize / 2 + Math.random() * (maxGapY - MIN_GAP_Y - cfg.gapSize / 2)
      s.obstacles.push({ x: W + OBS_W, gapY, passed: false })
      s.lastSpawnTime = Date.now()
    }

    // ── Render ────────────────────────────────────────────────────────────────

    function drawStars() {
      c.fillStyle = 'rgba(255,255,255,0.18)'
      for (let i = 0; i < 60; i++) {
        const sx = (i * 149 + 37) % W
        const sy = (i * 91  + 19) % H
        c.fillRect(sx, sy, 1, 1)
      }
    }

    function drawHeart(cx: number, cy: number, r: number, color: string) {
      c.fillStyle = color
      c.beginPath()
      c.moveTo(cx, cy + r * 0.4)
      c.bezierCurveTo(cx, cy - r * 0.2, cx - r * 1.1, cy - r * 0.2, cx - r * 1.1, cy + r * 0.5)
      c.bezierCurveTo(cx - r * 1.1, cy + r * 1.2, cx, cy + r * 1.8, cx, cy + r * 1.8)
      c.bezierCurveTo(cx, cy + r * 1.8, cx + r * 1.1, cy + r * 1.2, cx + r * 1.1, cy + r * 0.5)
      c.bezierCurveTo(cx + r * 1.1, cy - r * 0.2, cx, cy - r * 0.2, cx, cy + r * 0.4)
      c.fill()
    }

    function drawPlayer(s: State) {
      const px  = PLAYER_X
      const py  = s.playerY
      const now = Date.now()

      // Pisca quando invencível
      const isInvincible = now < s.invincibleUntil
      if (isInvincible && Math.floor(now / 80) % 2 === 0) return

      // Rotação baseada na velocidade (tilt up ao pular, down ao cair)
      const angle = Math.max(-0.5, Math.min(1.2, s.playerVy / Math.abs(cfg.jumpVyPps) * 0.9))

      c.save()
      c.translate(px, py)
      c.rotate(angle)

      // Corpo da nave (triângulo apontando para direita)
      c.fillStyle = '#6366f1'
      c.beginPath()
      c.moveTo(18, 0)
      c.lineTo(-14, -11)
      c.lineTo(-14, 11)
      c.closePath()
      c.fill()

      // Detalhe central
      c.fillStyle = '#a5b4fc'
      c.beginPath()
      c.arc(2, 0, 5, 0, Math.PI * 2)
      c.fill()

      // Propulsão (flickery)
      const flicker = 0.7 + Math.random() * 0.3
      c.fillStyle = `rgba(251,146,60,${flicker})`
      c.beginPath()
      c.moveTo(-14, -6)
      c.lineTo(-14 - 10 * flicker, 0)
      c.lineTo(-14, 6)
      c.closePath()
      c.fill()

      c.restore()
    }

    function drawObstacles(s: State) {
      for (const obs of s.obstacles) {
        const topH    = obs.gapY - cfg.gapSize / 2
        const botY    = obs.gapY + cfg.gapSize / 2
        const botH    = H - botY

        // Coluna superior
        const gradT = c.createLinearGradient(obs.x, 0, obs.x + OBS_W, 0)
        gradT.addColorStop(0, '#312e81')
        gradT.addColorStop(0.5, '#4338ca')
        gradT.addColorStop(1, '#312e81')
        c.fillStyle = gradT
        c.fillRect(obs.x, 0, OBS_W, topH)

        // Borda inferior da coluna superior
        c.fillStyle = '#6366f1'
        c.fillRect(obs.x - 4, topH - 12, OBS_W + 8, 12)

        // Coluna inferior
        c.fillStyle = gradT
        c.fillRect(obs.x, botY, OBS_W, botH)

        // Borda superior da coluna inferior
        c.fillStyle = '#6366f1'
        c.fillRect(obs.x - 4, botY, OBS_W + 8, 12)

        // Glow no gap
        const glowGrad = c.createLinearGradient(obs.x, obs.gapY - 20, obs.x, obs.gapY + 20)
        glowGrad.addColorStop(0, 'rgba(99,102,241,0)')
        glowGrad.addColorStop(0.5, 'rgba(99,102,241,0.12)')
        glowGrad.addColorStop(1, 'rgba(99,102,241,0)')
        c.fillStyle = glowGrad
        c.fillRect(obs.x, obs.gapY - 30, OBS_W, 60)
      }
    }

    function drawHUD(s: State, timeLeft: number) {
      // Score
      c.fillStyle = 'rgba(255,255,255,0.8)'
      c.font      = 'bold 15px monospace'
      c.fillText(`${s.score} / ${winTarget} obstacles`, 14, 26)

      // Corações (vidas) — centralizados no topo
      const heartR   = 7
      const heartSpacing = 30
      const totalW   = (MAX_HP - 1) * heartSpacing
      const startHX  = W / 2 - totalW / 2
      for (let i = 0; i < MAX_HP; i++) {
        drawHeart(startHX + i * heartSpacing, 14, heartR, i < s.playerHp ? '#ef4444' : '#374151')
      }

      // Timer
      const timeColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f97316' : 'rgba(255,255,255,0.6)'
      c.fillStyle = timeColor
      c.font      = 'bold 15px monospace'
      const tw = c.measureText(`${timeLeft}s`).width
      c.fillText(`${timeLeft}s`, W - tw - 14, 26)

      // Hint (primeiros 3s)
      const elapsed = (Date.now() - startMs.current) / 1000
      if (elapsed < 3) {
        const alpha = Math.max(0, 1 - elapsed / 3) * 0.5
        c.fillStyle = `rgba(255,255,255,${alpha})`
        c.font = '13px monospace'
        const isMobile = 'ontouchstart' in window
        const hint = isMobile ? 'Tap to thrust' : 'Space / Click to thrust'
        c.fillText(hint, W / 2 - c.measureText(hint).width / 2, H - 14)
      }
    }

    // ── Game loop ─────────────────────────────────────────────────────────────

    function loop(ts: number) {
      const s = stateRef.current; if (!s) return

      const dt  = lastFrameMs.current ? Math.min((ts - lastFrameMs.current) / (1000 / 60), 4) : 1
      lastFrameMs.current = ts

      const now      = Date.now()
      const elapsed  = (now - startMs.current) / 1000
      const timeLeft = Math.max(0, timeLimitSec - Math.floor(elapsed))
      if (timeLeft === 0) { endGame(false, s.score); return }

      // Física do jogador
      const dtSec    = dt / 60
      s.playerVy    += cfg.gravityPps2 * dtSec
      s.playerY     += s.playerVy * dtSec

      // Colisão com teto/chão
      if (s.playerY - PLAYER_R <= 0 || s.playerY + PLAYER_R >= H) {
        if (now > s.invincibleUntil) {
          s.playerHp--
          s.invincibleUntil = now + INVINCIBLE_MS
          s.playerY  = H / 2   // respawn no centro da tela
          s.playerVy = 0
          if (s.playerHp <= 0) { endGame(false, s.score); return }
        }
      }

      // Spawn de obstáculos
      if (now - s.lastSpawnTime >= cfg.spawnEvery * 1000) {
        spawnObstacle(s)
      }

      // Move obstáculos e checa colisão
      const moveX = cfg.speedPps * dtSec
      for (const obs of s.obstacles) {
        obs.x -= moveX

        // Score: passou pelo obstáculo
        if (!obs.passed && PLAYER_X > obs.x + OBS_W) {
          obs.passed = true
          s.score++
          if (s.score >= winTarget) { endGame(true, s.score); return }
        }

        // Colisão com o obstáculo (hitbox circular do jogador)
        if (PLAYER_X + PLAYER_R > obs.x && PLAYER_X - PLAYER_R < obs.x + OBS_W) {
          const topH = obs.gapY - cfg.gapSize / 2
          const botY = obs.gapY + cfg.gapSize / 2
          if (s.playerY - PLAYER_R < topH || s.playerY + PLAYER_R > botY) {
            if (now > s.invincibleUntil) {
              s.playerHp--
              s.invincibleUntil = now + INVINCIBLE_MS
              s.playerY  = H / 2  // respawn no centro da tela
              s.playerVy = 0
              if (s.playerHp <= 0) { endGame(false, s.score); return }
            }
          }
        }
      }

      // Remove obstáculos fora da tela
      s.obstacles = s.obstacles.filter(o => o.x > -OBS_W - 10)

      // ── Render ──────────────────────────────────────────────────────────────
      c.fillStyle = '#07070e'
      c.fillRect(0, 0, W, H)

      drawStars()
      drawObstacles(s)
      drawPlayer(s)
      drawHUD(s, timeLeft)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      canvas.removeEventListener('mousedown', onMouseDown)
      cvs.removeEventListener('touchstart', onTouchStart)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="w-full h-full touch-none cursor-pointer"
      style={{ display: 'block' }}
    />
  )
}
