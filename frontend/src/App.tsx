import { useState } from "react";
import "./App.css";

function App() {
  const [pacientesAtendidos, setPacientesAtendidos] = useState(12);

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: "800px",
        margin: "40px auto",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <header
        style={{
          background: "#2563eb",
          color: "white",
          padding: "20px",
          borderRadius: "10px",
        }}
      >
        <h1>🏥 MediSync Perú</h1>
        <p>Plataforma Digital de Gestión Hospitalaria y Pre-Triaje</p>
      </header>

      <main
        style={{
          marginTop: "30px",
          padding: "20px",
          background: "#f8fafc",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
        }}
      >
        <h2>Panel de Control - Staging</h2>
        <p style={{ color: "#16a34a", fontWeight: "bold" }}>
          ● Sistema Operativo y Conectado al Pipeline CI/CD
        </p>

        <div
          style={{
            margin: "20px 0",
            padding: "15px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <p>
            Pacientes en cola de pre-triaje (IA):{" "}
            <strong>{pacientesAtendidos}</strong>
          </p>
          <button
            onClick={() => setPacientesAtendidos((prev) => prev + 1)}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "10px 15px",
              borderRadius: "5px",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            Simular Ingreso de Paciente
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
