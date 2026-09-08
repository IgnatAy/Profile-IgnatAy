/** Folder 1: black turtleneck, short bob, necklace and plaid skirt.
 * Each pose uses supplied native expression pixels and its own anatomy. */
/* oxlint-disable typescript/no-require-imports -- Offline CommonJS asset preparation. */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(
  process.env.ALICE_SHARP_MODULE ||
    '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp',
);
const { createNativeOutfitPreparer } = require('./prepare-native-outfit.cjs');
const SOURCE = process.env.ALICE_SOURCE_DIR || '/Users/1gnat4y/Desktop/立绘/1';
const OUT =
  process.env.ALICE_SWEATER_OUTPUT_DIR ||
  path.resolve('public/models/alice-sweater');
const WORK =
  process.env.ALICE_SWEATER_REVIEW_DIR || path.resolve('work/alice/sweater');
const file = (id) =>
  id === 'soft' ? 'ari_a_01_10_00_01_00-HD.png' : `ARI_A_01_${id}-HD.png`;
const rect = (left, top, width, height) => ({ left, top, width, height });
const configs = {
  idle: {
    source: '02_00',
    half: '02_01',
    closed: '02_05',
    talk: '02_02',
    headBox: rect(240, 0, 740, 1020),
    eyeBox: rect(320, 408, 478, 209),
    mouthBox: rect(524, 660, 91, 77),
    skin: rect(531, 735, 212, 88),
    headBottom: 770,
    backingBox: rect(310, 785, 650, 290),
    hairLeft:
      'M308 566 L380 560 L408 637 L449 679 L513 734 L570 768 L554 826 L534 842 L523 811 L513 852 L500 840 L485 874 L468 846 L455 879 L438 843 L429 895 L412 867 L409 940 L388 939 L384 973 L368 964 L347 936 L332 881 L319 785 Z',
    hairRight:
      'M725 570 L960 568 L952 704 L925 799 L916 774 L906 829 L897 789 L882 838 L870 811 L856 865 L844 843 L832 889 L817 871 L801 904 L781 917 L754 942 L694 960 L713 882 L724 812 Z',
    rig: {
      headPivot: { x: 641, y: 819 },
      bodyPivot: { x: 620, y: 2760 },
      bodyRigidUntil: 1310,
      bodyFixedFrom: 4430,
      hairLeft: { pin: 740, tip: 963 },
      hairRight: { pin: 742, tip: 958 },
      headGain: 0.3,
      nodGain: 0.2,
      arms: [
        {
          spring: 'armFront',
          cx: 635,
          cy: 1960,
          rx: 390,
          ry: 290,
          ex: 957,
          ey: 1490,
        },
        {
          spring: 'armBack',
          cx: 135,
          cy: 2250,
          rx: 155,
          ry: 380,
          ex: 263,
          ey: 1650,
        },
      ],
    },
  },
  thinking: {
    source: '03_00',
    half: '03_01',
    closed: '03_05',
    talk: '03_04',
    headBox: rect(190, 0, 760, 1070),
    eyeBox: rect(294, 385, 474, 239),
    mouthBox: rect(522, 667, 94, 78),
    skin: rect(568, 745, 145, 73),
    headBottom: 769,
    backingBox: rect(284, 790, 646, 290),
    hairLeft:
      'M288 595 L368 587 L411 646 L472 704 L538 741 L582 772 L544 792 L507 798 L502 844 L477 857 L450 888 L436 917 L421 950 L408 999 L390 983 L371 1013 L346 965 L329 978 L309 952 L292 880 L286 852 Z',
    hairRight:
      'M690 571 L928 568 L923 706 L903 793 L885 771 L882 824 L862 788 L851 837 L835 813 L816 856 L799 839 L781 882 L764 900 L742 925 L706 948 L665 975 L679 900 L688 875 L692 805 Z',
    rig: {
      headPivot: { x: 635, y: 819 },
      bodyPivot: { x: 620, y: 2760 },
      bodyRigidUntil: 1320,
      bodyFixedFrom: 4430,
      hairLeft: { pin: 758, tip: 1020 },
      hairRight: { pin: 746, tip: 966 },
      headGain: 0,
      nodGain: 0,
      arms: [
        {
          spring: 'armBack',
          cx: 135,
          cy: 2250,
          rx: 155,
          ry: 380,
          ex: 263,
          ey: 1650,
        },
      ],
    },
  },
  relaxed: {
    source: '08_00',
    half: '08_04',
    closed: '08_04',
    talk: '08_02',
    headBox: rect(280, 0, 690, 980),
    eyeBox: rect(372, 386, 489, 217),
    mouthBox: rect(570, 655, 98, 79),
    skin: rect(510, 724, 228, 83),
    headBottom: 767,
    backingBox: rect(334, 770, 610, 265),
    hairLeft:
      'M306 577 L425 570 L444 649 L471 686 L512 721 L525 762 L519 800 L504 781 L498 811 L485 793 L478 807 L479 833 L490 852 L502 875 L496 891 L475 883 L464 874 L449 872 L432 859 L419 847 L405 854 L386 848 L369 822 L346 754 L324 687 Z',
    hairRight:
      'M799 573 L941 569 L936 659 L914 750 L886 821 L869 809 L860 853 L846 865 L835 861 L827 878 L814 875 L801 879 L780 892 L749 900 L773 856 L783 818 L771 834 L775 791 L751 797 L749 772 L731 784 L734 741 L771 708 Z',
    rig: {
      headPivot: { x: 623, y: 804 },
      bodyPivot: { x: 636, y: 2740 },
      bodyRigidUntil: 1300,
      bodyFixedFrom: 4400,
      hairLeft: { pin: 735, tip: 895 },
      hairRight: { pin: 733, tip: 900 },
      headGain: 0.32,
      nodGain: 0.22,
      arms: [
        {
          spring: 'armFront',
          cx: 1151,
          cy: 2290,
          rx: 142,
          ry: 382,
          ex: 1043,
          ey: 1600,
        },
        {
          spring: 'armBack',
          cx: 117,
          cy: 2290,
          rx: 142,
          ry: 382,
          ex: 238,
          ey: 1600,
        },
      ],
    },
  },
  side: {
    source: '14_00',
    half: '14_00',
    closed: '14_02',
    headBox: rect(48, 0, 716, 1000),
    eyeBox: rect(324, 392, 374, 218),
    mouthBox: rect(532, 624, 96, 85),
    skin: rect(391, 704, 191, 126),
    headBottom: 765,
    backingBox: rect(175, 770, 550, 290),
    hairLeft:
      'M73 554 L393 554 L399 736 L426 888 L424 915 L409 898 L390 890 L369 865 L352 863 L333 846 L310 833 L279 822 L256 816 L235 802 L224 815 L212 856 L200 856 L181 835 L162 810 L141 790 L116 734 L98 694 Z',
    hairRight:
      'M648 557 L727 548 L724 696 L711 799 L703 824 L698 799 L697 767 L674 813 L677 776 L654 806 L637 825 L603 836 L620 773 L586 799 L562 801 L540 800 L537 770 L563 746 L596 701 Z',
    rig: {
      headPivot: { x: 441, y: 825 },
      bodyPivot: { x: 493, y: 2760 },
      bodyRigidUntil: 1300,
      bodyFixedFrom: 4380,
      hairLeft: { pin: 722, tip: 900 },
      hairRight: { pin: 693, tip: 849 },
      headGain: 0.27,
      nodGain: 0.18,
      arms: [
        {
          spring: 'armBack',
          cx: 441,
          cy: 2350,
          rx: 163,
          ry: 400,
          ex: 298,
          ey: 1590,
        },
      ],
    },
  },
  shy: {
    source: '19_02',
    half: '19_02',
    closed: '19_00',
    headBox: rect(0, 0, 696, 1030),
    eyeBox: rect(55, 395, 501, 220),
    mouthBox: rect(248, 646, 103, 85),
    skin: rect(306, 724, 157, 66),
    headBottom: 755,
    headShape:
      'M0 0 L696 0 L696 670 L645 712 L618 750 L535 785 L466 790 L378 783 L308 770 L211 715 L0 715 Z',
    backingBox: rect(50, 744, 630, 310),
    hairLeft:
      'M29 573 L116 569 L142 636 L187 686 L243 728 L267 756 L227 771 L211 793 L201 764 L185 821 L174 791 L170 847 L156 833 L155 872 L169 897 L145 883 L126 861 L135 900 L158 918 L138 914 L115 899 L103 875 L113 925 L128 948 L101 933 L85 902 L69 848 L52 754 Z',
    hairRight:
      'M465 570 L674 572 L670 660 L647 722 L632 712 L621 750 L610 728 L599 772 L584 745 L571 803 L557 780 L549 828 L533 806 L517 855 L496 878 L480 900 L454 922 L420 941 L398 942 L430 892 L444 839 L451 770 Z',
    rig: {
      headPivot: { x: 378, y: 786 },
      bodyPivot: { x: 923, y: 2600 },
      bodyRigidUntil: 1260,
      bodyFixedFrom: 4010,
      hairLeft: { pin: 732, tip: 957 },
      hairRight: { pin: 730, tip: 956 },
      headGain: 0.25,
      nodGain: 0.17,
      portraitCenterX: 560,
      portraitWidth: 1510,
      arms: [],
    },
  },
};
const shiftedRect = (b, dx, dy = 0) => ({
  ...b,
  left: b.left + dx,
  top: b.top + dy,
});
const shiftedPath = (p, dx, dy = 0) =>
  p.replace(
    /(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,
    (_, x, y) => `${Number(x) + dx} ${Number(y) + dy}`,
  );
const r = configs.relaxed;
configs['hand-over-mouth'] = {
  ...r,
  source: '10_00',
  half: '10_04',
  closed: '10_04',
  talk: null,
  headBox: shiftedRect(r.headBox, -19),
  eyeBox: shiftedRect(r.eyeBox, -19),
  mouthBox: shiftedRect(r.mouthBox, -19),
  skin: shiftedRect(r.skin, -19),
  backingBox: shiftedRect(r.backingBox, -19),
  hairLeft: shiftedPath(r.hairLeft, -19),
  hairRight: shiftedPath(r.hairRight, -19),
  rig: {
    ...r.rig,
    headPivot: { x: r.rig.headPivot.x - 19, y: r.rig.headPivot.y },
    bodyPivot: { x: r.rig.bodyPivot.x - 19, y: r.rig.bodyPivot.y },
    headGain: 0,
    nodGain: 0,
    arms: [
      {
        spring: 'armBack',
        cx: 1132,
        cy: 2290,
        rx: 142,
        ry: 382,
        ex: 1024,
        ey: 1600,
      },
    ],
  },
};
configs['side-folded'] = {
  ...configs.side,
  source: '16_00',
  half: '16_00',
  closed: '16_01',
  rig: { ...configs.side.rig, arms: [] },
};

// This alternate export changes the entire sprite, so it gets a complete rig.
// Its artwork is inset 15 px on every side, including the top of the canvas.
const contact = configs['hand-over-mouth'];
const movePoint = (p) => ({ x: p.x + 15, y: p.y + 15 });
configs['hand-over-mouth-soft'] = {
  ...contact,
  source: 'soft',
  half: null,
  closed: null,
  talk: null,
  headBox: {
    ...contact.headBox,
    left: contact.headBox.left + 15,
    height: contact.headBox.height + 15,
  },
  eyeBox: shiftedRect(contact.eyeBox, 15, 15),
  mouthBox: shiftedRect(contact.mouthBox, 15, 15),
  skin: shiftedRect(contact.skin, 15, 15),
  backingBox: shiftedRect(contact.backingBox, 15, 15),
  headBottom: contact.headBottom + 15,
  hairLeft: shiftedPath(contact.hairLeft, 15, 15),
  hairRight: shiftedPath(contact.hairRight, 15, 15),
  rig: {
    ...contact.rig,
    headPivot: movePoint(contact.rig.headPivot),
    bodyPivot: movePoint(contact.rig.bodyPivot),
    bodyRigidUntil: contact.rig.bodyRigidUntil + 15,
    bodyFixedFrom: contact.rig.bodyFixedFrom + 15,
    hairLeft: {
      pin: contact.rig.hairLeft.pin + 15,
      tip: contact.rig.hairLeft.tip + 15,
    },
    hairRight: {
      pin: contact.rig.hairRight.pin + 15,
      tip: contact.rig.hairRight.tip + 15,
    },
    arms: contact.rig.arms.map((arm) => ({
      ...arm,
      cx: arm.cx + 15,
      cy: arm.cy + 15,
      ex: arm.ex + 15,
      ey: arm.ey + 15,
    })),
  },
};
const prepare = createNativeOutfitPreparer({
  sourceDirectory: SOURCE,
  outputDirectory: OUT,
  reviewDirectory: WORK,
  revision: 'sweater-native-20260908-1',
  file,
});
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(WORK, { recursive: true });
  const selected = process.argv.slice(2);
  for (const [pose, config] of Object.entries(configs))
    if (!selected.length || selected.includes(pose))
      await prepare(pose, config);
  if (!selected.length || selected.includes('idle'))
    for (const [name, id] of [
      ['half-eye', configs.idle.closed],
      ['talk', configs.idle.talk],
    ])
      await sharp(path.join(SOURCE, file(id)))
        .resize({ height: 2400 })
        .webp({ quality: 92, alphaQuality: 100, effort: 4 })
        .toFile(path.join(OUT, name + '.webp'));
  fs.writeFileSync(
    path.join(WORK, 'sweater-configs.json'),
    JSON.stringify(configs, null, 2) + '\n',
  );
}
module.exports = { configs, prepare };
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
