import { NextRequest, NextResponse } from 'next/server'
import { MAP_IMAGES } from '@/lib/mapPolygons'

export async function GET(req: NextRequest) {
  const key = (req.nextUrl.searchParams.get('key') ?? '').toLowerCase()
  const url = MAP_IMAGES[key]

  console.log('[map-image] key:', key, '| url:', url ?? 'NOT FOUND')

  if (!url) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'force-cache',
    })

    console.log('[map-image] CDN status:', res.status, url)

    if (!res.ok) {
      return new NextResponse(null, { status: res.status })
    }

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
