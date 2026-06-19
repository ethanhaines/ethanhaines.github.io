import { useEffect, useState } from 'react'
import manifestLocalUrl from '../../tsne/manifest.json?url'
import nodesLocalUrl from '../../tsne/nodes.json?url'
import edgesLocalUrl from '../../tsne/edges.json?url'
import speciesLocalUrl from '../../tsne/species.json?url'

const DATA_PREFIX = (import.meta.env.VITE_DATA_PREFIX ?? '').replace(/\/+$/, '')
const LOCAL_DATA_URLS = {
  'manifest.json': manifestLocalUrl,
  'nodes.json': nodesLocalUrl,
  'edges.json': edgesLocalUrl,
  'species.json': speciesLocalUrl
}
const FOSSIL_DISPLAY_SPECIES = 'fossil_pollen'
const FOSSIL_DISPLAY_LABEL = 'Fossil pollen'
const FOSSIL_COLOR_HEX = '#f21f2f'
const DISPLAY_GLOBAL_SCALE = 0.95
const DISPLAY_SHAPE_MODE = String(import.meta.env.VITE_DISPLAY_SHAPE_MODE ?? 'freeform').toLowerCase()
const DISPLAY_SPHERIFY_AMOUNT = Number.isFinite(Number(import.meta.env.VITE_DISPLAY_SPHERIFY_AMOUNT))
  ? Number(import.meta.env.VITE_DISPLAY_SPHERIFY_AMOUNT)
  : 0.82

function withCacheBust(url, cacheBust) {
  if (!cacheBust) return url
  if (String(url).startsWith('data:')) return url
  return `${url}${url.includes('?') ? '&' : '?'}v=${cacheBust}`
}

function buildUrl(filePath, cacheBust) {
  const clean = String(filePath || '')
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/^\/+/, '')

  if (DATA_PREFIX) {
    return withCacheBust(`/${DATA_PREFIX}/${clean}`, cacheBust)
  }

  const localAssetUrl = LOCAL_DATA_URLS[clean]
  if (localAssetUrl) {
    return withCacheBust(localAssetUrl, cacheBust)
  }

  return withCacheBust(`/${clean}`, cacheBust)
}

