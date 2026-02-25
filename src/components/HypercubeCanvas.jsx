import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const GRAPH_SCALE = 1.45

export default function HypercubeCanvas({
  data,
  hoveredIndex,
  selectedIndex,
  onHoverChange,
  onSelectIndex
}) {
  const [isInteracting, setIsInteracting] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener?.('change', update)

    return () => {
      media.removeEventListener?.('change', update)
    }
  }, [])

  return (
    <div className="canvas-shell" aria-label="Interactive pollen embedding graph">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.25, 4.4], fov: 50, near: 0.1, far: 100 }}
        raycaster={{ params: { Points: { threshold: 0.035 } } }}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={(event) => {
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
  autoRotate
}) {
  const groupRef = useRef(null)

  const speciesColorByKey = useMemo(() => {
    return new Map(data.speciesLegend.map((entry) => [entry.species, entry.color?.hex ?? '#111111']))
  }, [data.speciesLegend])

  const pointsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
    geometry.computeBoundingSphere()
    return geometry
  }, [data.positions, data.colors])

  const baseEdgesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(data.baseEdgePositions, 3))
    geometry.computeBoundingSphere()
    return geometry
  }, [data.baseEdgePositions])

  useEffect(() => {
    return () => {
      pointsGeometry.dispose()
      baseEdgesGeometry.dispose()
    }
  }, [pointsGeometry, baseEdgesGeometry])

  useFrame((_, delta) => {
    if (!groupRef.current || !autoRotate) return
    groupRef.current.rotation.y += delta * 0.12
    groupRef.current.rotation.x = 0.36 + Math.sin(performance.now() * 0.00012) * 0.07
    groupRef.current.rotation.z = 0.08 + Math.cos(performance.now() * 0.00009) * 0.035
  })

  const hoveredNode = hoveredIndex == null ? null : data.nodes[hoveredIndex]
  const selectedNode = selectedIndex == null ? null : data.nodes[selectedIndex]

  return (
    <group ref={groupRef} scale={GRAPH_SCALE}>
      <lineSegments geometry={baseEdgesGeometry}>
        <lineBasicMaterial color="#111111" transparent opacity={0.03} depthWrite={false} />
      </lineSegments>

      <points
        geometry={pointsGeometry}
        onPointerMove={(event) => {
          event.stopPropagation()
          if (event.index == null) return
          const sourceEvent = event.sourceEvent ?? event
          onHoverChange({
            index: event.index,
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
          if (event.index == null) return
          onSelectIndex(event.index)
        }}
      >
        <pointsMaterial
          vertexColors
          size={0.038}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite
        />
      </points>

      {hoveredNode ? (
        <NodeMarker
          node={hoveredNode}
          color={speciesColorByKey.get(hoveredNode.species) ?? '#111111'}
          scale={0.05}
          opacity={0.65}
          wireOpacity={0.6}
        />
      ) : null}

      {selectedNode ? (
        <NodeMarker
          node={selectedNode}
          color={speciesColorByKey.get(selectedNode.species) ?? '#111111'}
          scale={0.06}
          opacity={0.92}
          wireOpacity={0.9}
        />
      ) : null}
    </group>
  )
}

function NodeMarker({ node, color, scale, opacity, wireOpacity }) {
  const p = node.displayPosition ?? node.position
  return (
    <group position={[p?.x ?? 0, p?.y ?? 0, p?.z ?? 0]} rotation={[0.6, 0.6, 0]}>
      <mesh>
        <octahedronGeometry args={[scale, 0]} />
        <meshBasicMaterial color="#111111" wireframe transparent opacity={wireOpacity} />
      </mesh>
      <mesh>
        <sphereGeometry args={[scale * 0.3, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </group>
  )
}
