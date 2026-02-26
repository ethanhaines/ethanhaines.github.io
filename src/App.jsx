import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import HypercubeCanvas from './components/HypercubeCanvas'
import { useHypercubeData } from './hooks/useHypercubeData'
import resumePdfUrl from '../resume/Ethan_Haines_resume.pdf?url'

const SHOW_UNFINISHED_TABS = false
const HOVER_PANEL_CLEAR_DELAY_MS = 180

const TABS = [
  { id: 'NEST', label: 'NEST', enabled: true },
  { id: 'RESUME', label: 'Resume', enabled: true },
  { id: 'ALAN', label: 'ALAN', enabled: SHOW_UNFINISHED_TABS },
  { id: 'TRADING_BOT', label: 'Algorithmic Trading Bot', enabled: SHOW_UNFINISHED_TABS }
]

export default function App() {
  const [activeTab, setActiveTab] = useState('NEST')
  const [hoverState, setHoverState] = useState(null)
  const [panelHoverState, setPanelHoverState] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const hoverClearTimeoutRef = useRef(null)
  const { status, data, error, reload } = useHypercubeData()

  const deferredHoverState = useDeferredValue(hoverState)
  const hoveredIndex = hoverState?.index ?? null
  const panelHoveredIndex = panelHoverState?.index ?? null

  useEffect(() => {
    return () => {
      if (hoverClearTimeoutRef.current != null) {
        clearTimeout(hoverClearTimeoutRef.current)
      }
    }
  }, [])

  function handleHoverChange(nextHoverState) {
    if (hoverClearTimeoutRef.current != null) {
      clearTimeout(hoverClearTimeoutRef.current)
      hoverClearTimeoutRef.current = null
    }

    setHoverState(nextHoverState)

    if (nextHoverState) {
      setPanelHoverState(nextHoverState)
      return
    }

    hoverClearTimeoutRef.current = setTimeout(() => {
      setPanelHoverState(null)
      hoverClearTimeoutRef.current = null
    }, HOVER_PANEL_CLEAR_DELAY_MS)
  }

  useEffect(() => {
    if (!data) {
      setSelectedIndex(null)
      return
    }

    if (selectedIndex != null && selectedIndex >= data.nodes.length) {
      setSelectedIndex(null)
    }
  }, [data, selectedIndex])

  const selectedNode = data && selectedIndex != null ? data.nodes[selectedIndex] : null
  const hoveredNode = data && panelHoveredIndex != null ? data.nodes[panelHoveredIndex] : null
  const tooltipNode = data && deferredHoverState?.index != null ? data.nodes[deferredHoverState.index] : null
  const panelNode = selectedNode ?? hoveredNode

  const projectSubtitle = useMemo(() => {
    if (activeTab === 'NEST') return 'Nearest Extant Similarity Tool'
    if (activeTab === 'RESUME') return 'Resume / CV'
    if (activeTab === 'ALAN') return 'Portfolio Project / Placeholder'
    return 'Portfolio Project / Placeholder'
  }, [activeTab])

  return (
    <div className="app-shell">
      <div className="ambient-grid" aria-hidden="true" />

      <header className="site-header">
        <div className="brand-block">
          <div className="brand-name">Ethan Haines</div>
          <div className="brand-subtitle">{projectSubtitle}</div>
        </div>

        <nav className="tab-nav" aria-label="Portfolio projects">
          {TABS.filter((tab) => tab.enabled).map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-button ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => {
                startTransition(() => {
                  setActiveTab(tab.id)
                })
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main-stage">
        {activeTab === 'NEST' ? (
          <>
            <div className="canvas-layer">
              {status === 'ready' && data ? (
                <HypercubeCanvas
                  data={data}
                  hoveredIndex={hoveredIndex}
                  selectedIndex={selectedIndex}
                  onHoverChange={handleHoverChange}
                  onSelectIndex={setSelectedIndex}
                />
              ) : (
                <div className="scene-placeholder">
                  <div className="scene-placeholder-inner">
                    <div className="mono-label">NEST</div>
                    <h1 className="scene-title">
                      {status === 'error' ? 'Data load failed' : 'Loading t-SNE map'}
                    </h1>
                    <p className="scene-copy">
                      {status === 'error'
                        ? error?.message ??
                          'Unable to load manifest/nodes/edges/species JSON.'
                        : 'Reading manifest.json and constructing the 3D k-NN network.'}
                    </p>
                    {status === 'error' ? (
                      <button className="ghost-button" type="button" onClick={reload}>
                        Retry Load
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div className="left-priority-stack">
              <ProjectAbstractPanel />
              <BottomDetailPanel
                node={panelNode}
                data={data}
                selectedNode={selectedNode}
                isBottomRight={Boolean(panelNode)}
              />
              <TopInfoPanel
                data={data}
                onReload={reload}
              />
            </div>

            {data ? <SpeciesRail speciesLegend={data.speciesLegend} /> : null}

            {deferredHoverState && tooltipNode ? (
              <Tooltip hoverState={deferredHoverState} node={tooltipNode} />
            ) : null}
          </>
        ) : activeTab === 'RESUME' ? (
          <ResumeView />
        ) : (
          <ProjectPlaceholder activeTab={activeTab} />
        )}
      </main>
    </div>
  )
}

function ResumeView() {
  const resumeViewerUrl = `${resumePdfUrl}#zoom=100&pagemode=none&navpanes=0`

  return (
    <section className="resume-shell" aria-label="Resume">
      <div className="resume-card">
        <div className="resume-header">
          <div>
            <div className="mono-label resume-block-label">Resume</div>
          </div>

          <div className="resume-actions">
            <a className="ghost-button resume-action" href={resumePdfUrl} target="_blank" rel="noreferrer">
              Open PDF
            </a>
            <a className="ghost-button resume-action" href={resumePdfUrl} download>
              Download
            </a>
          </div>
        </div>

        <div className="resume-viewer">
          <iframe
            className="resume-frame"
            src={resumeViewerUrl}
            title="Ethan Haines resume PDF"
          />
        </div>
      </div>
    </section>
  )
}

function TopInfoPanel({ data, onReload }) {
  return (
    <section className="floating-panel top-panel" aria-live="polite">
      {data ? (
        <>
          <div className="panel-row">
            <span className="mono-label">Nodes</span>
            <span className="panel-value panel-value-single">
              {data.manifest?.counts?.nodes ?? data.nodes.length}
            </span>
          </div>
          <div className="panel-row">
            <span className="mono-label">Species</span>
            <span className="panel-value panel-value-single">
              {data.manifest?.counts?.species ?? data.species.length}
            </span>
          </div>
        </>
      ) : null}

      <button className="ghost-button" type="button" onClick={onReload}>
        Reload Data
      </button>
    </section>
  )
}

function SpeciesRail({ speciesLegend }) {
  return (
    <aside className="floating-panel species-rail" aria-label="Species legend">
      <div className="mono-label rail-title">Species</div>
      <div className="species-list">
        {speciesLegend.map((entry) => (
          <div key={entry.species} className="species-row">
            <span
              className="species-dot"
              style={{ backgroundColor: entry.color?.hex ?? '#111111' }}
              aria-hidden="true"
            />
            <span className="species-name">{entry.label}</span>
            <span className="species-count">{entry.count}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}

function BottomDetailPanel({ node, data, selectedNode, isBottomRight = false }) {
  if (!data || !node) return null
  const thumbnailUrl = selectedNode ? buildThumbnailUrl(selectedNode) : null
  const panelClassName = `floating-panel bottom-panel${isBottomRight ? ' is-bottom-right' : ''}`

  return (
    <section className={panelClassName} aria-live="polite">
      <div className="mono-label">
        {selectedNode ? 'Selected Grain' : 'Hovered Grain'}
      </div>

      {thumbnailUrl ? (
        <ThumbnailPreview src={thumbnailUrl} alt={`${node.filename} thumbnail`} />
      ) : null}

      <h2 className="detail-title">{node.filename}</h2>
      <div className="detail-grid">
        <div className="detail-item">
          <span className="detail-key">Species</span>
          <span className="detail-value">{prettifySpecies(node.species)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-key">Node ID</span>
          <span className="detail-value">{node.id}</span>
        </div>
      </div>
    </section>
  )
}

function ProjectAbstractPanel() {
  return (
    <aside className="floating-panel abstract-panel" aria-label="Project abstract">
      <p className="abstract-copy">
        NEST builds a searchable pollen database using DINOv3 embeddings and FAISS nearest-neighbor
        search so a fossil pollen query can be matched to the closest extant species in feature
        space.
      </p>
      <p className="abstract-copy">
        The retrieval pipeline is feature-driven rather than color-driven, emphasizing morphology
        and structural similarity over color variation due to staining. Images are captured on a Keyence VHX-7000
        at 1000x magnification.
      </p>
    </aside>
  )
}

function ThumbnailPreview({ src, alt }) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [src])

  if (!src || hasError) return null

  return (
    <div className="detail-thumb">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setHasError(true)}
      />
    </div>
  )
}

function Tooltip({ hoverState, node }) {
  const width = typeof window === 'undefined' ? 1200 : window.innerWidth
  const style = {
    left: Math.min(width - 280, hoverState.x + 14),
    top: Math.max(16, hoverState.y + 14)
  }

  return (
    <div className="node-tooltip" style={style} role="status">
      <div className="mono-label">Hover</div>
      <div className="tooltip-title">{prettifySpecies(node.species)}</div>
      <div className="tooltip-meta">{node.filename}</div>
      <div className="tooltip-meta">{node.crop_size}</div>
    </div>
  )
}

function ProjectPlaceholder({ activeTab }) {
  const copy =
    activeTab === 'ALAN'
      ? 'ALAN project page scaffold placeholder. We can iterate into a full case study next.'
      : 'Algorithmic Trading Bot project page scaffold placeholder. Ready for metrics, architecture visuals, and strategy storytelling.'

  return (
    <section className="project-placeholder">
      <div className="project-card">
        <div className="mono-label">{activeTab === 'ALAN' ? 'Project 02' : 'Project 03'}</div>
        <h1>{activeTab === 'ALAN' ? 'ALAN' : 'Algorithmic Trading Bot'}</h1>
        <p>{copy}</p>
      </div>
    </section>
  )
}

function prettifySpecies(value) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function buildThumbnailUrl(node) {
  const species = String(node?.species ?? '').trim()
  const cropSize = String(node?.crop_size ?? '').trim()
  const filename = String(node?.filename ?? '').trim()

  if (!species || !cropSize || !filename) return null

  const base = String(import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '')
  return `${base}/${encodeURIComponent(species)}/${encodeURIComponent(cropSize)}/${encodeURIComponent(filename)}`
}
