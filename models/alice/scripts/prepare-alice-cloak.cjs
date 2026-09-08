/** Fur-trimmed cloak from supplied folder 5, using the established native-pixel rig pipeline.
 * Original PNGs are read-only. Contact poses share the torso transform; all
 * expression patches come from supplied originals. No new painted pixels. */
/* oxlint-disable typescript/no-require-imports -- Offline CommonJS asset preparation script. */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(
  process.env.ALICE_SHARP_MODULE ||
    '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp',
);
const SOURCE = process.env.ALICE_SOURCE_DIR || '/Users/1gnat4y/Desktop/立绘/5';
const OUT =
  process.env.ALICE_CLOAK_OUTPUT_DIR ||
  path.resolve('public/models/alice-cloak');
const WORK =
  process.env.ALICE_CLOAK_REVIEW_DIR || path.resolve('work/alice/cloak');
const REVISION = 'cloak-native-20260908-1';
const rect = (left, top, width, height) => ({ left, top, width, height });
const file = (id) => `ARI_A_14_${id}-HD.png`;
const source = (id) => path.join(SOURCE, file(id));
const configs = {
  idle: {
    source: '02_00',
    closed: '02_02',
    talk: '02_01',
    headBox: rect(505, 0, 760, 1010),
    eyeBox: rect(633, 442, 391, 143),
    mouthBox: rect(805, 648, 87, 78),
    skin: rect(680, 696, 328, 84),
    headBottom: 709,
    hairLeft:
      'M594 460 L681 496 L697 643 L746 718 L779 751 L761 771 L752 808 L723 838 L713 856 L704 816 L713 873 L695 862 L692 898 L674 854 L679 936 L649 919 L639 942 L624 899 L613 863 L601 690 Z',
    hairRight:
      'M1020 378 L1231 379 L1238 648 L1214 762 L1189 811 L1191 771 L1173 819 L1169 783 L1151 838 L1129 865 L1130 836 L1102 882 L1085 859 L1057 909 L1021 932 L1000 914 L1026 860 L1004 891 L1024 796 Z',
    backingBox: rect(580, 752, 655, 290),
    rig: {
      headPivot: { x: 872, y: 794 },
      bodyPivot: { x: 894, y: 2800 },
      bodyRigidUntil: 1400,
      bodyFixedFrom: 4270,
      hairLeft: { pin: 770, tip: 944 },
      hairRight: { pin: 768, tip: 934 },
      headGain: 0.28,
      nodGain: 0.18,
      arms: [
        {
          spring: 'armFront',
          cx: 1325,
          cy: 2330,
          rx: 190,
          ry: 390,
          ex: 1250,
          ey: 1960,
        },
        {
          spring: 'armBack',
          cx: 406,
          cy: 2250,
          rx: 180,
          ry: 360,
          ex: 460,
          ey: 1940,
        },
      ],
    },
  },
  thinking: {
    source: '03_00',
    half: '03_01',
    closed: '03_03',
    talk: '03_02',
    headBox: rect(455, 0, 780, 1040),
    eyeBox: rect(610, 439, 393, 164),
    mouthBox: rect(805, 656, 80, 72),
    skin: rect(672, 705, 310, 77),
    headBottom: 718,
    hairLeft:
      'M570 476 L655 529 L699 652 L744 722 L776 750 L763 787 L723 809 L721 858 L705 813 L699 872 L696 830 L691 906 L676 875 L681 943 L653 926 L674 981 L647 969 L650 1001 L628 973 L626 938 L614 961 L600 913 L585 846 Z',
    hairRight:
      'M983 367 L1207 368 L1212 642 L1199 726 L1180 769 L1190 720 L1155 814 L1146 774 L1136 824 L1110 847 L1107 821 L1078 868 L1069 847 L1040 886 L989 918 L977 906 L1006 849 L984 877 L990 775 Z',
    backingBox: rect(550, 760, 668, 310),
    rig: {
      headPivot: { x: 851, y: 796 },
      bodyPivot: { x: 894, y: 2800 },
      bodyRigidUntil: 1470,
      bodyFixedFrom: 4270,
      hairLeft: { pin: 812, tip: 1002 },
      hairRight: { pin: 782, tip: 919 },
      headGain: 0,
      nodGain: 0,
      arms: [
        {
          spring: 'armBack',
          cx: 406,
          cy: 2250,
          rx: 180,
          ry: 360,
          ex: 460,
          ey: 1940,
        },
      ],
    },
  },
  relaxed: {
    source: '08_00',
    headBox: rect(550, 0, 700, 985),
    eyeBox: rect(680, 437, 425, 137),
    mouthBox: rect(861, 649, 78, 79),
    skin: rect(711, 692, 375, 88),
    headBottom: 710,
    hairLeft:
      'M591 394 L696 411 L710 616 L747 694 L795 739 L786 753 L776 737 L771 767 L764 748 L784 805 L766 783 L791 843 L771 830 L810 882 L789 871 L772 862 L774 881 L751 863 L732 863 L713 839 L710 822 L686 831 L661 809 L644 771 L637 742 L622 655 Z',
    hairRight:
      'M1090 399 L1221 399 L1226 633 L1203 769 L1183 801 L1192 751 L1167 817 L1154 802 L1147 837 L1126 849 L1126 831 L1106 861 L1082 878 L1090 851 L1066 880 L1034 887 L1059 856 L1044 864 L1078 813 L1081 775 L1098 722 L1079 746 L1075 717 Z',
    backingBox: rect(598, 750, 635, 275),
    rig: {
      headPivot: { x: 898, y: 802 },
      bodyPivot: { x: 905, y: 2780 },
      bodyRigidUntil: 1390,
      bodyFixedFrom: 4210,
      hairLeft: { pin: 754, tip: 889 },
      hairRight: { pin: 753, tip: 892 },
      headGain: 0.28,
      nodGain: 0.18,
      arms: [
        {
          spring: 'armFront',
          cx: 1450,
          cy: 2250,
          rx: 190,
          ry: 380,
          ex: 1370,
          ey: 1900,
        },
        {
          spring: 'armBack',
          cx: 373,
          cy: 2230,
          rx: 180,
          ry: 370,
          ex: 450,
          ey: 1900,
        },
      ],
    },
  },
  front: {
    inherit: 'relaxed',
    source: '09_01',
    talk: '09_00',
    rigOverride: { bodyRigidUntil: 2070, arms: [] },
  },
  'hand-over-mouth': {
    inherit: 'relaxed',
    source: '10_01',
    rigOverride: {
      headGain: 0,
      nodGain: 0,
      bodyRigidUntil: 1470,
      arms: [
        {
          spring: 'armFront',
          cx: 1450,
          cy: 2250,
          rx: 190,
          ry: 380,
          ex: 1370,
          ey: 1900,
        },
      ],
    },
  },
  side: {
    source: '14_00',
    closed: '14_01',
    headBox: rect(320, 0, 740, 975),
    eyeBox: rect(675, 433, 272, 145),
    mouthBox: rect(832, 623, 94, 96),
    skin: rect(685, 690, 189, 90),
    headBottom: 712,
    hairLeft:
      'M350 384 L677 393 L689 619 L689 741 L697 792 L707 874 L686 865 L676 843 L674 864 L657 838 L648 848 L618 817 L613 783 L605 814 L585 791 L574 758 L559 788 L541 771 L528 747 L525 772 L506 755 L506 729 L491 744 L471 722 L453 702 L438 690 L425 675 L428 705 L407 688 L387 654 L372 602 Z',
    hairRight:
      'M926 385 L1030 385 L1033 647 L1023 725 L1005 821 L998 812 L1004 762 L975 807 L956 787 L937 822 L924 799 L912 817 L889 836 L897 795 L883 800 L872 785 L890 730 L903 677 L931 602 Z',
    backingBox: rect(370, 751, 672, 280),
    rig: {
      headPivot: { x: 730, y: 806 },
      bodyPivot: { x: 754, y: 2750 },
      bodyRigidUntil: 1410,
      bodyFixedFrom: 4180,
      hairLeft: { pin: 745, tip: 884 },
      hairRight: { pin: 725, tip: 841 },
      headGain: 0.23,
      nodGain: 0.15,
      arms: [
        {
          spring: 'armBack',
          cx: 725,
          cy: 2300,
          rx: 185,
          ry: 380,
          ex: 680,
          ey: 1920,
        },
      ],
    },
  },
  'side-folded': {
    inherit: 'side',
    source: '16_00',
    closed: '14_01',
    rigOverride: {
      arms: [
        {
          spring: 'armBack',
          cx: 1035,
          cy: 2180,
          rx: 155,
          ry: 300,
          ex: 976,
          ey: 1930,
        },
      ],
    },
  },
  profile: {
    source: '17_00',
    headBox: rect(710, 0, 940, 975),
    eyeBox: rect(1125, 430, 391, 160),
    mouthBox: rect(1384, 638, 120, 94),
    skin: rect(1100, 707, 311, 87),
    headBottom: 700,
    hairLeft:
      'M826 391 L1116 379 L1120 574 L1089 650 L1090 701 L1064 750 L1035 780 L1034 818 L1046 856 L1011 867 L1000 847 L984 823 L978 790 L977 834 L953 817 L936 782 L934 764 L928 811 L911 794 L909 759 L905 796 L888 773 L880 740 L879 768 L861 748 L849 715 L850 748 L831 729 L822 696 L824 730 L802 708 L797 671 L788 698 L767 683 L760 654 Z',
    hairRight:
      'M1082 543 L1130 585 L1129 629 L1149 658 L1135 680 L1148 717 L1147 756 L1178 787 L1196 807 L1180 804 L1162 789 L1139 763 L1120 739 L1114 707 L1102 681 L1098 653 L1086 639 Z',
    backingBox: rect(930, 750, 686, 285),
    rig: {
      headPivot: { x: 1252, y: 810 },
      bodyPivot: { x: 1210, y: 2740 },
      bodyRigidUntil: 1420,
      bodyFixedFrom: 4200,
      hairLeft: { pin: 735, tip: 875 },
      hairRight: { pin: 706, tip: 812 },
      headGain: 0.19,
      nodGain: 0.12,
      portraitCenterX: 1230,
      portraitWidth: 1640,
      arms: [
        {
          spring: 'armBack',
          cx: 1355,
          cy: 2340,
          rx: 190,
          ry: 355,
          ex: 1295,
          ey: 2020,
        },
      ],
    },
  },
  shy: {
    source: '19_01',
    closed: '19_00',
    talk: '19_00',
    headBox: rect(175, 0, 755, 1010),
    eyeBox: rect(330, 439, 379, 145),
    mouthBox: rect(466, 636, 104, 90),
    skin: rect(371, 687, 307, 79),
    headShape:
      'M180 0 H905 V665 L866 688 L700 719 L594 760 L522 775 L382 722 L283 731 H180 Z',
    hairLeft:
      'M266 454 L356 495 L373 631 L419 692 L445 716 L431 746 L422 735 L415 779 L407 760 L401 811 L387 792 L397 853 L381 837 L384 878 L365 862 L367 893 L348 874 L359 919 L333 909 L329 928 L310 908 L297 903 L287 871 L275 817 Z',
    hairRight:
      'M692 387 L896 388 L899 621 L881 700 L864 727 L865 695 L846 751 L827 767 L821 744 L810 787 L793 789 L773 819 L754 832 L739 850 L712 866 L697 891 L675 905 L650 931 L637 928 L666 898 L639 916 L653 881 L667 833 L677 750 Z',
    backingBox: rect(235, 723, 679, 319),
    rig: {
      headPivot: { x: 547, y: 788 },
      bodyPivot: { x: 1120, y: 2500 },
      bodyRigidUntil: 1320,
      bodyFixedFrom: 3860,
      hairLeft: { pin: 769, tip: 931 },
      hairRight: { pin: 751, tip: 935 },
      headGain: 0.2,
      nodGain: 0.13,
      portraitCenterX: 745,
      portraitWidth: 1660,
      arms: [],
    },
  },
  leaning: {
    inherit: 'shy',
    source: '20_01',
    closed: '20_03',
    talk: '20_04',
    dx: -88,
    rigOverride: {
      headGain: 0,
      nodGain: 0,
      bodyRigidUntil: 1530,
      bodyPivot: { x: 1032, y: 2500 },
      portraitCenterX: 657,
      portraitWidth: 1600,
      arms: [],
    },
  },
};
for (const [name, c] of Object.entries(configs))
  if (c.inherit) {
    const p = configs[c.inherit],
      dx = c.dx || 0,
      shift = (b) => ({ ...b, left: b.left + dx });
    configs[name] = {
      ...p,
      ...c,
      headBox: shift(p.headBox),
      eyeBox: shift(p.eyeBox),
      mouthBox: shift(p.mouthBox),
      skin: shift(p.skin),
      backingBox: shift(p.backingBox),
      shapeDx: dx,
      rig: {
        ...p.rig,
        headPivot: { x: p.rig.headPivot.x + dx, y: p.rig.headPivot.y },
        ...c.rigOverride,
      },
      half: c.half || null,
      closed: c.closed || null,
      talk: c.talk || null,
    };
  }

// A leaning pose is translated 88 native pixels left of shy.
configs.leaning.headShape =
  'M92 0 H817 V665 L778 688 L612 719 L506 760 L434 775 L294 722 L195 731 H92 Z';
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
      ['half-eye', '02_02'],
      ['talk', '02_01'],
      ['front-talk', '09_00'],
    ])
      await sharp(source(id))
        .resize({ height: 2400 })
        .webp({ quality: 92, alphaQuality: 100, effort: 4 })
        .toFile(path.join(OUT, name + '.webp'));
  fs.writeFileSync(
    path.join(WORK, 'cloak-configs.json'),
    JSON.stringify(configs, null, 2),
  );
}
module.exports = { configs, prepare };
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
