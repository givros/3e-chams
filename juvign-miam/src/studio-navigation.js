export function navigationSettings(project){return {enabled:false,style:'tabs',showHeader:true,showBack:true,items:[],...project.navigation};}
export function setNavigation(project,changes){
 const before=navigationSettings(project),next={...before,...changes};
 if(changes.enabled===true&&!before.enabled&&!next.items.length)next.items=project.screens.map(s=>s.id);
 next.items=[...new Set(next.items)].filter(id=>project.screens.some(s=>s.id===id));project.navigation=next;return next;
}
export function cleanNavigation(project){if(project.navigation)setNavigation(project,{});}