async function fetchJson(filePath, { signal, cacheBust }) {
  const url = buildUrl(filePath, cacheBust)
  if (url.startsWith('data:')) {
    return parseJsonDataUrl(url)
  }

  const response = await fetch(url, {
    signal,
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new Error(`Failed to load ${filePath} (${response.status})`)
  }

  return response.json()
}

function parseJsonDataUrl(url) {
  const value = String(url ?? '')
  const commaIndex = value.indexOf(',')
  if (commaIndex < 0) {
    throw new Error('Invalid data URL for JSON asset')
  }

  const header = value.slice(0, commaIndex)
  const payload = value.slice(commaIndex + 1)
  const isBase64 = /;base64/i.test(header)

  let decoded = ''
  if (isBase64) {
    if (typeof atob === 'function') {
      decoded = atob(payload)
    } else {
      throw new Error('Base64 data URL decoding is not available in this environment')
    }
  } else {
    decoded = decodeURIComponent(payload)
  }

  return JSON.parse(decoded)
}

function hexToRgb01(hex) {
  const normalized = String(hex || '').replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized
  const parsed = Number.parseInt(full, 16)

  if (Number.isNaN(parsed)) {
    return [0.07, 0.07, 0.07]
  }

  return [
    ((parsed >> 16) & 255) / 255,
    ((parsed >> 8) & 255) / 255,
    (parsed & 255) / 255
  ]
}

function prettifySpeciesName(value) {
  if (value === FOSSIL_DISPLAY_SPECIES) return FOSSIL_DISPLAY_LABEL

  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function isFossilPollenNode(node) {
  const searchable = [
    node?.species,
    node?.source_folder,
    node?.path,
    node?.filename,
    node?.label,
    node?.query_group
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return searchable.includes('fossil')
}

function getDisplaySpecies(node) {
  return isFossilPollenNode(node) ? FOSSIL_DISPLAY_SPECIES : node?.species
}

function isVec3(value) {
  return (
    value &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.z)
  )
}

function chooseDisplayField(manifest, nodes) {
  const sample = nodes?.[0] ?? {}
  const candidates = [
    manifest?.display_coordinates?.default_field,
    'position_cloud',
    'position',
    'position_tsne',
    'position_raw'
  ].filter(Boolean)

  for (const field of candidates) {
    if (isVec3(sample[field])) return field
  }

  return 'position'
}

function getDisplayPosition(node, field) {
  const candidates = [node?.[field], node?.position_cloud, node?.position, node?.position_tsne, node?.position_raw]
  for (const candidate of candidates) {
    if (isVec3(candidate)) return candidate
  }
  return { x: 0, y: 0, z: 0 }
}

function cubeToSphere(position) {
  const x = position.x ?? 0
  const y = position.y ?? 0
  const z = position.z ?? 0

  const xx = x * x
  const yy = y * y
  const zz = z * z

  // Standard cube->sphere mapping. Applied to already-normalized display
  // coordinates, this removes the hard "6-face cube" feel while keeping
  // relative neighborhoods recognizable.
  return {
    x: x * Math.sqrt(Math.max(0, 1 - yy / 2 - zz / 2 + (yy * zz) / 3)),
    y: y * Math.sqrt(Math.max(0, 1 - zz / 2 - xx / 2 + (zz * xx) / 3)),
    z: z * Math.sqrt(Math.max(0, 1 - xx / 2 - yy / 2 + (xx * yy) / 3))
  }
}

function stylizeDisplayPosition(position) {
  const raw = {
    x: position.x ?? 0,
    y: position.y ?? 0,
    z: position.z ?? 0
  }

  // Default: preserve the exporter-provided cloud shape (free-form).
  if (DISPLAY_SHAPE_MODE !== 'spherify') {
    return {
      x: raw.x * DISPLAY_GLOBAL_SCALE,
      y: raw.y * DISPLAY_GLOBAL_SCALE,
      z: raw.z * DISPLAY_GLOBAL_SCALE
    }
  }

  // Legacy mode for comparison: remap normalized positions toward a sphere.
  const base = {
    x: Math.max(-1, Math.min(1, raw.x)),
    y: Math.max(-1, Math.min(1, raw.y)),
    z: Math.max(-1, Math.min(1, raw.z))
  }
  const sphere = cubeToSphere(base)
  const t = Math.max(0, Math.min(1, DISPLAY_SPHERIFY_AMOUNT))

  return {
    x: (base.x + (sphere.x - base.x) * t) * DISPLAY_GLOBAL_SCALE,
    y: (base.y + (sphere.y - base.y) * t) * DISPLAY_GLOBAL_SCALE,
    z: (base.z + (sphere.z - base.z) * t) * DISPLAY_GLOBAL_SCALE
  }
}

function processPackage({ manifest, nodes, edges, species }) {
  const displayField = chooseDisplayField(manifest, nodes)
  const sortedNodes = [...nodes]
    .sort((a, b) => a.id - b.id)
    .map((node) => {
      const isFossilPollen = isFossilPollenNode(node)
      return {
        ...node,
        isFossilPollen,
        displaySpecies: isFossilPollen ? FOSSIL_DISPLAY_SPECIES : getDisplaySpecies(node),
        displayPosition: stylizeDisplayPosition(getDisplayPosition(node, displayField))
      }
    })
  const speciesByKey = new Map(species.map((entry) => [entry.species, entry]))
  const indexById = new Map()

  const positions = new Float32Array(sortedNodes.length * 3)
  const colors = new Float32Array(sortedNodes.length * 3)

  sortedNodes.forEach((node, index) => {
    indexById.set(node.id, index)

    const o = index * 3
    positions[o] = node.displayPosition.x
    positions[o + 1] = node.displayPosition.y
    positions[o + 2] = node.displayPosition.z

    const colorHex = node.isFossilPollen
      ? FOSSIL_COLOR_HEX
      : speciesByKey.get(node.species)?.color?.hex ?? '#111111'
    const [r, g, b] = hexToRgb01(colorHex)
    colors[o] = r
    colors[o + 1] = g
    colors[o + 2] = b
  })

  const edgesByNodeIndex = Array.from({ length: sortedNodes.length }, () => [])
  const baseEdgePositions = new Float32Array(edges.length * 6)
  const normalizedEdges = []
  let edgeCursor = 0

  for (const edge of edges) {
    const sourceIndex = indexById.get(edge.source)
    const targetIndex = indexById.get(edge.target)
    if (sourceIndex == null || targetIndex == null) continue

    const sourceOffset = sourceIndex * 3
    const targetOffset = targetIndex * 3

    baseEdgePositions[edgeCursor] = positions[sourceOffset]
    baseEdgePositions[edgeCursor + 1] = positions[sourceOffset + 1]
    baseEdgePositions[edgeCursor + 2] = positions[sourceOffset + 2]
    baseEdgePositions[edgeCursor + 3] = positions[targetOffset]
    baseEdgePositions[edgeCursor + 4] = positions[targetOffset + 1]
    baseEdgePositions[edgeCursor + 5] = positions[targetOffset + 2]

    const normalized = { ...edge, sourceIndex, targetIndex }
    normalizedEdges.push(normalized)
    edgesByNodeIndex[sourceIndex].push(normalized)
    edgesByNodeIndex[targetIndex].push(normalized)
    edgeCursor += 6
  }

  const legendByDisplaySpecies = new Map()

  sortedNodes.forEach((node) => {
    const displaySpecies = node.displaySpecies ?? node.species
    const existing = legendByDisplaySpecies.get(displaySpecies)

    if (existing) {
      existing.count += 1
      return
    }

    const sourceEntry = speciesByKey.get(node.species)
    const isFossilPollen = displaySpecies === FOSSIL_DISPLAY_SPECIES
    legendByDisplaySpecies.set(displaySpecies, {
      ...(sourceEntry ?? {}),
      species: displaySpecies,
      rawSpecies: isFossilPollen ? null : node.species,
      label: prettifySpeciesName(displaySpecies),
      count: 1,
      isFossilPollen,
      color: {
        ...(sourceEntry?.color ?? {}),
        hex: isFossilPollen ? FOSSIL_COLOR_HEX : sourceEntry?.color?.hex ?? '#111111'
      }
    })
  })

  const speciesLegend = [...legendByDisplaySpecies.values()].sort((a, b) => {
    if (a.isFossilPollen) return -1
    if (b.isFossilPollen) return 1
    return b.count - a.count
  })

  return {
    manifest,
    displayField,
    nodes: sortedNodes,
    edges: normalizedEdges,
    species,
    speciesLegend,
    displaySpeciesCount: speciesLegend.length,
    positions,
    colors,
    baseEdgePositions:
      edgeCursor === baseEdgePositions.length
        ? baseEdgePositions
        : baseEdgePositions.slice(0, edgeCursor),
    edgesByNodeIndex,
    indexById,
    loadedAt: new Date().toISOString()
  }
}

export function useHypercubeData() {
  const [refreshToken, setRefreshToken] = useState(0)
  const [state, setState] = useState({
    status: 'loading',
    data: null,
    error: null
  })

  useEffect(() => {
    const controller = new AbortController()
    const cacheBust = Date.now()
    let active = true

    setState((previous) => ({ ...previous, status: 'loading', error: null }))

    ;(async () => {
      try {
        const manifest = await fetchJson('manifest.json', {
          signal: controller.signal,
          cacheBust
        })

        const files = manifest.generated_files ?? {}
        const [nodes, edges, species] = await Promise.all([
          fetchJson(files.nodes ?? 'nodes.json', {
            signal: controller.signal,
            cacheBust
          }),
          fetchJson(files.edges ?? 'edges.json', {
            signal: controller.signal,
            cacheBust
          }),
          fetchJson(files.species ?? 'species.json', {
            signal: controller.signal,
            cacheBust
          })
        ])

        if (!active) return

        setState({
          status: 'ready',
          data: processPackage({ manifest, nodes, edges, species }),
          error: null
        })
      } catch (error) {
        if (!active || controller.signal.aborted) return

        setState({
          status: 'error',
          data: null,
          error
        })
      }
    })()

    return () => {
      active = false
      controller.abort()
    }
  }, [refreshToken])

  return {
    ...state,
    reload() {
      setRefreshToken((value) => value + 1)
    }
  }
}
