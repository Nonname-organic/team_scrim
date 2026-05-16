'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MatchesPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/round-analysis') }, [router])
  return null
}
