import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'

const gltfLoader = new GLTFLoader()
const fbxLoader = new FBXLoader()
const gltfCache = new Map()
const fbxCache = new Map()

export function loadGLTF(url) {
  if (!gltfCache.has(url)) {
    gltfCache.set(url, new Promise((resolve, reject) => {
      gltfLoader.load(url, resolve, undefined, reject)
    }))
  }
  return gltfCache.get(url)
}

export function loadFBX(url) {
  if (!fbxCache.has(url)) {
    fbxCache.set(url, new Promise((resolve, reject) => {
      fbxLoader.load(url, resolve, undefined, reject)
    }))
  }
  return fbxCache.get(url)
}

export async function cloneGLTFScene(url) {
  const gltf = await loadGLTF(url)
  return cloneSkeleton(gltf.scene)
}

export async function cloneFBX(url) {
  const fbx = await loadFBX(url)
  const clone = cloneSkeleton(fbx)
  clone.animations = (fbx.animations ?? []).map(clip => clip.clone())
  return clone
}

export async function cloneModel(url) {
  const cleanUrl = String(url).split(/[?#]/)[0].toLowerCase()
  if (cleanUrl.endsWith('.glb') || cleanUrl.endsWith('.gltf')) {
    const gltf = await loadGLTF(url)
    const clone = cloneSkeleton(gltf.scene)
    clone.animations = (gltf.animations ?? []).map(clip => clip.clone())
    return clone
  }
  return cloneFBX(url)
}

export async function loadFBXClips(url) {
  const fbx = await loadFBX(url)
  return (fbx.animations ?? []).map(clip => clip.clone())
}

const PRELOAD_TIMEOUT_MS = 8000

const blockingRuntimeGLTFUrls = [
]

const blockingRuntimeFBXUrls = [
]

function withPreloadTimeout(promise, url, timeoutMs = PRELOAD_TIMEOUT_MS) {
  let timeoutId = null
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== null) window.clearTimeout(timeoutId)
  }).catch((error) => {
    console.warn(`Model preload failed: ${url}`, error)
    return null
  })
}

async function preloadModelList(gltfUrls, fbxUrls, onProgress = null) {
  const total = gltfUrls.length + fbxUrls.length
  let loaded = 0

  const update = (url, ok) => {
    loaded += 1
    onProgress?.({ loaded, total, url, ok })
  }

  if (total === 0) {
    onProgress?.({ loaded: 0, total: 0, url: null, ok: true })
    return
  }

  await Promise.all([
    ...gltfUrls.map(url => withPreloadTimeout(loadGLTF(url), url).then(result => update(url, !!result))),
    ...fbxUrls.map(url => withPreloadTimeout(loadFBX(url), url).then(result => update(url, !!result))),
  ])
}

export async function preloadRuntimeModels(onProgress = null) {
  await preloadModelList(
    [...new Set(blockingRuntimeGLTFUrls)],
    [...new Set(blockingRuntimeFBXUrls)],
    onProgress,
  )
}
