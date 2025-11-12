import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const [emailOrUser, setEmailOrUser] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (value) => /\S+@\S+\.\S+/.test(value);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!emailOrUser) return setErrorMsg("Por favor ingrese su usuario o correo.");
    if (emailOrUser.includes("@") && !validateEmail(emailOrUser)) {
      return setErrorMsg("El formato del correo no es válido.");
    }
    if (!password) return setErrorMsg("Debe ingresar su contraseña.");

    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: emailOrUser,
          password: password,
        }),
      });

      if (!res.ok) throw new Error("Usuario o contraseña incorrectos.");

      const data = await res.json();
      const { user, access, refresh } = data;

      login(user, { access, refresh });
      navigate("/app/dashboard");
    } catch (_) {
      setErrorMsg("Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  // Generar partículas una sola vez para evitar reiniciar animación en cada render
  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      width: `${8 + Math.random() * 12}px`,
      height: `${8 + Math.random() * 12}px`,
      animationDuration: `${6 + Math.random() * 8}s`,
      animationDelay: `${Math.random() * 6}s`,
    }));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-[#0a0f1f] text-white">
      <div className="particles-container fixed inset-0 pointer-events-none -z-10">
        {particles.map((s, i) => (
          <span
            key={i}
            className="particle"
            style={{
              top: s.top,
              left: s.left,
              width: s.width,
              height: s.height,
              animationDuration: s.animationDuration,
              animationDelay: s.animationDelay,
            }}
          />
        ))}
      </div>

      <div className="glass-card relative w-full max-w-md rounded-2xl p-8 z-10">
        <h1 className="text-center text-3xl font-bold text-indigo-400 drop-shadow">
          FerreDash
        </h1>
        <p className="text-center text-indigo-300/80 mb-6">
          Sistema Inteligente de Gestión
        </p>

        {errorMsg && (
          <div className="mb-4 text-sm text-red-300 text-center bg-red-500/20 border border-red-400/30 px-4 py-2 rounded-lg">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className={`w-full bg-[#0f172a] border ${
              emailOrUser.includes("@") && !validateEmail(emailOrUser)
                ? "border-red-500"
                : "border-white/20"
            } rounded-lg px-4 py-2 text-white focus:ring-2 ring-indigo-500`}
            placeholder="Usuario o correo"
            value={emailOrUser}
            onChange={(e) => setEmailOrUser(e.target.value)}
          />

          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              className="w-full bg-[#0f172a] border border-white/20 rounded-lg px-4 py-2 text-white focus:ring-2 ring-indigo-500"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-2.5 cursor-pointer text-white hover:text-indigo-400 transition"
            >
              {showPass ? "🙈" : "👁️"}
            </span>
          </div>

          <button
            disabled={loading}
            className={`w-full rounded-lg bg-indigo-600 text-white py-2 transition font-semibold shadow-md hover:shadow-indigo-500/50 ${
              loading ? "opacity-60 cursor-not-allowed" : "hover:bg-indigo-500"
            }`}
            aria-busy={loading}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link to="/forgot" className="text-sm text-indigo-300 hover:text-indigo-100">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
    </div>
  );
}
