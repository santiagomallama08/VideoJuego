// Experience/Utils/KeyboardControls.js
import EventEmitter from './EventEmitter.js'

export default class KeyboardControls extends EventEmitter {
    constructor() {
        super()

        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            space: false
        }

        this.disabled = false // 🔹 Controla si las teclas están activas
        this.setListeners()
    }

    setListeners() {
        window.addEventListener('keydown', (event) => {
            if (this.disabled) return // 🚫 Ignora si está desactivado
            if (event.key === 'ArrowUp') this.keys.up = true
            if (event.key === 'ArrowDown') this.keys.down = true
            if (event.key === 'ArrowLeft') this.keys.left = true
            if (event.key === 'ArrowRight') this.keys.right = true
            if (event.code === 'Space') this.keys.space = true
            this.trigger('change', this.keys)
        })

        window.addEventListener('keyup', (event) => {
            if (this.disabled) return // 🚫 Ignora si está desactivado
            if (event.key === 'ArrowUp') this.keys.up = false
            if (event.key === 'ArrowDown') this.keys.down = false
            if (event.key === 'ArrowLeft') this.keys.left = false
            if (event.key === 'ArrowRight') this.keys.right = false
            if (event.code === 'Space') this.keys.space = false
            this.trigger('change', this.keys)
        })
    }

    // ✅ Nuevo: permite desactivar todos los controles
    disableControls() {
        this.disabled = true
        // Limpia los estados activos
        for (const key in this.keys) this.keys[key] = false
        this.trigger('change', this.keys)
    }

    // ✅ Nuevo: vuelve a habilitar los controles
    enableControls() {
        this.disabled = false
        this.trigger('change', this.keys)
    }

    getState() {
        // Si está deshabilitado, devuelve todas las teclas en false
        if (this.disabled) {
            return { up: false, down: false, left: false, right: false, space: false }
        }
        return this.keys
    }
}
