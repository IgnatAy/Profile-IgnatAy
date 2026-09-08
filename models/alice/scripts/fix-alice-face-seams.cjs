/** Run after pose generation. Restore exact-source underlap at face patch seams,
 * retain transparent eye/mouth interiors, and keep non-body runtime textures lossless. */
const fs=require('node:fs');const path=require('node:path');
const sharp=require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const SOURCE_ROOT=process.env.ALICE_SEAM_SOURCE_ROOT||process.cwd();
const OUTPUT_ROOT=process.env.ALICE_SEAM_OUTPUT_ROOT||SOURCE_ROOT;
const ORIGINALS=process.env.ALICE_SOURCE_DIR||'/Users/1gnat4y/Library/CloudStorage/OneDrive-个人/魔法使之夜/Alice/立绘';
const nativeOverlap=8;
function alphaAt(data,w,h,x,y){
 const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
 const a=(xx,yy)=>xx<0||yy<0||xx>=w||yy>=h?0:data[(yy*w+xx)*4+3];
 return a(x0,y0)*(1-fx)*(1-fy)+a(x0+1,y0)*fx*(1-fy)+a(x0,y0+1)*(1-fx)*fy+a(x0+1,y0+1)*fx*fy;
}
async function fix(pose){
 const src=path.join(SOURCE_ROOT,'public/models/alice/layers',pose),out=path.join(OUTPUT_ROOT,'public/models/alice/layers',pose);
 fs.mkdirSync(out,{recursive:true});if(path.resolve(src)!==path.resolve(out))fs.cpSync(src,out,{recursive:true});
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));
 const layer=id=>manifest.layers.find(l=>l.id===id);
 // Resizing a cutout can bake bright RGB fringes into its semi-transparent
 // pixels. Register RGB from the opaque original crop before retaining alpha.
 for(const id of ['eyesOpen','eyesHalf','eyesClosed','mouthClosed','mouth']){
  const rect=layer(id),file=path.join(out,rect.file);
  const patch=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const pw=patch.info.width,ph=patch.info.height;
  const mouthSource=id==='mouth'&&pose==='front'?'ARI_A_08_09_00-HD.png':manifest.source;
  const exact=await sharp(path.join(ORIGINALS,mouthSource)).extract({left:rect.left,top:rect.top,width:rect.width,height:rect.height}).resize(pw,ph,{fit:'fill'}).ensureAlpha().raw().toBuffer();
  const editedEye=manifest.rig.blink&&(id==='eyesClosed'||id==='eyesHalf');
  const border=Math.ceil(3*Math.max(pw/rect.width,ph/rect.height));
  for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){
   const i=y*pw+x;let edge=!editedEye;
   if(editedEye)for(let d=0;d<=border&&!edge;d++)for(const [xx,yy]of [[x-d,y],[x+d,y],[x,y-d],[x,y+d]])if(xx<0||yy<0||xx>=pw||yy>=ph||patch.data[(yy*pw+xx)*4+3]<128){edge=true;break;}
   if(edge)for(let c=0;c<3;c++)patch.data[i*4+c]=exact[i*4+c];
  }
  await sharp(patch.data,{raw:{width:pw,height:ph,channels:4}}).png().toFile(file+'.fixed.png');fs.renameSync(file+'.fixed.png',file);
 }
 const headLayer=layer('head'),head=await sharp(path.join(out,headLayer.file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const w=head.info.width,h=head.info.height;
 const original=await sharp(path.join(ORIGINALS,manifest.source)).extract({left:headLayer.left,top:headLayer.top,width:headLayer.width,height:headLayer.height}).resize(w,h,{fit:'fill'}).ensureAlpha().raw().toBuffer();
 const radius=Math.ceil(nativeOverlap*Math.max(w/headLayer.width,h/headLayer.height));
 const stats={pose,headPixels:[w,h],nativeOverlap,restoredPixels:0,clearedInteriorPixels:0,runtimeBytes:0};
 for(const id of ['eyesOpen','mouthClosed']){
  const rect=layer(id),patch=await sharp(path.join(out,rect.file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const mask=new Uint8Array(w*h),dist=new Int16Array(w*h);dist.fill(-1);const queue=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const nx=headLayer.left+(x+.5)*headLayer.width/w,ny=headLayer.top+(y+.5)*headLayer.height/h;
   const px=(nx-rect.left)*patch.info.width/rect.width-.5,py=(ny-rect.top)*patch.info.height/rect.height-.5;
   mask[y*w+x]=alphaAt(patch.data,patch.info.width,patch.info.height,px,py)>=128?1:0;
  }
  // A two-sided band restores source colors just outside the previous hole as
  // well as a short distance inside; old nearest-neighbour gutters can differ.
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const i=y*w+x;if([i-1,i+1,i-w,i+w].some(j=>mask[j]!==mask[i])){dist[i]=0;queue.push(i);}
  }
  for(let q=0;q<queue.length;q++){
   const i=queue[q];if(dist[i]>=radius)continue;
   for(const j of [i-1,i+1,i-w,i+w])if(j>=0&&j<w*h&&dist[j]<0){dist[j]=dist[i]+1;queue.push(j);}
  }
  for(let i=0;i<w*h;i++){
   if(dist[i]>=0&&dist[i]<=radius&&original[i*4+3]>=254){
    for(let c=0;c<4;c++)head.data[i*4+c]=original[i*4+c];stats.restoredPixels++;
   }else if(mask[i]){head.data[i*4+3]=0;stats.clearedInteriorPixels++;}
  }
 }
 await sharp(head.data,{raw:{width:w,height:h,channels:4}}).png().toFile(path.join(out,'head-seam-fixed.png'));
 fs.renameSync(path.join(out,'head-seam-fixed.png'),path.join(out,headLayer.file));
 for(const l of manifest.layers){
  if(l.id==='body')continue;
  await sharp(path.join(out,l.file)).webp({lossless:true,effort:6}).toFile(path.join(out,l.runtimeFile));
 }
 for(const l of manifest.layers)stats.runtimeBytes+=fs.statSync(path.join(out,l.runtimeFile)).size;
 return stats;
}
(async()=>{
 const stats=[];for(const pose of ['front','thinking','shy'])stats.push(await fix(pose));
 const work=path.join(OUTPUT_ROOT,'work/alice');fs.mkdirSync(work,{recursive:true});
 fs.writeFileSync(path.join(work,'face-seam-fix-validation.json'),JSON.stringify(stats,null,2)+'\n');console.log(stats);
})().catch(e=>{console.error(e);process.exit(1)});
