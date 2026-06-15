import * as THREE from 'three'

const _tmpForward = new THREE.Vector3()
const _tmpRight = new THREE.Vector3()
const _tmpOffset = new THREE.Vector3()
const _tmpDesired = new THREE.Vector3()
const _tmpRayDir = new THREE.Vector3()

export class ThirdPersonCameraController {
  constructor(domElement, {
    fov = 62,
    near = 0.1,
    far = 260,
    distance = 5.2,
    minDistance = 3.2,
    maxDistance = 7.5,
    pitch = 0.3316,
    yaw = Math.PI * 0.75,
    minPitch = THREE.MathUtils.degToRad(-30),
    maxPitch = THREE.MathUtils.degToRad(45),
    rotateSpeed = 0.004,
    zoomSpeed = 0.0015,
    damping = 10,
    targetOffset = new THREE.Vector3(0, 1.35, 0),
    occlusionPadding = 0.2,
    occlusionMinDistance = 1.05,
  } = {}) {
    this.domElement = domElement
    this.camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far)

    this.distance = distance
    this.minDistance = minDistance
    this.maxDistance = maxDistance
    this.pitch = pitch
    this.yaw = yaw
    this.minPitch = minPitch
    this.maxPitch = maxPitch
    this.rotateSpeed = rotateSpeed
    this.zoomSpeed = zoomSpeed
    this.damping = damping
    this.targetOffset = targetOffset.clone()
    this.occlusionPadding = occlusionPadding
    this.occlusionMinDistance = occlusionMinDistance
    this.enabled = true

    this._lookTarget = new THREE.Vector3()
    this._isRotating = false
    this._raycaster = new THREE.Raycaster()
    this._collisionObjects = null

    this._onMouseDown = (e) => {
      if (!this.enabled) return
      if (e.button !== 0 && e.button !== 2) return
      this._isRotating = true
      e.preventDefault()
    }
    this._onMouseUp = (e) => {
      if (e.button === 0 || e.button === 2) this._isRotating = false
    }
    this._onMouseMove = (e) => {
      if (!this.enabled) return
      if (!this._isRotating) return
      this.yaw -= e.movementX * this.rotateSpeed
      this.pitch += e.movementY * this.rotateSpeed
      this.pitch = THREE.MathUtils.clamp(this.pitch, this.minPitch, this.maxPitch)
      e.preventDefault()
    }
    this._onWheel = (e) => {
      if (!this.enabled) return
      this.distance += e.deltaY * this.zoomSpeed
      this.distance = THREE.MathUtils.clamp(this.distance, this.minDistance, this.maxDistance)
      e.preventDefault()
    }
    this._onContextMenu = (e) => e.preventDefault()

    domElement.addEventListener('mousedown', this._onMouseDown)
    window.addEventListener('mouseup', this._onMouseUp)
    window.addEventListener('mousemove', this._onMouseMove)
    domElement.addEventListener('wheel', this._onWheel, { passive: false })
    domElement.addEventListener('contextmenu', this._onContextMenu)
  }

  _desiredPosition(targetPos, out) {
    const cp = Math.cos(this.pitch)
    _tmpOffset.set(
      Math.sin(this.yaw) * cp,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cp,
    ).multiplyScalar(this.distance)
    out.copy(targetPos).add(this.targetOffset).add(_tmpOffset)
    return out
  }

  getLookTarget() {
    return this._lookTarget
  }

  getDesiredState(targetPos, outPos, outLook) {
    outLook.copy(targetPos).add(this.targetOffset)
    this._desiredPosition(targetPos, _tmpDesired)
    this._resolveOcclusion(outLook, _tmpDesired, outPos)
  }

  syncToTarget(targetPos) {
    this._lookTarget.copy(targetPos).add(this.targetOffset)
    this._desiredPosition(targetPos, _tmpDesired)
    this._resolveOcclusion(this._lookTarget, _tmpDesired, this.camera.position)
    this.camera.lookAt(this._lookTarget)
  }

  update(dt, targetPos) {
    const desiredLook = _tmpForward.copy(targetPos).add(this.targetOffset)
    const desiredPos = _tmpRight
    this._desiredPosition(targetPos, _tmpDesired)
    this._resolveOcclusion(desiredLook, _tmpDesired, desiredPos)

    const t = 1 - Math.exp(-this.damping * dt)
    this._lookTarget.lerp(desiredLook, t)
    this.camera.position.lerp(desiredPos, t)
    this.camera.lookAt(this._lookTarget)
  }

  _isCameraIgnored(obj) {
    let p = obj
    while (p) {
      if (p.userData?.cameraIgnore) return true
      p = p.parent
    }
    return false
  }

  _resolveOcclusion(lookPos, desiredPos, outPos) {
    if (!this._collisionObjects || this._collisionObjects.length === 0) {
      outPos.copy(desiredPos)
      return
    }

    _tmpRayDir.subVectors(desiredPos, lookPos)
    const fullDist = _tmpRayDir.length()
    if (fullDist <= 0.0001) {
      outPos.copy(desiredPos)
      return
    }

    _tmpRayDir.multiplyScalar(1 / fullDist)
    this._raycaster.set(lookPos, _tmpRayDir)
    this._raycaster.near = 0.02
    this._raycaster.far = fullDist
    const hits = this._raycaster.intersectObjects(this._collisionObjects, true)

    for (const hit of hits) {
      if (!hit.object?.isMesh) continue
      if (this._isCameraIgnored(hit.object)) continue
      const safeDist = THREE.MathUtils.clamp(
        hit.distance - this.occlusionPadding,
        this.occlusionMinDistance,
        fullDist,
      )
      outPos.copy(lookPos).addScaledVector(_tmpRayDir, safeDist)
      return
    }

    outPos.copy(desiredPos)
  }

  setCollisionObjects(objects) {
    this._collisionObjects = objects
  }

  getMoveBasis(outForward, outRight) {
    outForward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize()
    outRight.set(-outForward.z, 0, outForward.x).normalize()
  }

  setEnabled(enabled) {
    this.enabled = !!enabled
    if (!this.enabled) this._isRotating = false
  }

  dispose() {
    this.domElement.removeEventListener('mousedown', this._onMouseDown)
    window.removeEventListener('mouseup', this._onMouseUp)
    window.removeEventListener('mousemove', this._onMouseMove)
    this.domElement.removeEventListener('wheel', this._onWheel)
    this.domElement.removeEventListener('contextmenu', this._onContextMenu)
  }
}
