import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const loader = new GLTFLoader()
const H = '/models/holiday/'

function place(scene, file, x, y, z, rotY = 0, scale = 1) {
  loader.load(H + file, (gltf) => {
    const mesh = gltf.scene
    mesh.position.set(x, y, z)
    mesh.rotation.y = rotY
    mesh.scale.setScalar(scale)
    mesh.traverse(c => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
    })
    scene.add(mesh)
  })
}

export function createHolidayDecorations(scene) {
  // ── 大圣诞树（中心焦点）────────────────────────────
  place(scene, 'tree-decorated-snow.glb', -5, 0, -12, 0, 3)

  // ── 雪地地毯（铺在树下）───────────────────────────
  place(scene, 'snow-flat-large.glb', -5, 0.01, -12, 0, 4)

  // ── 雪人 ──────────────────────────────────────────
  place(scene, 'snowman.glb',     -9,  0, -11, Math.PI * 0.3, 1.8)
  place(scene, 'snowman-hat.glb', -9,  0, -11, Math.PI * 0.3, 1.8)

  // ── 礼品盒（围绕圣诞树）──────────────────────────
  place(scene, 'present-a-cube.glb',      -3.5, 0, -11,   Math.PI * 0.1, 1.2)
  place(scene, 'present-a-rectangle.glb', -4.0, 0, -12.8, Math.PI * 0.8, 1.2)
  place(scene, 'present-b-cube.glb',      -6.0, 0, -10.5, Math.PI * 1.5, 1.1)
  place(scene, 'present-a-cube.glb',      -6.5, 0, -13.2, Math.PI * 0.5, 0.9)
  place(scene, 'present-b-cube.glb',      -4.8, 0, -13.3, Math.PI * 1.2, 1.0)

  // ── 拐杖糖（夹道圣诞树两侧）──────────────────────
  place(scene, 'candy-cane-red.glb',   -2.8, 0, -12,   0,             1.6)
  place(scene, 'candy-cane-green.glb', -7.2, 0, -12,   0,             1.6)
  place(scene, 'candy-cane-red.glb',   -3.2, 0, -10.4, Math.PI * 0.15, 1.3)
  place(scene, 'candy-cane-green.glb', -6.8, 0, -10.4, Math.PI * 1.85, 1.3)

  // ── 长椅（面朝圣诞树）────────────────────────────
  place(scene, 'bench.glb', -2.0, 0, -13.8, Math.PI * 0.5,  1.6)
  place(scene, 'bench.glb', -8.0, 0, -13.8, Math.PI * 1.5,  1.6)

  // ── 彩灯 ─────────────────────────────────────────
  place(scene, 'lights-colored.glb', -5, 0.05, -10.5, 0, 2.5)

  // ── 小火车（圆形轨道）────────────────────────────
  //   轨道以 (-5.5, -16.5) 为中心，件间距 2（scale=2 时每块宽 2m）
  // 四角
  place(scene, 'trainset-rail-corner.glb', -3.5, 0, -15,   0,             2)  // NE
  place(scene, 'trainset-rail-corner.glb', -7.5, 0, -15,   Math.PI * 0.5, 2)  // NW
  place(scene, 'trainset-rail-corner.glb', -7.5, 0, -18,   Math.PI,       2)  // SW
  place(scene, 'trainset-rail-corner.glb', -3.5, 0, -18,   Math.PI * 1.5, 2)  // SE
  // 北直道
  place(scene, 'trainset-rail-straight.glb', -5.5, 0, -15,   0,             2)
  // 南直道
  place(scene, 'trainset-rail-straight.glb', -5.5, 0, -18,   0,             2)
  // 西直道
  place(scene, 'trainset-rail-straight.glb', -7.5, 0, -16.5, Math.PI * 0.5, 2)
  // 东直道
  place(scene, 'trainset-rail-straight.glb', -3.5, 0, -16.5, Math.PI * 0.5, 2)
  // 火车头 + 车厢
  place(scene, 'train-locomotive.glb', -5.5, 0, -15.5, Math.PI, 2)
  place(scene, 'train-wagon.glb',      -5.5, 0, -17,   Math.PI, 2)

  // ── 驯鹿 + 雪橇 ──────────────────────────────────
  place(scene, 'sled.glb',     3.5, 0, -15,   Math.PI * 0.85, 1.8)
  place(scene, 'reindeer.glb', 1.5, 0, -14.5, Math.PI * 0.85, 1.8)
  place(scene, 'reindeer.glb', 2.5, 0, -13.8, Math.PI * 0.85, 1.8)

  // ── 路灯（通往广场的小路两侧）────────────────────
  place(scene, 'lantern.glb', -1.5, 0,  -9,   0, 1.8)
  place(scene, 'lantern.glb', -8.5, 0,  -9,   0, 1.8)
  place(scene, 'lantern.glb',  0.5, 0, -12,   0, 1.8)
  place(scene, 'lantern.glb', -10.5, 0, -12,  0, 1.8)
  place(scene, 'lantern.glb', -1.5, 0, -17,   0, 1.8)
  place(scene, 'lantern.glb', -8.5, 0, -17,   0, 1.8)

  // ── 雪松（背景装饰）──────────────────────────────
  place(scene, 'tree-snow-a.glb', -14, 0,  -8,  Math.PI * 0.2, 2.2)
  place(scene, 'tree-snow-b.glb', -14, 0, -14,  Math.PI * 1.3, 2.2)
  place(scene, 'tree-snow-c.glb', -13, 0, -20,  0,             2.0)
  place(scene, 'tree-snow-a.glb',  0,  0, -20,  Math.PI * 0.7, 2.0)
  place(scene, 'tree-snow-b.glb',  1,  0,  -8,  Math.PI * 1.8, 2.0)
  place(scene, 'tree-snow-c.glb', -3,  0, -20,  Math.PI * 0.5, 1.8)

  // ── 散落雪堆 ─────────────────────────────────────
  place(scene, 'snow-flat.glb',  -10, 0.01, -16.5, Math.PI * 0.3, 2.5)
  place(scene, 'snow-flat.glb',    1, 0.01, -15,   Math.PI * 1.1, 2.5)
  place(scene, 'snow-pile.glb', -1.5, 0,    -14,   0,             1.6)
  place(scene, 'snow-pile.glb',  -11, 0,    -10,   Math.PI * 0.6, 1.6)
  place(scene, 'snow-pile.glb',    3, 0,    -18,   Math.PI * 1.4, 1.4)
}
