type Coordenadas = [number, number, number];

function Elipsoide({
  posicion,
  escala,
  color,
}: {
  posicion: Coordenadas;
  escala: Coordenadas;
  color: string;
}) {
  return (
    <mesh position={posicion} scale={escala}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Extremidad({
  posicion,
  radio,
  largo,
  color,
  giro = 0,
}: {
  posicion: Coordenadas;
  radio: number;
  largo: number;
  color: string;
  giro?: number;
}) {
  return (
    <mesh position={posicion} rotation={[0, 0, giro]}>
      <capsuleGeometry args={[radio, largo, 4, 12]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Rostro({
  piel,
  cabello,
  cubrebocas,
}: {
  piel: string;
  cabello: string;
  cubrebocas?: string;
}) {
  return (
    <>
      <Elipsoide posicion={[0, 0, 0]} escala={[0.103, 0.134, 0.095]} color={piel} />
      <Elipsoide posicion={[0, 0.078, -0.02]} escala={[0.108, 0.072, 0.092]} color={cabello} />
      {[-1, 1].map((lado) => (
        <group key={lado} position={[lado * 0.041, 0.026, 0.086]}>
          <Elipsoide posicion={[0, 0, 0]} escala={[0.014, 0.009, 0.007]} color="#332720" />
        </group>
      ))}
      {cubrebocas ? (
        <Elipsoide
          posicion={[0, -0.038, 0.065]}
          escala={[0.089, 0.061, 0.044]}
          color={cubrebocas}
        />
      ) : (
        <Elipsoide posicion={[0, -0.008, 0.091]} escala={[0.018, 0.024, 0.02]} color={piel} />
      )}
    </>
  );
}

export function PacienteUci({ piel }: { piel: string }) {
  return (
    <group name="paciente-uci">
      <group position={[0, 0.925, -0.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <Rostro piel={piel} cabello="#40302b" />
      </group>
      <Elipsoide posicion={[0, 0.84, -0.46]} escala={[0.27, 0.105, 0.25]} color="#8cb8dc" />
      {[-1, 1].map((lado) => (
        <group key={lado} position={[lado * 0.24, 0.81, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <Extremidad posicion={[0, 0, 0]} radio={0.055} largo={0.26} color={piel} />
        </group>
      ))}
      <Elipsoide posicion={[0, 0.784, 0.44]} escala={[0.41, 0.105, 0.54]} color="#76aca7" />
    </group>
  );
}

export function PersonaDePie({
  rol,
  posicion,
  giro,
  piel,
  uniforme,
  personal = true,
}: {
  rol: string;
  posicion: Coordenadas;
  giro: number;
  piel: string;
  uniforme: string;
  personal?: boolean;
}) {
  return (
    <group name={rol} position={posicion} rotation={[0, giro, 0]}>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.64, 1]}>
        <circleGeometry args={[0.31, 24]} />
        <meshBasicMaterial color="#4a5a63" transparent opacity={0.21} depthWrite={false} />
      </mesh>
      {[-1, 1].map((lado) => (
        <group key={lado}>
          <Extremidad
            posicion={[lado * 0.096, 0.47, 0]}
            radio={0.085}
            largo={0.61}
            color={uniforme}
          />
          <Elipsoide
            posicion={[lado * 0.096, 0.075, 0.056]}
            escala={[0.081, 0.071, 0.147]}
            color="#22384a"
          />
          <Extremidad
            posicion={[lado * 0.23, 1.19, 0]}
            radio={0.074}
            largo={0.14}
            color={uniforme}
            giro={lado * 0.22}
          />
          <Extremidad
            posicion={[lado * 0.267, 0.98, 0.025]}
            radio={0.05}
            largo={0.2}
            color={piel}
            giro={lado * 0.1}
          />
        </group>
      ))}
      <Elipsoide posicion={[0, 1.105, 0]} escala={[0.23, 0.275, 0.14]} color={uniforme} />
      <Extremidad posicion={[0, 1.377, 0]} radio={0.065} largo={0.06} color={piel} />
      <group position={[0, 1.526, 0]}>
        <Rostro
          piel={piel}
          cabello={personal ? uniforme : '#40302b'}
          cubrebocas={personal ? '#d2eff0' : undefined}
        />
      </group>
      {personal && (
        <mesh position={[-0.105, 1.218, 0.127]} rotation={[-0.19, -0.16, 0.08]}>
          <boxGeometry args={[0.064, 0.09, 0.014]} />
          <meshStandardMaterial color="#e5f5f3" />
        </mesh>
      )}
    </group>
  );
}
