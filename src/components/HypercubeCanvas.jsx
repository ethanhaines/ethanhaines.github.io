import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const GRAPH_SCALE = 1.45
const CLICK_ROTATION_ASSIST_MS = 1000

export default function HypercubeCanvas({
  data,
  hoveredIndex,
  selectedIndex,
  onHoverChange,
  onSelectIndex
}) {
  const [isInteracting, setIsInteracting] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const rotationAssistStartedAtRef = useRef(-Infinity)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener?.('change', update)

    return () => {
      media.removeEventListener?.('change', update)
    }
  }, [])

  function triggerRotationAssist() {
    rotationAssistStartedAtRef.current = performance.now()
  }

  return (
    <div className="canvas-shell" aria-label="Interactive pollen embedding graph">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.25, 4.2], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={(event) => {
          if (event.type === 'click') triggerRotationAssist()
          if (event.type === 'click') onSelectIndex(null)
          onHoverChange(null)
        }}
      >
        <color attach="background" args={['#f6f5f1']} />
        <fog attach="fog" args={['#f6f5f1', 5.5, 11]} />
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 2, 4]} intensity={0.45} />

        <NetworkObject
          data={data}
          hoveredIndex={hoveredIndex}
          selectedIndex={selectedIndex}
          onHoverChange={onHoverChange}
          onSelectIndex={onSelectIndex}
          autoRotate={!isInteracting && !reducedMotion}
          rotationAssistStartedAtRef={rotationAssistStartedAtRef}
          onRotationAssistTrigger={triggerRotationAssist}
        />

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={2.4}
          maxDistance={8}
          rotateSpeed={0.65}
          zoomSpeed={0.8}
          dampingFactor={0.08}
          onStart={() => setIsInteracting(true)}
          onEnd={() => setIsInteracting(false)}
        />
      </Canvas>
    </div>
  )
}

