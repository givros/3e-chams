export function navigationSettings(project){const nav=project.navigation||{};return {enabled:false,style:'tabs',showHeader:true,showBack:true,headerIcon:nav.style==='drawer'||nav.style==='both'?'menu':'none',profileScreen:'',items:[],...nav};}
export function setNavigation(project,changes){
 const before=navigationSettings(project),next={...before,...changes};
 if(changes.enabled===true&&!before.enabled&&!next.items.length)next.items=project.screens.map(s=>s.id);
 if(changes.style&&!Object.hasOwn(changes,'headerIcon')&&before.headerIcon==='none'&&['drawer','both'].includes(changes.style))next.headerIcon='menu';
 if(next.headerIcon==='profile'&&!project.screens.some(s=>s.id===next.profileScreen))next.profileScreen=project.screens.find(s=>/profil|profile/i.test(s.name))?.id||'';
 next.items=[...new Set(next.items)].filter(id=>project.screens.some(s=>s.id===id));project.navigation=next;return next;
}
export function cleanNavigation(project){if(project.navigation)setNavigation(project,{});}
export function moveNavigationItem(project,id,delta){
 const nav=navigationSettings(project),index=nav.items.indexOf(id),next=index+Math.sign(delta);
 if(index<0||next<0||next>=nav.items.length||!delta)return false;
 const items=nav.items.slice();[items[index],items[next]]=[items[next],items[index]];setNavigation(project,{items});return true;
}
