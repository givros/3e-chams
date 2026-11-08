const shareEndpoint='https://givros-studio.fr/juvign-share.php';
const validShareId=id=>typeof id==='string'&&id.length<=72&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
export function projectSlug(name){
 return name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
  .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60).replace(/-$/,'')||'mon-application';
}

async function shareRequest(url,options){
 let response;
 try{response=await fetch(url,{...options,signal:AbortSignal.timeout(30000)});}
 catch{throw Error('Le service de partage est inaccessible. Réessaie ou exporte ton application en HTML.');}
 const data=await response.json().catch(()=>null);
 if(!response.ok||!data)throw Error(data?.error||'Le service de partage est indisponible.');
 return data;
}

export async function publishProject(project){
 const body=JSON.stringify(project),blob=new Blob([body]);
 const slug=projectSlug(project.name);
 const request=(parameters,payload,type)=>{
  const url=new URL(shareEndpoint);
  url.search=new URLSearchParams({name:slug,...parameters});
  return shareRequest(url,{method:'POST',headers:{'Content-Type':type},body:payload});
 };
 let id;
 if(blob.size<=1024*1024){
  ({id}=await request({},body,'application/json'));
 }else{
  const send=(parameters,payload)=>request(parameters,payload,'application/octet-stream');
  const {token}=await send({upload:'start'});
  if(!validShareId(token))throw Error('Le service a renvoyé un transfert invalide.');
  try{
   for(let offset=0;offset<blob.size;offset+=1024*1024){
    const chunk=blob.slice(offset,offset+1024*1024);
    const result=await send({upload:'chunk',token,offset},chunk);
    if(result.offset!==offset+chunk.size)throw Error('Transfert incomplet. Relance le partage.');
   }
   ({id}=await send({upload:'finish',token,offset:blob.size}));
  }catch(error){
   send({upload:'cancel',token}).catch(()=>{});
   throw error;
  }
 }
 if(!validShareId(id))throw Error('Le service a renvoyé un identifiant invalide.');
 return new URL('/3e-chams/'+id,shareEndpoint).href;
}

export async function listSharedProjects(){
 const url=new URL(shareEndpoint);
 url.searchParams.set('library','1');
 const {apps}=await shareRequest(url);
 if(!Array.isArray(apps))throw Error('La bibliothèque est indisponible.');
 return apps.filter(app=>validShareId(app?.id)&&typeof app.name==='string')
  .map(({id,name})=>({name,url:new URL('/3e-chams/'+id,shareEndpoint).href}));
}

export async function loadSharedProject(id){
 if(!validShareId(id))throw Error('Identifiant de partage invalide.');
 const url=new URL(shareEndpoint);url.searchParams.set('id',id);
 return shareRequest(url);
}

export async function encodeProject(project){
 if(typeof CompressionStream!=='function')throw Error('Le partage nécessite un navigateur récent. Tu peux toujours exporter ton application en HTML.');
 const stream=new Blob([JSON.stringify(project)]).stream().pipeThrough(new CompressionStream('deflate'));
 const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}
export async function decodeProject(encoded){
 if(typeof DecompressionStream!=='function')throw Error('Ouvre ce lien avec un navigateur récent.');
 if(encoded.length>4000000)throw Error('Lien trop volumineux.');
 const binary=atob(encoded.replaceAll('-','+').replaceAll('_','/'));
 const stream=new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('deflate'));
 const reader=stream.getReader();let size=0;const chunks=[];
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>30000000){await reader.cancel();throw Error('Projet trop volumineux.');}chunks.push(value);}
 return JSON.parse(await new Blob(chunks).text());
}