function NetworkObject({
  data,
  hoveredIndex,
  selectedIndex,
  onHoverChange,
  onSelectIndex,
  autoRotate,
  rotationAssistStartedAtRef,
  onRotationAssistTrigger
}) {
  const groupRef = useRef(null)
  const crystalMeshRef = useRef(null)
  const rotationFactorRef = useRef(1)
  const wobbleTimeRef = useRef(0)

  const speciesColorByKey = useMemo(() => {
    return new Map(data.speciesLegend.map((entry) => [entry.species, entry.color?.hex ?? '#111111']))
  }, [data.speciesLegend])

  const baseEdgesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(data.baseEdgePositions, 3))
    geometry.computeBoundingSphere()
    return geometry
  }, [data.baseEdgePositions])

  useLayoutEffect(() => {
    const mesh = crystalMeshRef.current
    if (!mesh) return

    const tempObject = new THREE.Object3D()
    const tempColor = new THREE.Color()

    for (let index = 0; index < data.nodes.length; index += 1) {
      const node = data.nodes[index]
      const p = node.displayPosition ?? node.position ?? { x: 0, y: 0, z: 0 }

      const seedA = fract(Math.sin((node.id + 1) * 12.9898) * 43758.5453)
      const seedB = fract(Math.sin((node.id + 1) * 78.233) * 12345.6789)
      const seedC = fract(Math.sin((node.id + 1) * 31.4159) * 98765.4321)

      const scale = 0.012 + seedA * 0.008

      tempObject.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0)
      tempObject.rotation.set(seedA * Math.PI, seedB * Math.PI, seedC * Math.PI)
      tempObject.scale.setScalar(scale)
      tempObject.updateMatrix()
      mesh.setMatrixAt(index, tempObject.matrix)

      const o = index * 3
      tempColor.setRGB(data.colors[o] ?? 0.07, data.colors[o + 1] ?? 0.07, data.colors[o + 2] ?? 0.07)
      mesh.setColorAt(index, tempColor)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere?.()
  }, [data.colors, data.nodes])

  useEffect(() => {
    return () => {
      baseEdgesGeometry.dispose()
    }
  }, [baseEdgesGeometry])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const now = performance.now()
    const assistFactor = getClickRotationAssistFactor(now, rotationAssistStartedAtRef.current)
    const targetRotationFactor = autoRotate ? assistFactor : 0
    const easing = 1 - Math.exp(-delta * 7)

    rotationFactorRef.current += (targetRotationFactor - rotationFactorRef.current) * easing
    const rotationFactor = rotationFactorRef.current

    wobbleTimeRef.current += delta * rotationFactor
    const wobbleT = wobbleTimeRef.current

    groupRef.current.rotation.y += delta * 0.12 * rotationFactor
    groupRef.current.rotation.x = 0.36 + Math.sin(wobbleT * 0.12) * 0.07
    groupRef.current.rotation.z = 0.08 + Math.cos(wobbleT * 0.09) * 0.035
  })

  const hoveredNode = hoveredIndex == null ? null : data.nodes[hoveredIndex]
  const selectedNode = selectedIndex == null ? null : data.nodes[selectedIndex]

  return (
    <group ref={groupRef} scale={GRAPH_SCALE}>
      <lineSegments geometry={baseEdgesGeometry}>
        <lineBasicMaterial color="#111111" transparent opacity={0.055} depthWrite={false} />
      </lineSegments>

      <instancedMesh
        ref={crystalMeshRef}
        args={[null, null, data.nodes.length]}
        onPointerMove={(event) => {
          event.stopPropagation()
          if (event.instanceId == null) return
          const sourceEvent = event.sourceEvent ?? event
          onHoverChange({
            index: event.instanceId,
            x: sourceEvent.clientX ?? 0,
            y: sourceEvent.clientY ?? 0
          })
        }}
        onPointerOut={(event) => {
          event.stopPropagation()
          onHoverChange(null)
        }}
        onClick={(event) => {
          event.stopPropagation()
          if (event.instanceId == null) return
          onRotationAssistTrigger()
          onSelectIndex(event.instanceId)
        }}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.06}
          roughness={0.34}
          flatShading
        />
      </instancedMesh>

      {hoveredNode ? (
        <NodeMarker
          node={hoveredNode}
          color={speciesColorByKey.get(hoveredNode.species) ?? '#111111'}
          scale={0.036}
          opacity={0.58}
          wireOpacity={0.42}
        />
      ) : null}

      {selectedNode ? (
        <NodeMarker
          node={selectedNode}
          color={speciesColorByKey.get(selectedNode.species) ?? '#111111'}
          scale={0.045}
          opacity={0.86}
          wireOpacity={0.82}
        />
      ) : null}
    </group>
  )
}

function NodeMarker({ node, color, scale, opacity, wireOpacity }) {
  const p = node.displayPosition ?? node.position
  return (
    <group position={[p?.x ?? 0, p?.y ?? 0, p?.z ?? 0]} rotation={[0.6, 0.6, 0]} renderOrder={5}>
      <mesh>
        <octahedronGeometry args={[scale, 0]} />
        <meshBasicMaterial
          color="#111111"
          wireframe
          transparent
          opacity={wireOpacity}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[scale * 0.3, 10, 10]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function fract(value) {
  return value - Math.floor(value)
}

function getClickRotationAssistFactor(now, startedAt) {
  if (!Number.isFinite(startedAt) || startedAt < 0) return 1

  const elapsed = now - startedAt
  if (elapsed <= 0) return 1
  if (elapsed >= CLICK_ROTATION_ASSIST_MS) return 1

  const stopEaseMs = 180
  const holdMs = 420
  const resumeMs = CLICK_ROTATION_ASSIST_MS - stopEaseMs - holdMs

  if (elapsed < stopEaseMs) {
    const t = elapsed / stopEaseMs
    return 1 - easeInOutCubic(t)
  }

  if (elapsed < stopEaseMs + holdMs) {
    return 0
  }

  const t = Math.min(1, (elapsed - stopEaseMs - holdMs) / Math.max(1, resumeMs))
  return easeInOutCubic(t)
}

function easeInOutCubic(t) {
  if (t < 0.5) return 4 * t * t * t
  return 1 - Math.pow(-2 * t + 2, 3) / 2
}
