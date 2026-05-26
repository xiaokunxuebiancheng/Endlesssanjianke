import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const univer = new Univer({
      locale: LocaleType.ZH_CN,
    })

    univer.registerPlugin(UniverRenderEnginePlugin)
    univer.registerPlugin(UniverFormulaEnginePlugin)
    univer.registerPlugin(UniverUIPlugin, {
      container,
    })
    univer.registerPlugin(UniverSheetsPlugin)
    univer.registerPlugin(UniverSheetsUIPlugin)

    univer.createUnit(UniverInstanceType.UNIVER_SHEET, {})

    univerRef.current = univer

    return () => {
      univer.dispose()
      univerRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 'calc(100vh - 180px)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginTop: '1rem',
      }}
    />
  )
}
