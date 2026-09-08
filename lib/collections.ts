// Public metadata verified on 2026-09-08. Covers stay on their source platforms;
// no repository archives, paper PDFs, video files, or game files are bundled.
export const projects = [
  {
    name: 'dsh-telegram',
    url: 'https://github.com/IgnatAy/dsh-telegram',
    language: 'TypeScript',
    description: 'A Telegram bot plugin for DeepSeek Harness, with shared sessions, image input, and interactive agent conversations.',
    zhDescription: '面向 DeepSeek Harness 的 Telegram 机器人插件，支持共享会话、图片输入与交互式智能体对话。',
  },
  {
    name: 'JMComic-Next',
    url: 'https://github.com/IgnatAy/JMComic-Next',
    language: 'JavaScript',
    description: 'A WebUI built around JMComic-Crawler-Python, with local ratings, preference management, and personalized AI recommendations.',
    zhDescription: '基于 JMComic-Crawler-Python 接口方案重构的 WebUI，集成本地评分、偏好管理与 AI 个性化推荐。',
  },
] as const;

// Title supplied by the owner; bibliographic fields verified with Crossref.
export const publication = {
  title: 'Multi-constellation Opportunistic Positioning Technology from LEO Signals: Simulation and Performance Analysis',
  authors: ['Bowen Ai', 'Shengjie Zhou', 'Jihong Huang', 'Rong Yang', 'Xingqun Zhan'],
  venue: '2025 IEEE/ION Position, Location and Navigation Symposium (PLANS)',
  year: '2025',
  pages: '429–438',
  doi: '10.1109/PLANS61210.2025.11028326',
  url: 'https://ieeexplore.ieee.org/document/11028326',
} as const;

export const videos = [
  {
    id: 'BV1mKdNYzEX5',
    title: 'Empurple · Original choreography',
    zhTitle: '【娃梅泠】Empurple☔️染紫【原创编舞】',
    creator: '黑糖梅 · 爱娃利亚一动不动 · 泠泠泠泠泠',
    platform: 'Bilibili',
    url: 'https://www.bilibili.com/video/BV1mKdNYzEX5/',
    image: 'https://i1.hdslb.com/bfs/archive/f52981fdfa60f1b45479ee3b501a5a6f5b72f6e0.jpg',
  },
  {
    id: 'w0EF3AxJwLU',
    title: 'Complicated (Official Music Video)',
    zhTitle: 'Complicated（官方 MV）',
    creator: 'Dimitri Vegas & Like Mike vs David Guetta ft. Kiiara',
    platform: 'YouTube',
    url: 'https://www.youtube.com/watch?v=w0EF3AxJwLU',
    image: 'https://i.ytimg.com/vi/w0EF3AxJwLU/hqdefault.jpg',
  },
  {
    id: 'uqUfNc4C1C0',
    title: 'Weavers',
    zhTitle: 'Weavers',
    creator: 'Feint',
    platform: 'YouTube',
    url: 'https://www.youtube.com/watch?v=uqUfNc4C1C0',
    image: 'https://i.ytimg.com/vi/uqUfNc4C1C0/hqdefault.jpg',
  },
] as const;

export const games = [
  {
    title: "Baldur’s Gate 3",
    zhTitle: '博德之门 3',
    creator: 'Larian Studios',
    genre: 'Party-based RPG · Dungeons & Dragons',
    zhGenre: '团队角色扮演 · 龙与地下城',
    url: 'https://store.steampowered.com/app/1086940/Baldurs_Gate_3/',
    image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/48a2fcbda8565bb45025e98fd8ebde8a7203f6a0/header.jpg?t=1777363040',
  },
  {
    title: 'WITCH ON THE HOLY NIGHT',
    zhTitle: '魔法使之夜',
    creator: 'TYPE-MOON',
    genre: 'Visual novel · Magic & coming of age',
    zhGenre: '视觉小说 · 魔法与青春',
    url: 'https://store.steampowered.com/app/2052410/WITCH_ON_THE_HOLY_NIGHT/',
    image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2052410/header.jpg?t=1753952335',
  },
] as const;
