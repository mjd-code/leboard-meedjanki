import React, { useRef } from 'react';
import { SlideLayout } from '@/components/slides/SlideLayout';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Float, MeshDistortMaterial, Environment, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';
function AnimatedTorus() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(state => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      meshRef.current.rotation.y += 0.005;
    }
  });
  return <mesh ref={meshRef} position={[0, 0, 0]}>
      <torusKnotGeometry args={[1, 0.35, 128, 32]} />
      <MeshDistortMaterial color="#4E93FF" roughness={0.2} metalness={0.8} distort={0.2} speed={2} />
    </mesh>;
}
function FloatingCubes() {
  const colors = ['#4E93FF', '#6BABFF', '#3A7FE8', '#2D6FD4'];
  return <>
      {colors.map((color, i) => {
      const angle = i / colors.length * Math.PI * 2;
      const radius = 2.5;
      return <Float key={i} speed={2} rotationIntensity={1} floatIntensity={2} position={[Math.cos(angle) * radius, Math.sin(i * 0.5) * 0.5, Math.sin(angle) * radius]}>
            <RoundedBox args={[0.4, 0.4, 0.4]} radius={0.08} smoothness={4}>
              <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
            </RoundedBox>
          </Float>;
    })}
    </>;
}
function Scene() {
  return <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
       <directionalLight position={[-10, -10, -5]} intensity={0.3} color="#4E93FF" />
       <pointLight position={[0, 5, 0]} intensity={0.5} color="#6BABFF" />
      
      <AnimatedTorus />
      <FloatingCubes />
      
      <Environment preset="city" />
      
      <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} autoRotate autoRotateSpeed={0.5} />
    </>;
}
export default function Slide03Interactive3D() {
  return <SlideLayout variant="default">
      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <div className="absolute top-16 left-20 z-10">
          <p className="text-[#4E93FF] text-sm font-semibold uppercase tracking-widest mb-2">
            3D Interactive
          </p>
          <h2 className="text-4xl font-bold text-slate-900 mb-2">3D Simulations</h2>
          <p className="text-lg text-slate-500 font-light">
            Click and drag to orbit around the 3D object
          </p>
        </div>

        {/* 3D Canvas - use offsetSize to ignore CSS transforms */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto" style={{
          width: 800,
          height: 600
        }}>
            <Canvas camera={{
            position: [0, 0, 6],
            fov: 45
          }} gl={{
            antialias: true,
            alpha: true
          }} dpr={1} style={{
            background: 'transparent'
          }} resize={{
            scroll: false,
            offsetSize: true
          }}>
              <Scene />
            </Canvas>
          </div>
        </div>

        {/* Hint at bottom */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center z-10">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <span className="text-sm text-slate-600">Click + Drag</span>
            </div>
            <div className="w-px h-4 bg-slate-300" />
            <span className="text-sm text-slate-500">to rotate view</span>
          </div>
        </div>
      </div>
    </SlideLayout>;
}