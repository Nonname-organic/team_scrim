/**
 * Japanese → English map name normalizer
 * Handles both English ("Haven") and Japanese ("ヘイヴン") stored map names.
 */
const JP_TO_EN: Record<string, string> = {
  'アセント':     'ascent',
  'スプリット':   'split',
  'ヘイヴン':     'haven',
  'バインド':     'bind',
  'ブリーズ':     'breeze',
  'アイスボックス':'icebox',
  'フラクチャー': 'fracture',
  'パール':       'pearl',
  'ロータス':     'lotus',
  'サンセット':   'sunset',
  'アビス':       'abyss',
}

export function normalizeMapKey(mapName: string): string {
  return JP_TO_EN[mapName] ?? mapName.toLowerCase()
}

/**
 * Valorant map minimap image URLs from valorant-api.com
 * Key: lowercase English name of the map.
 */
export const MAP_IMAGES: Record<string, string> = {
  ascent:   'https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/displayicon.png',
  split:    'https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/displayicon.png',
  haven:    'https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/displayicon.png',
  bind:     'https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/displayicon.png',
  breeze:   'https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/displayicon.png',
  icebox:   'https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/displayicon.png',
  fracture: 'https://media.valorant-api.com/maps/b529448b-4d60-346e-e89e-00a4c527a405/displayicon.png',
  pearl:    'https://media.valorant-api.com/maps/fd267378-4d1d-484f-ff52-77821ed10dc2/displayicon.png',
  lotus:    'https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/displayicon.png',
  sunset:   'https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/displayicon.png',
  abyss:    'https://media.valorant-api.com/maps/224b0a95-48b9-f703-1bd8-67aca101a61f/displayicon.png',
}

/**
 * CSS rotation (degrees) to apply to the map image for correct display.
 * Positive = clockwise, negative = counter-clockwise.
 */
export const MAP_ROTATION: Record<string, number> = {
  haven: -90,
}

/**
 * Site polygon definitions per map.
 * Coordinates are normalized [x, y] in [0, 1] space relative to the minimap image.
 * [0, 0] = top-left, [1, 1] = bottom-right.
 *
 * NOTE: These are approximate bounding polygons.
 * Adjust vertices if auto-detection is imprecise for your minimap scale.
 */
export const MAP_POLYGONS: Record<string, Record<string, [number, number][]>> = {
  ascent: {
    A: [[0.52, 0.05], [0.88, 0.05], [0.88, 0.48], [0.52, 0.48]],
    B: [[0.12, 0.52], [0.48, 0.52], [0.48, 0.92], [0.12, 0.92]],
  },
  split: {
    A: [[0.55, 0.05], [0.92, 0.05], [0.92, 0.50], [0.55, 0.50]],
    B: [[0.08, 0.50], [0.45, 0.50], [0.45, 0.92], [0.08, 0.92]],
  },
  haven: {
    A: [[0.04, 0.20], [0.35, 0.20], [0.35, 0.80], [0.04, 0.80]],
    B: [[0.38, 0.30], [0.62, 0.30], [0.62, 0.70], [0.38, 0.70]],
    C: [[0.65, 0.20], [0.96, 0.20], [0.96, 0.80], [0.65, 0.80]],
  },
  bind: {
    A: [[0.55, 0.10], [0.95, 0.10], [0.95, 0.55], [0.55, 0.55]],
    B: [[0.05, 0.45], [0.45, 0.45], [0.45, 0.90], [0.05, 0.90]],
  },
  breeze: {
    A: [[0.05, 0.10], [0.45, 0.10], [0.45, 0.55], [0.05, 0.55]],
    B: [[0.55, 0.45], [0.95, 0.45], [0.95, 0.90], [0.55, 0.90]],
  },
  icebox: {
    A: [[0.05, 0.05], [0.45, 0.05], [0.45, 0.50], [0.05, 0.50]],
    B: [[0.55, 0.50], [0.95, 0.50], [0.95, 0.92], [0.55, 0.92]],
  },
  fracture: {
    A: [[0.55, 0.08], [0.95, 0.08], [0.95, 0.92], [0.55, 0.92]],
    B: [[0.05, 0.08], [0.45, 0.08], [0.45, 0.92], [0.05, 0.92]],
  },
  pearl: {
    A: [[0.55, 0.05], [0.95, 0.05], [0.95, 0.55], [0.55, 0.55]],
    B: [[0.05, 0.45], [0.45, 0.45], [0.45, 0.92], [0.05, 0.92]],
  },
  lotus: {
    A: [[0.55, 0.05], [0.95, 0.05], [0.95, 0.50], [0.55, 0.50]],
    B: [[0.30, 0.35], [0.70, 0.35], [0.70, 0.65], [0.30, 0.65]],
    C: [[0.05, 0.50], [0.45, 0.50], [0.45, 0.92], [0.05, 0.92]],
  },
  sunset: {
    A: [[0.55, 0.05], [0.95, 0.05], [0.95, 0.50], [0.55, 0.50]],
    B: [[0.05, 0.50], [0.45, 0.50], [0.45, 0.95], [0.05, 0.95]],
  },
  abyss: {
    A: [[0.55, 0.05], [0.95, 0.05], [0.95, 0.50], [0.55, 0.50]],
    B: [[0.05, 0.50], [0.45, 0.50], [0.45, 0.95], [0.05, 0.95]],
  },
}
