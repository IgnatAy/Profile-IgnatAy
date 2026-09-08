import photoAssets from './photo-assets.json';
import photoCopy from './photo-copy.json';

export type Language = 'en' | 'zh';
export const socials = [
  { name: 'GitHub', icon: 'github', url: 'https://github.com/IgnatAy' },
  {
    name: 'Instagram',
    icon: 'instagram',
    url: 'https://www.instagram.com/IgnatAy/',
  },
  { name: 'X', icon: 'x', url: 'https://x.com/IgnatAy' },
  { name: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com/@IgnatAy' },
  { name: 'Telegram', icon: 'telegram', url: 'https://t.me/IgnatAy' },
  {
    name: 'Discord',
    icon: 'discord',
    url: 'https://discord.com/users/1124979656530071593',
  },
  {
    name: 'Steam',
    icon: 'steam',
    url: 'https://steamcommunity.com/id/IgnatAy/',
  },
  {
    name: 'Bilibili',
    icon: 'bilibili',
    url: 'https://space.bilibili.com/1247015270',
  },
];

// Content stays separate from presentation so future additions are straightforward.
export const devices = [
  {
    group: 'computers',
    name: 'MacBook Air',
    detail: 'Apple M4',
    zhDetail: 'Apple M4',
    icon: 'laptop',
  },
  {
    group: 'computers',
    name: 'MacBook Pro',
    detail: '2020',
    zhDetail: '2020 款',
    icon: 'laptop',
  },
  {
    group: 'computers',
    name: 'ASUS TUF Gaming F15',
    zhName: '华硕天选 3',
    detail: 'Intel Core i7-12700H · GeForce RTX 3060 Laptop GPU',
    zhDetail: 'Intel Core i7-12700H · GeForce RTX 3060 Laptop GPU',
    icon: 'laptop',
  },
  {
    group: 'everyday',
    name: 'iPhone 16 Pro',
    detail: 'Phone',
    zhDetail: '手机',
    icon: 'phone',
  },
  {
    group: 'everyday',
    name: 'iPad Air',
    detail: '5th generation',
    zhDetail: '第 5 代',
    icon: 'tablet',
  },
  {
    group: 'everyday',
    name: 'Apple Watch SE',
    detail: '2nd generation',
    zhDetail: '第 2 代',
    icon: 'watch',
  },
  {
    group: 'photo',
    name: 'Nikon Z 7II',
    zhName: '尼康 Z 7II',
    detail: 'Full-frame mirrorless camera',
    zhDetail: '全画幅微单相机',
    icon: 'camera',
  },
  {
    group: 'photo',
    name: 'NIKKOR Z 24-120mm f/4 S',
    zhName: '尼克尔 Z 24-120mm f/4 S',
    detail: 'Standard zoom lens',
    zhDetail: '标准变焦镜头',
    icon: 'lens',
  },
  {
    group: 'audio',
    name: 'AirPods',
    detail: '3rd generation',
    zhDetail: '第 3 代',
    icon: 'earbuds',
  },
  {
    group: 'audio',
    name: 'AirPods Max',
    detail: 'Over-ear headphones',
    zhDetail: '头戴式耳机',
    icon: 'headphones',
  },
  {
    group: 'audio',
    name: 'beyerdynamic DT 900 PRO X',
    zhName: '拜亚动力 DT 900 PRO X',
    detail: 'Open-back headphones',
    zhDetail: '开放式耳机',
    icon: 'headphones',
  },
  {
    group: 'audio',
    name: 'NF Audio NM2+',
    zhName: '宁梵声学 NM2+',
    detail: 'In-ear monitors',
    zhDetail: '入耳式监听耳机',
    icon: 'earbuds',
  },
  {
    group: 'audio',
    name: 'FiiO K11',
    zhName: '飞傲 K11',
    detail: 'Desktop DAC & headphone amplifier',
    zhDetail: '桌面解码耳放',
    icon: 'audio',
  },
  {
    group: 'gaming',
    name: 'FLYDIGI APEX 4',
    zhName: '飞智八爪鱼 4',
    detail: 'Game controller',
    zhDetail: '游戏手柄',
    icon: 'gamepad',
  },
] as const;
// Owner-confirmed locations are marked in photo-copy.json; captions remain editorial.
export const photos = photoAssets.map((asset) => ({
  ...asset,
  locationConfirmed: false,
  ...photoCopy[asset.id as keyof typeof photoCopy],
}));
