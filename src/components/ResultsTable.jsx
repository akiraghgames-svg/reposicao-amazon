import { useState } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const FILTERS = ['PS5', 'PS4', 'XBOX', 'SWITCH']
const HEADERS = ['SKU', 'Produto', 'Qtd. Amazon', 'Estoque Bling']

function toRows(results) {
  return results.map(r => {
    if (r.notInAmazon) return [r.sku, r.name, '—', String(r.quantity)]
    const qty = r.amazonQty
    const qtyDisplay = qty % 1 === 0 ? String(Math.floor(qty)) : parseFloat(qty).toFixed(2)
    return [r.sku, r.name, qtyDisplay, String(r.quantity)]
  })
}

function exportXLS(results) {
  const rows = toRows(results)
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
  ws['!cols'] = [{ wch: 20 }, { wch: 50 }, { wch: 14 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Reposição')
  XLSX.writeFile(wb, 'reposicao-amazon.xls')
}

function exportPDF(results) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.setTextColor(30, 30, 30)
  doc.text('Planejamento de Reposição Amazon', 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 22)
  autoTable(doc, {
    startY: 28,
    head: [HEADERS],
    body: toRows(results),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [31, 31, 31], textColor: [204, 204, 204], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didParseCell(data) {
      if (data.section !== 'body') return
      const r = results[data.row.index]
      if (r.notInAmazon) {
        data.cell.styles.textColor = [180, 140, 0]
      } else if (data.column.index === 2) {
        data.cell.styles.textColor = r.amazonQty === 0 ? [200, 50, 50] : [180, 100, 0]
        data.cell.styles.fontStyle = 'bold'
      } else if (data.column.index === 3) {
        data.cell.styles.textColor = [60, 140, 80]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })
  doc.save('reposicao-amazon.pdf')
}

export default function ResultsTable({ results }) {
  const [activeFilter, setActiveFilter] = useState(null)

  if (results === null) return null

  const filtered = activeFilter
    ? results.filter(r => r.name.toUpperCase().includes(activeFilter))
    : results

  const repor = results.filter(r => !r.notInAmazon)
  const naoEncontrados = results.filter(r => r.notInAmazon)

  return (
    <div className="results-section">

      {/* Header fixo */}
      <div className="results-header">
        <div className="results-title">📋 Produtos para Repor</div>
        <div className="results-info">
          {repor.length === 0 && naoEncontrados.length === 0
            ? 'Estoque sincronizado. Nenhum produto para repor.'
            : `${repor.length} produto(s) para repor · ${naoEncontrados.length} produto(s) do Bling não encontrados na Amazon`}
        </div>
        {results.length > 0 && (
          <div className="filter-bar">
            <span className="filter-label">Filtrar:</span>
            {FILTERS.map(f => (
              <button
                key={f}
                className={`btn-filter${activeFilter === f ? ' active' : ''}`}
                onClick={() => setActiveFilter(activeFilter === f ? null : f)}
              >
                {f}
              </button>
            ))}
          </div>
        )}
        {activeFilter && (
          <div className="filter-count">
            {filtered.length} produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''} para "{activeFilter}"
          </div>
        )}
      </div>

      {/* Corpo scrollável */}
      {results.length === 0 ? (
        <div className="no-results">Nenhum produto para repor</div>
      ) : (
        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produto</th>
                <th>Qtd. Amazon</th>
                <th>Estoque Bling</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#555', padding: '30px' }}>
                    Nenhum produto encontrado para "{activeFilter}"
                  </td>
                </tr>
              ) : filtered.map((r, i) => {
                if (r.notInAmazon) {
                  return (
                    <tr key={i} style={{ background: '#2a2600' }}>
                      <td style={{ color: '#f5c518' }}>{r.sku}</td>
                      <td style={{ color: '#f5c518' }}>{r.name}</td>
                      <td style={{ color: '#666666' }}>—</td>
                      <td style={{ fontWeight: 500, color: '#4a9d5f' }}>{r.quantity}</td>
                    </tr>
                  )
                }
                const qty = r.amazonQty
                const qtyDisplay = qty % 1 === 0 ? Math.floor(qty) : parseFloat(qty).toFixed(2)
                const isZero = qty === 0
                const rowColor = isZero ? '#ff4444' : undefined
                const qtyColor = isZero ? '#ff4444' : '#ff9800'
                return (
                  <tr key={i}>
                    <td style={{ color: rowColor }}>{r.sku}</td>
                    <td style={{ color: rowColor }}>{r.name}</td>
                    <td style={{ fontWeight: 500, color: qtyColor }}>{qtyDisplay}</td>
                    <td style={{ fontWeight: 500, color: '#4a9d5f' }}>{r.quantity}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer fixo com exports */}
      {results.length > 0 && (
        <div className="export-actions">
          <button className="btn-export" onClick={() => exportXLS(filtered)}>
            Exportar XLS
          </button>
          <button className="btn-export btn-export-pdf" onClick={() => exportPDF(filtered)}>
            Exportar PDF
          </button>
        </div>
      )}
    </div>
  )
}
