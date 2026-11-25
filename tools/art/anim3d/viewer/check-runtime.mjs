#!/usr/bin/env node
/** CPU-only GLTFLoader / AnimationMixer smoke test. No Chromium or WebGL. */
import {readFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {applyTeamMask} from './team-mask.mjs';
import {cameraBasis,measureClip,fitClip} from './framing.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const modules=process.env.VIEWER_NODE_MODULES;
if(!modules)throw new Error('Set VIEWER_NODE_MODULES to a directory containing three@0.170.0');
const THREE=await import(pathToFileURL(join(modules,'three/build/three.module.js')).href);
const {GLTFLoader}=await import(pathToFileURL(join(modules,'three/examples/jsm/loaders/GLTFLoader.js')).href);
globalThis.self=globalThis;
// The CPU check only verifies buffers/dimensions, not browser codec decoding.
globalThis.Image=class {set src(value){queueMicrotask(()=>{this.height=1;this.onload?.();});}};
globalThis.ProgressEvent=class {constructor(type,data){this.type=type;Object.assign(this,data);}};
// Texture dimensions only: no pixel rendering is claimed by this CPU test.
globalThis.createImageBitmap=async blob=>{
  const b=Buffer.from(await blob.arrayBuffer());let width,height;
  if(b[0]===137){width=b.readUInt32BE(16);height=b.readUInt32BE(20);}
  else if(b.toString('ascii',0,4)==='RIFF'){const kind=b.toString('ascii',12,16);
    if(kind==='VP8X'){width=1+b.readUIntLE(24,3);height=1+b.readUIntLE(27,3);}
    else if(kind==='VP8L'){const bits=b.readUInt32LE(21);width=1+(bits&0x3fff);height=1+((bits>>14)&0x3fff);}
    else {assert.equal(kind,'VP8 ');width=b.readUInt16LE(26)&0x3fff;height=b.readUInt16LE(28)&0x3fff;}}
  else {assert.equal(b.readUInt16BE(0),0xffd8);let offset=2;
    while(offset<b.length){assert.equal(b[offset],255);while(b[offset]===255)offset++;const marker=b[offset++];const size=b.readUInt16BE(offset);
      if([0xc0,0xc1,0xc2].includes(marker)){height=b.readUInt16BE(offset+3);width=b.readUInt16BE(offset+5);break;}offset+=size;}
  }
  assert(width&&height);return {width,height,close(){}};
};
const path=process.argv[2]||resolve(here,'../units/spearman-0ad/spearman.glb');
const bytes=await readFile(path);
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const lods=['spearman_LOD0','spearman_LOD1'].map(n=>gltf.scene.getObjectByName(n));
assert(lods.every(o=>o?.isSkinnedMesh));
assert.equal(lods[0].skeleton,lods[1].skeleton);
assert.equal(lods[0].material,lods[1].material);
lods[1].visible=false;
assert.deepEqual(gltf.animations.map(a=>a.name).sort(),['attack','death','hit','idle','walk']);
const mixer=new THREE.AnimationMixer(gltf.scene);
const report={three:THREE.REVISION,clips:{},teamMaterials:0};
const mats=new Set();gltf.scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[]))if(m.userData.team?.attribute==='COLOR_0')mats.add(m);});
assert.equal(mats.size,1);report.teamMaterials=mats.size;
for(const m of mats){assert.equal(m.map.image.width,1024);assert.equal(m.map.image.height,1024);assert(m.normalMap);assert.equal(m.aoMap,m.roughnessMap);assert.equal(m.metalnessMap,m.roughnessMap);applyTeamMask(m,THREE);m.userData.teamUniform.value.set('#306bda');
  const shader={uniforms:{},fragmentShader:'#include <color_fragment>'};m.onBeforeCompile(shader);
  assert(shader.fragmentShader.includes('vColor.r'));assert.equal(shader.uniforms.teamColor.value.getHexString(),'306bda');}
for(const clip of gltf.animations){
  mixer.stopAllAction();const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.reset().play();
  const bound=new THREE.Box3();let first,last,poseDelta=0;
  for(let i=0;i<=Math.round(clip.duration*30);i++){
    action.time=i/30;mixer.update(0);gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});
    bound.union(new THREE.Box3().setFromObject(gltf.scene,true));
    const bone=gltf.scene.getObjectByName(clip.name==='walk'?'foot_L':'chest');
    const pos=bone.getWorldPosition(new THREE.Vector3());
    if(!first)first=pos.clone();poseDelta=Math.max(poseDelta,first.distanceTo(pos));last=pos;
    let draws=0;
    gltf.scene.traverse(o=>{if(!o.isMesh)return;draws++;assert(o.isSkinnedMesh);
      const color=o.geometry.getAttribute('color');assert(color);assert.equal(color.itemSize,4);
      assert.equal(o.skeleton.bones.length,30);assert(!Array.isArray(o.material));
    });assert.equal(draws,2);

  }
  assert(poseDelta>.0001,`${clip.name} must actually animate`);
  if(['idle','walk'].includes(clip.name))assert(first.distanceTo(last)<.0001,`${clip.name} seam`);
  report.clips[clip.name]={duration:clip.duration,bounds:[bound.min.toArray(),bound.max.toArray()],probeMotionMetres:poseDelta};
}
const config=JSON.parse(await readFile(resolve(here,'../units/spearman-0ad/review.json'),'utf8'));
const basis=cameraBasis(THREE,config);
report.framing={};
for(const clip of gltf.animations) {
  const measured=measureClip(THREE,gltf.scene,mixer,mixer.clipAction(clip),basis);
  const fit=fitClip(THREE,measured,basis,config,1.5);
  assert(fit.figureFraction>.65 && fit.figureFraction<=.70001,`${clip.name}: figure fill`);
  assert(fit.widthFraction<=.92001 && fit.heightFraction<=.92001,`${clip.name}: full extent`);
  report.framing[clip.name]={...fit,target:fit.target.toArray(),displayYawDegrees:config.display_yaw_degrees};
}
console.log(JSON.stringify(report,null,2));
