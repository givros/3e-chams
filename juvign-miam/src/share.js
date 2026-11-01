export async function encodeProject(project){
 const stream=new Blob([JSON.stringify(project)]).stream().pipeThrough(new CompressionStream('deflate'));
 const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}
export async function decodeProject(encoded){
 if(encoded.length>4000000)throw Error('Lien trop volumineux.');
 const binary=atob(encoded.replaceAll('-','+').replaceAll('_','/'));
 const stream=new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('deflate'));
 const reader=stream.getReader();let size=0;const chunks=[];
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>30000000){await reader.cancel();throw Error('Projet trop volumineux.');}chunks.push(value);}
 return JSON.parse(await new Blob(chunks).text());
}
