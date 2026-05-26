import { useEffect, useRef, useState } from 'react'
import { Univer, UniverInstanceType, LocaleType } from '@univerjs/core'
import { UniverSheetsPlugin } from '@univerjs/sheets'
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui'
import { UniverUIPlugin } from '@univerjs/ui'
import { UniverRenderEnginePlugin } from '@univerjs/engine-render'
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula'
import '@univerjs/sheets-ui/lib/index.css'
import '@univerjs/ui/lib/index.css'
import '@univerjs/design/lib/index.css'

export default function Spreadsheet() {
  const containerRef = useRef(null)
  const univerRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    try {
      const univer = new Univer({
        locale: LocaleType.ZH_CN,
      })

      univer.registerPlugin(UniverRenderEnginePlugin)
      univer.registerPlugin(UniverFormulaEnginePlugin)
      univer.registerPlugin(UniverUIPlugin, {
        container,
        header: true,
        toolbar: true,
        footer: true,
      })
      univer.registerPlugin(UniverSheetsPlugin)
      univer.registerPlugin(UniverSheetsUIPlugin)

      univer.createUnit(UniverInstanceType.UNIVER_SHEET, {})

      univerRef.current = univer
    } catch (err) {
      console.error('Univer init error:', err)
      setError(err.message || String(err))
    }

    return () => {
      if (univerRef.current) {
        try { univerRef.current.dispose() } catch (_) {}
        univerRef.current = null
      }
    }
  }, [])

  if (error) {
    return (
      <div style={{
        marginTop: '1rem',
        background: 'rgba(255,0,0,0.1)',
        border: '1px solid rgba(255,0,0,0.3)',
        borderRadius: '8px',
        padding: '1rem',
        color: '#fca5a5',
      }}>
        表格加载失败: {error}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 'calc(100vh - 180px)',
        marginTop: '1rem',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        background: '#fff',
      }}
    />
  )
}
