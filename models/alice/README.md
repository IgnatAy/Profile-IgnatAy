> 2026-09-08：新增黑色高领毛衣装（七姿态、36个完整状态，含独立全身差分），参与全部已注册模型的页面加载随机选择。见 [高领装模型说明](docs/sweater-model.md)。

> 2026-09-08：新增企鹅服单姿态模型，复用披肩装眨眼并支持轻微呼吸与随动，参与全部已注册套装的等概率选择。见 [企鹅服模型说明](docs/penguin-model.md)。

> 2026-09-08：新增毛边斗篷装（立绘/5，10 姿态、22 个完整表情）。与全部已注册套装共同参与打开/刷新时的等概率随机选择。见 [毛边斗篷模型说明](docs/cloak-model.md)。

> 2026-09-08：黑色长裙提供八种姿态，见 [黑色长裙模型说明](docs/dress-model.md)。

> 2026-09-08：原冬装扩为九种姿态，另新增七姿态披肩装，网页每次打开或刷新随机选择一套。见 [立绘扩充说明](docs/source-expansion.md) 和 [披肩装模型说明](docs/cape-model.md)。下文四姿态数据为历史原型记录。

> 本文记录原模型调试原型，旧页面与样式已保存在 `prototype/`，原调试控件不再出现在个人主页。当前主页行为见根目录 README。以下历史验证与浏览器实测记录属于整理前的模型工作。

# 有珠 · 冬日小屋

个人主页角色的交互原型。四种姿态均实现实际部件拆分，用 Canvas 2D 组合原画纹理，身体采用 WebGL 网格变形（无 WebGL 时使用 Canvas 后备）；保留第一版整图效果供切换对照。

## 体验

本机预览：http://localhost:3000/

- 默认开启「使用拆层模型」，动作幅度从 1.0× 提高为 1.4×。肩膀和上身自主轻倾，头部随肩膀增加少量摆动，呼吸带动整个头肩区域；腰胯逐渐减弱变形，双脚固定。
- 前侧弯曲手臂和后侧垂手有独立的延迟摆动。袖口到手套使用连续网格权重，肘部保持连接；待机时也有轻微摆动。
- 左右发束、帽子蝴蝶结分别使用弹簧惯性。贴脸发根与头部固定连接，发梢渐进弯曲，头部停止后会轻微回弹。
- 整图与拆层画布采用互斥显示；头肩共享刚性变换，脸部与五官始终保持固定比例。
- 默认站姿眼部包含睁眼、半闭、完全闭合三帧；正面和害羞使用睁眼/闭眼两帧。思考保持原画闭眼表情。四个姿态均有闭嘴/说话嘴型；思考和害羞补充了明显张开的嘴型，口部墨迹高度分别从 5/6px 增加到 27/30px。
- 「眨一下眼」手动触发；「查看拆层」将部件分离展示；「动作幅度」调整强度。
- 关闭拆层开关可对比当前姿态的原画。切换模式、展开图层或点击人物都保留当前姿态。
- 自定义文字保持当前姿态并驱动嘴型，没有语音、AI 对话或向外发送消息。
- 支持半身/全身、手机布局、减少动态效果偏好、页面后台暂停渲染。

思考姿态把托腮手套单独拆出，与头部共用腕部转轴，限制局部转头来保持手与下巴的接触；正面分别绑定两只手臂；害羞姿态的手藏在身后，只带动肩背，并调整窄画布上的半身取景避免裁掉头部。

当前是四种姿势的 2D 部件绑定原型，不是 Cubism 的 `.moc3` 模型。头部运动是平面旋转与平移，不包含真正的多角度转脸；除托腮手套外，手臂和衣服在同一纹理上进行局部网格变形，没有拆成可大幅抬手的完整图层，瞳孔也未独立绑定。大角度动作仍需更多补画和精细拆分。

## 图层与补图

可直接复用的透明 PNG 图层和网页用 WebP 在 `public/models/alice/layers/`：默认姿态直接位于该目录，新增姿态分别位于 `thinking/`、`front/`、`shy/`。每个 `manifest.json` 定义自己的原图尺寸、部件坐标和绑定。共 53 张运行纹理（13/14/13/13）。图层包括身体、头部、左右发束、蝴蝶结、眼部帧、嘴型以及领口遮挡补图；思考另有托腮手套。各姿态增加 `headRest` 原画脸部底图及清除旧嘴线的 `headTalk` 底图。帽子与面部目前属于同一个头部图层。新增身体纹理限制到高 3600，适配 4096 纹理上限。

正常显示时，`models/alice/alice-face.ts` 先在同一像素网格合成整张脸，再随头部旋转、缩放，避免五官小贴片分别重采样产生方框。静止脸直接使用原图五官；说话只替换嘴唇和口腔，原来的闭嘴线在局部肤色中平滑清除。嘴型没有矩形肤色背景，身体以外的纹理使用无损 WebP。展开图层时仍分别展示部件。发梢的变形条带有亚像素重叠，避免细横纹。

