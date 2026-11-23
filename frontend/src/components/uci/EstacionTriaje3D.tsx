import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import { MathUtils, type Group } from 'three';
import { duracionLlegada } from '../../services/flujoTriajeUci';
import { LimiteEscena } from './LimiteEscena';
import { PersonaDePie } from './PersonasUci';

type Punto = [number, number, number];

function Bloque({
  posicion,
  dimensiones,
  color,
}: {
  posicion: Punto;
  dimensiones: Punto;
  color: string;
}) {
  return (
    <mesh position={posicion}>
      <boxGeometry args={dimensiones} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function PacienteEntrando({ ingreso, talla }: { ingreso: number; talla: number }) {
  const paciente = useRef<Group>(null);
  const movimientoReducido = useReducedMotion();
  const altura = talla / 167.6;

  useFrame(() => {
    if (!paciente.current) return;

    const transcurrido = Date.now() - ingreso;
    const avance = movimientoReducido ? 1 : MathUtils.smoothstep(transcurrido, 0, duracionLlegada);
    const paso = Math.sin(avance * Math.PI * 8) * (1 - avance);
    paciente.current.position.set(
      MathUtils.lerp(-2.08, -0.18, avance),
      0.025 * Math.abs(paso) + avance * 0.1,
      MathUtils.lerp(-1.75, 0.14, avance)
    );
    paciente.current.rotation.set(0, MathUtils.lerp(0.92, 0, avance), paso * 0.045);
  });

  return (
    <group ref={paciente} scale={altura} position={[-2.08, 0, -1.75]}>
      <PersonaDePie
        rol="paciente-en-recepcion"
        posicion={[0, 0, 0]}
        giro={0}
        piel="#d5a786"
        uniforme="#5c6394"
        personal={false}
      />
    </group>
  );
}

function SalaMedicion({
  ingreso,
  talla,
  capturada,
}: {
  ingreso: number | null;
  talla: number;
  capturada: boolean;
}) {
  return (
    <>
      <color attach="background" args={['#bfd1d8']} />
      <hemisphereLight args={['#f1fff8', '#6b8290', 2.4]} />
      <directionalLight position={[2, 5, 4]} intensity={2.4} color="#fff1dd" />
      <Bloque posicion={[0, -0.11, 0.95]} dimensiones={[10, 0.22, 7.2]} color="#92acb2" />
      <gridHelper
        args={[10, 24, '#79979e', '#a5bbbf']}
        position={[0, 0.003, 0.95]}
        scale={[1, 1, 0.72]}
      />
      <Bloque posicion={[0, 1.5, -2.47]} dimensiones={[10, 3, 0.18]} color="#d2e4df" />
      <Bloque posicion={[0, 0.33, -2.36]} dimensiones={[10, 0.66, 0.05]} color="#608f98" />
      <Bloque posicion={[-2.1, 1.12, -2.34]} dimensiones={[1.14, 2.24, 0.1]} color="#365461" />
      <Bloque posicion={[-2.1, 1.12, -2.28]} dimensiones={[0.92, 2.02, 0.03]} color="#557786" />
      <Bloque posicion={[-1.78, 1.05, -2.247]} dimensiones={[0.15, 0.035, 0.06]} color="#e6f5f5" />
      <Bloque posicion={[-0.18, 0.045, 0.14]} dimensiones={[0.82, 0.09, 0.74]} color="#264652" />
      <Bloque posicion={[-0.18, 0.091, 0.14]} dimensiones={[0.7, 0.02, 0.62]} color="#609793" />
      <Bloque posicion={[0.22, 1.04, -0.23]} dimensiones={[0.07, 2.08, 0.08]} color="#536d78" />
      <Bloque posicion={[0.22, 1.12, -0.185]} dimensiones={[0.034, 1.58, 0.02]} color="#e0efed" />
      {[0.56, 0.72, 0.88, 1.04, 1.2, 1.36, 1.52, 1.68, 1.84].map((altura) => (
        <Bloque
          key={altura}
          posicion={[0.22, altura, -0.174]}
          dimensiones={[0.052, 0.012, 0.008]}
          color="#35525b"
        />
      ))}
      <Bloque
        posicion={[0.05, talla / 100 + 0.1, -0.02]}
        dimensiones={[0.43, 0.035, 0.38]}
        color="#abc4c5"
      />
      <Bloque posicion={[0.54, 0.88, -0.27]} dimensiones={[0.08, 1.6, 0.1]} color="#536d78" />
      <Bloque posicion={[0.54, 1.59, -0.18]} dimensiones={[0.5, 0.31, 0.14]} color="#28414e" />
      <Bloque
        posicion={[0.54, 1.59, -0.102]}
        dimensiones={[0.42, 0.23, 0.02]}
        color={capturada ? '#2e9c85' : '#49636d'}
      />
      <PersonaDePie
        rol="personal-de-triaje"
        posicion={[1.46, 0, -0.45]}
        giro={-0.44}
        piel="#b67c5e"
        uniforme="#177c85"
      />
      {ingreso !== null && <PacienteEntrando key={ingreso} ingreso={ingreso} talla={talla} />}
    </>
  );
}

export default function EstacionTriaje3D({
  ingreso,
  talla = 174,
  capturada,
}: {
  ingreso: number | null;
  talla?: number;
  capturada: boolean;
}) {
  const alternativa = (
    <p className="grid h-full place-items-center px-4 text-center text-sm">
      Vista 3D no disponible.
    </p>
  );

  return (
    <div aria-hidden="true" className="h-64 bg-slate-200 sm:h-80 dark:bg-slate-800">
      <LimiteEscena alternativa={alternativa}>
        <Canvas
          camera={{ position: [2.25, 2.24, 4.95], fov: 41 }}
          dpr={[1, 1.5]}
          onCreated={({ camera }) => camera.lookAt(-0.25, 1, -0.45)}
          fallback={alternativa}
        >
          <SalaMedicion ingreso={ingreso} talla={talla} capturada={capturada} />
        </Canvas>
      </LimiteEscena>
    </div>
  );
}
