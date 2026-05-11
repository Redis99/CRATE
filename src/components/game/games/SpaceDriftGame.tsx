'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { GameResult } from '@/components/game/MinigameShell'

// ─── Config (velocidades em px/seg, independente do refresh rate) ─────────────

interface DiffConfig {
  enemyCols:     number
  enemyRows:     number
  enemySpeedPps: number   // px por segundo (time-based)
  enemyDescent:  number   // px de descida ao bater na lateral
  bulletPps:     number   // px por segundo da bala
  shootCooldown: number   // ms entre tiros
  playerPps:     number   // px por segundo do jogador
}

const DIFF: Record<number, DiffConfig> = {
  1: { enemyCols: 5, enemyRows: 2, enemySpeedPps: 80,  enemyDescent: 20, bulletPps: 450, shootCooldown: 400, playerPps: 260 },
  2: { enemyCols: 6, enemyRows: 2, enemySpeedPps: 115, enemyDescent: 22, bulletPps: 500, shootCooldown: 350, playerPps: 280 },
  3: { enemyCols: 6, enemyRows: 3, enemySpeedPps: 155, enemyDescent: 24, bulletPps: 550, shootCooldown: 300, playerPps: 300 },
  4: { enemyCols: 7, enemyRows: 3, enemySpeedPps: 200, enemyDescent: 26, bulletPps: 600, shootCooldown: 250, playerPps: 320 },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vec2   { x: number; y: number }
interface Enemy  { x: number; y: number; alive: boolean }
interface Bullet { x: number; y: number; active: boolean }

interface State {
  player:      Vec2
  enemies:     Enemy[]
  bullets:     Bullet[]
  enemyDir:    1 | -1
  enemySpeedPps: number
  destroyed:   number
  lastShot:    number
  keys:        Set<string>
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
  const lastTimeRef = useRef(0)   // para delta time

  const cfg = DIFF[difficulty] ?? DIFF[1]

  const initState = useCallback((W: number, H: number): State => {
    const { enemyCols, enemyRows, enemySpeedPps } = cfg
    const cellW = 42
    const cellH = 28
    const gridW = enemyCols * cellW
    const padX  = (W - gridW) / 2 + cellW / 2

    const enemies: Enemy[] = []
    for (let r = 0; r < enemyRows; r++) {
      for (let c = 0; c < enemyCols; c++) {
        enemies.push({ x: padX + c * cellW, y: 60 + r * cellH, alive: true })
      }
    }
    return {
      player: { x: W / 2, y: H - 45 },
      enemies, bullets: [],
      enemyDir: 1, enemySpeedPps,
      destroyed: 0, lastShot: 0,
      keys: new Set(),
    }
  }, [cfg])

  // Ref para onResult — evita que nova referência recrie endGame e re-dispare o useEffect
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

    const W = canvas.width
    const H = canvas.height
    const c = ctx as CanvasRenderingContext2D

    resultSent.current  = false
    startTime.current   = Date.now()
    lastTimeRef.current = 0
    stateRef.current    = initState(W, H)

    function onKeyDown(e: KeyboardEvent) {
      stateRef.current?.keys.add(e.code)
      if (['Space','ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW'].includes(e.code))
        e.preventDefault()
    }
    function onKeyUp(e: KeyboardEvent) { stateRef.current?.keys.delete(e.code) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    function loop(timestamp: number) {
      const s = stateRef.current
      if (!s) return

      // ── Delta time (normalizado a 60 fps) ────────────────────────────────
      const dt = lastTimeRef.current
        ? Math.min((timestamp - lastTimeRef.current) / (1000 / 60), 4)
        : 1
      lastTimeRef.current = timestamp

      // ── Timeout ──────────────────────────────────────────────────────────
      if (Date.now() - startTime.current >= timeLimitSec * 1000) {
        endGame(false, s.destroyed); return
      }

      const aliveEnemies = s.enemies.filter((e) => e.alive)
      if (aliveEnemies.length === 0) { endGame(true, s.destroyed); return }

      // ── Jogador ──────────────────────────────────────────────────────────
      const pSpeed = cfg.playerPps * dt / 60
      if (s.keys.has('ArrowLeft')  || s.keys.has('KeyA'))
        s.player.x = Math.max(18, s.player.x - pSpeed)
      if (s.keys.has('ArrowRight') || s.keys.has('KeyD'))
        s.player.x = Math.min(W - 18, s.player.x + pSpeed)

      // ── Tiro ─────────────────────────────────────────────────────────────
      const now = Date.now()
      if ((s.keys.has('Space') || s.keys.has('ArrowUp') || s.keys.has('KeyW'))
          && now - s.lastShot >= cfg.shootCooldown) {
        s.bullets.push({ x: s.player.x, y: s.player.y - 22, active: true })
        s.lastShot = now
      }

      // ── Move balas ───────────────────────────────────────────────────────
      const bSpeed = cfg.bulletPps * dt / 60
      for (const b of s.bullets) {
        if (!b.active) continue
        b.y -= bSpeed
        if (b.y < 0) b.active = false
      }

      // ── Move todos os inimigos primeiro, depois verifica colisão com borda
      const eSpeed = s.enemySpeedPps * dt / 60
      for (const e of aliveEnemies) e.x += s.enemyDir * eSpeed

      const leftmost  = aliveEnemies.reduce((m, e) => Math.min(m, e.x), Infinity)
      const rightmost = aliveEnemies.reduce((m, e) => Math.max(m, e.x), -Infinity)
      if (leftmost < 16 || rightmost > W - 16) {
        // Reverte e desce para não grudar na borda
        for (const e of aliveEnemies) {
          e.x -= s.enemyDir * eSpeed
          e.y += cfg.enemyDescent
        }
        s.enemyDir = s.enemyDir === 1 ? -1 : 1
      }

      // Acelera conforme inimigos são destruídos (max +60%)
      s.enemySpeedPps = cfg.enemySpeedPps *
        (1 + (1 - aliveEnemies.length / s.enemies.length) * 0.6)

      // ── Colisão bala × inimigo ───────────────────────────────────────────
      for (const b of s.bullets) {
        if (!b.active) continue
        for (const e of s.enemies) {
          if (!e.alive) continue
          if (Math.abs(b.x - e.x) < 20 && Math.abs(b.y - e.y) < 14) {
            b.active = false; e.alive = false; s.destroyed++
            if (s.destroyed >= winTarget) { endGame(true, s.destroyed); return }
          }
        }
      }

      // Inimigos chegaram perto do jogador = derrota
      if (aliveEnemies.some((e) => e.y > H - 70)) { endGame(false, s.destroyed); return }

      // ── Render ───────────────────────────────────────────────────────────
      c.fillStyle = '#07070e'
      c.fillRect(0, 0, W, H)

      // Estrelas estáticas
      c.fillStyle = 'rgba(255,255,255,0.18)'
      for (let i = 0; i < 55; i++) {
        c.fillRect((i * 137 + 17) % W, (i * 97 + 53) % H, 1, 1)
      }

      // Jogador
      c.fillStyle = '#6366f1'
      c.beginPath()
      c.moveTo(s.player.x,      s.player.y - 20)
      c.lineTo(s.player.x - 15, s.player.y + 12)
      c.lineTo(s.player.x + 15, s.player.y + 12)
      c.closePath(); c.fill()
      // propulsão
      c.fillStyle = 'rgba(251,146,60,0.8)'
      c.beginPath()
      c.moveTo(s.player.x - 8, s.player.y + 12)
      c.lineTo(s.player.x,     s.player.y + 26)
      c.lineTo(s.player.x + 8, s.player.y + 12)
      c.closePath(); c.fill()

      // Inimigos
      for (const e of s.enemies) {
        if (!e.alive) continue
        c.fillStyle = '#f87171'
        c.beginPath()
        c.moveTo(e.x,      e.y - 12)
        c.lineTo(e.x + 16, e.y)
        c.lineTo(e.x,      e.y + 12)
        c.lineTo(e.x - 16, e.y)
        c.closePath(); c.fill()
        c.fillStyle = '#fca5a5'
        c.beginPath(); c.arc(e.x, e.y, 4, 0, Math.PI * 2); c.fill()
      }

      // Balas
      c.fillStyle = '#fde047'
      for (const b of s.bullets) {
        if (!b.active) continue
        c.beginPath()
        c.roundRect(b.x - 2, b.y - 9, 4, 12, 2)
        c.fill()
      }

      // HUD
      c.fillStyle = 'rgba(255,255,255,0.75)'
      c.font = 'bold 14px monospace'
      c.fillText(`${s.destroyed} / ${winTarget} destroyed`, 12, 22)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  return (
    <canvas
      ref={canvasRef}
      width={720}
      height={540}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  )
}
