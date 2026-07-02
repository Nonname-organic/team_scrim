// ============================================================
// Uploaded image validation (PR-6)
// ============================================================
// - size limit
// - allow-list MIME
// - magic-bytes (binary header) check to defeat spoofed Content-Type
// ============================================================

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB

export type AllowedImageType = 'image/jpeg' | 'image/png' | 'image/webp'
const ALLOWED: AllowedImageType[] = ['image/jpeg', 'image/png', 'image/webp']

export interface ValidationResult {
  ok: boolean
  status?: number
  error?: string
  mediaType?: AllowedImageType
}

/** バイナリ先頭のマジックバイトから実際の画像形式を判定（null=不明） */
function sniff(buf: Buffer): AllowedImageType | null {
  if (buf.length < 12) return null
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png'
  // WebP: "RIFF"...."WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp'
  return null
}

/**
 * 画像バッファを検証。
 * - サイズ超過 → 413
 * - MIME 非許可 / マジックバイト不一致 / 宣言と実体の不一致 → 415
 */
export function validateImage(buffer: Buffer, declaredType: string): ValidationResult {
  if (buffer.length === 0) {
    return { ok: false, status: 400, error: '空のファイルです' }
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, error: '画像サイズは10MB以下にしてください' }
  }
  if (!ALLOWED.includes(declaredType as AllowedImageType)) {
    return { ok: false, status: 415, error: '対応形式は JPEG / PNG / WebP のみです' }
  }
  const sniffed = sniff(buffer)
  if (!sniffed) {
    return { ok: false, status: 415, error: '画像として認識できませんでした' }
  }
  if (sniffed !== declaredType) {
    // Content-Type 偽装（宣言と実体の不一致）
    return { ok: false, status: 415, error: 'ファイル形式が一致しません' }
  }
  return { ok: true, mediaType: sniffed }
}
