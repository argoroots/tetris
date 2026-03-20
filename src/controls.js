import { CELL } from './constants.js'

const DAS_DELAY  = 267  // ms before auto-repeat starts
const DAS_REPEAT = 100  // ms between repeats

export class Controls {
  #game
  #canvas
  #das = { left: null, right: null }
  #keydownHandler
  #keyupHandler

  constructor(game, canvas) {
    this.#game   = game
    this.#canvas = canvas
    this.#attachKeyboard()
    this.#attachTouch()
  }

  reset() {
    this.#stopDAS('left')
    this.#stopDAS('right')
  }

  destroy() {
    this.reset()
    document.removeEventListener('keydown', this.#keydownHandler)
    document.removeEventListener('keyup', this.#keyupHandler)
  }

  #startDAS(dir) {
    this.#stopDAS(dir)
    const method = dir === 'left' ? 'moveLeft' : 'moveRight'
    this.#game[method]()
    this.#das[dir] = setTimeout(() => {
      this.#das[dir] = setInterval(() => {
        if (this.#game.state === 'playing') this.#game[method]()
      }, DAS_REPEAT)
    }, DAS_DELAY)
  }

  #stopDAS(dir) {
    clearTimeout(this.#das[dir])
    clearInterval(this.#das[dir])
    this.#das[dir] = null
  }

  #attachKeyboard() {
    this.#keydownHandler = e => {
      if (e.repeat) return

      if (this.#game.state === 'playing') {
        switch (e.key) {
          case 'ArrowLeft':  e.preventDefault(); this.#startDAS('left');        return
          case 'ArrowRight': e.preventDefault(); this.#startDAS('right');       return
          case 'ArrowUp':    e.preventDefault(); this.#game.rotate();           return
          case 'ArrowDown':  e.preventDefault(); this.#game.softDrop();         return
          case ' ':          e.preventDefault(); this.#game.hardDrop();         return
        }
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault()
        this.#game.pause()
        this.reset()
      }
    }

    this.#keyupHandler = e => {
      if (e.key === 'ArrowLeft')  this.#stopDAS('left')
      if (e.key === 'ArrowRight') this.#stopDAS('right')
    }

    document.addEventListener('keydown', this.#keydownHandler)
    document.addEventListener('keyup',   this.#keyupHandler)
  }

  #attachTouch() {
    const canvas = this.#canvas
    let startX, startY, lastX, lastY, startTime
    let moved = false
    let colAccum = 0

    canvas.addEventListener('touchstart', e => {
      e.preventDefault()
      const t = e.touches[0]
      startX = lastX = t.clientX
      startY = lastY = t.clientY
      startTime = Date.now()
      moved = false
      colAccum = 0
    }, { passive: false })

    canvas.addEventListener('touchmove', e => {
      e.preventDefault()
      if (this.#game.state !== 'playing') return

      const t = e.touches[0]
      const dx = t.clientX - lastX
      const dy = t.clientY - lastY
      const totalDy = t.clientY - startY
      const totalDist = Math.hypot(t.clientX - startX, t.clientY - startY)

      if (totalDist > 10) moved = true

      colAccum += dx
      while (colAccum >= CELL) { this.#game.moveRight(); colAccum -= CELL }
      while (colAccum <= -CELL) { this.#game.moveLeft();  colAccum += CELL }

      if (dy > 0 && totalDy > 20) {
        this.#game.softDrop()
      }

      lastX = t.clientX
      lastY = t.clientY
    }, { passive: false })

    canvas.addEventListener('touchend', e => {
      e.preventDefault()
      const elapsed = Date.now() - startTime
      const totalDy = lastY - startY

      if (!moved && elapsed < 200) {
        this.#game.rotate()
      } else if (totalDy < -50) {
        this.#game.hardDrop()
      }
    }, { passive: false })
  }
}
