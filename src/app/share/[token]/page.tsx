'use client'

import { useParams } from 'next/navigation'
import TokenBasedBillSplitter from '@/components/TokenBasedBillSplitter'

export default function SharePage() {
  const params = useParams()
  const token = params.token as string

  return <TokenBasedBillSplitter token={token} />
}