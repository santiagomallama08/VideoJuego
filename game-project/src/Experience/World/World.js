
import * as THREE from 'three'
import Environment from './Environment.js'
import Fox from './Fox.js'
import Robot from './Robot.js'
import ToyCarLoader from '../../loaders/ToyCarLoader.js'
import Floor from './Floor.js'
import ThirdPersonCamera from './ThirdPersonCamera.js'
import Sound from './Sound.js'
import AmbientSound from './AmbientSound.js'
import MobileControls from '../../controls/MobileControls.js'
import LevelManager from './LevelManager.js';
import BlockPrefab from './BlockPrefab.js'
import FinalPrizeParticles from '../Utils/FinalPrizeParticles.js'
import Enemy from './Enemy.js'


export default class World {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.blockPrefab = new BlockPrefab(this.experience)
        this.resources = this.experience.resources
        this.levelManager = new LevelManager(this.experience);
        this.finalPrizeActivated = false
        this.gameStarted = false
        this.enemies = []

        this.coinSound = new Sound('/sounds/coin.ogg')
        this.ambientSound = new AmbientSound('/sounds/ambiente.mp3')
        this.winner = new Sound('/sounds/winner.mp3')
        this.portalSound = new Sound('/sounds/portal.mp3')
        this.loseSound = new Sound('/sounds/lose.ogg')


        this.allowPrizePickup = false
        this.hasMoved = false

        setTimeout(() => {
            this.allowPrizePickup = true
        }, 2000)

