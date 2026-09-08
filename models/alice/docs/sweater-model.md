# 黑色高领毛衣装 · 2026-09-08

桌面 `立绘/1` 的 36 张 PNG 接入为独立 `sweater` 套装。运行资源位于 `public/models/alice-sweater/`，源文件只读保留。使用现有 Canvas/WebGL 分层、身体网格、短发惯性、表情调度、聊天口型、按需载入与整图回退体系。

每次新打开或刷新网页，在全部已注册套装中等概率选择一次；仅在当前页面内存保留结果。聊天、切换语言或页面板块不会更换套装。允许连续刷新抽到同一套，自动姿态仅使用本套支持的七种姿态。

## 原画与表情

表中编号省略 `ARI_A_01_` 与 `-HD.png`。完整表情每隔 4–8 秒从当前姿态的原画状态中选择，不连续重复，保留眉眼、口型、脸部阴影及其他细节。

| 姿态 | 中性原画 | 自动收眼 | 聊天嘴型 | 完整状态数 |
| --- | --- | --- | --- | --- |
| 常态 `idle` | 02_00 | 02_01 / 02_05 | 02_02 | 6 |
| 托腮 `thinking` | 03_00 | 03_01 / 03_05 | 03_04 | 7 |
| 正面垂手 `relaxed` | 08_00 | 08_04（半闭） | 08_02 | 7 |
| 掩嘴 `hand-over-mouth` | 10_00 | 10_04（闭眼） | 保持手部遮挡 | 8 |
| 侧身垂手 `side` | 14_00 | 14_02（闭眼） | 保持原嘴型 | 3 |
| 侧身收手 `side-folded` | 16_00 | 16_01（闭眼） | 保持原嘴型 | 2 |
| 前倾 `shy` | 19_02 | 19_00（闭眼） | 保持原嘴型 | 3 |

正面垂手没有完全闭眼原画，前倾的中性原画本身为半睁眼、微张嘴，保留原画效果。完整表情驻留时不会被中性眨眼或嘴型覆盖。

掩嘴另含 `ari_a_01_10_00_01_00-HD.png`，尺寸为 1284×5268；常规掩嘴为 1254×5238。其四周增加约 15 像素边距，且全身像素均存在差异，所以使用独立的 `layers/hand-over-mouth-soft` 完整绑定，不作为重复文件或局部脸部贴片处理。此状态保持自己的眼口原画。

## 绑定与资源

七种姿态与一张特殊全身差分共八个完整绑定，每个包含 13 张基础运行纹理，共 104 张；另有 28 组完整表情颜色/透明度补丁及对应整图回退。身体纹理高度最多 3600，其他分层与表情补丁采用无损 WebP。制作用 PNG 留在本地，静态打包仅保留运行 WebP。

短直发使用各姿态单独标定的轮廓。前倾头部避开右肩；领口和项链保持在身体层。托腮、掩嘴头部与上半身使用相同变换，保持手脸接触；侧身收手不施加局部手臂摆动，前倾的手藏在背后。身体呼吸和换重心沿用现有动作。

共用的原画分层制作过程从长裙脚本提取到 `prepare-native-outfit.cjs`，各套装分别提供自己的原画路径、解剖坐标与动作参数。表达生成支持 `--model sweater`，只重新制作本套素材，并在结束时读取最新目录合并本套登记。不同任务的最终目录写入应串行执行。

## 复现与验证

使用本机已有 Node 24、sharp 和 @napi-rs/canvas，无需增加网站依赖：

```sh
node models/alice/scripts/prepare-alice-sweater.cjs
node models/alice/scripts/prepare-alice-expressions.cjs --model sweater
node models/alice/scripts/check-alice-dress-recomposition.cjs public/models/alice-sweater/layers /Users/1gnat4y/Desktop/立绘/1 work/alice/sweater/recomposition idle,thinking,relaxed,hand-over-mouth,side,side-folded,shy,hand-over-mouth-soft
node models/alice/scripts/check-alice-all-poses.cjs --model sweater --out work/alice/sweater
node models/alice/scripts/check-alice-expanded.cjs --model sweater
node scripts/check-alice-models.mjs
node scripts/check-alice-expressions.mjs
pnpm exec tsc --noEmit
pnpm build:pages
node scripts/check-performance.mjs
pnpm build
```

最终验证通过：八个绑定与各自原画的中性 PNG 重组无像素遗漏、无新增像素，透明度与不透明 RGB 差异均为零；七姿态 118 项绑定及渲染检查通过。所有已注册六套的 42 种姿态、144 个完整状态通过解码、原画像素、随机选择、页面生命周期与缓存隔离检查；TypeScript、修改脚本 lint、静态与 Vinext 构建通过。

检查图与报告保存在 `work/alice/sweater/`，完整表情总览保存在 `work/alice/expressions/sweater.png`，不会随网站发布。离线渲染采用 Canvas 路径，不等同于浏览器 WebGL 或真机性能测试。当前仍是原画拆层 2D 模型，并非 Cubism `.moc3`。
