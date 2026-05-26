import { useEffect, useRef, useState } from 'react'
import { Univer, UniverInstanceType, LocaleType, merge } from '@univerjs/core'
import { UniverSheetsPlugin } from '@univerjs/sheets'
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui'
import { UniverUIPlugin } from '@univerjs/ui'
import { UniverRenderEnginePlugin } from '@univerjs/engine-render'
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula'
import { UniverDocsPlugin } from '@univerjs/docs'
import { UniverDocsUIPlugin } from '@univerjs/docs-ui'
import '@univerjs/sheets-ui/lib/index.css'
import '@univerjs/ui/lib/index.css'
import '@univerjs/design/lib/index.css'

import { default as uiLocale } from '@univerjs/ui/locale/zh-CN'
import { default as sheetsUILocale } from '@univerjs/sheets-ui/locale/zh-CN'
import { default as docsUILocale } from '@univerjs/docs-ui/locale/zh-CN'
import { default as sheetsLocale } from '@univerjs/sheets/locale/zh-CN'

export default function Spreadsheet() {
  const containerRef = useRef(null)
  const univerRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const wrapper = containerRef.current
    if (!wrapper) return

    const container = document.createElement('div')
    Object.assign(container.style, {
      width: '100%',
      height: '100%',
    })
    wrapper.appendChild(container)

    try {
      const univer = new Univer({
        locale: LocaleType.ZH_CN,
        locales: {
          [LocaleType.ZH_CN]: merge(
            {},
            docsUILocale,
            sheetsUILocale,
            sheetsLocale,
            uiLocale,
          ),
        },
      })

      univer.registerPlugin(UniverRenderEnginePlugin)
      univer.registerPlugin(UniverFormulaEnginePlugin)
      univer.registerPlugin(UniverUIPlugin, { container })
      univer.registerPlugin(UniverDocsPlugin)
      univer.registerPlugin(UniverDocsUIPlugin)
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
      if (container.parentNode) container.parentNode.removeChild(container)
    }
  }, [])

  if (error) {
    return (
      <div style={{
        marginTop: '1rem', background: 'rgba(255,0,0,0.1)',
        border: '1px solid rgba(255,0,0,0.3)', borderRadius: '8px',
        padding: '1rem', color: '#fca5a5',
      }}>
        表格加载失败: {error}
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{
      width: '100%', height: 'calc(100vh - 180px)', marginTop: '1rem',
      borderRadius: '12px', overflow: 'hidden', position: 'relative', background: '#fff',
    }} />
  )
}
