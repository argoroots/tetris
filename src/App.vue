<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Game } from './game.js'
import { Renderer } from './renderer.js'
import { Controls } from './controls.js'
import { BOARD_W, BOARD_H, NEXT_CANVAS_SIZE, DROP_INTERVALS } from './constants.js'

const LS_KEY = 'block-hi'

// ── Template refs ──
const boardCanvasRef = ref(null)
const nextCanvasRef  = ref(null)

// ── Reactive HUD ──
const score     = ref(0)
const level     = ref(0)
const lines     = ref(0)
const highScore = ref(Number(localStorage.getItem(LS_KEY) ?? 0))
const gameState = ref('start')  // 'start' | 'playing' | 'paused' | 'gameover'

const formattedScore = computed(() => score.value)
const formattedBest  = computed(() => highScore.value)

// ── Responsive scale ──
// Natural layout: 112px sidebar + 16px gap + board + 16px gap + 112px sidebar
const SIDEBAR_W   = 112   // w-28  = 7rem = 112px
const GAP         = 16    // gap-4 = 1rem = 16px
const NATURAL_W   = SIDEBAR_W * 2 + GAP * 2 + BOARD_W   // 556
const NATURAL_H   = BOARD_H + 4                          // +4 for 2px border×2
const SAFE_PAD_X  = 16   // a little horizontal breathing room
const SAFE_PAD_Y  = 0    // board fills full height

const scale = ref(1)

function updateScale() {
  const sw = (window.innerWidth  - SAFE_PAD_X * 2) / NATURAL_W
  const sh = (window.innerHeight - SAFE_PAD_Y * 2) / NATURAL_H
  scale.value = Math.min(sw, sh, 1.5)   // allow up to 1.5× on large screens
}

// ── High score ──
function updateHighScore() {
  if (score.value > highScore.value) {
    highScore.value = score.value
    localStorage.setItem(LS_KEY, highScore.value)
  }
}

const CLEAR_ANIM_MS = 500

// ── Game instances ──
let game, renderer, controls
let rafId       = null
let dropAccum   = 0
let lastTime    = 0
let loopRunning = false
let clearStart  = 0

// ── Game loop ──
function loop(timestamp) {
  const delta = Math.min(timestamp - lastTime, 100)
  lastTime = timestamp

  let clearProgress = 0

  if (game.state === 'clearing') {
    if (!clearStart) clearStart = timestamp
    clearProgress = Math.min((timestamp - clearStart) / CLEAR_ANIM_MS, 1)
    if (clearProgress >= 1) {
      clearStart = 0
      game.finishClear()
    }
  } else {
    clearStart = 0
    if (game.state === 'playing') {
      dropAccum += delta
      const interval = DROP_INTERVALS[Math.min(game.level, 29)]
      while (dropAccum >= interval) {
        game.tick()
        dropAccum -= interval
      }
    }
  }

  renderer.drawFrame(game, clearProgress)
  score.value     = game.score
  level.value     = game.level
  lines.value     = game.lines

  const next = game.state === 'clearing' ? 'playing' : game.state
  if (next === 'gameover' && gameState.value !== 'gameover') updateHighScore()
  gameState.value = next

  rafId = requestAnimationFrame(loop)
}

function startLoop() {
  if (loopRunning) return
  loopRunning = true
  lastTime = performance.now()
  rafId = requestAnimationFrame(loop)
}

// ── Overlay actions ──
function handleStart() {
  game.restart()
  dropAccum = 0
  startLoop()
}

function handleResume() {
  game.pause()
  controls.reset()
}

function handleRestart() {
  updateHighScore()
  game.restart()
  dropAccum = 0
}

// ── Overlay content ──
const overlayTitle  = computed(() => ({ paused: 'PAUSED', gameover: 'GAME OVER' }[gameState.value] ?? ''))
const overlayButton = computed(() => ({ start: 'START', paused: 'RESUME', gameover: 'PLAY AGAIN' }[gameState.value] ?? ''))
const overlayAction = computed(() => ({ start: handleStart, paused: handleResume, gameover: handleRestart }[gameState.value]))

// ── Lifecycle ──
function onVisibilityChange() {
  if (document.hidden && game?.state === 'playing') {
    game.pause()
    controls.reset()
  }
}

onMounted(() => {
  const bc = boardCanvasRef.value
  const nc = nextCanvasRef.value
  bc.width  = BOARD_W
  bc.height = BOARD_H
  nc.width  = NEXT_CANVAS_SIZE
  nc.height = NEXT_CANVAS_SIZE

  game     = new Game()
  renderer = new Renderer(bc, nc)
  controls = new Controls(game, bc)

  renderer.drawFrame(game)

  updateScale()
  window.addEventListener('resize', updateScale)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  controls?.destroy()
  window.removeEventListener('resize', updateScale)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <!-- Full-screen centering shell — overflow hidden so nothing bleeds -->
  <div class="w-screen h-screen bg-[#1a1a2e] flex items-center justify-center overflow-hidden select-none">
    <!-- Scaled game container — transform-origin centre so it scales in-place -->
    <div
      class="flex items-center gap-4"
      :style="{ transform: `scale(${scale})`, transformOrigin: 'center center' }"
    >
      <!-- Left sidebar: Score / Best / Level / Lines -->
      <div class="w-28 flex flex-col gap-5 font-mono">
        <div class="flex flex-col items-center gap-1">
          <span class="text-[0.6rem] tracking-[0.2em] text-[#6666aa] uppercase">Score</span>
          <span class="text-lg font-bold text-[#e0e0ff] tabular-nums">{{ formattedScore }}</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <span class="text-[0.6rem] tracking-[0.2em] text-[#6666aa] uppercase">Best</span>
          <span class="text-lg font-bold text-[#ffcc66] tabular-nums">{{ formattedBest }}</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <span class="text-[0.6rem] tracking-[0.2em] text-[#6666aa] uppercase">Level</span>
          <span class="text-lg font-bold text-[#e0e0ff]">{{ level }}</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <span class="text-[0.6rem] tracking-[0.2em] text-[#6666aa] uppercase">Lines</span>
          <span class="text-lg font-bold text-[#e0e0ff]">{{ lines }}</span>
        </div>
      </div>

      <!-- Board -->
      <div class="relative">
        <canvas
          ref="boardCanvasRef"
          class="block border-2 border-[#4a4a8a]"
        />

        <!-- Overlay: start / paused / gameover -->
        <Transition name="fade">
          <div
            v-if="gameState !== 'playing'"
            class="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-5"
          >
            <p
              v-if="overlayTitle"
              class="font-mono text-3xl font-bold tracking-widest text-white drop-shadow-[0_0_12px_rgba(140,140,255,0.8)]"
            >
              {{ overlayTitle }}
            </p>
            <button
              class="font-mono px-7 py-2.5 bg-[#2a2a5e] text-[#c0c0ff] border-2 border-[#6a6aff] tracking-widest hover:bg-[#3a3a7e] active:scale-95 transition-all cursor-pointer"
              @click="overlayAction"
            >
              {{ overlayButton }}
            </button>
          </div>
        </Transition>
      </div>

      <!-- Right sidebar: Next piece -->
      <div class="w-28 flex flex-col items-center gap-2 font-mono">
        <span class="text-[0.6rem] tracking-[0.2em] text-[#6666aa] uppercase">Next</span>
        <canvas
          ref="nextCanvasRef"
          class="block"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
