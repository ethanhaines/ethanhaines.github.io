import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import HypercubeCanvas from './components/HypercubeCanvas'
import { useHypercubeData } from './hooks/useHypercubeData'
import resumePdfUrl from '../resume/Ethan_Haines_resume.pdf?url'

const SHOW_UNFINISHED_TABS = false
const HOVER_PANEL_CLEAR_DELAY_MS = 180
const EMPTY_QUERIES = []

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
  const [queryPanelOpen, setQueryPanelOpen] = useState(false)
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
            </div>

            {data ? <DataBadge data={data} /> : null}

            <QueryPanel
              data={data}
              isOpen={queryPanelOpen}
              onToggle={() => setQueryPanelOpen((value) => !value)}
              onSelectIndex={setSelectedIndex}
            />

            <BottomDetailPanel
              node={panelNode}
              data={data}
              selectedNode={selectedNode}
              isBottomRight={Boolean(panelNode)}
            />

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

function DataBadge({ data }) {
  return (
    <section className="data-badge" aria-label="Dataset summary">
      <span>{data.manifest?.counts?.nodes ?? data.nodes.length} nodes</span>
      <span>{data.displaySpeciesCount ?? data.manifest?.counts?.species ?? data.species.length} groups</span>
    </section>
  )
}

function SpeciesRail({ speciesLegend }) {
  return (
    <aside className="floating-panel species-rail" aria-label="Species legend">
      <div className="mono-label rail-title">Species</div>
      <div className="species-list">
        {speciesLegend.map((entry) => (
          <div
            key={entry.species}
            className={`species-row${entry.isFossilPollen ? ' is-fossil-pollen' : ''}`}
          >
            <span
              className={`species-dot${entry.isFossilPollen ? ' is-fossil-pollen' : ''}`}
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
          <span className="detail-value">{prettifySpecies(node.displaySpecies ?? node.species)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-key">Node ID</span>
          <span className="detail-value">{node.id}</span>
        </div>
      </div>
    </section>
  )
}

function QueryPanel({ data, isOpen, onToggle, onSelectIndex }) {
  const queries = data?.searchResults?.queries ?? EMPTY_QUERIES
  const [selectedQueryNodeId, setSelectedQueryNodeId] = useState(null)
  const [activeQueryNodeId, setActiveQueryNodeId] = useState(null)
  const [selectedResultNodeId, setSelectedResultNodeId] = useState(null)

  const selectedQuery = useMemo(() => {
    return queries.find((query) => query.query.node_id === selectedQueryNodeId) ?? queries[0] ?? null
  }, [queries, selectedQueryNodeId])

  const activeQuery = useMemo(() => {
    return queries.find((query) => query.query.node_id === activeQueryNodeId) ?? null
  }, [queries, activeQueryNodeId])

  const selectedResult = useMemo(() => {
    if (!activeQuery) return null
    return (
      activeQuery.results.find((result) => result.node_id === selectedResultNodeId) ??
      activeQuery.results[0] ??
      null
    )
  }, [activeQuery, selectedResultNodeId])

  useEffect(() => {
    if (!queries.length) {
      setSelectedQueryNodeId(null)
      setActiveQueryNodeId(null)
      setSelectedResultNodeId(null)
      return
    }

    if (!queries.some((query) => query.query.node_id === selectedQueryNodeId)) {
      setSelectedQueryNodeId(queries[0].query.node_id)
    }

    if (activeQueryNodeId != null && !queries.some((query) => query.query.node_id === activeQueryNodeId)) {
      setActiveQueryNodeId(null)
      setSelectedResultNodeId(null)
    }
  }, [activeQueryNodeId, queries, selectedQueryNodeId])

  function selectGraphNode(nodeId) {
    if (nodeId == null || !data?.indexById) return
    const index = data.indexById.get(nodeId)
    if (index != null) onSelectIndex(index)
  }

  function handleSelectQuery(query) {
    const nodeId = query.query.node_id
    setSelectedQueryNodeId(nodeId)
    setSelectedResultNodeId(null)
    selectGraphNode(nodeId)
  }

  function handleRunQuery() {
    if (!selectedQuery) return
    setActiveQueryNodeId(selectedQuery.query.node_id)
    setSelectedResultNodeId(selectedQuery.results[0]?.node_id ?? null)
    selectGraphNode(selectedQuery.query.node_id)
  }

  function handleSelectResult(result) {
    setSelectedResultNodeId(result.node_id)
    selectGraphNode(result.node_id)
  }

  return (
    <section className={`floating-panel query-panel${isOpen ? ' is-open' : ''}`} aria-label="Query panel">
      {!isOpen ? (
        <button className="query-toggle" type="button" onClick={onToggle}>
          Query
        </button>
      ) : (
        <>
          <div className="query-header">
            <div>
              <div className="mono-label">Query</div>
              <div className="query-subtitle">
                {queries.length ? `${queries.length} fossil pollen queries` : 'Static search unavailable'}
              </div>
            </div>
            <button className="query-close" type="button" onClick={onToggle}>
              Close
            </button>
          </div>

          {queries.length ? (
            <div className="query-workspace">
              <div className="query-selector">
                <div className="mono-label">Fossil Pollens</div>
                <div className="query-list" role="listbox" aria-label="Fossil pollen queries">
                  {queries.map((query) => {
                    const isSelected = query.query.node_id === selectedQuery?.query.node_id
                    const isActive = query.query.node_id === activeQuery?.query.node_id
                    return (
                      <button
                        key={query.query.node_id}
                        type="button"
                        className={`query-list-item${isSelected ? ' is-selected' : ''}${isActive ? ' is-active' : ''}`}
                        onClick={() => handleSelectQuery(query)}
                      >
                        <span>Node {query.query.node_id}</span>
                        <span>{query.query.crop_size}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {selectedQuery ? (
                <div className="query-preview">
                  <div className="mono-label">Selected Fossil</div>
                  <div className="query-preview-compact">
                    <ThumbnailPreview
                      src={buildThumbnailUrl(selectedQuery.query)}
                      alt={`${selectedQuery.query.filename} thumbnail`}
                      className="query-thumb query-preview-thumb"
                    />
                    <div className="query-preview-copy">
                      <div className="query-preview-title">{selectedQuery.query.filename}</div>
                      <div className="query-preview-meta">
                        Node {selectedQuery.query.node_id} | {selectedQuery.query.crop_size}
                      </div>
                      <button className="ghost-button query-run-button" type="button" onClick={handleRunQuery}>
                        Query This Fossil
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeQuery ? (
                <div className="query-results">
                  <div className="query-comparison">
                    <ComparisonCard label="Query Fossil" item={activeQuery.query} />
                    <ComparisonCard label="Selected Match" item={selectedResult} />
                  </div>

                  <div className="query-results-header">
                    <div className="mono-label">Similarity Leaderboard</div>
                    <div className="query-preview-meta">
                      Cosine similarity from stored DINOv3 embeddings
                    </div>
                  </div>

                  <div className="leaderboard" role="list" aria-label="Search results">
                    {activeQuery.results.map((result, index) => (
                      <button
                        key={`${activeQuery.query.node_id}-${result.node_id}`}
                        type="button"
                        className={`leaderboard-row${result.node_id === selectedResult?.node_id ? ' is-selected' : ''}`}
                        onClick={() => handleSelectResult(result)}
                      >
                        <span className="leaderboard-rank">{index + 1}</span>
                        <span className="leaderboard-main">
                          <span className="leaderboard-species">{prettifySpecies(result.species)}</span>
                          <span className="leaderboard-file">{result.filename}</span>
                        </span>
                        <span className="leaderboard-score">{formatSimilarity(result.similarity)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="query-empty-state">
                  Pick a fossil pollen above, then run a static nearest-neighbor query.
                </div>
              )}
            </div>
          ) : (
            <div className="query-empty-state">
              Static fossil search results were not found in the current export.
            </div>
          )}
        </>
      )}
    </section>
  )
}

function ComparisonCard({ label, item }) {
  return (
    <div className="comparison-card">
      <div className="mono-label">{label}</div>
      {item ? (
        <>
          <ThumbnailPreview
            src={buildThumbnailUrl(item)}
            alt={`${item.filename} thumbnail`}
            className="query-thumb"
          />
          <div className="comparison-title">{item.filename}</div>
          <div className="comparison-meta">
            {prettifySpecies(item.display_species ?? item.species)} | Node {item.node_id}
          </div>
          {'similarity' in item ? (
            <div className="comparison-score">{formatSimilarity(item.similarity)}</div>
          ) : null}
        </>
      ) : (
        <div className="query-empty-state">
          Select a leaderboard grain.
        </div>
      )}
    </div>
  )
}

function formatSimilarity(value) {
  if (!Number.isFinite(value)) return 'n/a'
  return value.toFixed(3)
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

function ThumbnailPreview({ src, alt, className = '' }) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [src])

  if (!src || hasError) return null

  return (
    <div className={`detail-thumb${className ? ` ${className}` : ''}`}>
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
      <div className="tooltip-title">{prettifySpecies(node.displaySpecies ?? node.species)}</div>
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
  if (value === 'fossil_pollen') return 'Fossil pollen'

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
