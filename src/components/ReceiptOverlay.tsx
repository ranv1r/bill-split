'use client'

import { useState, useRef, useEffect } from 'react'

interface ReceiptOverlayProps {
  currentImageUrl: string | null
  currentFileType: string | null
  isVisible: boolean
  onClose: () => void
}

const ReceiptOverlay = ({
  currentImageUrl,
  currentFileType,
  isVisible,
  onClose
}: ReceiptOverlayProps) => {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isVisible, onClose])

  const renderPDFOverlay = async (pdfPath: string) => {
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

      const loadingTask = pdfjsLib.getDocument(pdfPath)
      const pdf = await loadingTask.promise
      const page = await pdf.getPage(1)

      // Wait a bit for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = document.getElementById('overlayPdfCanvas') as HTMLCanvasElement
      if (!canvas) {
        console.warn('Overlay PDF Canvas element not found')
        return
      }

      const context = canvas.getContext('2d')
      if (!context) {
        console.warn('Could not get overlay canvas context')
        return
      }

      const viewport = page.getViewport({ scale: 2 })
      canvas.height = viewport.height
      canvas.width = viewport.width

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }

      await page.render(renderContext).promise
    } catch (error) {
      console.error('Error rendering PDF in overlay:', error)
    }
  }

  useEffect(() => {
    if (isVisible && currentImageUrl && currentFileType === 'application/pdf') {
      renderPDFOverlay(currentImageUrl)
    }
  }, [isVisible, currentImageUrl, currentFileType])

  if (!isVisible || !currentImageUrl) {
    return null
  }

  return (
    <div className="receipt-overlay">
      <div className="receipt-overlay-backdrop" onClick={onClose} />
      <div className="receipt-overlay-content" ref={overlayRef}>
        <button
          className="receipt-overlay-close"
          onClick={onClose}
          aria-label="Close overlay"
        >
          ×
        </button>
        <div className="receipt-overlay-image">
          {currentFileType === 'application/pdf' ? (
            <canvas id="overlayPdfCanvas" />
          ) : (
            <img src={currentImageUrl} alt="Receipt full view" />
          )}
        </div>
      </div>
    </div>
  )
}

export default ReceiptOverlay