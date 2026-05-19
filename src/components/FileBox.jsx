import { useRef, useState } from 'react'

const AMAZON_LOGO = 'https://www.citypng.com/public/uploads/preview/square-amazon-app-logo-icon-701751695133387c8mdvsejvz.png?v=2026041106'
const BLING_LOGO  = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZ4ReQ-LLJyt0QDAfFtpBpi6V-JA0CvkIZgA&s'

export default function FileBox({ type, fileName, onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const isAmazon = type === 'amazon'
  const logo  = isAmazon ? AMAZON_LOGO : BLING_LOGO
  const title = isAmazon ? 'Planilha de Estoque Amazon' : 'Planilha de Estoque Bling'
  const alt   = isAmazon ? 'Amazon' : 'Bling'

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleChange(e) {
    const file = e.target.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      className={`file-box${fileName ? ' loaded' : ''}${dragging ? ' dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      <div className="file-label">
        <div className="file-icon">
          <img src={logo} alt={alt} />
        </div>
        <h3>{title}</h3>
        {fileName ? <p className="file-check-inline">✓</p> : <p>Clique ou arraste</p>}
      </div>
    </div>
  )
}
