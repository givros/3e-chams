export function insertionIndex(rects,x,y,horizontal=false,grid=false){
 for(let i=0;i<rects.length;i++){const r=rects[i];if(grid){if(y<r.top||y<=r.top+r.height&&x<r.left+r.width/2)return i;}else if(horizontal?x<r.left+r.width/2:y<r.top+r.height/2)return i;}return rects.length;
}
export function moveActionBlock(node,fromPath,targetPath,index){
 const arrayPath=/^events\.(click|change|item|finish)(\.\d+\.(then|else))*$/;
 const parts=fromPath.split('.'),fromIndex=Number(parts.pop()),parentPath=parts.join('.');
 if(!arrayPath.test(parentPath)||!arrayPath.test(targetPath)||!Number.isInteger(fromIndex)||targetPath.startsWith(fromPath+'.'))return false;
 const get=path=>path.split('.').reduce((value,key)=>value?.[key],node),from=get(parentPath),target=get(targetPath);
 if(!Array.isArray(from)||!Array.isArray(target)||fromIndex<0||fromIndex>=from.length||!Number.isInteger(index)||index<0||index>target.length)return false;
 const [action]=from.splice(fromIndex,1);target.splice(index-(from===target&&fromIndex<index?1:0),0,action);return true;
}
