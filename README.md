# Ignat · Personal space

暗色柔光风格的个人主页初版，侧栏与纯图标社媒入口使用蓝紫色荧光。默认英文，可切换中文；包含基础信息、学术、娱乐、数码、个人开发、旅行摄影六个板块。

## 本地开发

需要 Node.js 24 与 pnpm 10。

```sh
pnpm install --frozen-lockfile
pnpm dev:pages
```

访问终端打印的地址，默认 `http://127.0.0.1:3001/`。已有 Vinext 开发入口 `pnpm dev` 也保留，当前本机预览为 `http://localhost:3000/`。两个入口使用同一个页面和样式。

```sh
pnpm exec tsc --noEmit
pnpm build:pages
pnpm preview:pages
```

`out/` 是可部署的纯静态网站，图片、社交图标和模型均从本站加载。有珠聊天由浏览器优先直连 Google Gemini API，失败时自动切换现有 ModelScope 接口一次，无需自建服务端或 Worker。**GitHub Pages 使用 `pnpm build:pages`**；`pnpm build` 保留 Vinext 构建。

### 页面换装与企鹅彩蛋

打开或刷新时，企鹅的抽选概率为 5%，其他五套均分 95%。每次切换到不同板块（包括浏览器前进/后退），有 60% 概率换成另一套，40% 保持；换装成功后，企鹅占候选抽选的 5%，其余概率由其他可用套装均分，并排除当前套装。当前已是企鹅且出场气泡已结束时，下一次切换到不同板块必定换走企鹅，从普通套装中等概率选取，不再经过 60% 判定；重复点击当前板块不换装。因此从普通套装出发，每次切页新触发企鹅的概率为 60% × 5% = 3%。重复点击同一板块、切语言、聊天和重渲染不抽选；聊天状态和历史在换装时保留。

左上角标志还有一次返回主页保证：本次文档打开后，如果从未出现过企鹅，首次从其他板块点击标志返回主页必出企鹅。在主页点击标志不触发、不消耗；侧栏返回主页和浏览器后退不触发这次保证。只要任意来源的企鹅完成淡入出现（含随机与高概率预览），保证立即失效。首次有效返回时若当前已选中企鹅，则消耗保证；气泡结束前继续保持企鹅，结束后按正常切页规则换走。该状态仅保存在本次文档内存中，刷新重置。`models/alice/alice-home-easter-egg.ts` 在首页与延迟加载的角色间共享此状态；`node scripts/check-alice-home-easter-egg.mjs` 检查首次/重复点击、已有企鹅、延迟加载和中途取消导航。

企鹅出场保护从选中套装开始，覆盖素材加载、淡入、1.5 秒气泡延迟及 4.5 秒展示；气泡自动结束或手动关闭才解除。保护期间切换板块、标志返回主页、前进/后退均保持企鹅，不补抽或排队；解除后下一次实际切页恢复换装。后台暂停计时，切语言、减少动态效果和本地预览中的切页不重启气泡。累计惹恼的最终锁定优先。

