import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import Sound from './Sound.js'

export default class Enemy {
    constructor(experience, position = { x: 0, y: 1.5, z: 0 }) {
        this.experience = experience
        this.scene = experience.scene
        this.resources = experience.resources
        this.physics = experience.physics
        this.time = experience.time
        this.playerRef = experience.world.robot
        this.position = position
        this.killedPlayer = false
        this.killDistance = 1.5 // 🔹 distancia para activar la animación de kill

        this.setModel()
        this.setPhysics()
        this.setAnimation()
        this.setSound()
    }

    // 📦 Cargar modelo GLB
    setModel() {
        console.log('🎨 Intentando cargar modelo del enemigo...')
        console.log('📦 Resources disponibles:', Object.keys(this.resources.items))

        if (!this.resources.items.enemyModel) {
            console.error('❌ enemyModel NO encontrado en resources')
            return
        }

        console.log('✅ enemyModel encontrado:', this.resources.items.enemyModel)

        this.model = this.resources.items.enemyModel.scene
        this.model.scale.set(0.45, 0.45, 0.45)
        this.model.position.set(this.position.x, this.position.y, this.position.z)

        this.group = new THREE.Group()
        this.group.add(this.model)
        this.scene.add(this.group)

        console.log(`✅ Enemigo agregado a la escena en posición:`, this.position)

        // Sombras
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
    }

    // ⚙️ Física
    setPhysics() {
        const shape = new CANNON.Sphere(1.2) // 🧠 colisionador acorde al tamaño
        this.body = new CANNON.Body({
            mass: 3,
            shape,
            position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
            linearDamping: 0.05,
        })

        this.body.material = this.physics.robotMaterial
        this.physics.world.addBody(this.body)

        // 🧩 Detectar colisión directa con el robot (para matar al jugador)
        this.body.addEventListener('collide', (event) => {
            const other = event.body
            if (!this.killedPlayer && other === this.playerRef?.body) {
                this.killPlayer()
            }
        })
    }

    // 🔊 Sonido de alerta
    setSound() {
        this.alertSound = new Sound('/sounds/alert.ogg', { loop: true, volume: 0.0 })
        this.alertSound.play()
    }

    // 🎬 Animaciones (walking / kill)
    setAnimation() {
        console.log('🎬 Configurando animaciones del enemigo...')

        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.model)
        this.animation.actions = {}

        const clips = this.resources.items.enemyModel.animations

        console.log('📊 Animaciones disponibles:', clips.map(a => a.name))

        const walkClip = clips.find(a => a.name.toLowerCase().includes('walk'))
        const killClip = clips.find(a => a.name.toLowerCase().includes('kill'))

        console.log('🚶 Walking clip:', walkClip?.name || 'NO ENCONTRADO')
        console.log('⚔️ Kill clip:', killClip?.name || 'NO ENCONTRADO')

        if (walkClip) {
            this.animation.actions.walking = this.animation.mixer.clipAction(walkClip)
            this.animation.actions.walking.play()
            console.log('✅ Animación walking iniciada')
        }

        if (killClip) {
            this.animation.actions.kill = this.animation.mixer.clipAction(killClip)
            this.animation.actions.kill.setLoop(THREE.LoopOnce)
            this.animation.actions.kill.clampWhenFinished = true
            console.log('✅ Animación kill configurada')
        }

