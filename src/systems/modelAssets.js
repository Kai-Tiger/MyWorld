import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import { CASTLE_ENTRANCE, CASTLE_ZONES } from '../config/castle.js'
import oldChurchRuinsUrl from '../place/old_church_ruins_medium.glb?url'
import playerStandFbxUrl from '../characters/player/stand.fbx?url'
import playerWalkFbxUrl from '../characters/player/walk.fbx?url'
import playerRunFbxUrl from '../characters/player/run.fbx?url'
import playerAttackFbxUrl from '../characters/player/attack.fbx?url'
import playerAttack2FbxUrl from '../characters/player/SwordAttack2.fbx?url'
import playerJumpFbxUrl from '../characters/player/jump.fbx?url'
import playerRollFbxUrl from '../characters/player/roll.fbx?url'
import playerThrowMagicFbxUrl from '../characters/player/throwMagic.fbx?url'
import playerDefenseFbxUrl from '../characters/player/defense.fbx?url'
import playerDefenseMoveFbxUrl from '../characters/player/defenseMove.fbx?url'
import playerHurtFbxUrl from '../characters/player/hurt.fbx?url'
import playerHealFbxUrl from '../characters/player/heal.fbx?url'
import playerPickFbxUrl from '../characters/player/pick.fbx?url'
import playerSitFbxUrl from '../characters/player/sit.fbx?url'
import playerHammerGlbUrl from '../weapons/hammer.glb?url'
import npcF1Url from '../characters/npc/f1.fbx?url'
import npcF2Url from '../characters/npc/f2.fbx?url'
import enemyMainFbxUrl from '../characters/enemy/main.fbx?url'
import enemyE2FbxUrl from '../characters/enemy/e2.fbx?url'
import enemySitFbxUrl from '../characters/enemy/sit.fbx?url'
import enemyStandFbxUrl from '../characters/enemy/Stand.fbx?url'
import enemyRunFbxUrl from '../characters/enemy/run.fbx?url'
import enemyWalkFbxUrl from '../characters/enemy/walk.fbx?url'
import enemyAttackFbxUrl from '../characters/enemy/attack.fbx?url'
import enemyHurtFbxUrl from '../characters/enemy/hurt.fbx?url'
import enemyDeathFbxUrl from '../characters/enemy/death.fbx?url'

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

const runtimeGLTFUrls = [
  playerHammerGlbUrl,
  oldChurchRuinsUrl,
  CASTLE_ENTRANCE.modelUrl,
  ...CASTLE_ZONES.map(zone => zone.modelUrl),
  '/models/trees/custom_tree.glb',
  '/models/rocks/namaqualand_boulder_03/namaqualand_boulder_03_1k.gltf',
  '/models/terrain/grass-hill.glb',
  '/models/terrain/stone-mountain.glb',
  '/models/terrain/grass-forest.glb',
  '/models/terrain/stone-rocks.glb',
  '/models/grass/grass_clump_low.glb',
  '/models/outdoor_landmarks/outdoor_landmarks.glb',
]

const runtimeFBXUrls = [
  playerStandFbxUrl,
  playerWalkFbxUrl,
  playerRunFbxUrl,
  playerAttackFbxUrl,
  playerAttack2FbxUrl,
  playerJumpFbxUrl,
  playerRollFbxUrl,
  playerThrowMagicFbxUrl,
  playerDefenseFbxUrl,
  playerDefenseMoveFbxUrl,
  playerHurtFbxUrl,
  playerHealFbxUrl,
  playerPickFbxUrl,
  playerSitFbxUrl,
  enemyDeathFbxUrl,
  npcF1Url,
  npcF2Url,
  enemyMainFbxUrl,
  enemyE2FbxUrl,
  enemySitFbxUrl,
  enemyStandFbxUrl,
  enemyRunFbxUrl,
  enemyWalkFbxUrl,
  enemyAttackFbxUrl,
  enemyHurtFbxUrl,
  '/models/cloud.fbx',
  '/models/terrain.fbx',
]

export async function preloadRuntimeModels(onProgress = null) {
  const gltfUrls = [...new Set(runtimeGLTFUrls)]
  const fbxUrls = [...new Set(runtimeFBXUrls)]
  const total = gltfUrls.length + fbxUrls.length
  let loaded = 0

  const update = (url, ok) => {
    loaded += 1
    onProgress?.({ loaded, total, url, ok })
  }

  await Promise.all([
    ...gltfUrls.map(url => loadGLTF(url)
      .then(() => update(url, true))
      .catch(error => {
        console.warn(`Model preload failed: ${url}`, error)
        update(url, false)
      })),
    ...fbxUrls.map(url => loadFBX(url)
      .then(() => update(url, true))
      .catch(error => {
        console.warn(`Model preload failed: ${url}`, error)
        update(url, false)
      })),
  ])
}
