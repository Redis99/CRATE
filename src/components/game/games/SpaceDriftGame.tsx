'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { GameResult } from '@/components/game/MinigameShell'

// ─── Config ───────────────────────────────────────────────────────────────────

interface DiffConfig {
  enemyCols:      number
  enemyRows:      number
  enemySpeedPps:  number   // px/s lateral
  enemyDescent:   number   // px ao bater na borda
  bulletPps:      number   // px/s bala do jogador
  shootCooldown:  number   // ms entre tiros do jogador
  playerPps:      number   // px/s movimento do jogador
  enemyShootMs:   number | null  // ms entre disparos inimigos (null = sem tiro)
  enemyBulletPps: number   // px/s bala inimiga
}

// Lv2: 7×2=14 ≥ winTarget 13 ✓  |  Lv4: 8×3=24 ≥ winTarget 22 ✓
const DIFF: Record<number, DiffConfig> = {
  1: { enemyCols: 5, enemyRows: 2, enemySpeedPps: 80,  enemyDescent: 20, bulletPps: 450, shootCooldown: 400, playerPps: 260, enemyShootMs: null, enemyBulletPps: 0 },
  2: { enemyCols: 7, enemyRows: 2, enemySpeedPps: 115, enemyDescent: 22, bulletPps: 500, shootCooldown: 350, playerPps: 280, enemyShootMs: 5000, enemyBulletPps: 220 },
  3: { enemyCols: 6, enemyRows: 3, enemySpeedPps: 155, enemyDescent: 24, bulletPps: 550, shootCooldown: 300, playerPps: 300, enemyShootMs: 4000, enemyBulletPps: 250 },
  4: { enemyCols: 8, enemyRows: 3, enemySpeedPps: 200, enemyDescent: 26, bulletPps: 600, shootCooldown: 250, playerPps: 320, enemyShootMs: 2500, enemyBulletPps: 280 },
}

const MAX_HP        = 3
const INVINCIBLE_MS = 1200  // frames de invencibilidade após levar dano

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vec2   { x: number; y: number }
interface Enemy  { x: number; y: number; alive: boolean }
interface Bullet { x: number; y: number; active: boolean }

interface State {
  player:          Vec2
  enemies:         Enemy[]
  playerBullets:   Bullet[]
  enemyBullets:    Bullet[]
  enemyDir:        1 | -1
  enemySpeedPps:   number
  destroyed:       number
  lastShot:        number
  lastEnemyShot:   number
  playerHp:        number
  invincibleUntil: number   // timestamp: se > Date.now(), jogador é invencível
  keys:            Set<string>
  pointerX:        number | null
  pointerFire:     boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toCanvasX(clientX: number, canvas: HTMLCanvasElement): number {
  const rect = canvas.getBoundingClientRect()
  return (clientX - rect.left) * (canvas.width / rect.width)
}

function drawHeart(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  c.fillStyle = color
  c.beginPath()
  c.moveTo(cx, cy + r * 0.4)
  c.bezierCurveTo(cx, cy - r * 0.2, cx - r * 1.1, cy - r * 0.2, cx - r * 1.1, cy + r * 0.5)
  c.bezierCurveTo(cx - r * 1.1, cy + r * 1.2, cx, cy + r * 1.8, cx, cy + r * 1.8)
  c.bezierCurveTo(cx, cy + r * 1.8, cx + r * 1.1, cy + r * 1.2, cx + r * 1.1, cy + r * 0.5)
  c.bezierCurveTo(cx + r * 1.1, cy - r * 0.2, cx, cy - r * 0.2, cx, cy + r * 0.4)
  c.fill()
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  difficulty:   number
  winTarget:    number
  timeLimitSec: number
  running:      boolean
  onResult:     (result: GameResult) => void
}

export function SpaceDriftGame({ difficulty, winTarget, running, timeLimitSec, onResult }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const stateRef    = useRef<State | null>(null)
  const rafRef      = useRef<number>(0)
  const resultSent  = useRef(false)
  const startTime   = useRef(0)
  const lastTimeRef = useRef(0)

  const cfg = DIFF[difficulty] ?? DIFF[1]

  const initState = useCallback((W: number, H: number): State => {
    const cellW = 44
    const gridW = cfg.enemyCols * cellW
    const padX  = (W - gridW) / 2 + cellW / 2
    const enemies: Enemy[] = []
    for (let r = 0; r < cfg.enemyRows; r++)
      for (let c = 0; c < cfg.enemyCols; c++)
        enemies.push({ x: padX + c * cellW, y: 60 + r * 30, alive: true })
    return {
      player: { x: W / 2, y: H - 48 },
      enemies, playerBullets: [], enemyBullets: [],
      enemyDir: 1, enemySpeedPps: cfg.enemySpeedPps,
      destroyed: 0, lastShot: 0, lastEnemyShot: 0,
      playerHp: MAX_HP, invincibleUntil: 0,
      keys: new Set(), pointerX: null, pointerFire: false,
    }
  }, [cfg])

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

    const W   = canvas.width
    const H   = canvas.height
    const c   = ctx as CanvasRenderingContext2D
    const cvs = canvas as HTMLCanvasElement

    resultSent.current  = false
    startTime.current   = Date.now()
    lastTimeRef.current = 0
    stateRef.current    = initState(W, H)

    // ── Teclado ───────────────────────────────────────────────────────────────
    function onKeyDown(e: KeyboardEvent) {
      stateRef.current?.keys.add(e.code)
      if (['Space','ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW'].includes(e.code))
        e.preventDefault()
    }
    function onKeyUp(e: KeyboardEvent) { stateRef.current?.keys.delete(e.code) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    // ── Mouse ─────────────────────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      const s = stateRef.current; if (s) s.pointerX = toCanvasX(e.clientX, cvs)
    }
    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return
      const s = stateRef.current; if (!s) return
      s.pointerX = toCanvasX(e.clientX, cvs); s.pointerFire = true
    }
    function onMouseUp()    { const s = stateRef.current; if (s) s.pointerFire = false }
    function onMouseLeave() { const s = stateRef.current; if (s) { s.pointerX = null; s.pointerFire = false } }

