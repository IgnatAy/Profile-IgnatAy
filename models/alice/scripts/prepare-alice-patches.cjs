const sharp=require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs=require('fs');
const OUT='public/models/alice/layers';
const SRC='/Users/1gnat4y/Library/CloudStorage/OneDrive-个人/魔法使之夜/Alice/立绘';
const eyes='M 482 539 Q 502 527 523 540 L 547 561 Q 566 580 576 611 Q 535 634 505 611 Q 488 584 482 539 Z M 698 553 Q 746 513 802 521 L 824 533 L 826 598 Q 773 625 716 600 Z';
const eyeBox={left:470,top:510,width:370,height:130};
const mouthBox={left:612,top:700,width:100,height:72};
const manifest=JSON.parse(fs.readFileSync(`${OUT}/manifest.json`));
async function cut(image,box,p,id,feather=1.5){
 const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}"><g transform="translate(${-box.left} ${-box.top})"><path d="${p}" fill="white"/></g></svg>`);
 const mask=await sharp(svg).blur(feather).png().toBuffer();
 await sharp(image).ensureAlpha().extract(box).composite([{input:mask,blend:'dest-in'}]).png().toFile(`${OUT}/${id}.png`);
 manifest.layers.push({id,file:`${id}.png`,...box});
}
async function main(){
 const eyeGen=await sharp('work/alice/closed-eyes-generated.png').resize(850,650,{fit:'fill'}).ensureAlpha().png().toBuffer();
 const full=await sharp({create:{width:1368,height:5392,channels:4,background:'#00000000'}}).composite([{input:eyeGen,left:300,top:320}]).png().toBuffer();
 await cut(full,eyeBox,eyes,'eyesClosed',1.7);
 await cut(`${SRC}/ARI_A_08_02_01-HD.png`,eyeBox,eyes,'eyesHalf',1.7);
 await cut(`${SRC}/ARI_A_08_02_00-HD.png`,eyeBox,eyes,'eyesOpen',1.7);
 await cut(`${SRC}/ARI_A_08_02_02-HD.png`,mouthBox,'M 615 700 H 710 V 768 H 615 Z','mouth',3);
 await cut(`${SRC}/ARI_A_08_02_00-HD.png`,mouthBox,'M 615 700 H 710 V 768 H 615 Z','mouthClosed',3);
 const torsoGen=await sharp('work/alice/torso-backing-generated.png').resize(850,1200,{fit:'fill'}).ensureAlpha().raw().toBuffer();
 // Texture gutter for the neckline: extend real collar pixels 22 px into the hidden join.
 for(let y=836;y<875;y++)for(let x=378;x<523;x++){const a=(y*850+x)*4,b=(880*850+x)*4;for(let c=0;c<4;c++)torsoGen[a+c]=torsoGen[b+c];}
 const torso=await sharp(torsoGen,{raw:{width:850,height:1200,channels:4}}).png().toBuffer();
 const torsoFull=await sharp({create:{width:1368,height:5392,channels:4,background:'#00000000'}}).composite([{input:torso,left:300,top:0}]).png().toBuffer();
 const hull='M 678 836 H 820 V 869 Q 870 868 892 855 Q 927 859 936 888 L 961 955 Q 1010 992 1106 1071 L 1148 1126 V 1200 H 386 L 392 1080 Q 402 1032 447 1005 Q 498 978 546 957 Q 616 933 656 891 L 668 878 Z';
 await cut(torsoFull,{left:300,top:820,width:850,height:380},hull,'backing',1);
 // Remove eye and mouth interiors from the head. Original edge pixels remain as a 3 px seam allowance.
 const interior = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="850" height="1080"><g transform="translate(-300 0)"><path d="${eyes}" fill="white" stroke="black" stroke-width="6"/><path d="M 619 706 H 705 V 762 H 619 Z" fill="white"/></g></svg>`);
 const maskRaw = await sharp(interior).resize(638,810).ensureAlpha().raw().toBuffer();
 const headRaw = await sharp(`${OUT}/head.png`).ensureAlpha().raw().toBuffer();
 for(let i=0;i<638*810;i++)if(maskRaw[i*4]>200 && maskRaw[i*4+3]>200)headRaw[i*4+3]=0;
 await sharp(headRaw,{raw:{width:638,height:810,channels:4}}).png().toFile(`${OUT}/head-clean.png`);
 fs.renameSync(`${OUT}/head-clean.png`,`${OUT}/head.png`);
 fs.writeFileSync(`${OUT}/manifest.json`,JSON.stringify(manifest,null,2));
 const ref=await sharp(`${SRC}/ARI_A_08_02_00-HD.png`).extract({left:300,top:320,width:850,height:650}).png().toBuffer();
 const closed=await sharp(`${OUT}/eyesClosed.png`).png().toBuffer();
 await sharp(ref).composite([{input:closed,left:170,top:190}]).png().toFile('work/alice/closed-eye-check.png');
 console.log('Prepared eye, mouth and occlusion patches.');
}
main().catch(e=>{console.error(e);process.exit(1)});
