export function scaledImageSize(width,height,maxSide=1280){const ratio=Math.min(1,maxSide/Math.max(width,height));return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};}
function dataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Impossible de lire ce fichier image.'));reader.readAsDataURL(blob);});}
async function decodeImage(file){
 if(typeof createImageBitmap==='function')try{return await createImageBitmap(file);}catch{}
 const source=await dataURL(file);return await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Ce fichier ne peut pas être lu comme une image.'));image.src=source;});
}
export async function prepareImage(file){
 if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw Error('Choisis une image PNG, JPEG, WebP ou GIF.');
 if(!file.size)throw Error('Ce fichier image est vide.');
 if(file.size>10*1024*1024)throw Error('Choisis une image de moins de 10 Mo.');
 const image=await decodeImage(file),width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;
 if(!width||!height){image.close?.();throw Error('Cette image ne contient pas de dimensions valides.');}
 const scaled=scaledImageSize(width,height),resized=scaled.width!==width||scaled.height!==height;
 if(file.type==='image/gif'||!resized&&file.size<=180000){image.close?.();return {src:await dataURL(file),bytes:file.size,width,height,optimized:false};}
 const canvas=document.createElement('canvas');canvas.width=scaled.width;canvas.height=scaled.height;
 const context=canvas.getContext('2d');if(!context){image.close?.();throw Error('Le navigateur ne peut pas préparer cette image.');}
 context.drawImage(image,0,0,scaled.width,scaled.height);image.close?.();
 const mime=file.type==='image/jpeg'?'image/jpeg':'image/webp';
 const encode=quality=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Impossible de préparer cette image.')),mime,quality));
 let result=await encode(.86);for(const quality of [.74,.64]){if(result.size<=320000)break;const next=await encode(quality);if(next.size<result.size)result=next;}canvas.width=canvas.height=0;
 const output=result.size>=file.size?file:result;
 return {src:await dataURL(output),bytes:output.size,width:output===file?width:scaled.width,height:output===file?height:scaled.height,optimized:output!==file};
}
