'use client'

import { useParams } from 'next/navigation'
import CollaborativeBillSplitter from '@/components/CollaborativeBillSplitter'

export default function ReceiptPage() {
  const params = useParams()
  const receiptId = params.id as string

  return <CollaborativeBillSplitter receiptId={receiptId} />
}