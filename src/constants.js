export const COLS = 10
export const ROWS = 20
export const CELL = 30
export const BOARD_W = COLS * CELL   // 300
export const BOARD_H = ROWS * CELL   // 600
export const NEXT_CANVAS_SIZE = 4 * CELL  // 120

export const COLORS = {
  empty:  '#0d0d1a',
  I:      '#00f0f0',
  O:      '#f0f000',
  T:      '#a000f0',
  S:      '#00f000',
  Z:      '#f00000',
  J:      '#0000f0',
  L:      '#f0a000',
  ghost:  'rgba(255,255,255,0.07)',
  border: '#1e1e3a',
}

// NES-exact rotation matrices. 4 states per piece.
// 1 = filled cell, 0 = empty.
export const PIECES = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
}

export const PIECE_NAMES = ['I','O','T','S','Z','J','L']

// NES Tetris gravity table: frames per gravity drop at 60.0988fps, indexed by level 0–29
const FRAMES_PER_DROP = [
  48, 43, 38, 33, 28,  // 0–4
  23, 18, 13,  8,  6,  // 5–9
   5,  5,  5,  4,  4,  // 10–14
   4,  3,  3,  3,  2,  // 15–19
   2,  2,  2,  2,  2,  // 20–24
   2,  2,  2,  2,  1,  // 25–29
]

const NES_FPS = 60.0988

// Milliseconds per drop for each level
export const DROP_INTERVALS = FRAMES_PER_DROP.map(f => (f / NES_FPS) * 1000)

// NES scoring: points per lines cleared × (level + 1)
export const LINE_SCORE_TABLE = [0, 40, 100, 300, 1200]

export const LINES_PER_LEVEL = 10
