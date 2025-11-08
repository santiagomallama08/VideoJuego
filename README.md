🎮 Proyecto Final Integrado – UCC
“Video Juego”

Ingeniería de Software – Universidad Cooperativa de Colombia
Asignaturas: Programación Orientada a Entornos Multimedia + Ingeniería Web

🧩 Descripción general

 videojuego interactivo en 3D desarrollado con React + Three.js + MongoDB + Blender, que simula una aventura urbana donde el jugador controla un personaje robótico que debe recolectar monedas, evitar enemigos y activar portales para avanzar entre diferentes niveles.

El proyecto combina entornos multimedia tridimensionales, lógica de backend segura con JWT, física realista (Cannon-es), efectos visuales dinámicos y mecánicas interactivas desarrolladas bajo un patrón de arquitectura modular (“Experience”).

⚙️ Estructura general del repositorio
VIDEOJUEGO/
├── backend/              # API REST + JWT + MongoDB + controladores
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── blockController.js
│   ├── models/
│   ├── routes/
│   ├── data/
│   ├── app.js
│   ├── seed.js
│   ├── package.json
│   └── README.md
│
├── game-project/         # Frontend 3D (React + Vite + Three.js)
│   ├── public/
│   │   ├── models/       # Escenarios GLB exportados desde Blender
│   │   ├── data/toy_car_blocks.json
│   │   ├── textures/
│   └── src/
│       ├── Experience/   # Núcleo del motor del juego
│       ├── World/        # Lógica de niveles, enemigos y físicas
│       ├── loaders/      # ToyCarLoader, Prize, Floor, etc.
│       ├── controls/     # HUD, teclado, cámara, modal
│       └── App.jsx / main.jsx
│
├── package.json
└── README.md

🌐 Tecnologías empleadas
Frontend

React 19 + Vite

Three.js (renderizado 3D)

Cannon-es (motor de física)

Howler.js (efectos de sonido)

GSAP / Tween (animaciones suaves)

Socket.io Client (multijugador – opcional)

Backend

Node.js + Express.js

MongoDB (Atlas o local)

Mongoose ODM

JSON Web Token (JWT)

CORS + dotenv + bcrypt

Modelado 3D

Blender 3.6+



Exportación: formato .glb con coordenadas adaptadas para Three.js

🧮 Variables de entorno
backend/.env
MONGO_URI=mongodb://127.0.0.1:27017/toycar_blocks
PORT=3001
JWT_SECRET=ucc2025

game-project/.env
VITE_API_URL=http://localhost:3001
VITE_BACKEND_URL=http://localhost:3001
VITE_ENEMIES_COUNT=1

🧠 Características principales del videojuego
🎮 Jugabilidad

Control total del personaje con teclado (movimiento, dirección, interacción).

Monedas coleccionables con animación rotatoria y efecto de desaparición.

Portales activos tras completar todos los objetivos.

Niveles conectados (1 → 2 → 3) con transiciones animadas.

Modal de derrota cuando el enemigo atrapa al jugador.

👾 Enemigo 

Persigue dinámicamente al jugador usando vectores de dirección.

Velocidad adaptable por nivel (0.3, 0.5, 0.8).

Reinicia animaciones correctamente tras la derrota.

Incluye detección y reencuentro post-reinicio del nivel.

💰 Sistema de recompensas

Monedas (Prize.js) con roles “default” y “finalPrize”.

Cuentan puntos totales globales en HUD.

No alteran la física del jugador (mantienen fluidez de movimiento).

🌍 Mundo dinámico (World.js)

Carga de niveles desde backend o desde JSON local.

Integración directa con ToyCarLoader.js.

Reaparición controlada de robot y enemigos.

Filtro por niveles (level 1, 2, 3).

🚪 Portales y transiciones

Activación visual con luces dinámicas.

Teletransporte fluido entre niveles.

Efecto vórtice (animación matemática y partículas).

🧾 HUD – Interfaz circular (CircularMenu.js)

Indicador de nivel actual y puntaje total.

Botones para pausar, salir o reiniciar.

Interfaz adaptativa y estilizada en CSS3.

🔐 Autenticación (JWT)

Registro e inicio de sesión con authController.js.

Cifrado de contraseñas con bcrypt.

Token persistente en sesión (almacenado localmente).

Validación previa antes de acceder al juego.

🏙️ Niveles del juego
Nivel	Descripción	Enemigos	Monedas	Portal	Dificultad
1	Ciudad urbana (tutorial básico)	1	10	Sí	🟢 Fácil
2	Suburbio industrial	3	12	Sí	🟡 Media
3	Zona avanzada	5	15	Sí	🔴 Difícil

Todos los niveles fueron modelados en Blender y exportados a GLB usando un script personalizado que genera toy_car_blocks.json con las coordenadas compatibles con Three.js.

🔧 Instalación
# Clonar el proyecto
git clone https://github.com/santiagomallama08/VideoJuego.git
cd videjuego

# Backend
cd backend
npm install
node app.js

# Frontend
cd ../game-project
npm install
npm run dev

🚀 Despliegue

Frontend: desplegado en Vercel


En caso de no tener conexión al backend, el juego funciona en modo local, leyendo toy_car_blocks.json.

🧱 API REST

Base: http://localhost:3001/api

Método	Endpoint	Descripción
GET	/blocks?level=1	Obtiene los bloques por nivel
POST	/blocks	Inserta un nuevo bloque
POST	/blocks/batch	Inserta varios bloques
POST	/auth/register	Registro de usuario
POST	/auth/login	Login y entrega de JWT
GET	/blocks/ping	Healthcheck del servidor
🔊 Audio y efectos

WalkSound → reproduce pasos del robot mientras camina.

LoseSound → al ser atrapado por un enemigo.

CollectSound → al recoger monedas.

PortalSound → al activar teletransporte.

🧠 Scripts importantes
Blender export script

Convierte automáticamente coordenadas de Blender a Three.js y exporta los bloques en JSON:

x -> x
y -> z
z -> -y


Guarda archivos .glb individuales y genera toy_car_blocks.json con roles, niveles y posiciones.

🧩 Funcionalidades implementadas

✅ Tres niveles totalmente funcionales
✅ Monedas con rotación animada y efectos
✅ Sistema de puntos y HUD dinámico
✅ Teletransporte entre niveles con vórtice
✅ Enemigos activos por nivel con IA real
✅ Reinicio de nivel sin errores visuales ni de animación
✅ Backend funcional con JWT
✅ Modo local y conectado
✅ Publicación completa (Vercel + Railway)

🧠 Problemas resueltos

🐞 Corrección del bug del enemigo en T-Pose tras reinicio.

🧱 Sincronización de físicas al reiniciar el nivel.

🏃 Prevención de pérdida de velocidad al recoger monedas.

👾 Ajuste de velocidad del enemigo por nivel.

🌍 Corrección del spawn y altura del piso en nivel 3.

📸 Evidencias visuales

Incluye capturas de:

HUD mostrando puntaje y nivel.

Portales activos.

Enemigo persiguiendo correctamente al jugador.

Login con JWT.

Transición completa entre niveles.

🧑‍💻 Autores

Santiago Mallama
Estudiante de Ingeniería de Software – Universidad Cooperativa de Colombia
GitHub: santiagomallama08

Uso académico. Proyecto desarrollado como entrega integradora de fin de ciclo.
© Universidad Cooperativa de Colombia – 2025