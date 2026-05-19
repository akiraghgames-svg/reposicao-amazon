import { useState, useEffect } from 'react'

const AMAZON_LOGO = 'https://www.citypng.com/public/uploads/preview/square-amazon-app-logo-icon-701751695133387c8mdvsejvz.png?v=2026041106'
const BLING_LOGO  = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZ4ReQ-LLJyt0QDAfFtpBpi6V-JA0CvkIZgA&s'

const AMAZON_EXCLUDE = ['unsellable', 'pending', 'cancelled', 'bin', 'external id 2', 'id externo 1', 'fnsku', 'asin', 'ruim', 'expirado', 'devoluções', 'reservado']
const BLING_EXCLUDE = ['gtin', 'ean', 'unidade']

const AMAZON_FIELDS = [
  { label: 'SKU',        key: 'amazonSku' },
  { label: 'Produto',    key: 'amazonName' },
  { label: 'Quantidade', key: 'amazonQty' },
]

const BLING_FIELDS = [
  { label: 'SKU',        key: 'blingSku' },
  { label: 'Produto',    key: 'blingName' },
  { label: 'Quantidade', key: 'blingQuantity' },
]

function SelectField({ id, label, columns, value, onChange }) {
  return (
    <div className="mapping-item">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Selecione</option>
        {columns.map(col => (
          <option key={col} value={col}>{col}</option>
        ))}
      </select>
    </div>
  )
}

function PlatformHeader({ logo, alt, name }) {
  return (
    <h4 className="mapping-section-title">
      <img src={logo} alt={alt} className="mapping-section-icon" />
      {name}
    </h4>
  )
}

function SummaryColumn({ logo, alt, name, fields, mappings }) {
  return (
    <div className="mapping-section">
      <PlatformHeader logo={logo} alt={alt} name={name} />
      {fields.map(f => (
        <div key={f.key} className="summary-row">
          <span className="summary-label">{f.label}</span>
          <span className="summary-value">
            {mappings[f.key] || <em style={{ color: '#666' }}>não detectado</em>}
          </span>
        </div>
      ))}
    </div>
  )
}

function MappingSummary({ mappings }) {
  return (
    <div className="mapping-columns">
      <SummaryColumn logo={AMAZON_LOGO} alt="Amazon" name="Amazon" fields={AMAZON_FIELDS} mappings={mappings} />
      <SummaryColumn logo={BLING_LOGO}  alt="Bling"  name="Bling"  fields={BLING_FIELDS}  mappings={mappings} />
    </div>
  )
}

export default function ColumnMapping({ amazonColumns, blingColumns, mappings, onMappingChange, onProcess }) {
  const allDetected = Object.values(mappings).every(v => v)
  const [editing, setEditing] = useState(!allDetected)

  useEffect(() => {
    setEditing(!allDetected)
  }, [allDetected])

  const filteredAmazon = amazonColumns.filter(
    col => !AMAZON_EXCLUDE.some(ex => col.toLowerCase().includes(ex))
  )
  const filteredBling = blingColumns.filter(
    col => !BLING_EXCLUDE.some(ex => col.toLowerCase().includes(ex))
  )

  const allSelected = Object.values(mappings).every(v => v)

  return (
    <div className="column-mapping">
      <div className="section-title">🔗 Mapeamento de Colunas</div>

      {editing ? (
        <div className="mapping-columns">
          <div className="mapping-section">
            <PlatformHeader logo={AMAZON_LOGO} alt="Amazon" name="Amazon" />
            {AMAZON_FIELDS.map(field => (
              <SelectField
                key={field.key}
                id={field.key}
                label={field.label}
                columns={filteredAmazon}
                value={mappings[field.key]}
                onChange={val => onMappingChange(field.key, val)}
              />
            ))}
          </div>
          <div className="mapping-section">
            <PlatformHeader logo={BLING_LOGO} alt="Bling" name="Bling" />
            {BLING_FIELDS.map(field => (
              <SelectField
                key={field.key}
                id={field.key}
                label={field.label}
                columns={filteredBling}
                value={mappings[field.key]}
                onChange={val => onMappingChange(field.key, val)}
              />
            ))}
          </div>
        </div>
      ) : (
        <MappingSummary mappings={mappings} />
      )}

      <div className="mapping-actions">
        <button className="btn-edit" onClick={() => setEditing(e => !e)}>
          {editing ? 'Cancelar' : 'Editar'}
        </button>
        <button className="btn-process" onClick={onProcess} disabled={!allSelected}>
          Processar
        </button>
      </div>
    </div>
  )
}