    canvas.addEventListener('mousemove',  onMouseMove)
    canvas.addEventListener('mousedown',  onMouseDown)
    canvas.addEventListener('mouseup',    onMouseUp)
    canvas.addEventListener('mouseleave', onMouseLeave)

    // ── Touch ─────────────────────────────────────────────────────────────────
    function onTouchStart(e: TouchEvent) {
      e.preventDefault()
      const s = stateRef.current; if (!s) return
      const t = e.touches[0]; if (!t) return
      s.pointerX = toCanvasX(t.clientX, cvs); s.pointerFire = true
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault()
      const s = stateRef.current; if (!s) return
      const t = e.touches[0]; if (t) s.pointerX = toCanvasX(t.clientX, cvs)
    }
    function onTouchEnd(e: TouchEvent) {
      e.preventDefault()
      const s = stateRef.current; if (!s) return
      if (e.touches.length === 0) { s.pointerFire = false; s.pointerX = null }
    }

    canvas.addEventListener('touchstart',  onTouchStart,  { passive: false })
    canvas.addEventListener('touchmove',   onTouchMove,   { passive: false })
    canvas.addEventListener('touchend',    onTouchEnd,    { passive: false })
    canvas.addEventListener('touchcancel', onTouchEnd,    { passive: false })

    // ── Game loop ─────────────────────────────────────────────────────────────
    function loop(timestamp: number) {
      const s = stateRef.current
      if (!s) return

      const dt = lastTimeRef.current
        ? Math.min((timestamp - lastTimeRef.current) / (1000 / 60), 4)
        : 1
      lastTimeRef.current = timestamp

      const now = Date.now()
      if (now - startTime.current >= timeLimitSec * 1000) { endGame(false, s.destroyed); return }

      const aliveEnemies = s.enemies.filter((e) => e.alive)
      if (aliveEnemies.length === 0) { endGame(true, s.destroyed); return }

      // ── Jogador ──────────────────────────────────────────────────────────
      const pSpeed = cfg.playerPps * dt / 60
      if (s.pointerX !== null) {
        const diff = s.pointerX - s.player.x
        s.player.x = Math.max(18, Math.min(W - 18,
          s.player.x + Math.sign(diff) * Math.min(Math.abs(diff), pSpeed * 1.5)
        ))
      } else {
        if (s.keys.has('ArrowLeft')  || s.keys.has('KeyA')) s.player.x = Math.max(18, s.player.x - pSpeed)
        if (s.keys.has('ArrowRight') || s.keys.has('KeyD')) s.player.x = Math.min(W - 18, s.player.x + pSpeed)
      }

      // ── Tiro do jogador ───────────────────────────────────────────────────
      const wantsFire = s.pointerFire || s.keys.has('Space') || s.keys.has('ArrowUp') || s.keys.has('KeyW')
      if (wantsFire && now - s.lastShot >= cfg.shootCooldown) {
        s.playerBullets.push({ x: s.player.x, y: s.player.y - 22, active: true })
        s.lastShot = now
      }

      // ── Tiro dos inimigos ────────────────────────────────────────────────
      if (cfg.enemyShootMs !== null && now - s.lastEnemyShot >= cfg.enemyShootMs) {
        // Escolhe um inimigo aleatório da fileira de baixo (mais próximos do jogador)
        const bottomRow = Math.max(...aliveEnemies.map((e) => e.y))
        const frontLine = aliveEnemies.filter((e) => e.y >= bottomRow - 10)
        const shooter   = frontLine[Math.floor(Math.random() * frontLine.length)]
        if (shooter) s.enemyBullets.push({ x: shooter.x, y: shooter.y + 14, active: true })
        s.lastEnemyShot = now
      }

      // ── Move balas do jogador ─────────────────────────────────────────────
      const bpSpeed = cfg.bulletPps * dt / 60
      for (const b of s.playerBullets) {
        if (!b.active) continue
        b.y -= bpSpeed
        if (b.y < 0) b.active = false
      }

      // ── Move balas inimigas ───────────────────────────────────────────────
      const ebSpeed = cfg.enemyBulletPps * dt / 60
      for (const b of s.enemyBullets) {
        if (!b.active) continue
        b.y += ebSpeed
        if (b.y > H + 10) b.active = false
      }

      // ── Move inimigos ─────────────────────────────────────────────────────
      const eSpeed = s.enemySpeedPps * dt / 60
      for (const e of aliveEnemies) e.x += s.enemyDir * eSpeed

      const leftmost  = aliveEnemies.reduce((m, e) => Math.min(m, e.x), Infinity)
      const rightmost = aliveEnemies.reduce((m, e) => Math.max(m, e.x), -Infinity)
      if (leftmost < 16 || rightmost > W - 16) {
        for (const e of aliveEnemies) { e.x -= s.enemyDir * eSpeed; e.y += cfg.enemyDescent }
        s.enemyDir = s.enemyDir === 1 ? -1 : 1
      }
      s.enemySpeedPps = cfg.enemySpeedPps * (1 + (1 - aliveEnemies.length / s.enemies.length) * 0.6)

      // ── Colisão: bala do jogador × inimigo ───────────────────────────────
      for (const b of s.playerBullets) {
        if (!b.active) continue
        for (const e of s.enemies) {
          if (!e.alive) continue
          if (Math.abs(b.x - e.x) < 22 && Math.abs(b.y - e.y) < 16) {
            b.active = false; e.alive = false; s.destroyed++
            if (s.destroyed >= winTarget) { endGame(true, s.destroyed); return }
          }
        }
      }

      // ── Colisão: bala inimiga × jogador ──────────────────────────────────
      if (now > s.invincibleUntil) {
        for (const b of s.enemyBullets) {
          if (!b.active) continue
          if (Math.abs(b.x - s.player.x) < 16 && Math.abs(b.y - s.player.y) < 20) {
            b.active = false
            s.playerHp--
            s.invincibleUntil = now + INVINCIBLE_MS
            if (s.playerHp <= 0) { endGame(false, s.destroyed); return }
            break
          }
        }
      }

      // Inimigos chegaram ao jogador = derrota
      if (aliveEnemies.some((e) => e.y > H - 70)) { endGame(false, s.destroyed); return }

      // ── Render ────────────────────────────────────────────────────────────
      c.fillStyle = '#07070e'
      c.fillRect(0, 0, W, H)

      // Estrelas
      c.fillStyle = 'rgba(255,255,255,0.18)'
      for (let i = 0; i < 55; i++) c.fillRect((i * 137 + 17) % W, (i * 97 + 53) % H, 1, 1)

      // Jogador (pisca quando invencível)
      const isInvincible = now < s.invincibleUntil
      const showPlayer   = !isInvincible || Math.floor(now / 80) % 2 === 0
      if (showPlayer) {
        c.fillStyle = '#6366f1'
        c.beginPath()
        c.moveTo(s.player.x,      s.player.y - 20)
        c.lineTo(s.player.x - 15, s.player.y + 12)
        c.lineTo(s.player.x + 15, s.player.y + 12)
        c.closePath(); c.fill()
        c.fillStyle = 'rgba(251,146,60,0.85)'
        c.beginPath()
        c.moveTo(s.player.x - 8, s.player.y + 12)
        c.lineTo(s.player.x,     s.player.y + 27)
        c.lineTo(s.player.x + 8, s.player.y + 12)
        c.closePath(); c.fill()
      }

      // Inimigos
      for (const e of s.enemies) {
        if (!e.alive) continue
        c.fillStyle = '#f87171'
        c.beginPath()
        c.moveTo(e.x, e.y - 12); c.lineTo(e.x + 17, e.y)
        c.lineTo(e.x, e.y + 12); c.lineTo(e.x - 17, e.y)
        c.closePath(); c.fill()
        c.fillStyle = '#fca5a5'
        c.beginPath(); c.arc(e.x, e.y, 4, 0, Math.PI * 2); c.fill()
      }

      // Balas do jogador
      c.fillStyle = '#fde047'
      for (const b of s.playerBullets) {
        if (!b.active) continue
        c.beginPath(); c.roundRect(b.x - 2, b.y - 9, 4, 12, 2); c.fill()
      }

      // Balas inimigas (cor diferente — laranja/vermelho)
      for (const b of s.enemyBullets) {
        if (!b.active) continue
        c.fillStyle = '#fb923c'
        c.beginPath(); c.roundRect(b.x - 3, b.y - 6, 6, 10, 3); c.fill()
        // brilho
        c.fillStyle = 'rgba(253,186,116,0.6)'
        c.beginPath(); c.arc(b.x, b.y, 5, 0, Math.PI * 2); c.fill()
      }

      // Cursor de mira
      if (s.pointerX !== null) {
        c.strokeStyle = 'rgba(99,102,241,0.4)'
        c.lineWidth = 1; c.setLineDash([4, 3])
        c.beginPath(); c.moveTo(s.pointerX, 0); c.lineTo(s.pointerX, H); c.stroke()
        c.setLineDash([])
      }

      // ── HUD ───────────────────────────────────────────────────────────────
      // Score
      c.fillStyle = 'rgba(255,255,255,0.75)'
      c.font = 'bold 14px monospace'
      c.fillText(`${s.destroyed} / ${winTarget}`, 12, 24)

      // Barra de vida (corações) — top right
      const hx = W - 20
      const hy = 14
      for (let i = 0; i < MAX_HP; i++) {
        const color = i < s.playerHp ? '#ef4444' : '#374151'
        drawHeart(c, hx - i * 28, hy, 7, color)
      }

      // Dica de controle (primeiros 4s)
      const elapsed = (now - startTime.current) / 1000
      if (elapsed < 4) {
        const alpha = Math.max(0, 1 - elapsed / 4) * 0.45
        c.fillStyle = `rgba(255,255,255,${alpha})`
        c.font = '12px monospace'
        const isMobile = 'ontouchstart' in window
        const hint = isMobile ? 'Touch & hold to move and fire' : 'Mouse to aim · Hold click to auto-fire'
        c.fillText(hint, W / 2 - (isMobile ? 108 : 140), H - 14)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      canvas.removeEventListener('mousemove',  onMouseMove)
      canvas.removeEventListener('mousedown',  onMouseDown)
      canvas.removeEventListener('mouseup',    onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('touchstart',  onTouchStart)
      canvas.removeEventListener('touchmove',   onTouchMove)
      canvas.removeEventListener('touchend',    onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  return (
    <canvas
      ref={canvasRef}
      width={720}
      height={540}
      className="w-full h-full touch-none cursor-crosshair"
      style={{ display: 'block' }}
    />
  )
}
