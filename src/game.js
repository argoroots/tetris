import {
  COLS, ROWS, PIECES, PIECE_NAMES,
  LINE_SCORE_TABLE, LINES_PER_LEVEL,
} from './constants.js'

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(''))
}

function isValid(board, matrix, x, y) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue
      const row = y + r
      const col = x + c
      if (col < 0 || col >= COLS) return false
      if (row >= ROWS) return false
      // Allow cells above the visible grid (row < 0) — needed for spawn
      if (row >= 0 && board[row][col] !== '') return false
    }
  }
  return true
}

function calcGhostY(board, piece) {
  let gy = piece.y
  while (isValid(board, piece.matrix, piece.x, gy + 1)) gy++
  return gy
}

function lockPiece(board, piece) {
  const { matrix, x, y, type } = piece
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue
      const row = y + r
      if (row >= 0) board[row][x + c] = type
    }
  }
}

/** Returns sorted-descending array of full row indices (does NOT mutate board). */
function findFullRows(board) {
  const rows = []
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== '')) rows.push(r)
  }
  return rows // already descending because we iterate top-down from ROWS-1
}

function removeRows(board, rows) {
  // rows is sorted descending — splice from bottom up so indices stay valid
  for (const r of rows) {
    board.splice(r, 1)
    board.unshift(new Array(COLS).fill(''))
  }
}

function spawnPiece(type) {
  const matrix = PIECES[type][0]
  const matrixW = matrix[0].length
  const x = Math.floor((COLS - matrixW) / 2)
  return { type, matrix, rotation: 0, x, y: -1 }
}

function randomType() {
  return PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)]
}

export class Game {
  #board
  #active
  #nextType
  #score
  #level
  #lines
  #state        // 'playing' | 'paused' | 'gameover' | 'clearing'
  #clearPending // { rows: number[], scoreAdd: number, numCleared: number } | null

  constructor() {
    this.#init()
  }

  #init() {
    this.#board        = createBoard()
    this.#nextType     = randomType()
    this.#score        = 0
    this.#level        = 0
    this.#lines        = 0
    this.#state        = 'playing'
    this.#clearPending = null
    this.#spawnNext()
  }

  #spawnNext() {
    const type = this.#nextType
    this.#nextType = randomType()
    this.#active = spawnPiece(type)
    // Game over: new piece immediately collides
    if (!isValid(this.#board, this.#active.matrix, this.#active.x, this.#active.y)) {
      this.#state = 'gameover'
    }
  }

  #lock() {
    lockPiece(this.#board, this.#active)
    const rows = findFullRows(this.#board)
    if (rows.length > 0) {
      this.#clearPending = {
        rows,
        numCleared: rows.length,
        scoreAdd: LINE_SCORE_TABLE[rows.length] * (this.#level + 1),
      }
      this.#active = null   // hide active piece while animating
      this.#state  = 'clearing'
    } else {
      this.#spawnNext()
    }
  }

  /** Called by App.vue once the clear animation finishes. */
  finishClear() {
    if (this.#state !== 'clearing') return
    const { rows, numCleared, scoreAdd } = this.#clearPending
    removeRows(this.#board, rows)
    this.#score += scoreAdd
    this.#lines += numCleared
    this.#level  = Math.floor(this.#lines / LINES_PER_LEVEL)
    this.#clearPending = null
    this.#state = 'playing'
    this.#spawnNext()
  }

  // Called by main loop when gravity timer fires
  tick() {
    if (this.#state !== 'playing') return
    if (isValid(this.#board, this.#active.matrix, this.#active.x, this.#active.y + 1)) {
      this.#active.y++
    } else {
      this.#lock()
    }
  }

  moveLeft() {
    if (this.#state !== 'playing') return
    if (isValid(this.#board, this.#active.matrix, this.#active.x - 1, this.#active.y)) {
      this.#active.x--
    }
  }

  moveRight() {
    if (this.#state !== 'playing') return
    if (isValid(this.#board, this.#active.matrix, this.#active.x + 1, this.#active.y)) {
      this.#active.x++
    }
  }

  rotate() {
    if (this.#state !== 'playing') return
    const { type, rotation } = this.#active
    const nextRot    = (rotation + 1) % 4
    const nextMatrix = PIECES[type][nextRot]
    if (isValid(this.#board, nextMatrix, this.#active.x, this.#active.y)) {
      this.#active.rotation = nextRot
      this.#active.matrix   = nextMatrix
    } else {
      // Simple wall kick: try ±1, ±2 columns
      for (const offset of [-1, 1, -2, 2]) {
        if (isValid(this.#board, nextMatrix, this.#active.x + offset, this.#active.y)) {
          this.#active.x       += offset
          this.#active.rotation = nextRot
          this.#active.matrix   = nextMatrix
          break
        }
      }
    }
  }

  softDrop() {
    if (this.#state !== 'playing') return
    if (isValid(this.#board, this.#active.matrix, this.#active.x, this.#active.y + 1)) {
      this.#active.y++
      this.#score += 1
    } else {
      this.#lock()
    }
  }

  hardDrop() {
    if (this.#state !== 'playing') return
    const gy = calcGhostY(this.#board, this.#active)
    const dropped = gy - this.#active.y
    this.#active.y = gy
    this.#score += dropped * 2
    this.#lock()
  }

  pause() {
    if (this.#state === 'playing') {
      this.#state = 'paused'
    } else if (this.#state === 'paused') {
      this.#state = 'playing'
    }
  }

  restart() {
    this.#init()
  }

  // ── Read-only accessors ──

  get board()       { return this.#board }
  get activePiece() { return this.#active }
  get ghostY()      { return this.#state === 'playing' ? calcGhostY(this.#board, this.#active) : -999 }
  get nextType()    { return this.#nextType }
  get score()       { return this.#score }
  get level()       { return this.#level }
  get lines()       { return this.#lines }
  get state()       { return this.#state }
  get clearedRows() { return this.#clearPending?.rows ?? [] }
}
