'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { GameResult } from '@/components/game/MinigameShell'

// ─── Config por dificuldade ───────────────────────────────────────────────────

interface DiffConfig {
  enemyCols:    number
  enemyRows:    number
  enemySpeed:   number   // px/frame base
  enemyDescent: number   // px de descida ao bater na lateral
  bulletSpeed:  number
  shootCooldown: number  // ms entre tiros
}

const DIFF: Record<number, DiffConfig> = {
  1: { enemyCols: 5, enemyRows: 2, enemySpeed: 1.2, enemyDescent: 12, bulletSpeed: 7, shootCooldown: 400 },
  2: { enemyCols: 6, enemyRows: 2, enemySpeed: 1.8, enemyDescent: 14, bulletSpeed: 8, shootCooldown: 350 },
  3: { enemyCols: 6, enemyRows: 3, enemySpeed: 2.4, enemyDescent: 16, bulletSpeed: 9, shootCooldown: 300 },
  4: { enemyCols: 7, enemyRows: 3, enemySpeed: 3.0, enemyDescent: 18, bulletSpeed: 10, shootCooldown: 250 },
}

// ─── Types internos ───────────────────────────────────────────────────────────

interface Vec2   { x: number; y: number }
interface Enemy  { x: number; y: number; alive: boolean }
interface Bullet { x: number; y: number; active: boolean }

