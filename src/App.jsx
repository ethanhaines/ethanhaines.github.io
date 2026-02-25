import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import HypercubeCanvas from './components/HypercubeCanvas'
import { useHypercubeData } from './hooks/useHypercubeData'

const TABS = [
  { id: 'NEST', label: 'NEST' },
  { id: 'ALAN', label: 'ALAN' },
  { id: 'TRADING_BOT', label: 'Algorithmic Trading Bot' }
]

export default function App() {
  const [activeTab, setActiveTab] = useState('NEST')
  const [hoverState, setHoverState] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const { status, data, error, reload } = useHypercubeData()

  const deferredHoverState = useDeferredValue(hoverState)
  const hoveredIndex = deferredHoverState?.index ?? null

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
  const hoveredNode = data && hoveredIndex != null ? data.nodes[hoveredIndex] : null
  const panelNode = selectedNode ?? hoveredNode

  const projectSubtitle = useMemo(() => {
    if (activeTab === 'NEST') return 'Pollen Embedding Space / GrainBrain'
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
          {TABS.map((tab) => (
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
                  onHoverChange={setHoverState}
                  onSelectIndex={setSelectedIndex}
                />
              ) : (
                <div className="scene-placeholder">
                  <div className="scene-placeholder-inner">
                    <div className="mono-label">NEST</div>
                    <h1 className="scene-title">
                      {status === 'error' ? 'Data load failed' : 'Loading hypercube'}
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

            <TopInfoPanel
              status={status}
              data={data}
              onReload={reload}
              selectedNode={selectedNode}
              hoveredNode={hoveredNode}
            />

            {data ? <SpeciesRail speciesLegend={data.speciesLegend} /> : null}

            {deferredHoverState && hoveredNode ? (
              <Tooltip hoverState={deferredHoverState} node={hoveredNode} />
            ) : null}

            <BottomDetailPanel node={panelNode} data={data} selectedNode={selectedNode} />
          </>
        ) : (
          <ProjectPlaceholder activeTab={activeTab} />
        )}
      </main>
    </div>
  )
}

function TopInfoPanel({ status, data, onReload, selectedNode, hoveredNode }) {
  const focus = selectedNode ?? hoveredNode

  return (
    <section className="floating-panel top-panel" aria-live="polite">
      <div className="panel-row">
        <span className="mono-label">Status</span>
        <span className={`status-dot status-${status}`} />
        <span className="panel-value">
          {status === 'ready' ? 'Interactive' : status === 'loading' ? 'Loading' : 'Error'}
        </span>
      </div>

      {data ? (
        <>
          <div className="panel-row">
            <span className="mono-label">Nodes</span>
            <span className="panel-value">{data.manifest?.counts?.nodes ?? data.nodes.length}</span>
          </div>
          <div className="panel-row">
            <span className="mono-label">Edges</span>
            <span className="panel-value">{data.manifest?.counts?.edges ?? data.edges.length}</span>
          </div>
          <div className="panel-row">
            <span className="mono-label">Species</span>
            <span className="panel-value">
              {data.manifest?.counts?.species ?? data.species.length}
            </span>
          </div>
        </>
      ) : null}

      {focus ? (
        <div className="panel-focus">
          <div className="mono-label">Focus</div>
          <div className="focus-title">{prettifySpecies(focus.species)}</div>
          <div className="focus-meta">{focus.filename}</div>
        </div>
      ) : (
        <div className="panel-focus muted">
          <div className="mono-label">Focus</div>
          <div className="focus-title">Hover or click a node</div>
          <div className="focus-meta">Orbit, zoom, inspect neighborhoods</div>
        </div>
      )}

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

function BottomDetailPanel({ node, data, selectedNode }) {
  if (!data) return null

  return (
    <section className="floating-panel bottom-panel" aria-live="polite">
      <div className="mono-label">
        {selectedNode ? 'Selected Grain' : node ? 'Hovered Grain' : 'Manifest Notes'}
      </div>

      {node ? (
        <>
          <h2 className="detail-title">{node.filename}</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-key">Species</span>
              <span className="detail-value">{prettifySpecies(node.species)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-key">Crop</span>
              <span className="detail-value">{node.crop_size}</span>
            </div>
            <div className="detail-item">
              <span className="detail-key">Node ID</span>
              <span className="detail-value">{node.id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-key">Path</span>
              <span className="detail-value detail-path">{node.path}</span>
            </div>
          </div>
        </>
      ) : (
        <ul className="notes-list">
          {(data.manifest?.notes ?? []).map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </section>
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
