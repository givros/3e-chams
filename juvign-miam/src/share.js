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
 const body=JSON.stringify(project);
 if(new Blob([body]).size>8*1024*1024)throw Error('Le projet dépasse 8 Mo. Réduis la taille des images ou exporte en HTML.');
 const url=new URL(shareEndpoint);url.searchParams.set('name',projectSlug(project.name));
 const {id}=await shareRequest(url,{method:'POST',headers:{'Content-Type':'application/json'},body});
 if(!validShareId(id))throw Error('Le service a renvoyé un identifiant invalide.');
 return new URL('/3e-chams/'+id,shareEndpoint).href;
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
