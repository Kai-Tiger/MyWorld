# 体积云（Volumetric Raymarched Clouds）

## 背景与目标
当前云画在跟随相机的天空穹顶（`SphereGeometry(180)`）上，用 `dir.xz/(dir.y+0.32)` 的 2D 投影 + 噪声生成，本质是「贴在球壳上的一张图」，没有空间位置、深度、自阴影或视差，看起来像假贴图。

目标：把云替换为**体积光线步进云**——光线穿过空间中一层真实云体，逐点采样 3D 噪声密度并朝太阳二次步进算自阴影，得到柔软蓬松、云顶亮云底暗、有体积深度、随相机移动有视差的积云（参考真实积云照片）。

## 成功标准
- 从玩家眼高抬头看：云有明显体积感（云顶亮、云底/内部暗、边缘 silver lining），不是平面贴图。
- 相机平移时云相对地平线有视差（确认是空间实体）。
- 云量为晴天散布的蓬松积云 + 大片蓝天，贴近参考图。
- 看向地平线/低头时无云突兀出现，与雾色 `#cfe2f3` 平滑过渡；太阳被云遮挡时光盘消失。
- 画质优先默认档，提供质量旋钮在战斗/低端自动降步数，保证帧率。

## 计划改动
- `src/scene/sky.js`：
  - 新增 uniforms：`uCameraPos`、`uCloudBottom/uCloudTop`、`uCloudDensity`、`uWindDir/uWindSpeed`、`uDensitySteps/uLightSteps`、`uMaxDist`；`uCloudCover` 调到 ~0.62。
  - 片元着色器新增 3D 噪声 `hash3/noise3/fbm3`（保留 2D 函数供太阳光晕/dither）。
  - 用体积 raymarch 替换原 2D 云块：`sampleDensity`（fbm3 + 覆盖阈值 + slab 高度梯度 + 风）、`intersectSlab`（`rd.y<0.02` 裁剪 + `uMaxDist` clamp）、主循环前到后合成（抖动起步 + lightMarch Beer/Powder + early-out）、与天空/太阳光盘/雾合成 + 防过曝 `min`。
  - `onBeforeRender` 写 `uCameraPos = camera.position`；`update` 签名不变；返回对象加 `setQuality(q)`。
- `src/main.js`（可选）：战斗降 pixelRatio 处接 `sky.setQuality(0.5)`，平时 `1.0`。

## 测试 / 验证计划
用项目无头流程（puppeteer-core + 系统 Chrome swiftshader，vite 绑 `127.0.0.1:3001`）从玩家眼高（非俯瞰）抬头 30°~80° 截图自检：体积感、视差、云量、地平线过渡、太阳遮挡、战斗降档帧率。

## 假设与范围外
- 假设：白天锁定（`sunPhase=0.95` 固定），太阳方向不变，云色一次调好即可。
- 范围外：昼夜/天气系统、动态云量、降雨、后处理（EffectComposer）、低分辨率离屏渲染云再上采样（如帧率不够再作为后续优化）。

## 补记：第二轮「去噪 + 更大更蓬松」（单遍高质调优）
首版体积云成功（有体积/深度/视差），但云面是雪花点噪点。根因：逐像素白噪声整步抖动 + 步数偏少 + 高频细节扣减，无 TAA 抹平。修复（全部在 `sky.js`）：
- 白噪声整步抖动 → **交错梯度噪声（IGN）**：屏幕稳定、低方差，消色带且不产生雪花点。
- 密度步数 30→64（循环上限 96）、`noise3` 改 **quintic 插值**、移除高频 `detail` 扣减、`lightMarch` 6→8 步。
- **空间跳过**：空气 2× 大步穿过、云体 1× 细步密采，控成本。
- 更大更蓬松：`CLOUD_SCALE` 1/440→1/750、slab 480→1050、密度圆化、`uCloudDensity` 1.7。
- 提亮：吸收 `exp(-ls*0.55)`、`uCloudShadow` 调亮 `#c4d2e2`、powder 银边，避免灰暗。
- `setQuality(q)` lerp 范围更新为密度 32→80 / 光照 4→10。
- 验证已通过：云面光滑无噪点、亮白柔软蓬松、散布 + 大片蓝天、平移相机视差成立。

