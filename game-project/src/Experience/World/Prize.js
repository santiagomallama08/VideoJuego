import * as THREE from 'three'

export default class Prize {
    constructor({ model, position, scene, role = 'default', sound = null, world = null }) {
        this.scene = scene
        this.world = world
        this.collected = false
        this.role = role
        this.sound = sound

        // 🎯 Nodo principal (pivote)
        this.pivot = new THREE.Group()
        this.pivot.position.copy(position)
        this.pivot.userData.interactivo = true
        this.pivot.userData.collected = false

        // 🧩 Clonar modelo base
        this.model = model.clone()
        const visual = this.model.children.find(child => child.isMesh) || this.model
        visual.userData.interactivo = true

        // 📦 Centrar el modelo
        const bbox = new THREE.Box3().setFromObject(visual)
        const center = new THREE.Vector3()
        bbox.getCenter(center)
        visual.position.sub(center)

        // 🧠 Agregar modelo al grupo principal
        this.pivot.add(visual)

        // 🔧 Ejes de depuración (puedes comentar esto si no quieres verlos)
        // const helper = new THREE.AxesHelper(0.5)
        // this.pivot.add(helper)

        this.scene.add(this.pivot)
        this.pivot.visible = role !== 'finalPrize'

        console.log(`🎯 Premio en: (${position.x}, ${position.y}, ${position.z}) [role: ${this.role}]`)
    }

    update(delta) {
        if (this.collected) return
        this.pivot.rotation.y += delta * 1.5
    }

    collect() {
        if (this.collected) return
        this.collected = true

        // 🔊 Reproducir sonido
        if (this.sound && typeof this.sound.play === 'function') {
            this.sound.play()
        }

        // ⚡ Marcar como recogida (sin alterar físicas del jugador)
        this.pivot.traverse(child => {
            child.userData.collected = true
        })

        // 💥 Efecto de desaparición suave
        const tween = { scale: 1 }
        const interval = setInterval(() => {
            tween.scale -= 0.1
            if (this.pivot.scale.x <= 0) {
                clearInterval(interval)
                this.scene.remove(this.pivot)
                return
            }
            this.pivot.scale.set(tween.scale, tween.scale, tween.scale)
        }, 16)

        // 🚀 Despertar física del robot para que no pierda impulso
        setTimeout(() => {
            if (this.world?.robot?.body) {
                this.world.robot.body.wakeUp()
                // 🧠 Fuerza mínima para mantener momentum
                this.world.robot.body.applyForce(
                    new CANNON.Vec3(0, 0, 0.001),
                    this.world.robot.body.position
                )
            }
        }, 100)
    }
}