        this.currentAction = this.animation.actions.walking
    }

    playAnimation(name) {
        const nextAction = this.animation.actions[name]
        if (nextAction && nextAction !== this.currentAction) {
            nextAction.reset().play()
            nextAction.crossFadeFrom(this.currentAction, 0.3, true)
            this.currentAction = nextAction
        }
    }

    // 🔄 Movimiento hacia el jugador
    update(delta) {
        if (this.killedPlayer) return;

        // 🌀 Actualizar animaciones
        if (this.animation?.mixer) this.animation.mixer.update(delta);

        const player = this.playerRef?.body;
        if (!player) return;

        const target = player.position;
        const dir = new CANNON.Vec3(
            target.x - this.body.position.x,
            0,
            target.z - this.body.position.z
        );
        const dist = dir.length();

        // 🧠 Si el jugador no se mueve, aún debe seguirlo
        dir.normalize();

        // 🔥 Movimiento constante hacia el jugador
        const moveSpeed = 2.2; // ajusta para más o menos agresividad
        this.body.velocity.x = dir.x * moveSpeed;
        this.body.velocity.z = dir.z * moveSpeed;

        // 💀 Si está cerca, mata inmediatamente
        const effectiveKillDistance = this.killDistance + 0.4;
        if (!this.killedPlayer && dist < effectiveKillDistance) {
            this.killPlayer();
            return;
        }

        // 🎬 Siempre mostrar animación de caminar mientras se mueve
        this.playAnimation('walking');

        // 🔊 Ajustar volumen según distancia
        const maxDist = 20;
        const vol = 1 - Math.min(dist / maxDist, 1);
        this.alertSound.setVolume(vol * 0.8);

        // 🔄 Sincronizar modelo y rotación
        this.model.position.copy(this.body.position);
        const angle = Math.atan2(dir.x, dir.z);
        this.model.rotation.y = angle;

        // 🚀 Mantener cuerpo activo (evita quedarse “dormido”)
        this.body.wakeUp();
    }

    killPlayer() {
        console.log("💀 [DEBUG] Entra en killPlayer()");
        if (this.killedPlayer) return; // Evitar múltiples activaciones

        this.killedPlayer = true;
        this.body.velocity.set(0, 0, 0);

        // Animación de kill
        this.playAnimation('kill');

        // Detener sonido de alerta
        this.alertSound.stop();

        // 🎧 Asegurar que el contexto de audio esté activo antes de reproducir
        const ctx = window.Howler?.ctx;
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => {
                console.log('🔊 AudioContext reanudado antes de reproducir loseSound');
                this.experience.world.loseSound?.play();
            });
        } else {
            this.experience.world.loseSound?.play();
        }


        // 🛑 Detener movimiento del jugador
        if (this.playerRef) {
            this.playerRef.isDead = true;
            this.playerRef.body.velocity.set(0, 0, 0);
            this.playerRef.body.angularVelocity.set(0, 0, 0);
            this.playerRef.walkSound?.stop();

            if (this.playerRef.animation?.actions?.die) {
                this.playerRef.animation.play('die');
            }

            // Evita que siga moviéndose tras morir
            if (this.experience.keyboard) {
                this.experience.keyboard.isDisabled = true
            }
        }

        // 💬 Mostrar modal con opciones después de un breve delay
        setTimeout(() => {
            const modal = this.experience.modal || this.modal;
            if (!modal) {
                console.warn("⚠️ No se encontró instancia del modal.");
                return;
            }

            console.log("💀 Mostrando modal de derrota...");

            modal.show({
                icon: '💀',
                message: '¡El enemigo te atrapó!\n¿Quieres intentarlo otra vez?',
                buttons: [
                    {
                        text: '🔄 Volver a jugar',
                        onClick: () => {
                            console.log('🔁 Reiniciando el nivel actual...');
                            modal.hide();

                            // 🧩 Reiniciar estado del enemigo antes de recargar
                            this.killedPlayer = false;
                            if (this.animation?.actions?.walking) {
                                this.playAnimation('walking');
                            }

                            // 🧠 Reactivar controles del jugador
                            if (this.experience.keyboard) {
                                this.experience.keyboard.isDisabled = false;
                            }

                            // 🧱 Llamar al método de reinicio de nivel actual
                            if (typeof this.experience.resetGameToCurrentLevel === 'function') {
                                this.experience.resetGameToCurrentLevel();
                            } else {
                                const currentLevel = this.experience.world.levelManager?.currentLevel || 1;
                                this.experience.world.loadLevel?.(currentLevel);
                            }
                        }
                    },
                    {
                        text: '🚪 Salir',
                        onClick: () => {
                            console.log('🚪 Saliendo al login...');
                            modal.hide();

                            if (typeof this.experience.resetGame === 'function') {
                                this.experience.resetGame();
                            } else {
                                window.location.href = '/login';
                            }
                        }
                    }
                ]
            });
        }, 700); // Espera 0.7s para que se vea la animación de kill
    }

    destroy() {
        console.log("💀 Destruyendo enemigo y limpiando recursos...");

        // 🛑 Detener cualquier sonido activo
        if (this.alertSound) {
            try { this.alertSound.stop(); } catch (_) { }
            this.alertSound = null;
        }

        // 🧹 Eliminar modelo y grupo de la escena
        if (this.model?.parent) {
            this.scene.remove(this.model);
        }
        if (this.group?.parent) {
            this.scene.remove(this.group);
        }

        // 🧠 Limpiar físicas
        if (this.body && this.physics?.world) {
            this.physics.world.removeBody(this.body);
            this.body = null;
        }

        // 🎬 Liberar correctamente las animaciones
        if (this.animation?.mixer) {
            try {
                this.animation.mixer.stopAllAction();
                this.animation.mixer.uncacheRoot(this.model);
                this.animation.mixer.uncacheClip?.(this.currentAction);
            } catch (e) {
                console.warn("⚠️ Error al limpiar mixer:", e);
            }
            this.animation.mixer = null;
            this.animation.actions = {};
        }

        // 🚫 Quitar referencias
        this.model = null;
        this.group = null;
        this.currentAction = null;
        this.killedPlayer = false;

        console.log("✅ Enemigo destruido correctamente.");
    }


}