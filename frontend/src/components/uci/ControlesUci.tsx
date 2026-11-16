import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils } from 'three';

const teclasMovimiento = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
]);

export function ControlesUci() {
  const { camera, gl } = useThree();
  const teclas = useRef(new Set<string>());

  useEffect(() => {
    const canvas = gl.domElement;
    let puntero: { id: number; x: number; y: number } | undefined;

    const enfocar = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || gl.xr.isPresenting) return;
      canvas.focus({ preventScroll: true });
      puntero = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };

    const mirar = (event: PointerEvent) => {
      if (!puntero || event.pointerId !== puntero.id || gl.xr.isPresenting) return;
      const dx = event.clientX - puntero.x;
      const dy = event.clientY - puntero.y;
      puntero = { id: event.pointerId, x: event.clientX, y: event.clientY };
      camera.rotation.set(
        MathUtils.clamp(camera.rotation.x - dy * 0.004, -1.2, 1.2),
        camera.rotation.y - dx * 0.004,
        0,
        'YXZ'
      );
    };

    const soltar = (event: PointerEvent) => {
      if (event.pointerId === puntero?.id) puntero = undefined;
    };

    const presionarTecla = (event: KeyboardEvent) => {
      if (!teclasMovimiento.has(event.code)) return;
      event.preventDefault();
      teclas.current.add(event.code);
    };

    const soltarTecla = (event: KeyboardEvent) => teclas.current.delete(event.code);
    const limpiar = () => {
      teclas.current.clear();
      puntero = undefined;
    };

    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute(
      'aria-label',
      'Recorrido 3D de la UCI. Usa WASD o las flechas para moverte.'
    );
    canvas.style.setProperty('touch-action', 'none');
    canvas.addEventListener('pointerdown', enfocar);
    window.addEventListener('pointermove', mirar);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    canvas.addEventListener('keydown', presionarTecla);
    window.addEventListener('keyup', soltarTecla);
    canvas.addEventListener('blur', limpiar);
    window.addEventListener('blur', limpiar);
    return () => {
      limpiar();
      canvas.removeEventListener('pointerdown', enfocar);
      window.removeEventListener('pointermove', mirar);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      canvas.removeEventListener('keydown', presionarTecla);
      window.removeEventListener('keyup', soltarTecla);
      canvas.removeEventListener('blur', limpiar);
      window.removeEventListener('blur', limpiar);
    };
  }, [camera, gl]);

  useFrame(({ camera, gl }, delta) => {
    if (gl.xr.isPresenting || teclas.current.size === 0) return;

    const adelante = Number(teclas.current.has('KeyW') || teclas.current.has('ArrowUp'));
    const atras = Number(teclas.current.has('KeyS') || teclas.current.has('ArrowDown'));
    const derecha = Number(teclas.current.has('KeyD') || teclas.current.has('ArrowRight'));
    const izquierda = Number(teclas.current.has('KeyA') || teclas.current.has('ArrowLeft'));
    const avance = adelante - atras;
    const lateral = derecha - izquierda;
    const paso = (2.2 * Math.min(delta, 0.05)) / Math.max(1, Math.hypot(avance, lateral));
    const seno = Math.sin(camera.rotation.y);
    const coseno = Math.cos(camera.rotation.y);

    camera.position.set(
      MathUtils.clamp(camera.position.x + paso * (lateral * coseno - avance * seno), -3.5, 3.5),
      camera.position.y,
      MathUtils.clamp(camera.position.z - paso * (lateral * seno + avance * coseno), -3.35, 3.55)
    );
  });

  return null;
}
