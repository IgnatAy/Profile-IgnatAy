const sharp = require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs = require('fs');
const path = require('path');
const W=1368,H=5392;
const SOURCE='/Users/1gnat4y/Library/CloudStorage/OneDrive-个人/魔法使之夜/Alice/立绘';
const OUT='public/models/alice/layers';
// Original-space masks, traced against the original drawing. No style transfer.
const shapes={
  head:'M 0 0 H 1368 V 700 L 1045 741 L 985 820 L 900 861 L 822 842 Q 750 867 676 862 L 666 815 L 570 745 L 510 672 L 474 596 L 448 533 L 405 567 L 345 530 L 0 500 Z',
  hairLeft:'M 408 530 L 461 519 L 481 578 Q 505 681 571 735 L 646 796 L 655 844 L 643 887 L 626 858 L 624 907 L 600 928 L 572 940 L 550 943 L 524 958 L 493 972 L 482 1004 L 480 973 L 473 1017 L 461 988 L 467 1032 L 451 996 L 443 961 L 437 993 L 426 955 L 416 850 L 410 682 Z',
  hairRight:'M 825 529 L 908 553 L 994 624 L 1004 714 L 995 790 L 981 862 L 969 906 L 952 938 L 962 885 L 943 945 L 940 918 L 921 961 L 924 927 L 905 968 L 889 981 L 901 952 L 878 977 L 858 991 L 870 963 L 842 986 L 818 1003 L 835 976 L 800 1007 L 832 964 Q 849 907 842 858 L 823 865 Z',
  bow:'M 840 560 Q 950 468 1005 478 Q 1064 477 1080 526 L 1109 570 L 1115 635 L 1096 672 L 1043 716 L 1004 733 L 1005 665 L 993 615 Q 973 665 967 704 Q 893 680 864 610 Z',
  fringe:'M 438 481 L 517 450 L 623 466 L 732 482 L 822 506 L 823 532 L 788 518 L 757 549 L 730 570 L 735 540 L 703 566 L 677 604 L 665 601 L 683 550 L 672 548 L 648 608 L 632 631 L 635 608 L 617 632 L 602 625 L 573 560 L 585 596 L 565 583 L 533 554 L 514 510 L 520 566 L 501 537 L 485 501 L 485 538 L 472 530 Z',
};
const svg = p=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><path d="${p}" fill="white"/></svg>`);
async function mask(p){return sharp(svg(p)).ensureAlpha().raw().toBuffer();}
async function main(){
 fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync('work/alice',{recursive:true});
 const raw=await sharp(path.join(SOURCE,'ARI_A_08_02_00-HD.png')).ensureAlpha().raw().toBuffer();
 delete shapes.fringe;
 const masks={};for(const [id,p] of Object.entries(shapes))masks[id]=await mask(p);
 // Hair extraction follows dark painted pixels; the coarse mask never cuts pale skin/coat into a strand.
 for(const id of ['hairLeft','hairRight'])for(let i=0;i<W*H;i++) {
   if(Math.max(raw[i*4],raw[i*4+1],raw[i*4+2])>128)masks[id][i*4+3]=0;
 }
 for(const m of Object.values(masks))for(let i=0;i<W*H;i++)m[i*4+3]=m[i*4+3]>127?255:0;
 // The head assembly is the union of the core, hair and bow masks.
 const headMask=new Uint8Array(W*H);
 for(let i=0;i<W*H;i++)for(const m of Object.values(masks))headMask[i]=Math.max(headMask[i],m[i*4+3]);
 for(let i=0;i<W*840;i++)if(raw[i*4+3])headMask[i]=255;
 // Disjoint extraction assigns each original pixel to one moving part.
 const parts={body:Buffer.alloc(raw.length),head:Buffer.alloc(raw.length),hairLeft:Buffer.alloc(raw.length),hairRight:Buffer.alloc(raw.length),bow:Buffer.alloc(raw.length)};
 const order=['bow','hairRight','hairLeft'];
 for(let i=0;i<W*H;i++){
  const a=raw[i*4+3];if(!a)continue;
  let remain=headMask[i]/255;
  for(const id of order){const f=Math.min(remain,masks[id][i*4+3]/255); if(f>0){for(let c=0;c<3;c++)parts[id][i*4+c]=raw[i*4+c];parts[id][i*4+3]=Math.round(a*f);remain-=f;}}
  for(let c=0;c<3;c++){parts.head[i*4+c]=raw[i*4+c];parts.body[i*4+c]=raw[i*4+c];}
  parts.head[i*4+3]=Math.round(a*remain);parts.body[i*4+3]=Math.round(a*(1-headMask[i]/255));
 }
 // Extend head pixels only into adjacent occluded hair, preserving the visible silhouette.
 const filled=Buffer.from(parts.head);
 for(let y=470;y<880;y++)for(let x=405;x<1050;x++){
  const i=y*W+x;if(filled[i*4+3]||!headMask[i]||!raw[i*4+3])continue;
  let found=-1;
  for(let d=1;d<=10 && found<0;d++)for(const [dx,dy] of [[d,0],[-d,0],[0,d],[0,-d]]){
   const j=(y+dy)*W+x+dx;if(parts.head[j*4+3]>250){found=j;break;}
  }
  if(found>=0){for(let c=0;c<4;c++)filled[i*4+c]=parts.head[found*4+c];}
 }
 parts.head=filled;
 const manifest={width:W,height:H,layers:[],source:'ARI_A_08_02_00-HD.png'};
 for(const [id,data] of Object.entries(parts)){
  const crop=id==='body'?{left:0,top:0,width:W,height:H}:{left:300,top:0,width:850,height:1080};
  await sharp(data,{raw:{width:W,height:H,channels:4}}).extract(crop).resize({width:Math.round(crop.width*.75)}).png().toFile(`${OUT}/${id}.png`);
  manifest.layers.push({id,file:`${id}.png`,...crop});
 }
 fs.writeFileSync(`${OUT}/manifest.json`,JSON.stringify(manifest,null,2));
 // Annotated reference for checking mask placement. Analysis artifact only.
 const colors=['#f55','#5f5','#5bf','#ff5','#f5f'];
 const annotation=`<svg xmlns="http://www.w3.org/2000/svg" width="850" height="1200"><g transform="translate(-300 0)">${Object.values(shapes).map((p,i)=>`<path d="${p}" fill="${colors[i]}" fill-opacity=".12" stroke="${colors[i]}" stroke-width="2"/>`).join('')}</g></svg>`;
 await sharp(path.join(SOURCE,'ARI_A_08_02_00-HD.png')).extract({left:300,top:0,width:850,height:1200}).composite([{input:Buffer.from(annotation)}]).png().toFile('work/alice/mask-review.png');
 console.log(manifest);
}
main().catch(e=>{console.error(e);process.exit(1)});
