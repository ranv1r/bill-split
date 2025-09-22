'use client'

import { useState, useRef, useEffect } from 'react'
import ReceiptOverlay from './ReceiptOverlay'

interface UploadSectionProps {
  currentImageUrl: string | null
  currentFileType: string | null
  onFileUpload: (file: File) => void
  onProcessOCR: () => void
}

const UploadSection = ({
  currentImageUrl,
  currentFileType,
  onFileUpload,
  onProcessOCR
}: UploadSectionProps) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const renderTaskRef = useRef<any>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      onFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
    }
  }

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click()
  }

  const handlePreviewClick = () => {
    setShowOverlay(true)
  }

  const handleCloseOverlay = () => {
    setShowOverlay(false)
  }

  const renderPDF = async (pdfPath: string) => {
    try {
      // Cancel any existing render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      // Load PDF.js dynamically
      const pdfjsLib = await import('pdfjs-dist')

      // Set worker path
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

      const loadingTask = pdfjsLib.getDocument(pdfPath)
      const pdf = await loadingTask.promise
      const page = await pdf.getPage(1) // Get first page

      // Wait a bit for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = document.getElementById('pdfCanvas') as HTMLCanvasElement
      if (!canvas) {
        console.warn('PDF Canvas element not found')
        return
      }

      const context = canvas.getContext('2d')
      if (!context) {
        console.warn('Could not get canvas context')
        return
      }

      // Clear the canvas first
      context.clearRect(0, 0, canvas.width, canvas.height);

      const viewport = page.getViewport({ scale: 1.5 })
      canvas.height = viewport.height
      canvas.width = viewport.width

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      renderTaskRef.current = null;
    } catch (error) {
      // Only log if it's not a cancellation
      if (error?.name !== 'RenderingCancelledException') {
        console.error('Error rendering PDF:', error)
      }
    }
  }

  useEffect(() => {
    if (currentImageUrl && currentFileType === 'application/pdf') {
      // Small delay to ensure DOM is ready and avoid React strict mode double rendering
      const timeoutId = setTimeout(() => {
        renderPDF(currentImageUrl)
      }, 200)

      return () => {
        clearTimeout(timeoutId)
        // Cancel any ongoing render task
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel()
          renderTaskRef.current = null
        }
      }
    }
  }, [currentImageUrl, currentFileType])

  if (currentImageUrl) {
    return (
      <>
        <div className="uploaded-preview">
          <div id="previewContainer" onClick={handlePreviewClick}>
            {currentFileType === 'application/pdf' ? (
              <canvas id="pdfCanvas" />
            ) : (
              <img id="receiptPreview" src={currentImageUrl} alt="Receipt preview" />
            )}
          </div>
          <div className="preview-actions">
            <button
              type="button"
              onClick={onProcessOCR}
              className="btn btn-primary btn-sm"
            >
              Extract Items
            </button>
            <button
              type="button"
              onClick={handleUploadAreaClick}
              className="btn btn-ghost btn-sm"
            >
              Change
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            hidden
          />
        </div>
        <ReceiptOverlay
          currentImageUrl={currentImageUrl}
          currentFileType={currentFileType}
          isVisible={showOverlay}
          onClose={handleCloseOverlay}
        />
      </>
    )
  }

  return (
    <div className="upload-compact">
      <div
        className={`upload-area-compact ${isDragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadAreaClick}
      >
        <div className="upload-content-compact">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <p>Upload receipt</p>
          <small>PNG, JPG, PDF</small>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          hidden
        />
      </div>
    </div>
  )
}

export default UploadSection