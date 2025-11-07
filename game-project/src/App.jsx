import { useEffect, useRef, useState } from "react";
import Experience, {clearHUD} from "./Experience/Experience";
import "./styles/loader.css";
import "./styles/auth.css";

const App = () => {
  const canvasRef = useRef();
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
      setLoading(true);
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && canvasRef.current) {
      const experience = new Experience(canvasRef.current);
      window.currentExperience = experience;

      const handleProgress = (e) => setProgress(e.detail);
      const handleComplete = () => setLoading(false);

      window.addEventListener("resource-progress", handleProgress);
      window.addEventListener("resource-complete", handleComplete);

      return () => {
        window.removeEventListener("resource-progress", handleProgress);
        window.removeEventListener("resource-complete", handleComplete);
      };
    }
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const res = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      // ✅ Ajuste: acceder correctamente al token
      const token = data.token || data.user?.token;

      if (token) {
        localStorage.setItem("token", token);
        setMessage("✅ Bienvenido al juego");
        setIsAuthenticated(true);
        setLoading(true);
      } else {
        setMessage("⚠️ No se recibió token del servidor");
      }
    } else {
      setMessage("❌ " + data.message);
    }
  } catch {
    setMessage("⚠️ Error al conectar con el servidor");
  }
};


  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Registro exitoso, ahora puedes iniciar sesión.");
        setIsRegistering(false);
      } else {
        setMessage("❌ " + data.message);
      }
    } catch {
      setMessage("⚠️ Error al conectar con el servidor");
    }
  };

  const handleLogout = () => {
    if (window.currentExperience) {
      window.currentExperience.destroy();
      window.currentExperience = null;
    }

    // 🔹 Limpieza global del HUD
    clearHUD();

    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setMessage("");
  };

  return (
    <>
      {!isAuthenticated ? (
        <div className="auth-container">
          {isRegistering ? (
            <>
              <h2>🧩 Registro</h2>
              <form onSubmit={handleRegister}>
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="submit">Registrarme</button>
              </form>
              <p>
                ¿Ya tienes cuenta?{" "}
                <a href="#" onClick={() => setIsRegistering(false)}>
                  Inicia sesión
                </a>
              </p>
            </>
          ) : (
            <>
              <h2>🎮 Iniciar Sesión</h2>
              <form onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="submit">Entrar al juego</button>
              </form>
              <p>
                ¿No tienes cuenta?{" "}
                <a href="#" onClick={() => setIsRegistering(true)}>
                  Regístrate aquí
                </a>
              </p>
            </>
          )}
          {message && <p className="message">{message}</p>}
        </div>
      ) : (
        <>
          {loading && (
            <div id="loader-overlay">
              <div id="loader-bar" style={{ width: `${progress}%` }}></div>
              <div id="loader-text">Cargando... {progress}%</div>
            </div>
          )}
          <canvas ref={canvasRef} className="webgl" />
          <button
            style={{
              position: "absolute",
              bottom: "20px",
              left: "20px",
              backgroundColor: "#ff4d4d",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              boxShadow: "0 0 10px rgba(0,0,0,0.3)",
              zIndex: 10,
            }}
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </>
      )}
    </>
  );
};

export default App;
