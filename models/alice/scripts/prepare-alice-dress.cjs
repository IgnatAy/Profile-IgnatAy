/** Black dress from supplied folder 3, using the established native-pixel rig pipeline.
 * Original PNGs are read-only. Contact poses share the torso transform; all
 * expression patches come from supplied originals. No new painted pixels. */
/* oxlint-disable typescript/no-require-imports -- Offline CommonJS asset preparation script. */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(
  process.env.ALICE_SHARP_MODULE ||
    '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp',
);
const SOURCE = process.env.ALICE_SOURCE_DIR || '/Users/1gnat4y/Desktop/立绘/3';
const OUT =
  process.env.ALICE_DRESS_OUTPUT_DIR ||
  path.resolve('public/models/alice-dress');
const WORK =
  process.env.ALICE_DRESS_REVIEW_DIR || path.resolve('work/alice/dress');
const REVISION = 'dress-native-20260908-1';
const rect = (left, top, width, height) => ({ left, top, width, height });
const file = (id) => `ARI_A_${id === 'tea' ? '17_05_00' : `12_${id}`}-HD.png`;
const source = (id) => path.join(SOURCE, file(id));
const configs = {
  idle: {
    source: '02_00',
    half: '02_01',
    closed: '02_06',
    talk: '02_05',
    headBox: rect(520, 0, 760, 1050),
    eyeBox: rect(646, 459, 405, 158),
    mouthBox: rect(790, 655, 107, 86),
    skin: rect(680, 710, 358, 122),
    headBottom: 786,
    hairLeft:
      'M592 527 L677 563 L701 685 L751 751 L796 783 L838 805 L846 843 L817 835 L803 859 L780 846 L766 870 L744 856 L725 890 L704 872 L689 849 L686 893 L667 918 L659 954 L638 911 L621 864 L606 724 Z',
    hairRight:
      'M1043 423 L1240 426 L1240 670 L1218 780 L1199 776 L1192 813 L1171 797 L1148 841 L1111 877 L1079 912 L1047 940 L1000 964 L979 959 L1008 876 L1027 774 Z',
    backingBox: rect(590, 790, 650, 290),
    rig: {
      headPivot: { x: 875, y: 822 },
      bodyPivot: { x: 890, y: 2820 },
      bodyRigidUntil: 1320,
      bodyFixedFrom: 4390,
      hairLeft: { pin: 805, tip: 960 },
      hairRight: { pin: 806, tip: 967 },
      headGain: 0.38,
      nodGain: 0.25,
      arms: [
        {
          spring: 'armFront',
          cx: 1010,
          cy: 1930,
          rx: 420,
          ry: 320,
          ex: 1260,
          ey: 1580,
        },
        {
          spring: 'armBack',
          cx: 350,
          cy: 2240,
          rx: 165,
          ry: 400,
          ex: 458,
          ey: 1760,
        },
      ],
    },
  },
  thinking: {
    source: '03_00',
    half: '03_01',
    closed: '03_02',
    headBox: rect(475, 0, 775, 1060),
    eyeBox: rect(620, 455, 413, 168),
    mouthBox: rect(791, 665, 97, 79),
    skin: rect(686, 720, 308, 80),
    headBottom: 792,
    hairLeft:
      'M566 538 L657 592 L702 697 L759 743 L799 768 L801 822 L787 869 L769 891 L738 909 L722 874 L713 935 L700 982 L687 964 L682 1022 L661 1009 L637 967 L617 1011 L599 966 L589 889 L580 756 Z',
    hairRight:
      'M1028 420 L1209 424 L1202 686 L1176 816 L1160 780 L1151 826 L1129 798 L1108 861 L1089 839 L1074 889 L1036 902 L1009 930 L973 954 L985 858 L1000 776 Z',
    backingBox: rect(562, 795, 652, 295),
    rig: {
      headPivot: { x: 861, y: 823 },
      bodyPivot: { x: 890, y: 2820 },
      bodyRigidUntil: 1380,
      bodyFixedFrom: 4390,
      hairLeft: { pin: 835, tip: 1030 },
      hairRight: { pin: 811, tip: 960 },
      // Chin and raised hand share the upper-body transform, preserving contact.
      headGain: 0,
      nodGain: 0,
      arms: [
        {
          spring: 'armBack',
          cx: 350,
          cy: 2240,
          rx: 165,
          ry: 400,
          ex: 458,
          ey: 1760,
        },
      ],
    },
  },
  relaxed: {
    source: '08_00',
    half: '08_03',
    closed: '08_04',
    talk: '08_05',
    headBox: rect(560, 0, 690, 1000),
    eyeBox: rect(679, 455, 427, 150),
    mouthBox: rect(850, 650, 98, 100),
    skin: rect(706, 701, 384, 112),
    headBottom: 783,
    hairLeft:
      'M601 465 L693 541 L710 662 L751 730 L796 766 L797 806 L778 792 L779 820 L766 806 L757 791 L754 846 L770 870 L764 883 L736 868 L755 896 L709 881 L686 852 L660 827 L644 773 L620 684 Z',
    hairRight:
      'M1098 457 L1218 459 L1210 670 L1188 782 L1162 832 L1143 816 L1134 857 L1117 844 L1093 878 L1062 897 L1039 891 L1048 879 L1024 890 L1062 817 L1068 751 L1059 773 L1054 742 L1079 678 Z',
    backingBox: rect(625, 777, 600, 283),
    rig: {
      headPivot: { x: 899, y: 816 },
      bodyPivot: { x: 904, y: 2800 },
      bodyRigidUntil: 1300,
      bodyFixedFrom: 4400,
      hairLeft: { pin: 771, tip: 901 },
      hairRight: { pin: 771, tip: 901 },
      headGain: 0.4,
      nodGain: 0.25,
      arms: [
        {
          spring: 'armFront',
          cx: 1445,
          cy: 2220,
          rx: 175,
          ry: 390,
          ex: 1340,
          ey: 1750,
        },
        {
          spring: 'armBack',
          cx: 373,
          cy: 2210,
          rx: 175,
          ry: 390,
          ex: 448,
          ey: 1750,
        },
      ],
    },
  },
  'hand-over-mouth': {
    inherit: 'relaxed',
    source: '10_00',
    half: '10_03',
    closed: '10_04',
    rigOverride: {
      // Fingertips cover the mouth; do not animate them as a mouth texture.
      headGain: 0,
      nodGain: 0,
      arms: [
        {
          spring: 'armFront',
          cx: 1445,
          cy: 2220,
          rx: 175,
          ry: 390,
          ex: 1340,
          ey: 1750,
        },
      ],
    },
  },
  side: {
    source: '14_00',
    half: '16_01',
    closed: '14_01',
    headBox: rect(330, 0, 715, 1000),
    eyeBox: rect(679, 449, 275, 157),
    mouthBox: rect(833, 628, 92, 93),
    skin: rect(673, 695, 231, 141),
    headBottom: 767,
    hairLeft:
      'M391 478 L695 433 L697 622 L693 715 L690 798 L711 883 L709 908 L678 858 L662 866 L630 831 L611 780 L600 810 L579 785 L558 740 L551 785 L537 763 L513 730 L503 768 L484 751 L450 733 L417 681 L393 615 Z',
    hairRight:
      'M938 463 L1013 421 L1000 660 L985 758 L965 799 L957 782 L937 800 L930 811 L931 792 L907 814 L888 806 L893 754 L910 682 Z',
    backingBox: rect(395, 768, 614, 300),
    rig: {
      headPivot: { x: 730, y: 823 },
      bodyPivot: { x: 754, y: 2780 },
      bodyRigidUntil: 1270,
      bodyFixedFrom: 4280,
      hairLeft: { pin: 763, tip: 912 },
      hairRight: { pin: 744, tip: 820 },
      headGain: 0.32,
      nodGain: 0.2,
      arms: [
        {
          spring: 'armBack',
          cx: 680,
          cy: 2440,
          rx: 205,
          ry: 400,
          ex: 655,
          ey: 1910,
        },
      ],
    },
  },
  'side-folded': {
    inherit: 'side',
    source: '16_00',
    half: '16_01',
    closed: '16_02',
    rigOverride: {
      arms: [
        {
          spring: 'armFront',
          cx: 952,
          cy: 2160,
          rx: 190,
          ry: 340,
          ex: 715,
          ey: 1880,
        },
      ],
    },
  },
  shy: {
    source: '19_02',
    half: '19_01',
    closed: '19_00',
    talk: '19_05',
    headBox: rect(108, 0, 727, 1040),
    eyeBox: rect(244, 470, 356, 151),
    mouthBox: rect(356, 662, 96, 97),
    skin: rect(262, 708, 330, 83),
    headShape:
      'M110 0 H815 V675 L795 729 L618 774 L480 796 L315 750 L265 760 L220 803 H110 Z',
    hairLeft:
      'M175 544 L252 582 L290 686 L337 731 L357 751 L338 764 L317 754 L293 777 L286 755 L275 796 L267 785 L265 840 L284 892 L288 930 L298 955 L270 938 L254 926 L231 906 L212 879 L195 829 L180 691 Z',
    hairRight:
      'M595 460 L800 460 L800 670 L784 710 L764 707 L746 742 L731 731 L719 776 L708 757 L703 808 L681 830 L662 870 L639 889 L615 920 L592 927 L563 944 L535 948 L577 870 L588 776 Z',
    backingBox: rect(154, 739, 667, 341),
    rig: {
      headPivot: { x: 497, y: 783 },
      bodyPivot: { x: 1080, y: 2510 },
      bodyRigidUntil: 1260,
      bodyFixedFrom: 3940,
      hairLeft: { pin: 790, tip: 963 },
      hairRight: { pin: 786, tip: 956 },
      headGain: 0.3,
      nodGain: 0.2,
      portraitCenterX: 710,
      portraitWidth: 1540,
      // Both hands are hidden behind the back.
      arms: [],
    },
  },
  tea: {
    inherit: 'relaxed',
    source: 'tea',
    half: '08_03',
    closed: '08_04',
    talk: '08_05',
    // Both hands and the cup/saucer remain together on the rigid upper torso.
    rigOverride: { bodyRigidUntil: 1900, arms: [] },
  },
};
for (const [name, c] of Object.entries(configs))
  if (c.inherit) {
    const parent = configs[c.inherit];
    configs[name] = {
      ...parent,
      ...c,
      rig: { ...parent.rig, ...c.rigOverride },
      talk: c.talk || null,
    };
  }
const { createNativeOutfitPreparer } = require('./prepare-native-outfit.cjs');
const prepare = createNativeOutfitPreparer({
  sourceDirectory: SOURCE,
  outputDirectory: OUT,
  reviewDirectory: WORK,
  revision: REVISION,
  file,
});
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(WORK, { recursive: true });
  const selected = process.argv.slice(2);
  for (const [name, conf] of Object.entries(configs))
    if (!selected.length || selected.includes(name)) await prepare(name, conf);
  if (!selected.length || selected.includes('idle'))
    for (const [name, id] of [
      ['half-eye', '02_01'],
      ['talk', '02_05'],
    ])
      await sharp(source(id))
        .resize({ height: 2400 })
        .webp({ quality: 92, alphaQuality: 100, effort: 4 })
        .toFile(path.join(OUT, name + '.webp'));
  fs.writeFileSync(
    path.join(WORK, 'dress-configs.json'),
    JSON.stringify(configs, null, 2),
  );
}
module.exports = { configs, prepare };
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
