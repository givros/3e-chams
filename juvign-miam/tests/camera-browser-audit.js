import {blankProject,component} from '../src/studio-model.js';
import {createPlayer} from '../src/studio-player.js';

export async function runCameraAudit(){
 const results=[],p=blankProject(),node=component('camera',p);p.screens[0].nodes=[node];p.screens.push({id:'other',name:'Other',nodes:[]});
 const root=document.createElement('div');document.body.append(root);let player=createPlayer(root,p);
 const key='studio-photo-'+p.id+'-'+node.props.variable;
 const assert=(value,message)=>{if(!value)throw Error(message);};
 const until=async fn=>{const start=Date.now();while(!fn()){if(Date.now()-start>5000)throw Error('Camera state timeout');await new Promise(r=>setTimeout(r,20));}};
 const check=async(name,fn)=>{try{await fn();results.push({name,pass:true});}catch(error){results.push({name,pass:false,error:error.message});}};
 const open=async()=>{root.querySelector('[data-camera-open]').click();await until(()=>root.querySelector('video')?.videoWidth>0);return root.querySelector('video').srcObject.getTracks();};
 try{
  await check('synthetic camera capture is saved locally and releases the stream',async()=>{const tracks=await open();root.querySelector('[data-camera-capture]').click();await until(()=>root.querySelector('.rt-camera img'));assert(tracks.every(t=>t.readyState==='ended'),'capture stops tracks');assert(localStorage.getItem(key)?.startsWith('data:image/jpeg;base64,'),'local photo');assert(player.getState()[node.props.variable].startsWith('data:image/jpeg;'),'linked photo data');});
  await check('reopening a player restores its last photo without changing the project',async()=>{player.destroy();root.replaceChildren();player=createPlayer(root,p);assert(root.querySelector('.rt-camera img'),'restored photo');assert(p.variables.find(v=>v.name===node.props.variable).initial==='','source app contains no captured photo');});
  await check('leaving the camera screen stops every active video track',async()=>{const tracks=await open();player.run([{type:'navigate',screen:'other'}]);assert(tracks.every(t=>t.readyState==='ended'),'navigation stops tracks');player.run([{type:'back'}]);});
  await check('permission refusal leaves a usable image-picker fallback',async()=>{const original=navigator.mediaDevices.getUserMedia;try{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};root.querySelector('[data-camera-open]').click();await until(()=>root.textContent.includes('refusé'));assert(root.querySelector('[data-camera-file]'),'fallback input');assert(!root.querySelector('[data-camera-open]').disabled,'retry available');}finally{navigator.mediaDevices.getUserMedia=original;}});
  await check('storage failures keep a downloadable photo and report the failed save',async()=>{const tracks=await open(),original=Storage.prototype.setItem;try{Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Full','QuotaExceededError');return original.call(this,k,v);};root.querySelector('[data-camera-capture]').click();await until(()=>root.textContent.includes('enregistrement local est indisponible'));assert(root.querySelector('[data-camera-download]'),'download remains available');assert(tracks.every(t=>t.readyState==='ended'),'quota still stops camera');}finally{Storage.prototype.setItem=original;}});
  await check('reset removes the local photo and stops an open camera',async()=>{const tracks=await open();player.reset();assert(!localStorage.getItem(key),'local photo removed');assert(!root.querySelector('.rt-camera img'),'preview cleared');assert(tracks.every(t=>t.readyState==='ended'),'reset stops camera');});
 }finally{player.destroy();root.remove();localStorage.removeItem(key);}
 return {total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass)};
}