## 补记：第三轮「消除横向条纹 + 柔软自然」
实拍截图发现云体内有横向条纹（raymarch slicing artifact），且边缘偏硬。修复（全在 `sky.js`）：
- **条纹根因**：① 空气 2× 大步量化命中点（主因）；② 固定步数→低仰角步长暴涨；③ 仅起步抖动只平移不打散。
- **消条纹**：删空气大步、空/实统一步长推进；改**固定世界步长 `uWorldStep=22` + 距离增长 `uStepGrowth`**（近细远粗）；远端 `distFade`（uFadeNear/Far 1500/3500）融入地平线，96 步截断不可见；起步用静态屏幕 IGN（不含 uTime）。
- **柔软**：去密度二次圆化、过渡带加宽到 0.45、高度梯度顶底羽化；新增中频 `detail` 仅侵蚀边缘带（云心不动）→ 内部光滑边缘碎软。
- **光照**：方向性提亮 `phaseLight = 0.85 + 0.45*pow(mu,2.5)`（背阳略暗不灰死、朝阳提亮，取代会把云压灰的裸 HG 乘子）；云顶亮白→云底蓝灰高度环境梯度；powder 银边。
- 参数重标定：`uCloudCover 0.56`、`uCloudDensity 1.5`、`uLightSteps 6`；`setQuality` 改缩放 `uWorldStep 34→18`。
- 验证已通过：近水平低仰角**无横向条纹**、边缘柔软羽化、内部明暗自然、朝阳侧提亮不过曝、远端无截断硬边。

## 补记：第四轮「修黑边（预乘 alpha bug）+ 云核鼓包」
近距离截图发现云边缘有**深灰/黑色描边**，且云核均匀偏糊。修复（全在 `sky.js`）：
- **黑边根因（数学验证）= 预乘 alpha 双重衰减**：`scatter` 已是预乘色，`mix(sky,cloudRGB,cloudA)` 又乘一次 cloudA → 边缘比纯天空更暗。改**预乘 over 合成** `sky = sky*(1-cloudA) + cloudRGB`；远端/地平线淡出合成 `fade` 同时乘到 `cloudA` 与 `cloudRGB`（能量一致）。`col` 软上限 `min(col,1.18)` 防死白。
- **云核鼓包**：中频 `fbm3_2`（2 oct）扰动塑形 `shape = base + (mid-0.375)*0.38` → 中等尺度鼓包轮廓；过渡带 0.45→0.38 收紧；云核内 `lump` 明暗调制。`CLOUD_SCALE 1/750→1/620`。
- **性能优化**：`sampleDensity(wp, lod)`，`lightMarch` 用 `lod=1` 跳过高频 detail；`fbm3` 降为 3 oct + 新增 `fbm3_2` 2 oct → lightMarch 每点 5 oct（比原 8 oct 更省）。删死代码 `hg()`。
- 验证已通过：黑边消失、鼓包轮廓出现、无条纹/无过曝/无颗粒。
- 备注：贴脸看云仍偏「大白块」，离参考图丰富多级鼓包/沟壑尚有差距；进一步精修建议在真实游戏视角反馈后做更激进多频塑形（有颗粒/过曝翻车风险，需逐步验证）。