企鹅淡入完成后播放 9 秒粉色柔光、上浮气泡和星芒，特效中心跟随企鹅宽画布向左偏移。模型出现 1.5 秒后展示一条原创有珠风格短句及「你发现了企鹅彩蛋」提示。六条固定中英文文案不连续重复，气泡显示 4.5 秒后收起，也可手动关闭；仅当聊天历史面板展开时让位，输入框单独打开且历史收起时仍正常显示。后台暂停，系统减少动态效果时只显示静态柔光和文字，手机仍不加载角色。素材来自 [Kenney Particle Pack](https://kenney.nl/assets/particle-pack)（CC0），本地文件与来源记录在 `public/effects/alice-penguin/`。

页面与不同套装切换共用 `components/faded-swap.tsx`：新内容立即在隐藏层挂载、加载并实时渲染，旧内容保持活动；新页面提交或新模型完整拆层首帧准备好后，执行与姿态相同的 280 毫秒淡出 + 280 毫秒淡入。隐藏层不可点击或聚焦，快速连续切换会取消过时的加载展示和淡出，已经准备好的新内容在转为可见时保留实例。聊天组件不随套装重建。`lib/interaction-timing.ts` 统一控制过渡、气泡延迟与停留时间，`lib/visible-timeline.ts` 在后台暂停计时。

`node scripts/check-faded-swap.mjs` 验证先准备再过渡、淡出/淡入时间、实例键保留、快速切换取消与减少动态效果；`node scripts/check-visible-timeline.mjs` 验证延迟 1.5 秒、停留 4.5 秒、后台暂停、单次触发与卸载清理。

临时预览：在本地地址添加 `?alice-easter-egg=preview`，例如 `http://127.0.0.1:5173/?alice-easter-egg=preview`。此入口首次打开必定出现企鹅，气泡结束后的下一次切页必定换成普通套装，再下一次切页必出企鹅，交替方便检查出场和退场；移除参数恢复正式概率。首次返回主页保证也会因预览中出现过企鹅而失效，验证这条规则请使用不带参数的地址。仅 localhost、127.0.0.1 和 IPv6 回环地址识别该开关，发布地址始终使用正式概率。

选择规则在 `models/alice/alice-models.ts`，出场与文案在 `components/alice-penguin-arrival.tsx`。运行 `node scripts/check-alice-models.mjs` 检查 60%/5% 概率边界、真实换装、页面生命周期和本地预览隔离。下方较早模型接入记录中的等概率/文档内固定规则已由本节替代。

### 情绪与阅读停留（2026-09-08）

累计惹恼锁定：每次成功完成的回复若为 annoyed 或 angry 且强度至少 0.5，计为一次；同一文档累计 3 次后，无论当前套装是哪一套，都固定为黑衣带帽披肩装 cape / relaxed / 13_11_00 红眼形态。此状态优先级为 100，覆盖企鹅出场保护，暂停所有随机姿态和表情切换，禁用输入框、发送、Enter 和重试；历史仍可查看。切页、切语言、开关聊天、错误回退和组件清理均不会解除，刷新或关闭网页后重置。仅统计最终成功回复，失败、取消、接口回退前的临时情绪不计数；计数不受最近 10 轮历史截断影响。

自然随机模式：annoyed / angry 相关表情的权重为普通表情的 4%，最低强度达到 0.8 的极端愤怒表情不进入随机池；只有不耐烦表情的姿态也同步降低权重。有其他平静表情时避免连续重复；若只有一张平静表情，允许保持，避免为了换表情而必选生气。语义情绪匹配仍可使用完整原生表情集。

验证新增规则：`node scripts/check-alice-idle-odds.mjs` 检查随机分布与极端表情排除；`node scripts/check-alice-interaction-locks.mjs` 检查真实聊天组件的完成/失败/回退计数、禁用入口及企鹅前台计时和手动关闭。

六套模型、42 个姿态组、144 个原生表情均已在 `models/alice/alice-affect-map.json` 建立人工视觉语义标注，包含九种情绪的匹配权重、强度区间和画面线索。标注与脚本生成的 `native-expressions.json` 分离，重建纹理不会覆盖人工数据。`alice-affect-selection.ts` 只在当前套装的真实姿态/表情中选取，综合语义、强度与上次选择，限制候选范围并降低连续重复。冬装和毛边斗篷的愤怒回退到不耐烦，企鹅只有一个原生表情，其他情绪回退平静；红眼暗化和阴影脸只允许在标注的高强度下选取。

同一板块在网页可见且窗口有焦点时累计阅读 45 秒，会触发强度 0.65 的自豪，保持 6 秒。所有六个板块使用相同规则，不根据摄影点击或快速切页触发情绪。打开聊天或聊天回复仍占用角色时暂停阅读计时；切换板块取消本次未完成计时，并结束旧板块的阅读反应。每个板块在本次文档访问中最多成功触发一次，刷新重置，不保存行为记录或发送阅读事件到接口。停留只是本地表现的触发条件，不代表系统确认访客真的在阅读。

`lib/alice-affect.ts` 统一调度：聊天 80、打开聊天的关注 50、阅读停留 40、待机 0。聊天输出期间锁住情绪，低优先级事件不排队，避免过时反应在回复后出现。输出结束后保持 4.5 秒，再平静 1.2 秒回到随机待机。情绪保持期间暂停随机姿态/随机表情，呼吸、身体和发束继续原有动画；有嘴型的默认脸继续说话，完整原生表情保留原画，绝不为了动嘴切回默认脸。后台暂停保持时间，减少动态效果时仍可显示一次静态情绪变化。

聊天提示词要求首行 `[[AFFECT:proud:0.65]]` 形式的控制头。两个接口共用累计流解析器，仅识别回答开头一次；白名单、数值范围、截断/畸形头处理均在前端完成。有效情绪先发出，正文等待约 180 毫秒开始显示；素材尚未解码时沿用现有的旧画面保留机制，不无限阻塞正文。控制头不进入气泡、历史或后续模型上下文。无头或非法头回退平静，只有头没有正文视为空回复。主接口失败时清理延迟显示、重置情绪到思考并重新解析备用回复；拆包的 Gemma 控制字符同样缓冲，不泄露到正文。

验证入口：`node scripts/check-alice-affect.mjs`（完整标注、回退、前缀边界、前台阅读计时、优先级与清理）、`node scripts/check-alice-client.mjs`（两接口/两格式、拆包、回退与取消）、`node scripts/check-alice-expression-clock.mjs`（受控表情暂停随机时钟）。这些是离线/模拟接口检查，不等同于真实上游回复质量或浏览器交互实测。

### 聊天界面与接口

点击角色打开悬浮在模型下部的紧凑输入框（约 40px 高），模型位置与大小保持不变。Enter 发送、Shift+Enter 换行、Esc 或再次点击角色退出；历史面板右上角的叉只收起历史，输入框保持打开。输入框与向上展开的历史面板沿用桌面 `Jmcomic-webUI-main` 搜索框的半透明渐变、边缘高光和阴影材质。发送键右侧为历史展开／收起键；收起时回复显示在角色上方的气泡中，展开后仅在历史面板显示，发送消息不改变展开状态。两处均流式显示回复，气泡采用圆角与弯曲尖尾，完整输出结束 4.5 秒后消失，回复仍保留在历史中。展开／收起历史不会重置气泡计时。较长回复可滚动阅读；输入框聚焦时仅保留材质边缘高光。

关闭聊天、切换页面板块或语言不会清空历史，进行中的请求也会继续。会话只保留在当前页面内存中，刷新或关闭网页后清空，不写入浏览器存储。显示历史和 AI 上下文共用最近 10 轮的限制（一问一答为一轮，正在等待回复的提问也计一轮）；开始第 11 轮时移除最早的完整一轮。企鹅彩蛋出现时，其触发提示与气泡短句会按发生顺序追加到展开历史中，仅用于页面显示，不进入 AI 上下文、不计入轮数或 10 轮空间。展开面板显示轮数与保留规则。失败时可在气泡或历史面板重试，回复为纯文本，并在聊天打开时短暂驱动嘴型。

统一系统提示词位于 `lib/alice-prompt.ts`，由模型按用户当前使用的语言回答。切换界面语言不清空历史，进行中的回复沿用发送时的语言设置。浏览器端 `lib/alice-client.ts` 首先调用 Gemini REST 流式接口，使用免费模型 `gemma-4-31b-it`，并通过 `thinkingLevel: "minimal"` 关闭思考；若连接在 8 秒内未建立、接口报错、限流或返回空内容，则清除可能出现的 Google 半截回复，自动调用现有 ModelScope 接口一次。备用模型为 `deepseek-ai/DeepSeek-V4-Flash-0731`，继续显式设置 `enable_thinking: false` 和 `thinking: { type: 'disabled' }`。两个接口均通过 ReadableStream 增量解码 SSE，只显示回答文本并忽略思考字段；两边都失败后才显示错误与手动重试入口。手动重试不会重复提问或将未完成回复带入上下文，而是重新执行完整的 Google Gemini API → ModelScope 链路。单次交互最长等待 50 秒，上下文最多 10 轮（包含当前提问），与显示历史一致，由 `lib/alice-history.ts` 统一截断。

网站主人已明确接受密钥公开：Gemini 与 ModelScope 公共密钥均配置在 `lib/alice-client.ts`，随 JavaScript 和系统提示词一起交付给浏览器。无需环境变量、`/api/alice` 或开发代理。本地使用 `pnpm dev:pages`，构建后直接部署 `out/` 到 GitHub Pages 等静态托管。跨域调用依赖两个上游接口的 CORS 响应；请求不携带浏览器 Cookie。Gemini Free Tier 的用量限制按 Google Cloud 项目而非单个 API Key 计算，各模型额度以 [AI Studio Rate Limits](https://aistudio.google.com/rate-limit) 显示为准；模型与免费定价参见 [Gemini 模型列表](https://ai.google.dev/gemini-api/docs/models) 和 [Gemini API 定价](https://ai.google.dev/gemini-api/docs/pricing)。

`node scripts/check-alice-client.mjs` 验证 Gemini 优先、两边关闭思考、一次 ModelScope 自动回退、流式回复切换、10 轮截断、错误和中途取消处理。

## GitHub Pages

已提供 `.github/workflows/pages.yml`：推送 `main` 或手动运行时，安装锁定依赖、检查类型、构建静态文件并发布 Pages。未连接远程仓库，也尚未发布线上版本。

1. 将当前工程放入目标 GitHub 仓库。个人主页可使用 `IgnatAy.github.io`；普通仓库也支持。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
3. 将网站源文件提交并推送到 `main`，或在 Actions 中手动运行部署流程。如果实际主分支不叫 `main`，同步修改工作流的分支条件。
4. 以 GitHub Actions 成功运行后提供的 URL 为准。

采用 hash 导航（如 `#academic`）和相对资源地址，同一份输出适用于域名根目录与仓库子目录，无需修改 base path。不要用 Worker 产物 `dist/server` 部署到 Pages。

流程依据：[GitHub Pages 官方自定义工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。原 `.openai/hosting.json` 作为已有工程配置保留，本轮按 GitHub Pages 目标构建。

## 内容与样式在哪里修改

- `app/page.tsx`：首页、六个导航项目、中英文基础信息。
- `components/profile-sections.tsx`：学术经历与成果、设备、摄影、公开仓库及娱乐收藏。
- `lib/collections.ts`：公开仓库、论文、视频和喜欢的游戏的中英文元数据及远程预览地址。
- `lib/profile.ts`：社交主页、14 件设备及摄影内容的数据入口。
- `app/globals.css`：颜色、柔光、尺寸、间距与响应式断点。
- `components/alice-companion.tsx`：角色随机行为、姿态调度及聊天开关；`components/alice-chat.tsx`：输入框、对话和请求状态。
- `lib/browser-preferences.ts`：语言偏好、hash 路由订阅与减少动态效果偏好。
- `public/photos/`：23 张旅行照片的 WebP 大图与 `thumbs/` 预览。
- `lib/photo-copy.json`：按原文件夹名称对应的中英文地点、标题、短文案与图片描述，均可直接修改。17 张照片的地点已按本人补充更新，并用 `locationConfirmed` 标记；其余地点仍保留原有草稿。
- `lib/photo-assets.json`：脚本生成的尺寸、大小与原图对应关系。

桌面采用 Jmcomic-webUI-main 风格的右侧胶囊图标 Dock，悬停或键盘聚焦显示标签。宽度不超过 1120px 时改用顶部菜单与左侧抽屉；低高度横屏也使用抽屉。关闭按钮、遮罩、Esc、选中板块均可关闭，抽屉由现有 Sheet 组件提供焦点管理。

## 角色整理

- `models/alice/`：模型组件、绑定/变形代码、原素材准备脚本、生成记录与旧原型说明。
- `models/alice/prototype/`：整理前的页面源码与样式；页面以 `.tsx.txt` 保存，避免成为新网站路由。
- `public/models/alice/`：网站加载的全部角色素材，包含九个姿态与拆层 manifest。
- `work/alice/`：原有生成参考与离线检查产物，继续保留在本机忽略目录。

角色固定在页面下方，显示大腿以上；手机缩小显示，页面末尾预留滚动空间。角色区域无拖拽、姿态按钮、调试标签或其他控件。

持续的呼吸、头肩摆动和手臂延迟摆动采用 1.15× 强度。持续保持自主待机，每 7–14 秒以三分之一概率切换姿态。自主待机约 2–4 秒后开始第一次大动作，侧倾、探身、换重心或歪头之后保持新身位，围绕该身位继续微动，不自动回弹。每次换位完成后保持 7–11 秒，再用约 1.8–2.6 秒慢慢换到下一个随机身位。九个姿态为 idle / thinking / front / shy / relaxed / side / side-folded / profile / leaning，切换通过先淡出再淡入完成；一次仅显示一个角色。点击或键盘激活打开聊天输入框，有配套嘴型的姿态在回复时短暂张嘴；profile、leaning 暂时保留原表情。切换站内板块不会重建角色。支持系统减少动态效果设置，页面进入后台时暂停绘制。拆层加载失败时使用原画回退，按需载入并最多缓存两套姿态，降低手机内存占用。

头发采用独立的发束绑定：左右发束各有中段、延迟发梢和末端轻摆三种运动，中段响应头部速度、加速度和缓慢变化的气流，发梢随后收势。纹理按平滑发束轮廓弯曲，主体会形变；帽子下的发根与贴脸内缘固定，只有下颌以下的内缘逐渐释放。表情首次使用时才合成并缓存；头发、脸部和蝴蝶结先在复用的原生分辨率画布上合成，再整体旋转与缩放；源像素行不重叠绘制，避免半透明接缝闪烁。发梢向内摆动和蝴蝶结转角受限，害羞姿态的取景为侧倾预留了空间。`models/alice/alice-hair.ts` 集中管理发束动力学、轮廓准备与变形绘制，不改动原画素材。

`node models/alice/scripts/check-alice-motion.cjs` 验证身体保持身位、减少动态效果及四姿态大动作；`node models/alice/scripts/check-alice-hair.cjs` 检查发梢延迟、实际发束中段位移、贴脸内缘像素一致性和透明接缝，检查图与报告写入 `work/alice/hair-redesign/`。

这是保留并复用的 Canvas/WebGL 2D 拆层模型，不是 Cubism `.moc3`。历史模型说明见 `models/alice/README.md`，其中的浏览器实测描述属于原型阶段。

## 立绘扩充（2026-09-08）

桌面 `立绘/2` 的 20 张原画全部接入完整表情。增加正面垂手、侧身垂手、侧身交手、侧脸、前倾抱臂五种拆层姿态，自动待机从四种扩为九种；托腮姿态增加原画睁眼/半闭/闭眼，前倾姿态用原画闭眼替换补绘。新增两种侧身共用同角度的原画闭眼和嘴型。侧脸缺少匹配闭眼/嘴型，前倾抱臂缺少匹配嘴型，保持原画口型。

完整素材对应、备用素材和复现步骤见 [立绘素材清单](models/alice/docs/source-expansion.md)。运行纹理共 118 张，继续按需载入、最多缓存两种姿态。原始 PNG 保持不变，新素材均在项目内生成。检查图在 `work/alice/source-expansion/`，仅作本地分析，不随站点构建发布。

## 素材与名称

### 毛边斗篷模型（立绘/5）

桌面 `立绘/5` 已作为 `cloak` 毛边斗篷装接入，提供常态、托腮、正面垂手、正面交手、掩嘴、侧身垂手、侧身收手、侧脸、前倾和双手托脸共 10 种姿态。25 张源文件对应 22 个完整表情及 3 张相同表情的加边、重采样导出；全部登记，重复导出不增加抽取权重。

新套装复用现有身体动作、发束惯性、表情、聊天、降级回退和缓存。打开或刷新网页时与全部已注册套装等概率随机选择一次，当前页面内保持所选套装。托腮、掩嘴和双手托脸保持手脸同步；正面交手保持双手同步。运行素材位于 `public/models/alice-cloak/`，具体原画映射和复现步骤见 [毛边斗篷模型说明](models/alice/docs/cloak-model.md)。

已通过 10 姿态精确原画重组、162 项绑定/渲染检查、全部 22 个表情的原画像素与透明轮廓检查，以及随机选择、文档生命周期、缓存隔离、类型和修改代码 lint 检查。新增 130 张基础运行纹理，素材与原画检查图位于 `work/alice/cloak/`。

### 三套模型的完整随机表情

`立绘/2、3、4` 的 87 张文件对应 85 个独立原画状态及 2 张重复导出，现已全部登记。每个姿态独立随机选择表情，并每隔 4–8 秒切换，不连续重复；完整保留眉眼、嘴形、脸红、汗滴等变化，闭眼和张嘴也作为表情驻留展示。披肩装红眼暗化状态包含完整身体。原有动作与整图回退继续工作，后台暂停计时，减少动态效果时保持静态。映射、像素归属修正及验证步骤见 [完整表情差分](models/alice/docs/expressions.md)。

### 披肩装模型与随机套装（2026-09-08）

桌面 `立绘/4` 的披肩装作为第二套独立分层模型接入，运行素材位于 `public/models/alice-cape/`。原冬装保留九种姿态；披肩装提供常态、正面垂手、侧身垂手、侧身收手、侧脸、前倾、前倾抱臂七种姿态。两套模型共用现有身体网格、发束、表情合成、聊天及动画循环。

每次打开或刷新网页时，从全部已注册模型中等概率选择一套，概率随模型数量自动计算。选择只保存在当前页面内存中；聊天、语言切换、重新渲染和待机动作不会更换套装。刷新是重新随机，允许连续选中同一套。套装注册与素材版本集中在 `models/alice/alice-models.ts`，自动动作仅从当前套装的可用姿态中选择；单姿态模型保持当前姿态。

加载器按「套装 + 姿态」区分缓存，仍最多保留两种姿态，并沿用分层失败时的整图回退。构建会处理所有已注册模型的素材清单，只发布运行纹理，保留本机制作用 PNG。模型行为与表情限制见 [披肩装素材说明](models/alice/docs/cape-model.md)。

披肩装胸前的绒球及细绳已单独拆层，跟随身体产生各自的惯性摆动；身体底图补齐原绒球位置，前倾抱臂保留手臂遮挡。沿用既有动画循环及减少动态效果设置，可用 `node models/alice/scripts/check-alice-pendants.cjs` 检查悬挂点与动态。

检查命令：`node scripts/check-alice-models.mjs`（随机选择、页面生命周期、缓存隔离、纹理解码）；`node models/alice/scripts/check-alice-all-poses.cjs --model cape --out work/alice/cape`（绑定与渲染）；`node models/alice/scripts/check-alice-expanded.cjs --model cape`（表情与总览）。

### 企鹅服单姿态模型（2026-09-08）

桌面 `立绘/6` 的企鹅服已作为独立 `penguin` 模型接入。只有常态一个姿态，复用披肩装的半闭和全闭眼素材，保留企鹅服原脸与服装；脸和头套同步轻微摆动、呼吸，支持既有点击聊天，缺少匹配嘴型时保留原嘴型。单姿态待机已兼容，不会随机切换到空姿态。

每次打开或刷新网页，企鹅服与全部已注册模型等概率参与抽取，概率随模型数量自动计算；当前文档内保持选中的套装，允许连续抽中同一套。13 张运行纹理、中性重组与表情检查和复现步骤见 [企鹅服模型说明](models/alice/docs/penguin-model.md)。

### 黑色长裙模型（2026-09-08）

桌面 `立绘/3` 的素材已作为第三套 `dress` 模型接入，运行素材位于 `public/models/alice-dress/`。共八种姿态：常态、托腮、正面垂手、掩嘴、侧身垂手、侧身收手、前倾和端茶；包含 104 张运行纹理，复用既有加载器、身体网格、头发惯性、表情合成和聊天交互。

托腮、掩嘴的头部与上半身同步，保持手脸接触；端茶的双手、杯碟保持同步。正面垂手、掩嘴、端茶缺少完全闭眼原画，使用原画半闭眼差分。常态、正面垂手、前倾和端茶有原画嘴型，其他姿态保持原嘴型。八种姿态、表情对应和复现步骤见 [黑色长裙模型说明](models/alice/docs/dress-model.md)。

已通过三套等概率选择、页面生命周期、缓存隔离与 24 种姿态解码，新增八姿态的 136 项绑定/渲染检查，全部八张中性 PNG 与原画精确重组检查，以及表情边界、TypeScript、修改代码 lint、静态与 Vinext 构建。静态输出验证覆盖三套共 326 张运行纹理的根目录和仓库子路径。检查图位于 `work/alice/dress/`；本次更新本地工程，未推送或发布。

摄影页已换成桌面 `pic` 提供的全部 23 张照片，移除 4 张 Unsplash 占位图及其署名。按原比例展示，保留照片本身的色彩；点击打开 1920px WebP 大图，列表按屏幕尺寸选择 960px 预览或大图，并延迟加载非首图。

使用带 Pillow 的 Python 运行 `python3 scripts/prepare-travel-photos.py /path/to/pic` 可重新生成网页图片。脚本自动修正 EXIF 方向、转换为 sRGB、去除输出中的 EXIF/GPS 元数据，保留桌面原图；大图长边至多 1920px、单张至多 650 KB，预览长边至多 960px、单张至多 180 KB。重新生成不会覆盖 `lib/photo-copy.json` 中手工修改的文案。

社交 SVG 图标来自 [Simple Icons](https://github.com/simple-icons/simple-icons)，图标文件保留原始 title。

学校及项目写法参考：[交大航空航天学院](https://www.aero.sjtu.edu.cn/en/about/overview)、[SJTU–MAI 联合项目](https://www.aero.sjtu.edu.cn/en/academics/programs/407)、[博士生致远荣誉计划](https://www.gs.sjtu.edu.cn/bsszyryjh/xmjs)、[校方英文计划名称](https://gc.sjtu.edu.cn/off-the-press/2023-03-17/136256/)。学历时间与研究方向按本人提供的信息编写；博士身份使用 PhD student。

设备名称参考：[Nikon Z 7II](https://www.nikonusa.com/p/z-7ii/1656/overview)、[NIKKOR Z 24-120mm f/4 S](https://www.nikonusa.com/p/nikkor-z-24-120mm-f4-s/20105/overview)、[beyerdynamic DT 900 PRO X](https://support.beyerdynamic.com/hc/en-us/sections/4407819687954-DT-700-PRO-X-and-DT-900-PRO-X)、[NM2+](https://nfacous.com/products/nm2)、[FiiO K11](https://www.fiio.com/k11)、[FLYDIGI APEX 4](https://shops.flydigi.com/pages/flydigi-apex4-gaming-controller-user-manual)。

Discord 已使用本人提供的直达链接：https://discord.com/users/1124979656530071593 。社媒入口为纯图标，保留悬停名称与辅助技术标签；点击直接打开对应主页。

## 本轮验证

静态构建、TypeScript（含无本机生成 Next 类型文件的检查）、新增页面代码 lint、四姿态 53 张纹理的 71 项模型数值与渲染回归检查。另检查静态输出的根目录和仓库子路径资源响应。

本轮未进行浏览器点击或横竖屏截图测试；响应式行为经过代码审查。GitHub Actions 实际发布尚未运行，需连接目标仓库并启用 Pages。

## 性能优化（2026-09-07）

同一份本地工程执行 `pnpm build:pages`，优化前后按实际文件字节统计（十进制 KB / MB）：

| 项目                 |    优化前 |        优化后 |  减少 |
| -------------------- | --------: | ------------: | ----: |
| CSS                  | 201.86 KB |      64.27 KB | 68.2% |
| 首屏 JavaScript      | 329.79 KB |     301.80 KB |  8.5% |
| 完整静态发布目录     |  17.14 MB |       4.78 MB | 72.1% |
| 角色初始备用原画请求 |      7 张 | 当前姿态 1 张 |  6 张 |

- 角色代码在页面加载后的空闲时段载入，其他板块首次访问时载入。角色下载失败不影响正文；站内导航不会重建角色。
- 拆层模型就绪后释放备用原画节点，备用眨眼/说话计时器仅在原画回退模式下运行。
- 桌面绘制最多 60 FPS；宽度不超过 200px 的小尺寸角色最多 30 FPS，像素倍率最多 1.5（桌面仍为 2）。小尺寸角色的画布像素数较此前最多减少 43.75%，以降低手机绘制开销。
- 页面隐藏、角色离开视口或布局尺寸为零时停止绘制；减少动态效果时保留静态画面，只在尺寸或必要状态变化时重绘。页面后台时也暂停随机行为计时器。
- 表情按首次使用合成，保留最多两套姿态缓存。manifest 使用版本号地址与浏览器默认 HTTP 缓存，不再强制 `no-store`。
- Tailwind 只扫描实际使用的页面和 UI 组件。新增 UI primitive 时需在 `app/globals.css` 的 `@source` 列表登记；依据 [Tailwind 官方来源扫描说明](https://tailwindcss.com/docs/detecting-classes-in-source-files)。
- GitHub Pages 打包通过 `lib/runtime-assets-plugin.ts` 排除 manifest 标记的制作用 PNG 和 `.DS_Store`；本地原素材保留，运行所需 WebP、照片原图、图标和 `.nojekyll` 正常打包。约 12.2 MB 的 PNG 原本并非浏览器首屏请求，因此发布目录缩小不等同于首屏流量缩小。
- 摄影页已有固定图片尺寸、异步解码和非首图懒加载，继续沿用。

复验：

```sh
pnpm exec tsc --noEmit
pnpm build:pages
node scripts/check-performance.mjs
pnpm build
node models/alice/scripts/check-alice-motion.cjs
node models/alice/scripts/check-alice-hair.cjs
node models/alice/scripts/check-alice-all-poses.cjs
```

本轮两种生产构建、TypeScript、本轮修改文件 lint、53 张纹理/四姿态 71 项回归、身体与发丝检查均通过。`check-performance.mjs` 验证 60/120/144 Hz 下的帧率上限、暂停/恢复、减少动态效果、清理、代码分包、原素材保留和根目录/仓库子路径资源。现有本地开发入口 HTTP 200。

全仓 `pnpm lint` 仍会报告未修改的历史 CommonJS 脚本及模板 UI 组件规则问题。未进行浏览器交互、真机帧耗时/内存/功耗或 Lighthouse 测量；上述数据是构建体积和程序回归结果，未推送或发布线上版本。

### 黑色高领毛衣装（立绘/1，2026-09-08）

桌面 `立绘/1` 的36张原画已作为独立 `sweater` 模型接入，包含常态、托腮、正面垂手、掩嘴、侧身垂手、侧身收手和前倾七种姿态。完整保留所有原生表情；另一个尺寸不同的掩嘴全身差分使用独立绑定。短发、头部、身体、表情使用现有 Canvas/WebGL 动画与聊天体系，项链随上半身一起运动。

每次打开或刷新网页，在所有已注册套装中等概率抽取一次；当前页面内切换板块、语言或聊天保持本套。姿态仅从本套可用列表中调度。素材说明、原图映射与复现命令见 [高领装模型说明](models/alice/docs/sweater-model.md)。

### 六套模型的统一半身取景（2026-09-08）

主页角色以白色冬装与毛衣短裙装的比例为基准，采用统一取景宽高比 `.33`，比两套参考装原先约 `.36` 的取景放大约 9%。长裙、斗篷和企鹅服不再因为整张原图更宽而缩小；前倾与侧脸保留绑定中标定的取景中心。角色等比绘制，尺寸不随动画帧变化。桌面向上扩展区域也计入底部裁切，最多展示原图顶部 72%，避免露出小腿下部及鞋子。

分层画布、首次载入的原画、拆层失败后的回退以及原生表情图共用 `alice-framing.ts` 的定位与缩放计算；窗口变化时同步重算。企鹅服及其余五套中会发生左右裁切的弯腰、侧身和部分待机姿态单独加宽显示区域，靠近屏幕右缘时向内避让，缩放仍使用原显示框宽度，大小与底部取景保持不变。加宽跟随当前已显示的姿态，未受影响的姿态保留原显示区域；独立原型的全身模式仍按完整轮廓适配。

`node scripts/check-alice-framing.mjs` 覆盖六套模型的全部 44 个绑定（含独立表情绑定），在桌面、向上扩展、笔记本、手机、横屏、全身布局下检查静止、左右最大摆动及反向惯性，共 1320 帧。检查将原图底部 24% 单独提取后经过实际身体形变绘制，确认主页裁切区域内没有脚部像素，同时检查原画与绑定取景中心一致、缩放和顶部定位不变、全部姿态的左右轮廓完整。报告和总览图写入 `work/alice/framing/`。这是离线 Canvas 回归，不等同于浏览器 WebGL 或 CSS 实测。

### 旅行摄影画册改版（2026-09-08）

摄影页采用金色玻璃桥开篇、衬线标题、细分隔线及错落双列照片编排。23 张照片按莫斯科与伊斯特拉、圣彼得堡、厄尔布鲁士与捷里别尔卡、伊斯坦布尔与格雷梅、迪拜、京都六组展示，窄屏切为单列。照片保留原始比例与色彩，点击仍在新标签页打开大图。

本人补充的 17 张照片地点已同步更新中英文，莫斯科河、阿斯顿·马丁 Valkyrie、厄尔布鲁士山海拔 3,900 米及宫廷桥开桥时分的描述也同步修正。有珠的资料引用已确认地点，未确认地点及编辑文案仍与确认经历区分。

地名对应依据：

- 基辅站旁的玻璃桥对应 [Bogdan Khmelnitsky Bridge](https://commons.wikimedia.org/wiki/Category:Bogdan_Khmelnitsky_Bridge)，页面沿用本人描述以方便辨认。
- 伊斯特拉教堂按所给地点与穹顶照片对应为[新耶路撒冷修道院复活大教堂](https://www.lonelyplanet.com/points-of-interest/new-jerusalem-monastery/1473636)。
- 冬宫旁开桥的桥按所给位置推定为[宫廷桥](https://en.mostotrest-spb.ru/bridges/dvorczovyj)。
- 捷里别尔卡山脊使用[捷里别尔卡自然公园](https://oopt-murman.ru/spaces/1)。
- 冬夜电车地点保留本人中文“康斯坦丁沙皇街”；英文按对应街名写作 Konstantina Tsaryova Street（улица Константина Царёва）。

本次验证：TypeScript、修改文件 lint、GitHub Pages 静态构建与 Vinext 构建通过；确认 23 张照片各展示一次、17 处地点更新，中英文文案及 46 个原图/缩略图文件齐全，静态输出资源完整。本地预览响应 HTTP 200。未进行浏览器交互测试，未发布线上版本。

摄影页补充本人拍摄声明及现有 Instagram 主页入口；海拔修正为 3,900 米，宫廷桥地点标签去除括号补注。摄影主题色改为引用全站紫色主题变量，中英文同步更新。

### 项目、学术成果与娱乐外链（2026-09-08）

- 个人开发加入 [dsh-telegram](https://github.com/IgnatAy/dsh-telegram) 与 [JMComic-Next](https://github.com/IgnatAy/JMComic-Next)，使用文字项目卡片展示仓库名称、公开简介、主要语言和外链；不加载 GitHub 统计预览图，不显示 Star、Fork 等数据。
- 学术成果加入一作论文 [Multi-constellation Opportunistic Positioning Technology from LEO Signals: Simulation and Performance Analysis](https://ieeexplore.ieee.org/document/11028326)。题名由本人提供，作者、2025 IEEE/ION PLANS、429–438 页及 DOI 由 [Crossref 元数据](https://api.crossref.org/works/10.1109/PLANS61210.2025.11028326) 核实；第一作者 Bowen Ai 加粗显示。
- 娱乐加入 [Empurple 原创编舞](https://www.bilibili.com/video/BV1mKdNYzEX5/)、[Complicated](https://www.youtube.com/watch?v=w0EF3AxJwLU)、[Feint — Weavers](https://www.youtube.com/watch?v=uqUfNc4C1C0)，标题与封面来自 Bilibili 公开元数据和 YouTube oEmbed；喜欢的游戏加入 [博德之门 3](https://store.steampowered.com/app/1086940/Baldurs_Gate_3/) 与 [魔法使之夜](https://store.steampowered.com/app/2052410/WITCH_ON_THE_HOLY_NIGHT/)，使用 Steam 官方商店封面与外链。
- 仅保存文字及外部 URL，封面按需从原平台加载，失败时保留原站入口。全部链接在新标签页打开，不嵌入播放器，不下载或打包仓库、论文 PDF、视频、音频或游戏资源。原有本地摄影和角色素材不受影响。

验证：TypeScript、修改代码 lint、GitHub Pages 与 Vinext 生产构建通过；三板块的中英文静态渲染通过，检查外链数量、目标与安全属性、一作标记及无嵌入资源；本地预览 HTTP 200。未进行浏览器交互测试或线上发布。现有 Sites 配置对应早期“有珠 · 冬日小屋”角色演示站，保留当前个人主页的 GitHub Pages 交付方式。

### GitHub Pages 无损体积优化（2026-09-08）

基于本轮开始时的完整静态构建，按实际文件字节统计（十进制 MB）：

| 项目         |   优化前 |   优化后 |
| ------------ | -------: | -------: |
| 完整 `out/`  | 67.21 MB | 57.13 MB |
| 发布文件数   |    1,052 |      920 |
| 模型图层文件 |      588 |      456 |

共减少 **10,086,081 字节（15.0%）**。`runtime-assets-plugin.ts` 在构建时按 SHA-256 和文件扩展名识别完全相同的模型图层，将发布 manifest 中的重复引用改为共享文件的相对路径，同时紧凑化 JSON。遍历顺序固定，保留根域名与仓库子路径部署兼容性。所有本地制作用 PNG/WebP 和 manifest 原件均保留。

没有重新编码、降低分辨率或删减照片、服装、姿态、表情及原画回退资源；浏览器应用代码和 CSS 的构建文件哈希保持一致。这里统计的是完整发布目录，不能等同于首屏流量减少；相同姿态内共享 URL 可避免重复纹理下载。

新增 `check-pages-assets.mjs` 逐字节对比发布纹理与原素材，确认 44 套绑定除资源路径外完全一致，并检查原画回退、表情补丁、照片、图标及 `.nojekyll` 齐全。Pages 工作流在上传前执行该检查和现有性能／子路径检查。

本轮通过：静态构建、TypeScript、修改脚本 lint、资源完整性和性能回归；模型检查直接读取 `out/`，验证全部套装解码、缓存隔离、失败重试、姿态、表情及 42 张头部静止帧的精确重组。未进行浏览器交互测试或线上发布。

```sh
pnpm exec tsc --noEmit
pnpm build:pages
node scripts/check-pages-assets.mjs
node scripts/check-performance.mjs
# 本地离线 Canvas 回归，沿用脚本中已有的 @napi-rs/canvas 运行库路径：
node scripts/check-alice-models.mjs out
```
