import { useLayoutEffect, useRef, useState } from 'react';
import { SRGBColorSpace, type CanvasTexture } from 'three';

export type SeleccionUci = 'cama' | 'monitor';

export interface PantallaUci {
  estado: string;
  hora: string;
  metricas: { nombre: string; valor: string; unidad: string }[];
}

type Coordenadas = [number, number, number];

function Bloque({
  posicion,
  tamano,
  color,
}: {
  posicion: Coordenadas;
  tamano: Coordenadas;
  color: string;
}) {
  return (
    <mesh position={posicion}>
      <boxGeometry args={tamano} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Habitacion() {
  return (
    <>
      <color attach="background" args={['#afc8cd']} />
      <hemisphereLight args={['#f1fffa', '#60737c', 2.3]} />
      <directionalLight position={[1, 5, 3]} color="#fff3dd" intensity={2.6} />
      <Bloque posicion={[0, -0.1, 0]} tamano={[8, 0.2, 8]} color="#8fa6ae" />
      <gridHelper args={[8, 16, '#91a8ac', '#9cb2b7']} position={[0, 0.003, 0]} />
      <Bloque posicion={[0, 1.6, -4]} tamano={[8, 3.2, 0.18]} color="#cbdad8" />
      <Bloque posicion={[-4, 1.6, 0]} tamano={[0.18, 3.2, 8]} color="#b8ced1" />
      <Bloque posicion={[4, 1.6, 0]} tamano={[0.18, 3.2, 8]} color="#d6e2df" />
      <Bloque posicion={[0, 1.6, 4]} tamano={[8, 3.2, 0.18]} color="#b8ced1" />
      <Bloque posicion={[0, 3.23, 0]} tamano={[8, 0.12, 8]} color="#dce8e4" />
      <Bloque posicion={[0, 3.15, -2.65]} tamano={[3.35, 0.05, 0.27]} color="#f5fff9" />
      <Bloque posicion={[0, 0.3, -3.89]} tamano={[8, 0.6, 0.06]} color="#5d9196" />
      <Bloque posicion={[-3.89, 0.3, 0]} tamano={[0.06, 0.6, 8]} color="#5d9196" />
      <Bloque posicion={[3.89, 0.3, 0]} tamano={[0.06, 0.6, 8]} color="#5d9196" />
      <Bloque posicion={[0, 2.94, -3.85]} tamano={[7.5, 0.05, 0.12]} color="#f5fff9" />
      <Bloque posicion={[-1.57, 2.1, -3.85]} tamano={[2.3, 1.35, 0.09]} color="#345561" />
      <Bloque posicion={[-1.57, 2.1, -3.78]} tamano={[2.14, 1.19, 0.06]} color="#95cbd1" />
      <Bloque posicion={[-1.57, 2.1, -3.73]} tamano={[0.035, 1.25, 0.03]} color="#52757d" />
      <Bloque posicion={[-1.57, 1.48, -3.68]} tamano={[2.45, 0.07, 0.29]} color="#edf5ec" />
      <Bloque posicion={[3.3, 0.52, -3.48]} tamano={[0.95, 1.04, 0.7]} color="#8ea5a9" />
      <Bloque posicion={[3.3, 1.05, -3.48]} tamano={[1.03, 0.09, 0.76]} color="#e1edeb" />
      <Bloque posicion={[3.3, 0.75, -3.11]} tamano={[0.24, 0.035, 0.045]} color="#425e65" />
      <Bloque posicion={[3.3, 0.36, -3.11]} tamano={[0.24, 0.035, 0.045]} color="#425e65" />
    </>
  );
}

function Cama({
  seleccionada,
  onSeleccionar,
}: {
  seleccionada: boolean;
  onSeleccionar: () => void;
}) {
  const color = seleccionada ? '#17bca6' : '#427683';

  return (
    <group
      name="cama-04"
      position={[-1.28, 0, -1.44]}
      onClick={(event) => {
        event.stopPropagation();
        onSeleccionar();
      }}
    >
      <Bloque posicion={[0, 0.009, 0]} tamano={[1.58, 0.012, 2.76]} color={color} />
      <Bloque posicion={[0, 0.02, 0]} tamano={[1.51, 0.012, 2.69]} color="#92aab0" />
      <Bloque posicion={[0, 0.25, 0]} tamano={[1.02, 0.14, 1.75]} color="#536b76" />
      <Bloque posicion={[0, 0.49, 0]} tamano={[1.25, 0.16, 2.37]} color={color} />
      <Bloque posicion={[0, 0.63, 0]} tamano={[1.17, 0.19, 2.23]} color="#f3faf1" />
      <Bloque posicion={[0, 0.75, 0.52]} tamano={[1.19, 0.09, 1.21]} color="#76aca7" />
      <Bloque posicion={[0, 0.77, -0.77]} tamano={[0.73, 0.14, 0.35]} color="#ffffef" />
      <Bloque posicion={[0, 0.65, -1.24]} tamano={[1.28, 0.93, 0.1]} color={color} />
      <Bloque posicion={[0, 0.54, 1.23]} tamano={[1.28, 0.67, 0.1]} color={color} />
      <Bloque posicion={[-0.68, 0.8, -0.13]} tamano={[0.06, 0.3, 1.29]} color="#d7e2de" />
      <Bloque posicion={[0.68, 0.8, -0.13]} tamano={[0.06, 0.3, 1.29]} color="#d7e2de" />
    </group>
  );
}

function PantallaMonitor({ abierta, pantalla }: { abierta: boolean; pantalla: PantallaUci }) {
  const textura = useRef<CanvasTexture>(null);
  const [canvas] = useState(() => {
    const superficie = document.createElement('canvas');
    superficie.width = 960;
    superficie.height = 560;
    return superficie;
  });

  useLayoutEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#091a23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#15404a';
    ctx.fillRect(0, 0, canvas.width, 108);
    ctx.fillStyle = '#d9faf4';
    ctx.font = 'bold 47px sans-serif';
    ctx.fillText('CAMA 04  /  MONITOR', 48, 73);

    if (abierta) {
      pantalla.metricas.forEach(({ nombre, valor, unidad }, indice) => {
        const y = 195 + indice * 100;
        ctx.fillStyle = '#b3d9da';
        ctx.font = '36px sans-serif';
        ctx.fillText(nombre, 50, y);
        ctx.fillStyle = '#8af8d7';
        ctx.font = 'bold 49px sans-serif';
        ctx.fillText(`${valor} ${unidad}`, 530, y);
      });
      ctx.fillStyle = '#bed2d4';
      ctx.font = '29px sans-serif';
      ctx.fillText(
        `${pantalla.estado}${pantalla.hora ? `  ·  ${pantalla.hora}` : ''}`,
        50,
        485,
        860
      );
    } else {
      ctx.fillStyle = '#8af8d7';
      ctx.font = 'bold 60px sans-serif';
      ctx.fillText('Abrir monitor', 50, 320);
    }

    if (textura.current) textura.current.needsUpdate = true;
  }, [abierta, canvas, pantalla]);

  return (
    <mesh position={[0, 1.68, 0.13]}>
      <planeGeometry args={[1.8, 1.05]} />
      <meshBasicMaterial toneMapped={false}>
        <canvasTexture ref={textura} attach="map" args={[canvas]} colorSpace={SRGBColorSpace} />
      </meshBasicMaterial>
    </mesh>
  );
}

export function EscenaUci({
  seleccion,
  pantalla,
  onSeleccionar,
}: {
  seleccion: SeleccionUci | null;
  pantalla: PantallaUci;
  onSeleccionar: (seleccion: SeleccionUci) => void;
}) {
  return (
    <>
      <Habitacion />
      <Cama seleccionada={seleccion !== null} onSeleccionar={() => onSeleccionar('cama')} />
      <group
        name="monitor-04"
        position={[1.19, 0, -2.61]}
        rotation={[0, -0.15, 0]}
        onClick={(event) => {
          event.stopPropagation();
          onSeleccionar('monitor');
        }}
      >
        <Bloque posicion={[0, 0.07, 0]} tamano={[0.96, 0.14, 0.62]} color="#344b56" />
        <Bloque posicion={[0, 0.74, 0]} tamano={[0.18, 1.35, 0.2]} color="#455e69" />
        <Bloque
          posicion={[0, 1.68, 0]}
          tamano={[1.95, 1.2, 0.25]}
          color={seleccion === 'monitor' ? '#1d9d90' : '#293e4a'}
        />
        <PantallaMonitor abierta={seleccion === 'monitor'} pantalla={pantalla} />
      </group>
    </>
  );
}
