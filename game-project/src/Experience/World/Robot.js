import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import Sound from './Sound.js'

export default class Robot {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.physics = this.experience.physics
        this.keyboard = this.experience.keyboard
        this.debug = this.experience.debug
        this.points = 0
        this.isDead = false // Bandera de estado de muerte

        this.setModel()
        this.setSounds()
        this.setPhysics()
        this.setAnimation()
    }

    // 📦 Cargar modelo 3D y ajustar tamaño
    setModel() {
        this.model = this.resources.items.robotModel.scene

        // 🔹 Escala aumentada (de 0.08 → 0.25)
        this.model.scale.set(0.25, 0.25, 0.25)

        // 🔹 Ajuste leve de posición para pies sobre el suelo
        this.model.position.set(0, -0.15, 0)

        // Crear grupo para controlar el modelo
        this.group = new THREE.Group()
        this.group.add(this.model)
        this.scene.add(this.group)

        // Sombras
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
    }

    // ⚙️ Física del cuerpo
    setPhysics() {
        // Aumentar el radio del cuerpo físico para coincidir con el nuevo tamaño
        const shape = new CANNON.Sphere(0.9)
        this.body = new CANNON.Body({
            mass: 2,
            shape: shape,
            position: new CANNON.Vec3(0, 1.5, 0),
            linearDamping: 0.05,
            angularDamping: 0.9
        })

        this.body.angularFactor.set(0, 1, 0)
        this.body.material = this.physics.robotMaterial
        this.physics.world.addBody(this.body)

        setTimeout(() => this.body.wakeUp(), 100)
    }

    // 🔊 Sonidos
    setSounds() {
        this.walkSound = new Sound('/sounds/robot/walking.mp3', { loop: true, volume: 0.5 })
    }

    // 🎬 Animaciones (solo Idle y Walking)
    setAnimation() {
        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.model)
        this.animation.actions = {}

        const animations = this.resources.items.robotModel.animations
        const idleClip = animations.find(a => a.name.toLowerCase().includes('idle'))
        const walkClip = animations.find(a => a.name.toLowerCase().includes('walk'))
        // Asegúrate de que tu modelo tiene una animación de Muerte/Caída
        const dieClip = animations.find(a => a.name.toLowerCase().includes('die') || a.name.toLowerCase().includes('death'))

        this.animation.actions.idle = this.animation.mixer.clipAction(idleClip)
        this.animation.actions.walking = this.animation.mixer.clipAction(walkClip)
        this.animation.actions.die = dieClip ? this.animation.mixer.clipAction(dieClip) : null

        if (this.animation.actions.die) {
            this.animation.actions.die.setLoop(THREE.LoopOnce)
            this.animation.actions.die.clampWhenFinished = true
        }

        // Animación inicial
        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()

        // Función para cambiar animaciones suavemente
        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            const oldAction = this.animation.actions.current

            if (newAction && newAction !== oldAction) {
                newAction.reset().play()
                // Si la animación actual es la de muerte, la transición puede ser más abrupta
                if (oldAction === this.animation.actions.die) {
                    newAction.crossFadeFrom(oldAction, 0.1, true)
                } else {
                    newAction.crossFadeFrom(oldAction, 0.3, true)
                }
                this.animation.actions.current = newAction
            }

            // Sonidos sincronizados
            if (name === 'walking') this.walkSound.play()
            else if (name !== 'walking' && oldAction === this.animation.actions.walking) this.walkSound.stop()
        }
    }
    
    // 💀 El robot muere
    die() {
        if (this.isDead) return
        
        console.log("💀 Robot ha sido atrapado. Muriendo...")
        this.isDead = true
        this.walkSound.stop()
        
        // 1. Detener el movimiento y rotación del cuerpo físico
        this.body.velocity.set(0, 0, 0)
        this.body.angularVelocity.set(0, 0, 0)
        
        // 2. Permitir que el cuerpo rote libremente (caída)
        // Esto permite que el robot se voltee y caiga al suelo.
        this.body.angularFactor.set(1, 1, 1) 
        
        // 3. Reproducir la animación de muerte
        if (this.animation.actions.die) {
            this.animation.play('die')
        } 
        
        // Deshabilitar los controles del teclado
        this.experience.keyboard.disableControls()
        
        // 4. Mostrar el Game Over (lo ponemos aquí para mayor certeza en el flujo)
        this.showGameOverModal()
    }

    // 💡 NUEVO: Centralizar la lógica del modal de Game Over
    showGameOverModal() {
        this.experience.modal.show({
            icon: '💀',
            message: '¡Has sido atrapado!',
            buttons: [
                {
                    text: '🔄 Reiniciar juego',
                    onClick: () => {
                        this.experience.modal.hide()
                        // 1. Reiniciar el estado completo del juego (puntos, enemigos, nivel)
                        this.experience.resetGameToFirstLevel() 
                        // 2. Iniciar el juego (activa banderas)
                        this.experience.startGame()
                    }
                }
            ]
        })
    }

    // 🔄 Restablecer la posición y física
    reset(position) {
        this.isDead = false
        this.points = 0
        this.experience.keyboard.enableControls() // Vuelve a habilitar los controles

        // 1. Reiniciar la posición y orientación física
        this.body.position.set(position.x, position.y, position.z)
        this.body.quaternion.set(0, 0, 0, 1) 

        // 2. Reiniciar velocidades
        this.body.velocity.set(0, 0, 0)
        this.body.angularVelocity.set(0, 0, 0)

        // 3. Volver a restringir la rotación en el eje Y (para que no se caiga al caminar)
        this.body.angularFactor.set(0, 1, 0) 
        
        // 4. Sincronizar el grupo visual con el cuerpo físico
        this.group.position.copy(this.body.position)
        this.group.quaternion.copy(this.body.quaternion)

        // 5. Reproducir animación Idle
        this.animation.play('idle')
        this.body.wakeUp()
    }


    // 🔄 Actualización del movimiento
    update() {
        const delta = this.time.delta * 0.001
        this.animation.mixer.update(delta)

        // 🛑 LÓGICA CLAVE: Detener movimiento si está muerto 🛑
        if (this.isDead) {
            // Solo sincronizar la posición y rotación con la simulación de física (caída)
            this.group.position.copy(this.body.position)
            this.group.quaternion.copy(this.body.quaternion)
            return // Detiene la ejecución del update para que no se procese el movimiento
        }

        const keys = this.keyboard.getState()
        const moveForce = 150
        const turnSpeed = 2.2
        let isMoving = false

        const maxSpeed = 20
        this.body.velocity.x = Math.max(Math.min(this.body.velocity.x, maxSpeed), -maxSpeed)
        this.body.velocity.z = Math.max(Math.min(this.body.velocity.z, maxSpeed), -maxSpeed)

        // Movimiento hacia adelante
        if (keys.up) {
            const forward = new THREE.Vector3(0, 0, 1)
            forward.applyQuaternion(this.group.quaternion)
            this.body.applyForce(
                new CANNON.Vec3(forward.x * moveForce, 0, forward.z * moveForce),
                this.body.position
            )
            isMoving = true
        }

        // Movimiento hacia atrás
        if (keys.down) {
            const backward = new THREE.Vector3(0, 0, -1)
            backward.applyQuaternion(this.group.quaternion)
            this.body.applyForce(
                new CANNON.Vec3(backward.x * moveForce, 0, backward.z * moveForce),
                this.body.position
            )
            isMoving = true
        }

        // Rotación
        if (keys.left) {
            this.group.rotation.y += turnSpeed * delta
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }
        if (keys.right) {
            this.group.rotation.y -= turnSpeed * delta
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }

        // Cambiar animación
        if (isMoving) this.animation.play('walking')
        else this.animation.play('idle')

        // Sincronizar física → visual
        this.group.position.copy(this.body.position)
    }
}