const { createCanvas, loadImage } = require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const fs=require('fs');const assert=require('assert/strict');const {pathToFileURL}=require('url');const path=require('path');
require('node:module').registerHooks({resolve(specifier,context,next){return next(/^\.\/alice-[^.]+$/.test(specifier)?`${specifier}.ts`:specifier,context)}});
async function main(){
 const {IDLE_RIG,LAYERS,createRigState,advanceRig,drawRig,deformBodyPoint}=await import(pathToFileURL(path.resolve('models/alice/alice-rig.ts')));
 const {aliceFraming}=await import(pathToFileURL(path.resolve('models/alice/alice-framing.ts')));
 const {createCanvasBodyPainter}=await import(pathToFileURL(path.resolve('models/alice/alice-body.ts')));
 const paintBody=createCanvasBodyPainter();
 const images=Object.fromEntries(await Promise.all(Object.keys(LAYERS).map(async id=>[id,await loadImage(`public/models/alice/layers/${id}.webp`)])));
 const stress=createRigState();
 for(let i=0;i<1200;i++){
  advanceRig(stress, i/60, i===500?10:1/60, true, false, 1.8, { lean: i%120<60?1:-1, lift: Math.sin(i/12), turn: i%120<60?1:-1, nod: Math.sin(i/12) });
  for(const s of Object.values(stress))assert(Number.isFinite(s.value)&&Number.isFinite(s.velocity),'spring must remain finite');
  for(const s of [stress.left,stress.right])assert(Math.abs(s.value)<=.2200001,'hair middle exceeds safe bounds');
  for(const s of [stress.leftTip,stress.rightTip])assert(Math.abs(s.value)<=.3000001,'hair tip exceeds safe bounds');
  assert(Math.abs(stress.bow.value)<=.0180001,'bow exceeds safe bounds');
  for(const s of [stress.armFront,stress.armBack])assert(Math.abs(s.value)<=.0400001,'arm motion exceeds safe bounds');
  const frame={state:stress,time:i/60,fullBody:true,motion:true,strength:1.8,blink:'open',mouthOpen:false,exploded:false};
  for(const [x,y] of [[550,5000],[800,4600]])assert.deepEqual(deformBodyPoint(x,y,frame),{x,y},'feet must stay planted');
  // A positive local Jacobian across both hand regions guards against mesh folds.
  if(i%30===0)for(let y=1500;y<=2600;y+=50)for(let x=100;x<=1200;x+=50){
   const p=deformBodyPoint(x,y,frame),px=deformBodyPoint(x+1,y,frame),py=deformBodyPoint(x,y+1,frame);
   assert((px.x-p.x)*(py.y-p.y)-(px.y-p.y)*(py.x-p.x)>.7,'skin must not fold at a glove or sleeve');
  }
 }
 for(let i=0;i<600;i++)advanceRig(stress, 0, 1/60, false, false, 1);
 for(const s of Object.values(stress))assert(Math.abs(s.value)<.0001,'all parts must settle when motion stops');
 // Regression: breathing and idle gestures must not resize or shear the face.
 const matrixCanvas=createCanvas(600,600),matrixContext=matrixCanvas.getContext('2d');
 const headMatrices=[], cameraMatrices=[];
 const captureBody=(ctx,images,frame)=>{cameraMatrices.push(ctx.getTransform());paintBody(ctx,images,frame);};
 const instrumented=new Proxy(matrixContext,{get(target,key){
  if(key==='drawImage')return (...args)=>{if(args[0]===images.head)headMatrices.push(target.getTransform());return target.drawImage(...args);};
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
 for(const t of [0,1.3,2.6,3.9])for(const x of [-1,0,1]){
  const state=createRigState();for(let j=0;j<180;j++)advanceRig(state, t, 1/60, true, false, 1.8, { lean: x, lift: .8, turn: x, nod: .8 });
  drawRig(instrumented,600,1350,images,{state,time:t,fullBody:false,motion:true,strength:1.8,blink:'open',mouthOpen:false,exploded:false},captureBody);
  // Isolate shared body motion: the same neck point in the mesh and head must coincide.
  state.angle.value=0;state.nod.value=0;
  const frame={state,time:t,fullBody:false,motion:true,strength:1.8,blink:'open',mouthOpen:false,exploded:false};
  drawRig(instrumented,600,1350,images,frame,captureBody);
  const m=headMatrices.at(-1),neck=deformBodyPoint(750,850,frame),camera=cameraMatrices.at(-1);
  assert(Math.abs(m.a*750+m.c*850+m.e-(camera.a*neck.x+camera.c*neck.y+camera.e))<.001,'head must remain attached horizontally');
  assert(Math.abs(m.b*750+m.d*850+m.f-(camera.b*neck.x+camera.d*neck.y+camera.f))<.001,'head must remain attached vertically');
 }
 // Skia stores its affine transform in float32; tolerate sub-pixel rounding.
 for(const [index,m] of headMatrices.entries()){
  const camera=cameraMatrices[index],expected=Math.hypot(camera.a,camera.b);
  assert(Math.abs(Math.hypot(m.a,m.b)-expected)<1e-6,'breathing/gestures must not change head width');
  assert(Math.abs(Math.hypot(m.c,m.d)-expected)<1e-6,'breathing/gestures must not change head height');
  assert(Math.abs(m.a*m.c+m.b*m.d)<1e-8,'head transform must not shear the face');
 }
 // Regression: opposite maximum hair swings leave the face and roots pixel-identical.
 const hairFrames=[];
 const framing=aliceFraming(600,1350,IDLE_RIG,false);
 const rootTop=Math.ceil(framing.top),rootBottom=Math.floor(framing.top+Math.min(IDLE_RIG.rig.hairLeft.pin,IDLE_RIG.rig.hairRight.pin)*framing.scale)-2;
 assert(rootBottom>rootTop,'protected hair roots must be in view');
 for(const amount of [-.055,.055]){
  const tile=createCanvas(600,650),ctx=tile.getContext('2d'),state=createRigState();
  state.left.value=amount;state.right.value=-amount;
  drawRig(ctx,600,1350,images,{state,time:0,fullBody:false,motion:false,strength:1.8,blink:'open',mouthOpen:false,exploded:false},paintBody);
  hairFrames.push(ctx.getImageData(0,rootTop,600,rootBottom-rootTop).data);
 }
 assert.equal(Buffer.compare(Buffer.from(hairFrames[0]),Buffer.from(hairFrames[1])),0,'hair motion must not move the face-adjacent roots');
 const handState=createRigState(),handFrame={state:handState,time:0,fullBody:true,motion:false,strength:1,blink:'open',mouthOpen:false,exploded:false};
 handState.armFront.value=.02;handState.armBack.value=-.02;
 for(const [x,y] of [[450,2100],[140,2300]]){
  const p=deformBodyPoint(x,y,handFrame);assert(Math.hypot(p.x-x,p.y-y)>5,'both hands must move independently of the torso');
 }
 for(const [x,y] of [[1040,1780],[700,1100],[700,2900]]){
  const p=deformBodyPoint(x,y,handFrame);assert(Math.hypot(p.x-x,p.y-y)<.001,'hands must not pull the elbow, neck or hips');
 }
 const stages=[{label:'Rest',x:0,y:0,blink:'open',exploded:false},{label:'Lean left',x:-1,y:.7,blink:'open',exploded:false},{label:'Lean right / blink',x:1,y:-.7,blink:'closed',exploded:false},{label:'Layers',x:0,y:0,blink:'open',exploded:true}];
 const sheet=createCanvas(1600,770);const c=sheet.getContext('2d');c.fillStyle='#14222b';c.fillRect(0,0,1600,770);
 for(let i=0;i<stages.length;i++){
  const f=stages[i], state=createRigState();for(let j=0;j<120;j++)advanceRig(state, 0, 1/60, true, f.exploded, 1.8, { lean: f.x, lift: f.y, turn: f.x, nod: f.y });
  const tile=createCanvas(400,720);drawRig(tile.getContext('2d'),400,720,images,{state,time:0,fullBody:false,motion:false,strength:1.8,blink:f.blink,mouthOpen:false,exploded:f.exploded},paintBody);
  c.drawImage(tile,i*400,40);c.fillStyle='#c7dce0';c.font='17px sans-serif';c.fillText(f.label,i*400+25,25);
  const data=tile.getContext('2d').getImageData(0,0,400,720).data;assert(data.some((v,k)=>k%4===3&&v>0),'rig must render visible pixels');
  fs.writeFileSync(`work/alice/rig-${i}.png`,tile.toBuffer('image/png'));
 }
 fs.writeFileSync('work/alice/rig-check.png',sheet.toBuffer('image/png'));
 console.log('PASS: 11 textures; bounded and settling springs; fixed feet; moving hands with pinned elbow; no mesh folds; shared head/neck attachment; constant face proportions; attached hair roots.');
}
main().catch(e=>{console.error(e);process.exit(1)});
