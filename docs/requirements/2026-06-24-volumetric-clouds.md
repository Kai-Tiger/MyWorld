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
