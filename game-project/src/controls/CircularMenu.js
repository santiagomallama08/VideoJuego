import gsap from 'gsap'

export default class CircularMenu {
  constructor({ container, vrIntegration, onAudioToggle, onWalkMode, onFullscreen, onCancelGame }) {
    this.container = container
    this.vrIntegration = vrIntegration
    this.isOpen = false
    this.actionButtons = []

    // ==========================
    //  BOTÓN FLOTANTE PRINCIPAL
    // ==========================
    const baseStyle = `
      position: fixed;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #00fff7, #005b73);
      color: #001014;
      font-size: 20px;
      border: 2px solid rgba(0, 255, 247, 0.75);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 12px #00fff7, 0 0 40px rgba(0,255,247,0.7);
      backdrop-filter: blur(6px);
      z-index: 9999;
      transition: all 0.25s ease;
    `

    const hoverStyle = `
      transform: scale(1.1) translateY(-2px);
      box-shadow: 0 0 18px #00fff7, 0 0 50px rgba(0,255,247,0.9);
    `

    this.toggleButton = document.createElement('button')
    this.toggleButton.innerText = '⚙️'
    this.toggleButton.title = 'Mostrar menú'
    this.toggleButton.setAttribute('aria-label', 'Mostrar menú')
    this.toggleButton.style.cssText = baseStyle + 'bottom: 32px; right: 32px;'
    container.appendChild(this.toggleButton)
    this.toggleButton.style.display = 'none'

    this.toggleButton.addEventListener('mouseenter', () => {
      this.toggleButton.style.cssText = baseStyle + 'bottom: 32px; right: 32px;' + hoverStyle
    })

    this.toggleButton.addEventListener('mouseleave', () => {
      this.toggleButton.style.cssText = baseStyle + 'bottom: 32px; right: 32px;'
    })

    this.toggleButton.addEventListener('click', () => this.toggleMenu())

    // ==========================
    //   BOTONES DEL MENÚ
    // ==========================
    const actions = [
      { icon: '🔊', title: 'Audio', onClick: onAudioToggle },
      { icon: '🚶', title: 'Modo Caminata', onClick: onWalkMode },
      { icon: '🖥️', title: 'Pantalla Completa', onClick: onFullscreen },
      { icon: '🥽', title: 'Modo VR', onClick: () => this.vrIntegration.toggleVR() },
      { icon: '👨‍💻', title: 'Acerca de', onClick: () => this.showAboutModal() },
      { icon: '❌', title: 'Cancelar Juego', onClick: onCancelGame }
    ]

    actions.forEach((action, index) => {
      const btn = document.createElement('button')
      btn.innerText = action.icon
      btn.title = action.title
      btn.setAttribute('aria-label', action.title)

      Object.assign(btn.style, {
        position: 'fixed',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: 'rgba(0, 15, 25, 0.9)',
        color: '#00fff7',
        fontSize: '20px',
        border: '1px solid rgba(0, 255, 247, 0.6)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 10px #00fff7',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        bottom: `${96 + index * 56}px`,
        right: '34px',
        opacity: '0',
        pointerEvents: 'none',
        transform: 'translateY(10px)'
      })

      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.08) translateY(0px)'
        btn.style.boxShadow = '0 0 16px #00fff7, 0 0 32px rgba(0,255,247,0.9)'
        btn.style.background = 'rgba(0, 40, 60, 0.95)'
      })

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0px)'
        btn.style.boxShadow = '0 0 10px #00fff7'
        btn.style.background = 'rgba(0, 15, 25, 0.9)'
      })

      btn.addEventListener('click', () => {
        action.onClick()
        this.toggleMenu()
      })

      this.container.appendChild(btn)
      this.actionButtons.push(btn)
    })

    // ==========================
    //        HUD SUPERIOR
    // ==========================
    this.hudContainer = document.createElement('div')
    Object.assign(this.hudContainer.style, {
      position: 'fixed',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      zIndex: 9998,
      pointerEvents: 'none'
    })
    document.body.appendChild(this.hudContainer)

    // Helper para crear paneles del HUD
    const createHudPanel = (emoji, text) => {
      const wrapper = document.createElement('div')
      Object.assign(wrapper.style, {
        display: 'flex',
        alignItems: 'center',
        padding: '6px 14px',
        borderRadius: '999px',
        background: 'linear-gradient(135deg, rgba(0,15,30,0.9), rgba(0,80,110,0.9))',
        border: '1px solid rgba(0,255,247,0.7)',
        boxShadow: '0 0 12px rgba(0,255,247,0.7)',
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#e5faff',
        pointerEvents: 'none',
        minWidth: '130px',
        justifyContent: 'center'
      })

      const iconSpan = document.createElement('span')
      iconSpan.textContent = emoji
      Object.assign(iconSpan.style, {
        marginRight: '8px',
        textShadow: '0 0 6px #00fff7'
      })

      const textSpan = document.createElement('span')
      textSpan.textContent = text

      wrapper.appendChild(iconSpan)
      wrapper.appendChild(textSpan)

      this.hudContainer.appendChild(wrapper)

      return textSpan
    }


    // ⏱ Tiempo (mm:ss)
    this.timerLabel = createHudPanel('⏱', '00:00')

    // 👥 Jugadores
    this.playersLabel = createHudPanel('👥', 'Jugadores: 1')

    // 🎖️ Puntos
    this.statusLabel = createHudPanel('🎖️', 'Puntos: 0')
  }

  // ========= SOBRE MÍ =========
  showAboutModal() {
    if (this.aboutContainer) return

    this.aboutContainer = document.createElement('div')
    Object.assign(this.aboutContainer.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0, 0, 0, 0.96)',
      padding: '20px',
      borderRadius: '12px',
      color: '#fff',
      zIndex: 10000,
      textAlign: 'center',
      fontFamily: 'sans-serif',
      maxWidth: '320px',
      boxShadow: '0 0 22px #00fff7'
    })

    this.aboutContainer.innerHTML = `
      <h2 style="margin-bottom: 10px;">👨‍💻 Desarrollador</h2>
      <p style="margin: 0;">Gustavo Sánchez Rodríguez</p>
      <p style="margin: 0; font-size: 14px;">Universidad Cooperativa de Colombia</p>
      <p style="margin: 10px 0 0; font-size: 13px;">Videojuego 3D con React + Three.js</p>
      <p style="margin: 6px 0 0; font-size: 13px;">Integración con física, HUD y niveles.</p>
      <p style="margin: 10px 0 0; font-size: 13px;">guswillsan@gmail.com</p>
      <button style="
        margin-top: 12px;
        padding: 6px 14px;
        font-size: 14px;
        background: #00fff7;
        color: black;
        border: none;
        border-radius: 6px;
        cursor: pointer;
      ">Cerrar</button>
    `

    const closeBtn = this.aboutContainer.querySelector('button')
    closeBtn.onclick = () => {
      this.aboutContainer.remove()
      this.aboutContainer = null
    }

    document.body.appendChild(this.aboutContainer)
  }

  // ========= MENÚ DESPLEGABLE =========
  toggleMenu() {
    this.isOpen = !this.isOpen

    this.actionButtons.forEach((btn, index) => {
      const delay = index * 0.05
      if (this.isOpen) {
        gsap.to(btn, {
          opacity: 1,
          y: 0,
          pointerEvents: 'auto',
          delay,
          duration: 0.25,
          ease: 'power2.out'
        })
      } else {
        gsap.to(btn, {
          opacity: 0,
          y: 10,
          pointerEvents: 'none',
          delay,
          duration: 0.2,
          ease: 'power2.in'
        })
      }
    })
  }

  // ========= MÉTODOS PÚBLICOS PARA EL HUD =========

  // solo texto de puntos (por compatibilidad con código viejo)
  setStatus(text) {
    if (this.statusLabel) this.statusLabel.textContent = text
  }

  // tiempo en segundos → mm:ss
  setTimer(seconds) {
    if (!this.timerLabel) return
    const s = Math.max(0, Math.floor(seconds || 0))
    const mins = String(Math.floor(s / 60)).padStart(2, '0')
    const secs = String(s % 60).padStart(2, '0')
    this.timerLabel.textContent = `${mins}:${secs}`
  }

  // contador de jugadores
  setPlayerCount(count) {
    if (this.playersLabel) {
      this.playersLabel.textContent = `Jugadores: ${count}`
    }
  }

  // helper completo para actualizar todo de una vez
  updateHUD({ level = 1, points = 0, time = 0 } = {}) {
    if (this.levelLabel) this.levelLabel.textContent = `Nivel: ${level}`
    if (this.statusLabel) this.statusLabel.textContent = `Puntos: ${points}`
    this.setTimer(time)
  }

  // ========= LIMPIEZA =========
  destroy() {
    this.toggleButton?.remove()
    this.actionButtons?.forEach(btn => btn.remove())
    this.hudContainer?.remove()
    this.aboutContainer?.remove()
  }
}
