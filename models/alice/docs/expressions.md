# 完整原画表情差分

新增毛边斗篷装 `cloak` 使用 `立绘/5` 的 25 张文件：22 个独立状态及 3 张加边、重采样的相同表情导出。含 10 种姿态，完整来源与绑定见 [毛边斗篷说明](cloak-model.md)。可运行 `node models/alice/scripts/prepare-alice-expressions.cjs --model cloak` 仅重建此套表情，保留其他套装目录。

桌面 `立绘/2、3、4` 的 87 张原始文件全部建立对应关系：冬装 20 个独立状态、黑裙 39 个、披肩装 26 个，共 85 个完整状态。披肩装另外两张小写文件是加边及模糊导出的重复表情，作为清晰原图的 aliases 记录，不重复增加抽取权重。源文件保持不变。

| 套装 | 各姿态的表情数量 |
| --- | --- |
| winter | idle 3、thinking 4、relaxed 2、front 2、side 3、side-folded 1、profile 1、shy 2、leaning 2 |
| dress | idle 10、thinking 5、relaxed 7、hand-over-mouth 5、side 2、side-folded 3、shy 6、tea 1 |
| cape | idle 3、relaxed 6、side 3、side-folded 3、profile 5、shy 3、leaning 3 |

`native-expressions.json` 和各姿态的 manifest 记录原文件、运行补片、像素遮罩、整图回退与特殊绑定目录。每次进入姿态随机选一个表情，此后独立于姿态/动作计时，每隔 4–8 秒从其余表情中等概率抽取。闭眼、惊讶、微笑、脸红、汗滴、视线变化和张嘴都作为完整表情保持展示。只有一个原画的姿态保持该原画；不跨角度拼出未提供的脸。

完整表情保留眉毛、眼睛、嘴形、脸颊和轮廓的关联。默认表情继续既有眨眼/聊天口型；其他原生表情展示期间不叠加中性眼口，避免把闭眼重开或擦掉表情。头肩、身体、发束和饰物仍按原绑定运动。系统减少动态效果时保持当前表情，后台取消表情计时，恢复前台后重新计时。整图回退也使用同一份表情选择。

## 像素与加载

冬装正面垂手 `relaxed` 的默认原画 `08_08_01` 自带脸红。眨眼素材准备时只保留供体的眼部轮廓变化，共同肤色区域沿用默认原画，避免无脸红的 `08_08_00` 半闭眼贴片擦掉红晕。此处理仅用于该姿态的眨眼帧，不改变完整原生表情。运行 `node models/alice/scripts/prepare-alice-expanded.cjs --relaxed-eyes-only` 可单独重建两张眼帧，不重写其他图层或表情清单。`node scripts/check-alice-relaxed-blink.mjs` 检查静止、说话时的三种眼帧，验证脸颊颜色不变且眼睛仍有动作，输出 `work/alice/relaxed-blink-review.png`。

准备脚本计算每张原图相对同姿态默认源的完整 RGBA 差异，使用实际变化像素遮罩而非眼框、嘴框或整块脸矩形。各表情变化像素的并集从头发、蝴蝶结及身体纹理中扣除并归还刚性头部，修复旧拆层误把睫毛或脸边分到可动部件的问题。运行时在原生头部画布上替换相应 RGBA，包含原画透明度变化；周围发丝继续运动。

披肩 `ARI_A_13_11_00-HD.png` 全身变暗并带红眼，作为 relaxed 的完整外观表情，复用原始分层和绒球流程生成 `layers/relaxed-shadow/`，保留身体和绒球动作。部件归属依据对应普通原画，最终颜色与透明度使用暗色源，避免暗肤色导致下巴误分到身体。

普通换脸仅按需解码一份小补片与遮罩，不重载身体，不淡出整个人，不重置弹簧或姿态。每套缓存中的姿态最多保留两份已请求表情，失败可再次请求；延迟解码期间保留上一次已绘制表情，过期请求不能覆盖新姿态。特殊全身外观沿用姿态的就绪与淡出切换流程。

## 复现与检查

在各套基础分层素材已生成后执行（下表与首段保留原三套的扩充记录；当前套装以 `alice-models.ts` 为准）：

```sh
node models/alice/scripts/prepare-alice-expressions.cjs
node scripts/check-alice-expressions.mjs
node scripts/check-alice-expression-clock.mjs
node scripts/check-alice-models.mjs
node scripts/check-alice-transition.mjs
node models/alice/scripts/check-alice-faces.cjs
pnpm exec tsc --noEmit
pnpm build:pages
node scripts/check-performance.mjs
```

可用 `ALICE_EXPRESSIONS_SOURCE_DIR` 指向含编号子文件夹的源目录，`ALICE_SHARP_MODULE` 指向已有 sharp。使用 `--model` 可仅更新对应套装；不带参数时处理已配置的全部分组。没有新增运行依赖或生成原画。重新执行整套素材生成脚本后，应再次执行表情准备脚本。

检查图在 `work/alice/expressions/`，使用实际生产 Canvas 合成代码，覆盖原图映射、随机抽取、透明轮廓、表情驻留、后台/减少动态效果、缓存和姿态交接；不等同于浏览器或真机测试。运行素材中的制作用 PNG 仍从构建中排除。
