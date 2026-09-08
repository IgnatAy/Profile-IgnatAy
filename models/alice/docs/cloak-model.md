# 毛边斗篷模型

来源：桌面 `立绘/5` 的 25 张 PNG。套装 ID 为 `cloak`，运行资源位于 `public/models/alice-cloak/`，复用现有 Canvas/WebGL 拆层模型体系。

每次打开或刷新页面，在 `alice-models.ts` 注册的全部套装中等概率选择一次。当前文档保持所选套装，聊天、语言切换、板块切换与待机只改变交互或姿态；刷新允许再次抽中相同套装。

## 姿态与表情

下表省略文件名前缀 `ARI_A_14_` 和后缀 `-HD.png`。22 张大写原文件全部作为完整表情保留。

| 姿态 | 源编号 | 完整表情数 |
| --- | --- | ---: |
| 常态 `idle` | 02_00–02 | 3 |
| 托腮 `thinking` | 03_00–03 | 4 |
| 正面垂手 `relaxed` | 08_00 | 1 |
| 正面交手 `front` | 09_00–01 | 2 |
| 掩嘴 `hand-over-mouth` | 10_01 | 1 |
| 侧身垂手 `side` | 14_00–01 | 2 |
| 侧身收手 `side-folded` | 16_00 | 1 |
| 侧脸 `profile` | 17_00 | 1 |
| 前倾 `shy` | 19_00–01 | 2 |
| 双手托脸 `leaning` | 20_00–04 | 5 |

三个小写文件 `ari_a_14_09_00_01_01-HD.png`、`ari_a_14_20_00_01_01-HD.png`、`ari_a_14_20_04_01_01-HD.png` 分别对应大写 `09_00`、`20_00`、`20_04` 的相同表情外观。它们画布宽高各多 30 像素，属于加边和重采样导出，**并非逐像素相同**。居中对齐后平均每通道差约 0.47–0.51；以 aliases 记录来源，运行使用清晰原画，不重复增加表情抽取权重。

表情每隔 4–8 秒从当前姿态的其他原生表情中随机切换。只有单张原画的姿态保持该表情。眉眼、脸红、嘴形及透明轮廓一起替换；非默认原生表情不会被中性眨眼或说话补片覆盖。

## 绑定与兼容

身体、头部与左右发束使用原画像素拆层，复用呼吸、惯性发丝、身体动作及聊天。托腮、掩嘴和双手托脸关闭独立转头与点头，接触手臂跟随相同的上半身变换；正面交手保持两手同步。毛边斗篷与长裙跟随身体网格轻微变形。

同角度有原画眼口差分的姿态复用该差分；缺少对应素材的姿态保留原画眼睛或嘴型。每个姿态都有整图回退，并提供 `half-eye.webp`、`talk.webp`、`front-talk.webp` 兼容既有降级路径。后台暂停、减少动态效果和最多两种「套装＋姿态」缓存沿用现有实现。

常态、托腮、侧身两姿态、前倾及双手托脸有匹配闭眼差分；正面垂手、正面交手、掩嘴和侧脸保留原画眼睛。前倾与双手托脸的默认源本身带口型，不修改中性原画；聊天在现有原画嘴型之间切换。

10 姿态各有 13 张基础运行纹理，共 130 张。独立原画重组全部通过：无像素遗漏/新增，透明度和不透明 RGB 差异均为 0。10 姿态共 162 项绑定/渲染检查及全部 22 表情的原生 RGBA 合成检查通过。表情导入后的模型缓存、文件解码、静止头部重组与随机选择检查也已通过。

## 复现

```sh
ALICE_SOURCE_DIR='/Users/1gnat4y/Desktop/立绘/5' node models/alice/scripts/prepare-alice-cloak.cjs
node models/alice/scripts/prepare-alice-expressions.cjs --model cloak
node models/alice/scripts/check-alice-all-poses.cjs --model cloak --out work/alice/cloak
node models/alice/scripts/check-alice-expanded.cjs --model cloak
node scripts/check-alice-models.mjs
node scripts/check-alice-expressions.mjs
pnpm exec tsc --noEmit
pnpm build:pages
node scripts/check-performance.mjs
```

源文件只读。项目保留制作用 PNG，静态发布目录仅包含运行 WebP；无需新增网站依赖。离线检查使用真实生产 Canvas 合成代码，检查图位于 `work/alice/cloak/` 与 `work/alice/expressions/cloak.png`，不等同于浏览器 WebGL 或真机测试。

静态与 Vinext 构建均通过，两个输出目录中的 189 个斗篷运行文件均与验证过的源文件 SHA-256 一致。`out/` 排除制作用 PNG；Vinext 沿用既有公共目录复制行为。
