/** Front pose: exact source-pixel ownership, with small hidden texture gutters. */
const sharp = require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs = require('node:fs');
const path = require('node:path');
const W=1423,H=5293;
const SOURCE='/Users/1gnat4y/Library/CloudStorage/OneDrive-个人/魔法使之夜/Alice/立绘';
const ROOT=process.env.ALICE_OUTPUT_ROOT || process.cwd();
const OUT=path.join(ROOT,'public/models/alice/layers/front');
const WORK=path.join(ROOT,'work/alice');
const BASE='ARI_A_08_09_01-HD.png';
const OPEN='ARI_A_08_09_00-HD.png';
const closedFile=process.env.ALICE_FRONT_CLOSED || path.join(ROOT,'work/alice/front-closed-generated.png');
// When supplied, the generated reference is registered to this exact original crop.
const closedCrop={left:300,top:0,width:850,height:1200};
const headBox={left:300,top:0,width:850,height:985};
const eyesBox={left:520,top:505,width:390,height:125};
const mouthBox={left:682,top:717,width:72,height:46};
const shapes={
 head:'M 0 0 H 1423 V 750 H 833 L 826 805 Q 835 839 777 846 Q 710 863 654 843 Q 616 831 614 805 L 612 768 L 596 750 H 0 Z',
 hairLeft:'M 396 544 L 516 531 L 529 629 Q 539 703 596 755 L 607 780 L 608 876 L 610 953 L 558 955 L 513 927 L 466 909 L 443 853 L 414 706 Z',
 hairRight:'M 908 529 L 1058 552 L 1072 755 L 1014 877 L 979 940 L 847 966 L 867 917 L 881 829 L 887 760 L 903 688 Z',
 bow:'M 934 507 Q 1010 451 1054 477 Q 1080 489 1087 526 L 1102 564 L 1103 621 Q 1092 674 1040 721 L 1030 670 L 1030 610 Q 1014 638 998 651 Q 953 626 943 569 Z',
 eyes:'M 525 535 Q 572 496 617 524 L 633 549 L 653 580 L 655 617 Q 591 635 547 615 L 537 578 Z M 784 534 Q 836 501 885 528 L 901 548 L 894 586 L 890 617 Q 829 631 781 617 L 780 581 Z',
 mouth:'M 683 719 H 753 V 762 H 683 Z',
};
async function makeMask(p){
 const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><path d="${p}" fill="white"/></svg>`);
 const data=await sharp(svg).ensureAlpha().raw().toBuffer();
 const result=new Uint8Array(W*H);for(let i=0;i<result.length;i++)result[i]=data[i*4+3]>127?1:0;return result;
}
function copyPixel(dst,i,src,j=i){for(let c=0;c<4;c++)dst[i*4+c]=src[j*4+c];}
async function main(){
 fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(WORK,{recursive:true});
 const raw=await sharp(path.join(SOURCE,BASE)).ensureAlpha().raw().toBuffer();
 const talking=await sharp(path.join(SOURCE,OPEN)).ensureAlpha().raw().toBuffer();
 const masks={};for(const [id,p]of Object.entries(shapes))masks[id]=await makeMask(p);
 for(const id of ['hairLeft','hairRight'])for(let i=0;i<W*H;i++)if(Math.max(raw[i*4],raw[i*4+1],raw[i*4+2])>128)masks[id][i]=0;
 const headMask=new Uint8Array(W*H);
 for(let i=0;i<W*H;i++)headMask[i]=masks.head[i]||masks.hairLeft[i]||masks.hairRight[i]||masks.bow[i];
 const parts=Object.fromEntries(['backing','body','head','hairLeft','hairRight','bow','eyesOpen','eyesHalf','eyesClosed','mouth','mouthClosed'].map(id=>[id,Buffer.alloc(raw.length)]));
 for(let i=0;i<W*H;i++){
  if(!raw[i*4+3])continue;
  let id=!headMask[i]?'body':masks.bow[i]?'bow':masks.hairRight[i]?'hairRight':masks.hairLeft[i]?'hairLeft':'head';
  if(id==='head'&&masks.eyes[i])id='eyesOpen';
  else if(id==='head'&&masks.mouth[i])id='mouthClosed';
  copyPixel(parts[id],i,raw);
 }
 // Extrude adjacent original head texture a short distance under the bow and
 // hair. Opaque overlying pixels keep neutral reconstruction unchanged.
 let headFrontier=[];const headReached=new Uint8Array(W*H);
 for(let y=470;y<980;y++)for(let x=390;x<1120;x++){
  const i=y*W+x;if(parts.head[i*4+3]===255){headReached[i]=1;headFrontier.push(i);}
 }
 for(let d=0;d<18;d++){
  const next=[];
  for(const i of headFrontier)for(const j of [i-1,i+1,i-W,i+W]){
   const y=Math.floor(j/W),x=j%W;
   if(x<390||x>=1120||y<470||y>=980||headReached[j]||raw[j*4+3]!==255||!(masks.bow[j]||masks.hairLeft[j]||masks.hairRight[j]))continue;
   copyPixel(parts.head,j,parts.head,i);headReached[j]=1;next.push(j);
  }
  headFrontier=next;
 }
 // Nearby original collar/coat pixels extend only behind fully opaque head
 // pixels. This is a seam allowance, not a painted or generated new torso.
 let frontier=[];const reached=new Uint8Array(W*H);
 for(let y=745;y<992;y++)for(let x=380;x<1110;x++){
  const i=y*W+x;if(parts.body[i*4+3]===255){reached[i]=1;frontier.push(i);}
 }
 for(let d=0;d<28;d++){
  const next=[];
  for(const i of frontier)for(const j of [i-1,i+1,i-W,i+W]){
   const y=Math.floor(j/W),x=j%W;
   if(x<380||x>=1110||y<745||y>=992||reached[j]||!headMask[j]||raw[j*4+3]!==255)continue;
   const src=parts.body[i*4+3]===255?parts.body:parts.backing;
   copyPixel(parts.backing,j,src,i);reached[j]=1;next.push(j);
  }
  frontier=next;
 }
 let closedRaw=null;
 if(closedFile){
  const patch=await sharp(closedFile).resize(closedCrop.width,closedCrop.height,{fit:'fill'}).ensureAlpha().raw().toBuffer();
  closedRaw=Buffer.from(raw);
  for(let y=0;y<closedCrop.height;y++)for(let x=0;x<closedCrop.width;x++)copyPixel(closedRaw,(y+closedCrop.top)*W+x+closedCrop.left,patch,y*closedCrop.width+x);
 }
 for(let i=0;i<W*H;i++){
  if(parts.eyesOpen[i*4+3]){
   copyPixel(parts.eyesClosed,i,closedRaw||raw);parts.eyesClosed[i*4+3]=parts.eyesOpen[i*4+3];
   // No fabricated intermediate pose: a crisp two-frame blink retains the artwork.
   copyPixel(parts.eyesHalf,i,parts.eyesClosed);
  }
  if(parts.mouthClosed[i*4+3]){copyPixel(parts.mouth,i,talking);parts.mouth[i*4+3]=parts.mouthClosed[i*4+3];}
 }
 const manifest={width:W,height:H,source:BASE,layers:[],rig:{headPivot:{x:718,y:833},bodyPivot:{x:730,y:2850},bodyRigidUntil:1250,bodyFixedFrom:3240,hairLeft:{pin:830,tip:950},hairRight:{pin:833,tip:946},bowPivot:{x:1028,y:491},arms:[{spring:'armFront',cx:895,cy:2035,rx:390,ry:410,ex:1140,ey:1690},{spring:'armBack',cx:480,cy:1950,rx:390,ry:390,ex:250,ey:1680}],headGain:1,nodGain:1,blink:!!closedFile,mouth:true}};
 for(const [id,data]of Object.entries(parts)){
  const box=id==='body'?{left:0,top:0,width:W,height:H}:id==='backing'?{left:380,top:745,width:730,height:247}:id.startsWith('eyes')?eyesBox:id.startsWith('mouth')?mouthBox:headBox;
  const png=await sharp(data,{raw:{width:W,height:H,channels:4}}).extract(box).png().toBuffer();
  await fs.promises.writeFile(`${OUT}/${id}.png`,png);
  const runtime=sharp(png);if(id==='body')runtime.resize({height:3600});
  await runtime.webp({quality:95,alphaQuality:100,effort:6}).toFile(`${OUT}/${id}.webp`);
  manifest.layers.push({id,file:`${id}.png`,runtimeFile:`${id}.webp`,...box});
 }
 fs.writeFileSync(`${OUT}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
 const composites=['backing','body','head','hairLeft','hairRight','bow','eyesOpen','mouthClosed'].map(id=>{const l=manifest.layers.find(l=>l.id===id);return{input:`${OUT}/${id}.png`,left:l.left,top:l.top};});
 const neutral=await sharp({create:{width:W,height:H,channels:4,background:'#00000000'}}).composite(composites).png().toBuffer();
 await sharp(neutral).extract({left:300,top:380,width:850,height:750}).png().toFile(WORK+'/front-neutral-review.png');
 await sharp(neutral).resize(570).png().toFile(WORK+'/front-neutral-full.png');
 const compared=await sharp(neutral).ensureAlpha().raw().toBuffer();let mismatch=0,maxDelta=0;
 for(let i=0;i<W*H;i++)for(let c=0;c<4;c++){if(c<3&&!raw[i*4+3]&&!compared[i*4+3])continue;const delta=Math.abs(raw[i*4+c]-compared[i*4+c]);if(delta)mismatch++;maxDelta=Math.max(maxDelta,delta);}
 fs.writeFileSync(WORK+'/front-validation.json',JSON.stringify({closedEyeSource:closedFile||null,recompositionChangedChannels:mismatch,maxChannelDelta:maxDelta,notes:'Two-frame blink. Whole upper head and face remain rigid. Hair roots pinned above lower tips. Native PNG layers retained.'},null,2)+'\n');
 const colors={head:'#f44',hairLeft:'#5f5',hairRight:'#5bf',bow:'#ff5',eyes:'#f5f',mouth:'#0ff'};
 const annotation=`<svg xmlns="http://www.w3.org/2000/svg" width="850" height="1100"><g transform="translate(-300 0)">${Object.entries(shapes).map(([id,p])=>`<path d="${p}" fill="${colors[id]}" fill-opacity=".08" stroke="${colors[id]}" stroke-width="2"/>`).join('')}</g></svg>`;
 await sharp(path.join(SOURCE,BASE)).extract({left:300,top:0,width:850,height:1100}).composite([{input:Buffer.from(annotation)}]).png().toFile(WORK+'/front-mask-review.png');
 console.log({layers:manifest.layers.length,mismatch,maxDelta,blink:manifest.rig.blink});
}
module.exports = { shapes, headBox, eyesBox, mouthBox };
if (require.main === module) main().catch(e=>{console.error(e);process.exit(1)});