## 补记：第五轮「Worley 云絮边缘 + 表面细节（去糊）」
反馈：仍偏糊、边缘缺真实云「一簇一簇花椰菜」感、极淡残留斜纹。
- **根因**：密度场全用 value-noise fbm（低通、等值面平滑斜坡）→ 只能均匀羽化边缘、糊面。云絮需 **Worley(cellular) F1 距离场**（圆形包络啃出簇状轮廓）+ **billow**（外凸鼓包）。
- **新增噪声**：`billow3`（3 oct `|2n-1|`）、`worley3`（3×3×3=27 邻域 F1 平方距离）、`cellPoint`。
- **sampleDensity(wp, lod, detailLOD)**：表面 `surf=billow3(sp*3.0)` 叠进塑形去糊；边缘块改用 `worley3(sp*2.6)` + `fine billow3(sp*5.5)` 侵蚀，仅过渡带 `edgeBand`、`detailLOD>0.05`、`lod<0.5` → 轮廓成花椰菜簇、云心保形、远云/lightMarch 跳过。**所有高频只喂世界坐标 sp → 不颗粒。**
- **消斜纹**：`uWorldStep 22→14`（匹配高频 Nyquist，主因）+ 每步相位微扰 `t+stepLen*(ign-0.5)*0.6`（屏幕稳定 ign，不含 uTime）。
- **远云 LOD**：`detailLOD = 1-smoothstep(800,2600, t-tEnter)` 关最贵的 worley（被雾吃掉，零损失）。
- 参数：`uCloudCover 0.62→0.58`、`uCloudDensity 1.5→1.6`、`uStepGrowth 0.0015→0.0018`；`setQuality` 区间 `uWorldStep 26→12`。
- **性能**：≈前版 1.6–2×（worldStep 减半 + worley，门控控成本）。`setQuality(0.4)` 已接入 `main.js` `setCombatPerfMode`（战斗降档/恢复）。
- 验证：边缘出现簇状碎块（Worley 生效）、无黑边/斜纹/过曝/颗粒；受无头脚本程序化云尺度限制，未能复现用户级贴脸特写——表面花椰菜细节待真实游戏视角反馈后微调（侵蚀强度/云团大小/表面振幅）。

## 补记：第六轮「收窄云尺寸分布（去超大连片云 + 去小碎云）」
反馈：有一朵特别大的云 + 一些小碎云想去掉。目标：适量中等云 + 较多蓝天。程序化云无「单朵」可删，改为统计性约束尺寸分布。
- **去小碎云**：`uCloudCover 0.58→0.64`（刚过阈值的小斑消失）；Worley 侵蚀强度 `0.6→0.4` + edgeBand 收窄 `smoothstep(0.05,0.55)→(0.12,0.5)`（保留簇感、不啃出孤立碎渣）。
- **去超大连片云**：新增超低频覆盖调制 `region = fbm3_2(sp*0.45)`（~1400 单位），`coverLocal = uCloudCover + (0.5-region)*0.20` → 天空分有云区/无云区，超大连片被切成几团中等云 + 蓝天间隙。
- 验证（多风相位 + 多方向广角巡查）：无超大连片云、云尺寸集中中等、大片蓝天，碎渣减少；保留花椰菜簇边缘、无黑边/斜纹/过曝/颗粒。最终观感以真实游戏视角为准，可继续微调 cover/break-up 振幅。

## 补记：第七轮「消斜向网点 + 单遍减糊」
贴脸近看暴露斜向网点纹理 + 糊。方向：单遍内优化（不上离屏）。
- **网点根因**：每步相位微扰 `t+stepLen*(ign-0.5)*0.6` 整条 ray 同一 IGN 相位 → 半透明区印 IGN 屏幕斜向 pattern。**去掉每步微扰**（采样点改回 `ro+dir*t`，仅保留起步 ign 抖动）。
- **减糊/增清晰**：`uWorldStep 14→11`（采样更密、消残留 banding）；过渡带 `+0.34→+0.22`（边缘更实）；Worley 侵蚀 `0.4→0.55`（恢复花椰菜簇，edgeBand 仍收窄不回碎渣）；surf 振幅 `0.16→0.20`（云面锐结构）。
- `setQuality` 区间对齐新默认（q=1 → worldStep 11）。性能约 +27%，战斗 setQuality(0.4) 兜底。
- 验证：斜向网点消失、近云团边缘清晰有簇结构、不回退碎云/超大云、维持散积云+蓝天。受程序化云尺度限制无头未拍到极贴脸大特写，以真实游戏视角为准。
