# 企鹅服模型

桌面 `立绘/6/ARI_A_17_12_00-HD.png` 作为独立 `penguin` 模型，运行素材位于 `public/models/alice-penguin/`。保留一张常态 `idle` 立绘，加入现有模型注册表；每次打开或刷新网页，从全部已注册套装中等概率抽取，当前文档内保持不变，允许连续抽到同一套。

## 动作与素材

复用既有 Canvas/WebGL 渲染器、身体网格、眨眼时钟、自主动作、减少动态效果、后台暂停、按需加载、两姿态缓存和聊天交互。脸与企鹅头套共用上半身变换，不独立转头；呼吸和轻微摆动逐渐衰减到脚部，双脚固定。单姿态不会进入换姿态分支，防止从空候选数组选出无效姿态。

眼睛借用披肩装正面垂手原画 `ARI_A_13_08_00/02/03-HD.png` 的睁眼、半闭、全闭素材。原画坐标加 `(754, 356)` 对齐企鹅服眼睛。通过供体睁眼与闭眼的差异生成遮罩，扩大 5px 后羽化，仅替换开合区域，避免残留睫毛；保留企鹅服原脸、刘海、服装和透明度。对齐与来源记录在 manifest 的 `borrowedEyes` 中，没有新增生成图。

企鹅服没有匹配嘴型，聊天时保留原嘴型。整图后备包含 `idle.webp`、闭眼的 `half-eye.webp` 与相同中性画面的 `talk.webp`，与现有后备加载逻辑兼容。共 13 张分层运行 WebP，发束和蝴蝶结槽位为兼容用透明纹理。静态构建排除 PNG 制作源；Vinext 沿用现有公共目录复制方式。原始立绘不改动，暂存差分仅写入本地 `work/alice/penguin/`。

## 复现与验证

使用项目已有 Node 24、sharp、Canvas 依赖：

```sh
node models/alice/scripts/prepare-alice-penguin.cjs
node models/alice/scripts/check-alice-penguin.cjs
node models/alice/scripts/check-alice-expanded.cjs --model penguin
node models/alice/scripts/check-alice-all-poses.cjs --model penguin --out work/alice/penguin
node scripts/check-alice-models.mjs
pnpm exec tsc --noEmit
pnpm build:pages
```

检查包含原画中性重组、眼帧变化边界、整图后备、单表情稳定性、面部比例、头套接缝绑定、固定双脚、快速转向和最大偏转。检查图与报告位于 `work/alice/penguin/`，离线绘制使用 Canvas 路径，不等同于浏览器 WebGL 或真机性能测试。

本次企鹅服的中性重组透明度和不透明 RGB 误差均为 0，16 项绑定/渲染检查通过，闭眼变化限定在眼部区域。六套随机选择、刷新重新抽取、文档内稳定、模型缓存隔离、TypeScript、相关源码 lint、静态和 Vinext 构建均通过；静态输出检查覆盖 560 张运行纹理的根路径与仓库子路径。本次更新本地工程，未推送或发布。
