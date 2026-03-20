import { CELL, BOARD_W, BOARD_H, NEXT_CANVAS_SIZE, COLS, ROWS, COLORS, PIECES } from './constants.js'

const FLASH_BLINKS = 5   // how many white flashes per clear animation

export class Renderer {
  #boardCtx
  #nextCtx

  constructor(boardCanvas, nextCanvas) {
    this.#boardCtx = boardCanvas.getContext('2d')
    this.#nextCtx  = nextCanvas.getContext('2d')
  }

  /**
   * @param {Game}   game
   * @param {number} clearProgress  0..1 while 'clearing', 0 otherwise
   */
  drawFrame(game, clearProgress = 0) {
    this.#drawBoard(game.board)

    if (game.state === 'clearing') {
      this.#drawClearAnimation(game.clearedRows, clearProgress)
    } else if (game.state === 'playing' || game.state === 'paused') {
      this.#drawGhost(game.activePiece, game.ghostY)
      this.#drawActivePiece(game.activePiece)
    }

    this.#drawNextPiece(game.nextType)
  }

  // ── Private helpers ──

  #drawCell(ctx, col, row, color) {
    const x = col * CELL
    const y = row * CELL
    ctx.fillStyle = color
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2)
    // top-left highlight
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(x + 1, y + 1, CELL - 2, 3)
    ctx.fillRect(x + 1, y + 1, 3, CELL - 2)
    // bottom-right shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(x + 1, y + CELL - 4, CELL - 2, 3)
    ctx.fillRect(x + CELL - 4, y + 1, 3, CELL - 2)
  }

  #drawBoard(board) {
    const ctx = this.#boardCtx
    ctx.fillStyle = COLORS.empty
    ctx.fillRect(0, 0, BOARD_W, BOARD_H)

    ctx.strokeStyle = COLORS.border
    ctx.lineWidth = 0.5
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c]
        if (cell) {
          this.#drawCell(ctx, c, r, COLORS[cell])
        } else {
          ctx.strokeRect(c * CELL + 0.5, r * CELL + 0.5, CELL, CELL)
        }
      }
    }
  }

  /**
   * Classic NES-style flash: cleared rows blink white FLASH_BLINKS times,
   * with a "sweep" from the centre outward on the final reveal.
   */
  #drawClearAnimation(rows, progress) {
    const ctx = this.#boardCtx

    // progress 0..1 split into FLASH_BLINKS on/off cycles
    // Each cycle: 0 = ON (white), 0.5 = OFF (dark overlay), wraps at 1
    const cycle = (progress * FLASH_BLINKS * 2) % 2  // 0..2
    const isOn  = cycle < 1

    for (const r of rows) {
      const y = r * CELL
      if (isOn) {
        // Bright white flash with a radial centre-glow feel
        const grad = ctx.createLinearGradient(0, y, BOARD_W, y)
        grad.addColorStop(0,    'rgba(180,180,255,0.7)')
        grad.addColorStop(0.5,  'rgba(255,255,255,0.98)')
        grad.addColorStop(1,    'rgba(180,180,255,0.7)')
        ctx.fillStyle = grad
        ctx.fillRect(0, y + 1, BOARD_W, CELL - 2)
      } else {
        // Dim the row slightly on the "off" phase so it reads as cleared
        ctx.fillStyle = 'rgba(13,13,26,0.55)'
        ctx.fillRect(0, y + 1, BOARD_W, CELL - 2)
      }
    }
  }

  #drawGhost(piece, ghostY) {
    if (!piece || ghostY === piece.y) return
    const ctx   = this.#boardCtx
    const { matrix, x, type } = piece
    const color = COLORS[type]
    ctx.lineWidth = 1.5

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue
        const row = ghostY + r
        if (row < 0 || row >= ROWS) continue
        const px = (x + c) * CELL
        const py = row      * CELL
        // faint colour fill
        ctx.globalAlpha = 0.08
        ctx.fillStyle   = color
        ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2)
        // slightly stronger outline in the same colour
        ctx.globalAlpha = 0.28
        ctx.strokeStyle = color
        ctx.strokeRect(px + 2, py + 2, CELL - 4, CELL - 4)
      }
    }
    ctx.globalAlpha = 1
  }

  #drawActivePiece(piece) {
    if (!piece) return
    const { matrix, x, y, type } = piece
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue
        const row = y + r
        if (row >= 0 && row < ROWS) {
          this.#drawCell(this.#boardCtx, x + c, row, COLORS[type])
        }
      }
    }
  }

  #drawNextPiece(type) {
    const ctx  = this.#nextCtx
    const size = NEXT_CANVAS_SIZE
    ctx.clearRect(0, 0, size, size)

    if (!type) return
    const matrix  = PIECES[type][0]
    const mSize   = matrix.length
    const offsetX = Math.floor((4 - mSize) / 2)
    const offsetY = Math.floor((4 - mSize) / 2)

    for (let r = 0; r < mSize; r++) {
      for (let c = 0; c < mSize; c++) {
        if (matrix[r][c]) {
          this.#drawCell(ctx, offsetX + c, offsetY + r, COLORS[type])
        }
      }
    }
  }
}
