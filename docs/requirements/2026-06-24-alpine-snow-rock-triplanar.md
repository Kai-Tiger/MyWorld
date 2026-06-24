# 雪山地形贴图重做:三平面投影 + 真实阿尔卑斯岩雪混合

## 背景与目标

山体在陡坡上出现整片竖直拉丝/涂抹,雪山质感很假。根因(已核查代码确认):

- 地形片元着色器里所有纹理与程序化噪声均用俯视平面投影 `vWorldPos.xz * scale` 采样
  (`src/scene/map.js` 的 `createTerrainDirtRockMaterial()` / `onBeforeCompile`)。近垂直坡面上
  世界 XZ 几乎不随高度变化,贴图被沿竖直方向无限拉伸成条纹。
- 顶点法线 `(-dhdx, dhdz, 1)`(`src/scene/heightmapTerrain.js:161-163`)配合 mesh `rotation.x=-π/2`
  映射到世界空间为 `(-dhdx, 1, -dhdz)`,正确,不改。
- 雪/高山岩为纯程序化色 + XZ 噪声,色彩平板、雪线被竖直拉伸,缺岩雪交错与阴影冷蓝。

目标:用三平面投影消除拉丝,并重做高山岩/雪混合,接近真实阿尔卑斯雪山——岩石按坡度分层、
雪在缓坡/凹处堆积、雪线随地形自然犬牙交错、阴影面冷蓝调。复用现有 Rock064 PBR 贴图,
雪保持程序化(加细颗粒)。

## 成功标准

- 雪山陡坡正面/俯视机位均无竖直拉丝,纹理沿坡面正常铺贴。
- 雪线随地形犬牙交错,陡面露岩、缓坡积雪,阴影面呈冷蓝。
- 平地草地/河岸观感无回归。
- 帧率无明显下降(关注分块加载卡顿)。

## 计划改动(均在 `src/scene/map.js` 地形材质着色器内)

1. 新增 GLSL 工具:`tpWeights()` 法线驱动权重、`triplanarColor(tex, scale, w)`、`terrainNoiseTP(scale, w)`。
2. 反照率 `dirtColor`/`rockColor` 改三平面采样(`<map_fragment>` 块)。
3. 岩石法线 `uRockNormalMap` 用 Whiteout blend 三平面(`<normal_fragment_maps>` 的 tangent-space 分支),
   dirt 法线 / roughness / AO 保持平面采样以省开销。
4. 重做高山岩(分层明暗+颗粒)与雪(缓坡堆积、犬牙雪线、冷蓝阴影、细颗粒),
   去掉会竖直拉伸的 `terrainNoise(vWorldPos.xz*…)`。
5. `customProgramCacheKey` 升级 `terrain-dirt-rock-pbr-v3` → `v4` 强制重编译。

## 测试 / 验证计划

1. 启动游戏(`npm run dev` 或既有方式)。
2. 用 `window.__MY_GAME_DEBUG__` + Playwright MCP teleport 到雪山陡坡正面与俯视机位,改动前后截图对比。
3. 目测帧率与分块加载卡顿。若 triplanar 拖慢,可把岩石法线退回平面、仅保留反照率三平面。

## 实施结果与方案调整（2026-06-24 联调后）

联调发现"竖直条纹"有两层成因,且最终按用户选择"保留陡峰 + 改贴图为岩雪"定案:

1. **贴图拉伸**(已修):三平面投影生效。用投影权重可视化确认平地用俯视投影、陡面自动切到侧投影,贴图不再竖直拉伸。
2. **山脚撞平地的硬切墙**:定位到 `applySnowMountainHeight` 末尾 `Math.max(0, mountainLift-100)` 在等高线上削平山脚。曾尝试平滑膝盖/空间平滑放缓整座山,但用户选择**保留陡峰、不动地形**,故几何已**全部还原为原始**。
3. **绿草爬上近垂直崖面**(真正的"假"):河道穿山使 2D 距离近,河岸地衣绿 + 草色染到高崖。新增**陡面强制裸岩覆盖**(`cliffMask`:坡度+海拔门控)把陡面渲染成中性冷灰岩;并把高山岩覆盖区间下探(`snowMountainMask` 22→64m)抑制中高坡草色。陡面现读作真实阿尔卑斯岩雪壁。

着色器缓存键最终为 `terrain-dirt-rock-pbr-v6`。`applySnowMountainHeight` 几何无净改动。

## 第二轮:山脚缓坡(锥形膨胀) + 水潭拉平降水面(2026-06-24)

用户澄清"保留陡峰"指**山顶尖锐**,山脚那种近垂直"墙"要改缓(允许改地形)。

- **山脚锥形膨胀**(`applySnowMountainHeight`):证伪了平滑(对恒定坡度墙无效)/加宽 body(ringing)。
  改用 morphological dilation:地形 = 各山峰**双段锥**的上包络(`snowMountainConeLift`):顶部陡段
  (`SNOW_CONE_TOP_R=110`、`SNOW_SLOPE_TOP=2.1`≈65° 尖峰)+ 山脚缓段(`SNOW_SLOPE_FOOT=1.0`≈45°)。
  实测山脚坡度从 ~83° 降到 40-45°、无墙,峰心高度保留(272/257/198;最高峰被原 river pass 下压属既有)。
  锥顶集合 `SNOW_APEXES`=4 峰 + 5 条 ridgeLine 采样;`SNOW_BBOX` 包围盒早退优化。
  雪线下移(settledSnow `70→46`、streakSnow `68→44`)让中上坡覆雪,远景为尖锐白雪峰。
- **水潭拉平降水面**(B2 被否后改 B1 思路):潭 ④`(-146,80)`/②`(-160,34)` 处是 -11~-18 深 rill 盆地;
  把 `bedY/surfaceY` 降到盆地高度(④ -16/-15,② -17/-16),`applyConfluencePoolCarve` 双向 lerp 拉平 →
  水齐平嵌入盆地、不再凸成圆顶、无台阶。
- 着色器缓存键 `v6→v7`。

## 假设与不做项

- 假设 `vWorldNormal` 已作为 varying 传入片元(代码中已使用)。
- 不做:日照金山 alpenglow(需太阳方向 uniform 与昼夜系统耦合)。
- 不做:下载新雪/岩贴图;雪保持程序化,岩石复用 Rock064。
- 不做:修改高度图、分块尺寸、法线生成。
