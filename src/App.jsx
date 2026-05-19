import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import './App.css'
import FileBox from './components/FileBox'
import ColumnMapping from './components/ColumnMapping'
import ResultsTable from './components/ResultsTable'

const DEFAULT_MAPPINGS = {
  amazonSku:      '',
  amazonName:     '',
  amazonQty:      '',
  blingSku:       '',
  blingName:      '',
  blingQuantity:  '',
}

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array', codepage: 65001 })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(sheet)
        resolve(data)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'))
    reader.readAsArrayBuffer(file)
  })
}

function detect(cols, keywords) {
  const lower = cols.map(c => ({ original: c, lc: c.toLowerCase() }))
  for (const kw of keywords) {
    const exact = lower.find(c => c.lc === kw)
    if (exact) return exact.original
  }
  for (const kw of keywords) {
    const starts = lower.find(c => c.lc.startsWith(kw + ' ') || c.lc.startsWith(kw + '-'))
    if (starts) return starts.original
  }
  for (const kw of keywords) {
    const inc = lower.find(c => c.lc.includes(kw))
    if (inc) return inc.original
  }
  return ''
}

function autoDetectMappings(amazonCols, blingCols) {
  const skuKw  = ['sku', 'código', 'codigo', 'referência', 'referencia']
  const nameKw = ['produto', 'descrição', 'descricao', 'nome', 'name', 'title', 'título']
  const qtyKw  = ['quantidade', 'estoque', 'saldo', 'qty', 'quantity']

  return {
    amazonSku:     detect(amazonCols, skuKw),
    amazonName:    detect(amazonCols, nameKw),
    amazonQty:     detect(amazonCols, qtyKw),
    blingSku:      detect(blingCols,  skuKw),
    blingName:     detect(blingCols,  nameKw),
    blingQuantity: detect(blingCols,  qtyKw),
  }
}

function shouldExclude(sku, name) {
  if (sku.toUpperCase().endsWith('_FBA')) return true
  if (name.startsWith('*')) return true
  return false
}

export default function App() {
  const [amazon, setAmazon] = useState(null)
  const [bling, setBling] = useState(null)
  const [amazonFileName, setAmazonFileName] = useState('')
  const [blingFileName, setBlingFileName] = useState('')
  const [mappings, setMappings] = useState(DEFAULT_MAPPINGS)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  async function handleFile(type, file) {
    setError('')
    try {
      const data = await parseFile(file)

      let newAmazon = amazon
      let newBling = bling

      if (type === 'amazon') {
        setAmazon(data)
        setAmazonFileName(file.name)
        newAmazon = data
      } else {
        setBling(data)
        setBlingFileName(file.name)
        newBling = data
      }

      if (newAmazon && newBling) {
        const amazonCols = newAmazon.length > 0 ? Object.keys(newAmazon[0]) : []
        const blingCols  = newBling.length > 0  ? Object.keys(newBling[0])  : []
        setMappings(autoDetectMappings(amazonCols, blingCols))
      }
    } catch (err) {
      setError('Erro ao carregar arquivo: ' + err.message)
    }
  }

  function handleMappingChange(key, value) {
    setMappings(prev => ({ ...prev, [key]: value }))
  }

  function processData() {
    setError('')
    setLoading(true)

    setTimeout(() => {
      try {
        const output = []

        // Primeiro passo: mapear todos os SKUs da Amazon (independente de quantidade)
        const amazonSkuMap = new Map()
        amazon.forEach(amazonProduct => {
          const sku  = String(amazonProduct[mappings.amazonSku]  ?? '').trim()
          const name = String(amazonProduct[mappings.amazonName] ?? '').trim()
          if (shouldExclude(sku, name)) return
          const qty = parseFloat(String(amazonProduct[mappings.amazonQty]).replace(',', '.')) || 0
          amazonSkuMap.set(sku, { qty, name })
        })

        // Segundo passo: cruzar com Bling
        const matchedBlingSkus = new Set()

        bling.forEach(blingProduct => {
          const sku     = String(blingProduct[mappings.blingSku]      ?? '').trim()
          const name    = String(blingProduct[mappings.blingName]     ?? '').trim()
          const blingQty = parseFloat(String(blingProduct[mappings.blingQuantity]).replace(',', '.')) || 0

          if (shouldExclude(sku, name)) return

          const amazonEntry = amazonSkuMap.get(sku)

          if (amazonEntry) {
            matchedBlingSkus.add(sku)
            if (amazonEntry.qty <= 1 && blingQty > 10) {
              output.push({
                sku,
                name,
                amazonQty: amazonEntry.qty,
                quantity: blingQty,
                notInAmazon: false,
              })
            }
          }
        })

        // Terceiro passo: Bling sem correspondência na Amazon
        bling.forEach(blingProduct => {
          const sku  = String(blingProduct[mappings.blingSku]  ?? '').trim()
          const name = String(blingProduct[mappings.blingName] ?? '').trim()

          if (shouldExclude(sku, name)) return
          if (matchedBlingSkus.has(sku)) return

          const qty = parseFloat(String(blingProduct[mappings.blingQuantity]).replace(',', '.')) || 0
          if (qty <= 5) return

          output.push({
            sku,
            name,
            amazonQty: null,
            quantity: qty,
            notInAmazon: true,
          })
        })

        setResults(output)
      } catch (err) {
        setError('Erro ao processar: ' + err.message)
      } finally {
        setLoading(false)
      }
    }, 500)
  }

  function resetAll() {
    setAmazon(null)
    setBling(null)
    setAmazonFileName('')
    setBlingFileName('')
    setMappings(DEFAULT_MAPPINGS)
    setResults(null)
    setError('')
  }

  const bothLoaded = amazon && bling
  const leftRef = useRef(null)
  const rightRef = useRef(null)

  useEffect(() => {
    if (!leftRef.current || !rightRef.current) return
    const observer = new ResizeObserver(() => {
      const h = leftRef.current.offsetHeight
      rightRef.current.style.setProperty('--left-col-height', h + 'px')
    })
    observer.observe(leftRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="container">
      <h1>📦 Planejamento de Reposição Amazon</h1>
      <p className="subtitle">Reposição de estoque entre Amazon e Bling</p>

      {error && <div className="error-message">⚠️ {error}</div>}

      <div className="layout">
        <div className="layout-left" ref={leftRef}>
          <div className="files-card">
            <div className="files-container">
              <FileBox
                type="amazon"
                fileName={amazonFileName}
                onFile={file => handleFile('amazon', file)}
              />
              <FileBox
                type="bling"
                fileName={blingFileName}
                onFile={file => handleFile('bling', file)}
              />
            </div>
            {(amazon || bling) && (
              <button className="btn-reset" onClick={resetAll}>Redefinir</button>
            )}
          </div>

          {bothLoaded && (
            <ColumnMapping
              amazonColumns={amazon.length > 0 ? Object.keys(amazon[0]) : []}
              blingColumns={bling.length > 0 ? Object.keys(bling[0]) : []}
              mappings={mappings}
              onMappingChange={handleMappingChange}
              onProcess={processData}
            />
          )}
        </div>

        <div className="layout-right" ref={rightRef}>
          {loading && (
            <div className="loading">
              <div className="spinner" />
              <p>Processando...</p>
            </div>
          )}
          {!loading && <ResultsTable results={results} />}
        </div>
      </div>
    </div>
  )
}
