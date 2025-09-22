interface OCRModalProps {
  show: boolean
}

const OCRModal = ({ show }: OCRModalProps) => {
  if (!show) return null

  return (
    <div className="modal">
      <div className="modal-content">
        <h3>Processing Receipt...</h3>
        <div className="loading-spinner"></div>
        <p>Extracting text from your receipt image. This may take a few moments.</p>
      </div>
    </div>
  )
}

export default OCRModal