        this.resources.on('ready', async () => {
            this.floor = new Floor(this.experience)
            this.environment = new Environment(this.experience)

            this.loader = new ToyCarLoader(this.experience)
            await this.loader.loadFromAPI()

            this.fox = new Fox(this.experience)
            this.robot = new Robot(this.experience)

            // Enemigos múltiples: plantilla y spawn lejos del jugador
            this.enemyTemplate = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshStandardMaterial({ color: 0xff0000 })
            )
            const enemiesCountEnv = parseInt(import.meta.env.VITE_ENEMIES_COUNT || '3', 10)
            const enemiesCount = Number.isFinite(enemiesCountEnv) && enemiesCountEnv > 0 ? enemiesCountEnv : 3
            this.spawnEnemies(enemiesCount)

            this.experience.vr.bindCharacter(this.robot)
            this.thirdPersonCamera = new ThirdPersonCamera(this.experience, this.robot.group)

            this.mobileControls = new MobileControls({
                onUp: (pressed) => { this.experience.keyboard.keys.up = pressed },
                onDown: (pressed) => { this.experience.keyboard.keys.down = pressed },
                onLeft: (pressed) => { this.experience.keyboard.keys.left = pressed },
                onRight: (pressed) => { this.experience.keyboard.keys.right = pressed }
            })

            if (!this.experience.physics || !this.experience.physics.world) {
                console.error("🚫 Sistema de físicas no está inicializado al cargar el mundo.");
                return;
            }

            // Si se está en modo VR, ocultar el robot
            this._checkVRMode()

            this.experience.renderer.instance.xr.addEventListener('sessionstart', () => {
                this._checkVRMode()
            })


        })
    }

    // Crear varios enemigos en posiciones alejadas del jugador para evitar atascos iniciales
    // Crear varios enemigos en posiciones alejadas del jugador
    spawnEnemies(count = 3) {
        console.log('🎯 spawnEnemies() llamado con count:', count)

        if (!this.robot?.body?.position) {
            console.error('❌ No se puede crear enemigos: Robot no tiene cuerpo físico')
            return
        }

        const playerPos = this.robot.body.position
        console.log('📍 Posición del jugador:', playerPos)

        const minRadius = 25
        const maxRadius = 40

        // 🧹 Eliminar enemigos previos si existen
        if (this.enemies?.length) {
            console.log(`🧹 Eliminando ${this.enemies.length} enemigos previos...`)
            this.enemies.forEach(e => e?.destroy?.())
            this.enemies = []
        } else {
            this.enemies = []
        }

        // ⚠️ Verificar que el modelo del enemigo esté cargado
        const enemyResource = this.experience.resources.items.enemyModel
        if (!enemyResource || !enemyResource.scene) {
            console.error('❌ Modelo enemyModel no está cargado.')
            console.log('📦 Recursos disponibles:', Object.keys(this.experience.resources.items))
            console.log('💡 Asegúrate de tener esta línea en tu archivo de recursos:')
            console.log(`{
    name: 'enemyModel',
    type: 'gltfModel',
    path: '/models/Enemy/enemy.glb'
}`)
            return
        }

        console.log('✅ Modelo enemyModel encontrado, creando enemigos...')

        // 🧟‍♂️ Crear nuevos enemigos
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const radius = minRadius + Math.random() * (maxRadius - minRadius)
            const x = playerPos.x + Math.cos(angle) * radius
            const z = playerPos.z + Math.sin(angle) * radius
            const y = 1.5

            console.log(`🧟 Creando enemigo ${i + 1} en posición: x=${x.toFixed(2)}, y=${y}, z=${z.toFixed(2)}`)

            // 🆕 IMPORTANTE: No pasar el parámetro "model", el Enemy lo carga internamente
            const enemy = new Enemy(
                this.experience,  // Solo pasar experience
                { x, y, z }       // Y la posición
            )
            enemy.playAnimation?.('walking'); // 🟢 asegúrate de que arranque caminando


            // 🕒 Delay para que no ataquen todos al mismo tiempo
            enemy.delayActivation = 1.0 + i * 0.5

            this.enemies.push(enemy)
            console.log(`✅ Enemigo ${i + 1} creado y agregado al array`)
        }

        console.log(`✅ Total de ${count} enemigos generados correctamente.`)
        console.log('🎯 Array de enemigos:', this.enemies)
    }


    toggleAudio() {
        this.ambientSound.toggle()
    }
    spawnEnemy() {
        console.log("👾 Spawning nuevo enemigo (posición aleatoria)...");

        // 🧠 Si ya existía un enemigo anterior, eliminarlo
        if (this.enemy) {
            this.enemy.destroy();
            this.enemy = null;
        }

        // 🎲 Generar una posición aleatoria dentro de un rango controlado
        const range = 40; // radio máximo de aparición
        const minDistanceFromPlayer = 10; // evitar que aparezca encima del robot

        const randomPos = () => {
            let x, z, dist;
            do {
                x = (Math.random() - 0.5) * range * 2; // de -range a +range
                z = (Math.random() - 0.5) * range * 2;
                const playerPos = this.robot?.body?.position || { x: 0, z: 0 };
                dist = Math.sqrt((x - playerPos.x) ** 2 + (z - playerPos.z) ** 2);
            } while (dist < minDistanceFromPlayer); // repetir si está demasiado cerca
            return { x, y: 1.5, z };
        };

        const position = randomPos();

        // 🚀 Crear el enemigo con esa posición
        this.enemy = new Enemy(this.experience, position);
        console.log(`✅ Enemigo creado en posición aleatoria: x=${position.x.toFixed(2)}, z=${position.z.toFixed(2)}`);

        return this.enemy;
    }


    update(delta) {
        this.fox?.update()
        this.robot?.update()
        this.blockPrefab?.update()

        // 🧟‍♂️ Actualizar enemigos SIEMPRE (para que se vean y se muevan)
        this.enemies?.forEach(e => e.update(delta))

        // 🧟‍♂️ Solo actualizar enemigos si el juego ya comenzó
        if (this.gameStarted && Array.isArray(this.enemies) && this.enemies.length > 0) {
            // Actualiza animaciones y movimiento de cada enemigo
            this.enemies.forEach(e => e.update(delta))

            // 💀 Calcular distancia más cercana entre enemigo y jugador
            const distToClosest = this.enemies.reduce((min, e) => {
                if (!e?.body?.position || !this.robot?.body?.position) return min
                const d = e.body.position.distanceTo(this.robot.body.position)
                return Math.min(min, d)
            }, Infinity)

            // Si el enemigo realmente está lo bastante cerca y no se ha disparado derrota
            if (distToClosest < 1.0 && !this.defeatTriggered) {
                this.defeatTriggered = true
                console.log("💀 El jugador fue atrapado por un enemigo (detecto en update).")

                // Reproduce sonido y muestra modal
                if (window.userInteracted && this.loseSound) this.loseSound.play()

                const firstEnemy = this.enemies[0]
                const enemyMesh = firstEnemy?.model || firstEnemy?.group
                if (enemyMesh) {
                    enemyMesh.scale.set(1.3, 1.3, 1.3)
                    setTimeout(() => enemyMesh.scale.set(1, 1, 1), 500)
                }

                this.experience.modal.show({
                    icon: '💀',
                    message: '¡El enemigo te atrapó!\n¿Quieres intentarlo otra vez?',
                    buttons: [
                        {
                            text: '🔁 Reintentar',
                            onClick: () => this.experience.resetGameToCurrentLevel()
                        },
                        {
                            text: '❌ Salir',
                            onClick: () => this.experience.resetGame()
                        }
                    ]
                })
            }
        } else {
            // 👀 Protección extra: si no hay enemigos, no se evalúa nada
            if (this.gameStarted && (!this.enemies || this.enemies.length === 0)) {
                //console.warn("⚠️ No hay enemigos activos en este frame.")
            }
        }


        if (this.thirdPersonCamera && this.experience.isThirdPerson && !this.experience.renderer.instance.xr.isPresenting) {
            this.thirdPersonCamera.update()
        }

        this.loader?.prizes?.forEach(p => p.update(delta))

        if (!this.allowPrizePickup || !this.loader || !this.robot || !this.robot.body) return


        let pos = null

        if (this.experience.renderer.instance.xr.isPresenting) {
            pos = this.experience.camera.instance.position
        } else if (this.robot?.body?.position) {
            pos = this.robot.body.position
        } else {
            return // No hay posición válida, salimos del update
        }


        const speed = this.robot?.body?.velocity?.length?.() || 0
        const moved = speed > 0.5

        this.loader.prizes.forEach((prize) => {
            if (!prize.pivot) return

            const dist = prize.pivot.position.distanceTo(pos)
            if (dist < 1.2 && moved && !prize.collected) {
                prize.collect()
                prize.collected = true

                if (prize.role === "default") {
                    this.points = (this.points || 0) + 1
                    this.robot.points = this.points

                    const pointsTarget = this.levelManager.getCurrentLevelTargetPoints()
                    console.log(`🎯 Monedas recolectadas: ${this.points} / ${pointsTarget}`)

                    if (!this.finalPrizeActivated && this.points === pointsTarget) {
                        const finalCoin = this.loader.prizes.find(p => p.role === "finalPrize")
                        if (finalCoin && !finalCoin.collected && finalCoin.pivot) {
                            finalCoin.pivot.visible = true
                            if (finalCoin.model) finalCoin.model.visible = true
                            this.finalPrizeActivated = true

                            new FinalPrizeParticles({
                                scene: this.scene,
                                targetPosition: finalCoin.pivot.position,
                                sourcePosition: this.robot.body.position,
                                experience: this.experience
                            })

                            // Faro visual
                            this.discoRaysGroup = new THREE.Group()
                            this.scene.add(this.discoRaysGroup)

                            const rayMaterial = new THREE.MeshBasicMaterial({
                                color: 0xaa00ff,
                                transparent: true,
                                opacity: 0.25,
                                side: THREE.DoubleSide
                            })

                            const rayCount = 4
                            for (let i = 0; i < rayCount; i++) {
                                const cone = new THREE.ConeGeometry(0.2, 4, 6, 1, true)
                                const ray = new THREE.Mesh(cone, rayMaterial)

                                ray.position.set(0, 2, 0)
                                ray.rotation.x = Math.PI / 2
                                ray.rotation.z = (i * Math.PI * 2) / rayCount

                                const spot = new THREE.SpotLight(0xaa00ff, 2, 12, Math.PI / 7, 0.2, 0.5)
                                spot.castShadow = false
                                spot.shadow.mapSize.set(1, 1)
                                spot.position.copy(ray.position)
                                spot.target.position.set(
                                    Math.cos(ray.rotation.z) * 10,
                                    2,
                                    Math.sin(ray.rotation.z) * 10
                                )

                                ray.userData.spot = spot
                                this.discoRaysGroup.add(ray)
                                this.discoRaysGroup.add(spot)
                                this.discoRaysGroup.add(spot.target)
                            }

                            this.discoRaysGroup.position.copy(finalCoin.pivot.position)

                            if (window.userInteracted) {
                                this.portalSound.play()
                            }

                            console.log("🪙 Coin final activado correctamente.")
                        }
                    }
                }

                if (prize.role === "finalPrize") {
                    if (this.levelManager.currentLevel < this.levelManager.totalLevels) {
                        this.levelManager.nextLevel()
                        this.points = 0
                        this.robot.points = 0
                    } else {
                        const elapsed = this.experience.tracker.stop()
                        this.experience.tracker.saveTime(elapsed)
                        this.experience.tracker.showEndGameModal(elapsed)

                        this.experience.obstacleWavesDisabled = true
                        clearTimeout(this.experience.obstacleWaveTimeout)
                        this.experience.raycaster?.removeAllObstacles()

                        if (window.userInteracted) {
                            this.winner.play()
                        }
                    }
                }

                if (this.experience.raycaster?.removeRandomObstacles) {
                    const reduction = 0.2 + Math.random() * 0.1
                    this.experience.raycaster.removeRandomObstacles(reduction)
                }

                if (window.userInteracted) {
                    this.coinSound.play()
                }

                this.experience.menu.setStatus?.(`🎖️ Puntos: ${this.points}`)
            }
        })

        // ✅ Verificar si todas las monedas se han recogido y aún no se activó el finalPrize
        // ✅ Activar finalPrize si todas las monedas default fueron recolectadas (desde VR o PC)
        if (!this.finalPrizeActivated && this.loader?.prizes) {
            const totalDefault = this.loader.prizes.filter(p => p.role === 'default').length
            const collectedDefault = this.loader.prizes.filter(p => p.role === 'default' && p.collected).length

            if (totalDefault > 0 && collectedDefault === totalDefault) {
                const finalCoin = this.loader.prizes.find(p => p.role === "finalPrize")
                if (finalCoin && !finalCoin.collected && finalCoin.pivot) {
                    finalCoin.pivot.visible = true
                    if (finalCoin.model) finalCoin.model.visible = true
                    this.finalPrizeActivated = true

                    new FinalPrizeParticles({
                        scene: this.scene,
                        targetPosition: finalCoin.pivot.position,
                        sourcePosition: this.experience.vrDolly?.position ?? this.experience.camera.instance.position,
                        experience: this.experience
                    })

                    // Faro visual
                    this.discoRaysGroup = new THREE.Group()
                    this.scene.add(this.discoRaysGroup)

                    const rayMaterial = new THREE.MeshBasicMaterial({
                        color: 0xaa00ff,
                        transparent: true,
                        opacity: 0.25,
                        side: THREE.DoubleSide
                    })

                    const rayCount = 4
                    for (let i = 0; i < rayCount; i++) {
                        const cone = new THREE.ConeGeometry(0.2, 4, 6, 1, true)
                        const ray = new THREE.Mesh(cone, rayMaterial)

                        ray.position.set(0, 2, 0)
                        ray.rotation.x = Math.PI / 2
                        ray.rotation.z = (i * Math.PI * 2) / rayCount

                        const spot = new THREE.SpotLight(0xaa00ff, 2, 12, Math.PI / 7, 0.2, 0.5)
                        spot.castShadow = false
                        spot.shadow.mapSize.set(1, 1)
                        spot.position.copy(ray.position)
                        spot.target.position.set(
                            Math.cos(ray.rotation.z) * 10,
                            2,
                            Math.sin(ray.rotation.z) * 10
                        )

                        ray.userData.spot = spot
                        this.discoRaysGroup.add(ray)
                        this.discoRaysGroup.add(spot)
                        this.discoRaysGroup.add(spot.target)
                    }

                    this.discoRaysGroup.position.copy(finalCoin.pivot.position)

                    if (window.userInteracted) {
                        this.portalSound.play()
                    }

                    console.log("🪙 FinalPrize activado automáticamente desde VR.")
                }
            }
        }


        // Faro rotación
        if (this.discoRaysGroup) {
            this.discoRaysGroup.rotation.y += delta * 0.5
        }

        // Optimización física por distancia
        const playerPos = this.experience.renderer.instance.xr.isPresenting
            ? this.experience.camera.instance.position
            : this.robot?.body?.position

        this.scene.traverse((obj) => {
            if (obj.userData?.levelObject && obj.userData.physicsBody) {
                const dist = obj.position.distanceTo(playerPos)
                const shouldEnable = dist < 40 && obj.visible

                const body = obj.userData.physicsBody
                if (shouldEnable && !body.enabled) {
                    body.enabled = true
                } else if (!shouldEnable && body.enabled) {
                    body.enabled = false
                }
            }
        })
    }



    async loadLevel(level) {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const apiUrl = `${backendUrl}/api/blocks?level=${level}`;

            let data;
            try {
                const res = await fetch(apiUrl);
                if (!res.ok) throw new Error('Error desde API');
                // Asegurar que la respuesta sea JSON
                const ct = res.headers.gzet('content-type') || '';
                if (!ct.includes('application/json')) {
                    const preview = (await res.text()).slice(0, 120);
                    throw new Error(`Respuesta no-JSON desde API (${apiUrl}): ${preview}`);
                }
                data = await res.json();
                console.log(`📦 Datos del nivel ${level} cargados desde API`);
            } catch (error) {
                console.warn(`⚠️ No se pudo conectar con el backend. Usando datos locales para nivel ${level}...`);
                const publicPath = (p) => {
                    const base = import.meta.env.BASE_URL || '/';
                    return `${base.replace(/\/$/, '')}/${p.replace(/^\//, '')}`;
                };

                const localUrl = publicPath('data/toy_car_blocks.json');
                const localRes = await fetch(localUrl);
                if (!localRes.ok) {
                    const preview = (await localRes.text()).slice(0, 120);
                    throw new Error(`No se pudo cargar ${localUrl} (HTTP ${localRes.status}). Vista previa: ${preview}`);
                }
                const localCt = localRes.headers.get('content-type') || '';
                if (!localCt.includes('application/json')) {
                    const preview = (await localRes.text()).slice(0, 120);
                    throw new Error(`Contenido no JSON en ${localUrl}. Vista previa: ${preview}`);
                }
                const allBlocks = await localRes.json();

                const filteredBlocks = allBlocks.filter(b => b.level === level);

                data = {
                    blocks: filteredBlocks,
                    spawnPoint: { x: -17, y: 1.5, z: -67 } // valor por defecto si no viene en JSON
                };
            }

            const spawnPoint = data.spawnPoint || { x: 5, y: 1.5, z: 5 };
            if (level === 3) {
                spawnPoint.x = 0;       // mueve horizontalmente si hace falta
                spawnPoint.y = -1.7;    // ajusta para que aparezca justo sobre la carretera
                spawnPoint.z = 0;
                console.log("📍 Spawn especial aplicado para nivel 3:", spawnPoint);
            }
            this.points = 0;
            this.robot.points = 0;
            this.finalPrizeActivated = false;
            this.experience.menu.setStatus?.(`🎖️ Puntos: ${this.points}`);

            if (data.blocks) {
                const publicPath = (p) => {
                    const base = import.meta.env.BASE_URL || '/';
                    return `${base.replace(/\/$/, '')}/${p.replace(/^\//, '')}`;
                };
                const preciseUrl = publicPath('config/precisePhysicsModels.json');
                const preciseRes = await fetch(preciseUrl);
                if (!preciseRes.ok) {
                    const preview = (await preciseRes.text()).slice(0, 120);
                    throw new Error(`No se pudo cargar ${preciseUrl} (HTTP ${preciseRes.status}). Vista previa: ${preview}`);
                }
                const preciseCt = preciseRes.headers.get('content-type') || '';
                if (!preciseCt.includes('application/json')) {
                    const preview = (await preciseRes.text()).slice(0, 120);
                    throw new Error(`Contenido no JSON en ${preciseUrl}. Vista previa: ${preview}`);
                }
                const preciseModels = await preciseRes.json();
                this.loader._processBlocks(data.blocks, preciseModels);
            } else {
                await this.loader.loadFromURL(apiUrl);
            }


            this.loader.prizes.forEach(p => {
                if (p.model) p.model.visible = (p.role !== 'finalPrize');
                p.collected = false;
            });

            this.totalDefaultCoins = this.loader.prizes.filter(p => p.role === "default").length;
            console.log(`🎯 Total de monedas default para el nivel ${level}: ${this.totalDefaultCoins}`);

            this.resetRobotPosition(spawnPoint);
            if (level === 3) {
                console.log("🚗 Ajuste de posición especial para nivel 3 aplicado al robot.");
                this.robot.group.position.y = -2.0;
                this.robot.body.position.y = -2.0;
            }
            console.log(`✅ Nivel ${level} cargado con spawn en`, spawnPoint);
        } catch (error) {
            console.error('❌ Error cargando nivel:', error);
        }
    }

    clearCurrentScene() {
        if (!this.experience || !this.scene || !this.experience.physics || !this.experience.physics.world) {
            console.warn('⚠️ No se puede limpiar: sistema de físicas no disponible.');
            return;
        }

        let visualObjectsRemoved = 0;
        let physicsBodiesRemoved = 0;

        const childrenToRemove = [];

        this.scene.children.forEach((child) => {
            if (child.userData && child.userData.levelObject) {
                childrenToRemove.push(child);
            }
        });

        childrenToRemove.forEach((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }

            this.scene.remove(child);

            if (child.userData.physicsBody) {
                this.experience.physics.world.removeBody(child.userData.physicsBody);
            }

            visualObjectsRemoved++;
        });

        let physicsBodiesRemaining = -1;

        if (this.experience.physics && this.experience.physics.world && Array.isArray(this.experience.physics.bodies)) {
            const survivingBodies = [];
            let bodiesBefore = this.experience.physics.bodies.length;

            this.experience.physics.bodies.forEach((body) => {
                if (body.userData && body.userData.levelObject) {
                    this.experience.physics.world.removeBody(body);
                    physicsBodiesRemoved++;
                } else {
                    survivingBodies.push(body);
                }
            });

            this.experience.physics.bodies = survivingBodies;

            console.log(`🧹 Physics Cleanup Report:`);
            console.log(`✅ Cuerpos físicos eliminados: ${physicsBodiesRemoved}`);
            console.log(`🎯 Cuerpos físicos sobrevivientes: ${survivingBodies.length}`);
            console.log(`📦 Estado inicial: ${bodiesBefore} cuerpos → Estado final: ${survivingBodies.length} cuerpos`);
        } else {
            console.warn('⚠️ Physics system no disponible o sin cuerpos activos, omitiendo limpieza física.');
        }

        console.log(`🧹 Escena limpiada antes de cargar el nuevo nivel.`);
        console.log(`✅ Objetos 3D eliminados: ${visualObjectsRemoved}`);
        console.log(`✅ Cuerpos físicos eliminados: ${physicsBodiesRemoved}`);
        console.log(`🎯 Objetos 3D actuales en escena: ${this.scene.children.length}`);

        if (physicsBodiesRemaining !== -1) {
            console.log(`🎯 Cuerpos físicos actuales en Physics World: ${physicsBodiesRemaining}`);
        }

        if (this.loader && this.loader.prizes.length > 0) {
            this.loader.prizes.forEach(prize => {
                if (prize.model) {
                    this.scene.remove(prize.model);
                    if (prize.model.geometry) prize.model.geometry.dispose();
                    if (prize.model.material) {
                        if (Array.isArray(prize.model.material)) {
                            prize.model.material.forEach(mat => mat.dispose());
                        } else {
                            prize.model.material.dispose();
                        }
                    }
                }
            });
            this.loader.prizes = [];
            console.log('🎯 Premios del nivel anterior eliminados correctamente.');
        }

        this.finalPrizeActivated = false
        this.loader?.prizes?.forEach(p => {
            if (p.role === "finalPrize" && p.pivot) {
                p.pivot.visible = false;
                if (p.model) p.model.visible = false;
                p.collected = false;
            }
        })


        /** Esto es de faro para limpienza */
        if (this.discoRaysGroup) {
            this.discoRaysGroup.children.forEach(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
            this.scene.remove(this.discoRaysGroup);
            this.discoRaysGroup = null;
        }

        /** Fin faro para limpianza */

    }

    resetRobotPosition(spawn = { x: -17, y: 1.5, z: -67 }) {
        if (!this.robot?.body || !this.robot?.group) return

        this.robot.body.position.set(spawn.x, spawn.y, spawn.z)
        this.robot.body.velocity.set(0, 0, 0)
        this.robot.body.angularVelocity.set(0, 0, 0)
        this.robot.body.quaternion.setFromEuler(0, 0, 0)

        this.robot.group.position.set(spawn.x, spawn.y, spawn.z)
        this.robot.group.rotation.set(0, 0, 0)
        // 🦊 Reposicionar el zorro junto al robot al reiniciar nivel
        if (this.fox?.model) {
            // Colocar al zorro detrás del robot (manteniendo distancia natural)
            const offset = new THREE.Vector3(-2, 0, -2)
            const foxPos = new THREE.Vector3(spawn.x, spawn.y, spawn.z).add(offset)

            this.fox.model.position.copy(foxPos)
            this.fox.model.rotation.set(0, 0, 0)

            console.log('🦊 Fox reposicionado junto al robot en nuevo nivel:', foxPos)
        }

    }

    async _processLocalBlocks(blocks) {
        const preciseRes = await fetch('/config/precisePhysicsModels.json');
        const preciseModels = await preciseRes.json();
        this.loader._processBlocks(blocks, preciseModels);

        this.loader.prizes.forEach(p => {
            if (p.model) p.model.visible = (p.role !== 'finalPrize');
            p.collected = false;
        });

        this.totalDefaultCoins = this.loader.prizes.filter(p => p.role === "default").length;
        console.log(`🎯 Total de monedas default para el nivel local: ${this.totalDefaultCoins}`);
    }

    _checkVRMode() {
        const isVR = this.experience.renderer.instance.xr.isPresenting

        if (isVR) {
            if (this.robot?.group) {
                this.robot.group.visible = false
            }

            // 🔁 Delay de 3s para que no ataque de inmediato en VR
            if (this.enemy) {
                this.enemy.delayActivation = 10.0
            }

            // 🧠 Posicionar cámara correctamente
            this.experience.camera.instance.position.set(5, 1.6, 5)
            this.experience.camera.instance.lookAt(new THREE.Vector3(5, 1.6, 4))
        } else {
            if (this.robot?.group) {
                this.robot.group.visible = true
            }
        }
    }


}