主体纹理和已有表情差分来自用户提供的原画，以原图坐标提取。使用内置 **imagegen** 共进行了六次定向补图：默认姿态完全闭眼、默认姿态被头发遮挡的领口/衣领、正面闭眼、害羞闭眼、思考张嘴、害羞张嘴。生成结果带有非透明棋盘背景，实际模型只使用对齐并遮罩后的内部像素，没有将棋盘背景作为透明纹理使用。两张张嘴参考已从上次生成结果恢复到 `work/alice/speaking-mouths/`，本次没有重复生成。新增头颈、发束和手腕的接缝余量来自原图像素延展。

前四次补图的原始提示词、输入裁切坐标、生成方式及输出信息记录在 [首次补图记录](docs/alice-generation-prompts.json) 和 [新增姿态补图记录](docs/alice-pose-generation-prompts.json)。张嘴参考的裁切与定位参数保存在 `models/alice/scripts/prepare-alice-unified-faces.cjs`；生成参考保存在本机忽略目录 `work/alice/`。模型不在运行时读取 OneDrive 或生成参考。

## 程序控制

页面加载后：

```js
window.character.setState('idle'); // idle | thinking | front | shy
window.character.setLayered(true);
window.character.blink();          // 默认、正面、害羞；思考保持闭眼
window.character.setExploded(true);
window.character.setExploded(false);
window.character.say('欢迎来到我的主页。');
window.character.setMotion(false); // 停止自动待机；手动动作仍然可用
```

`models/alice/layered-alice.tsx` 管理画布、动画循环与生命周期；`models/alice/alice-rig-assets.ts` 载入并缓存四个姿态；`models/alice/alice-face.ts` 缓存合成后的表情帧，动画每帧只选择现有帧。`models/alice/alice-rig.ts` 保存绑定、弹簧参数和渲染，`models/alice/alice-body.ts` 负责身体网格及 WebGL/Canvas 绘制，可移植到主页。`models/alice/alice-character.tsx` 负责在整图与拆层之间切换，首帧绘制后才显示画布，切换姿态时释放旧 WebGL 上下文、纹理和缓冲，并取消旧动画循环。

## 运行与验证

Node >= 22.13，pnpm。`pnpm install`、`pnpm dev`、`pnpm build`。依赖安装保留 pnpm 脚本禁用策略。

检查包括：TypeScript、生产构建、本机 HTTP 响应；独立渲染检查确认全部纹理可载入、静止/最大偏转/闭眼/图层分离能绘制，弹簧在突变与暂停后保持有限并回到静止。回归检查还验证了不同呼吸相位及自主动作方向下脸部变换没有缩放和剪切，并逐像素比较了正反最大摆动时贴脸发根区域的一致性。模型渲染检查图在 `work/alice/rig-check.png`。

身体随动检查另覆盖头肩连接点一致、双脚固定、双手独立位移、肘部不受拉扯、快速换向和最大强度下网格没有翻折。离线渲染使用相同变形函数及 Canvas 后备路径。

`node models/alice/scripts/check-alice-all-poses.cjs` 检查四个姿态，生成 `work/alice/all-poses-*-review.png` 和 `all-poses-report.json`。包含全身/半身、左右最大幅度、展开图层、对应表情、头颈/手腕连接与透明纹理检查；运行结果及目视复查不等同于 WebGL 浏览器实测。

`node --max-old-space-size=384 models/alice/scripts/check-alice-faces.cjs` 检查实际合成脸部的中性帧、嘴型边界、透明度及张嘴幅度，生成 `work/alice/unified-face-review.png` 和 `unified-face-report.json`。像素检查只统计差值，避免断言失败时输出数百万像素的数组差异造成内存暴涨。

针对用户反馈的重影问题，已在当前本机浏览器切换整图/拆层复查：拆层模式下整图没有绘制框，整图模式下画布没有绘制框，两者始终只显示其一。也检查了实际页面显示。此前使用父级 visibility:hidden 被子图 visibility:visible 覆盖的问题已改为 display:none。

素材准备和独立渲染脚本在 `models/alice/scripts/`，使用这台 Mac 上的原图和 Codex 已安装的 sharp / @napi-rs/canvas；不是运行网站所必需的依赖。完整提示词与原始生成结果保留，便于后续继续精修。

重新准备新增姿态时，先运行 `prepare-alice-front.cjs`、`prepare-alice-thinking-shy.cjs`，再运行 `fix-alice-face-seams.cjs`，最后运行 `prepare-alice-unified-faces.cjs` 和两项检查。补图输入从 `work/alice/front-closed-generated.png`、`work/alice/shy-closed-eyes-native.png` 和 `work/alice/speaking-mouths/` 读取。修改素材后同步更新载入器中的素材版本，避免浏览器复用旧贴片。

已有可选 WebMCP `set_character_state` 适配层保持原有行为，尚未在支持该 API 的浏览器上下文中验证。