interface State {
  player:      Vec2
  enemies:     Enemy[]
  bullets:     Bullet[]
  enemyDir:    1 | -1
  enemySpeed:  number
  destroyed:   number
  lastShot:    number
  keys:        Set<string>
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SpaceDriftGameProps {
  difficulty:   number
  winTarget:    number
  timeLimitSec: number
  running:      boolean
  onResult:     (result: GameResult) => void
}

export function SpaceDriftGame({ difficulty, winTarget, running, timeLimitSec, onResult }: SpaceDriftGameProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const stateRef   = useRef<State | null>(null)
  const rafRef     = useRef<number>(0)
  const resultSent = useRef(false)
  const startTime  = useRef(0)

  const cfg = DIFF[difficulty] ?? DIFF[1]

  // Inicializa ou reseta o estado
  const initState = useCallback((W: number, H: number): State => {
    const { enemyCols, enemyRows, enemySpeed } = cfg

    const enemyW  = 36
    const enemyH  = 24
    const padX    = (W - enemyCols * (enemyW + 10)) / 2
    const enemies: Enemy[] = []

    for (let r = 0; r < enemyRows; r++) {
      for (let c = 0; c < enemyCols; c++) {
        enemies.push({
          x: padX + c * (enemyW + 10),
          y: 50 + r * (enemyH + 14),
          alive: true,
        })
      }
    }

    return {
      player:     { x: W / 2, y: H - 40 },
      enemies,
      bullets:    [],
      enemyDir:   1,
      enemySpeed,
      destroyed:  0,
      lastShot:   0,
      keys:       new Set(),
    }
  }, [cfg])

  // Ref para onResult evita que mudanças de referência recriem endGame e
  // re-disparem o useEffect do game loop (causa do loop infinito de restart)
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  const endGame = useCallback((won: boolean, score: number) => {
    if (resultSent.current) return
    resultSent.current = true
    cancelAnimationFrame(rafRef.current)
    onResultRef.current({ won, score })
  }, [])  // sem deps: usa ref, nunca recriado

  useEffect(() => {
    if (!running) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height

    resultSent.current = false
    startTime.current  = Date.now()
    stateRef.current   = initState(W, H)

    // ── Controles ──────────────────────────────────────────────────────────
    function onKeyDown(e: KeyboardEvent) {
      stateRef.current?.keys.add(e.code)
      e.preventDefault()
    }
    function onKeyUp(e: KeyboardEvent) {
      stateRef.current?.keys.delete(e.code)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // ── Game loop ──────────────────────────────────────────────────────────
    // ctx já foi verificado acima — asserção segura dentro do closure
    const c = ctx as CanvasRenderingContext2D

    function loop() {
      const s = stateRef.current
      if (!s) return

      // Verificar timeout
      if (Date.now() - startTime.current >= timeLimitSec * 1000) {
        endGame(false, s.destroyed)
        return
      }

      // Movimento do jogador
      const speed = 4
      if (s.keys.has('ArrowLeft') || s.keys.has('KeyA')) s.player.x = Math.max(20, s.player.x - speed)
      if (s.keys.has('ArrowRight') || s.keys.has('KeyD')) s.player.x = Math.min(W - 20, s.player.x + speed)

      // Tiro
      const now = Date.now()
      if ((s.keys.has('Space') || s.keys.has('ArrowUp') || s.keys.has('KeyW')) &&
           now - s.lastShot >= cfg.shootCooldown) {
        s.bullets.push({ x: s.player.x, y: s.player.y - 20, active: true })
        s.lastShot = now
      }

      // Move balas
      for (const b of s.bullets) {
        if (!b.active) continue
        b.y -= cfg.bulletSpeed
        if (b.y < 0) b.active = false
      }

      // Move inimigos
      const aliveEnemies = s.enemies.filter((e) => e.alive)
      if (aliveEnemies.length === 0) {
        endGame(true, s.destroyed)
        return
      }

      let hitWall = false
      for (const e of aliveEnemies) {
        e.x += s.enemyDir * s.enemySpeed
        const leftmost  = aliveEnemies.reduce((m, e2) => Math.min(m, e2.x), Infinity)
        const rightmost = aliveEnemies.reduce((m, e2) => Math.max(m, e2.x), -Infinity)
        if (leftmost < 12 || rightmost > W - 12) { hitWall = true; break }
      }
      if (hitWall) {
        s.enemyDir = s.enemyDir === 1 ? -1 : 1
        for (const e of aliveEnemies) e.y += cfg.enemyDescent
      }

      // Aceleração conforme inimigos diminuem
      s.enemySpeed = cfg.enemySpeed * (1 + (1 - aliveEnemies.length / s.enemies.length) * 0.5)

      // Colisão bala × inimigo
      for (const b of s.bullets) {
        if (!b.active) continue
        for (const e of s.enemies) {
          if (!e.alive) continue
          if (Math.abs(b.x - e.x) < 18 && Math.abs(b.y - e.y) < 12) {
            b.active = false
            e.alive  = false
            s.destroyed++
            if (s.destroyed >= winTarget) { endGame(true, s.destroyed); return }
          }
        }
      }

      // Inimigos chegaram muito baixo = derrota
      if (aliveEnemies.some((e) => e.y > H - 60)) {
        endGame(false, s.destroyed)
        return
      }

      // ── Renderização ──────────────────────────────────────────────────────
      c.fillStyle = '#08080f'
      c.fillRect(0, 0, W, H)

      // Estrelas de fundo (estáticas)
      c.fillStyle = 'rgba(255,255,255,0.15)'
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137 + 17) % W
        const sy = (i * 97  + 53) % H
        c.fillRect(sx, sy, 1, 1)
      }

      // Jogador (nave triangular)
      c.fillStyle = '#6366f1'
      c.beginPath()
      c.moveTo(s.player.x, s.player.y - 18)
      c.lineTo(s.player.x - 14, s.player.y + 10)
      c.lineTo(s.player.x + 14, s.player.y + 10)
      c.closePath()
      c.fill()

      // Propulsão
      c.fillStyle = 'rgba(251,146,60,0.7)'
      c.beginPath()
      c.moveTo(s.player.x - 7, s.player.y + 10)
      c.lineTo(s.player.x, s.player.y + 22)
      c.lineTo(s.player.x + 7, s.player.y + 10)
      c.closePath()
      c.fill()

      // Inimigos
      for (const e of s.enemies) {
        if (!e.alive) continue
        c.fillStyle = '#f87171'
        c.beginPath()
        c.moveTo(e.x, e.y - 10)
        c.lineTo(e.x + 14, e.y)
        c.lineTo(e.x, e.y + 10)
        c.lineTo(e.x - 14, e.y)
        c.closePath()
        c.fill()
        c.fillStyle = '#fca5a5'
        c.beginPath()
        c.arc(e.x, e.y, 4, 0, Math.PI * 2)
        c.fill()
      }

      // Balas
      c.fillStyle = '#facc15'
      for (const b of s.bullets) {
        if (!b.active) continue
        c.fillRect(b.x - 2, b.y - 8, 4, 10)
      }

      // HUD
      c.fillStyle = 'rgba(255,255,255,0.7)'
      c.font = '13px monospace'
      c.fillText(`Destroyed: ${s.destroyed} / ${winTarget}`, 10, 20)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  // running é a única dep que deve re-disparar o efeito.
  // cfg/initState/endGame/winTarget são estáveis (refs ou constantes de módulo).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={420}
      className="w-full h-full"
      style={{ display: 'block', imageRendering: 'pixelated' }}
    />
  )
}
