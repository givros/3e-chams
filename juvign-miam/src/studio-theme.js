export const appFonts=[['rounded','Trebuchet'],['simple','Arial'],['serif','Georgia'],['mono','Courier'],['clear','Verdana']];
export function readableText(color){if(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))return '#000000';const c=color.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4),l=c[0]*.2126+c[1]*.7152+c[2]*.0722;return (l+.05)/.05>=4.5?'#000000':'#ffffff';}
export const themePresets=[
 {id:'violet',name:'Violet',primary:'#6339c7',background:'#fff8ef',text:'#29173f',radius:12,font:'rounded'},
 {id:'orange',name:'Orange',primary:'#ff5a2e',background:'#fff8ef',text:'#29173f',radius:14,font:'simple'},
 {id:'ocean',name:'Océan',primary:'#1268c4',background:'#f1f8ff',text:'#17344c',radius:10,font:'clear'},
 {id:'mint',name:'Menthe',primary:'#16775d',background:'#f1fff8',text:'#173b31',radius:18,font:'rounded'},
 {id:'pink',name:'Rose',primary:'#bd2877',background:'#fff3fa',text:'#4b2038',radius:20,font:'simple'},
 {id:'night',name:'Nuit',primary:'#87e8cf',background:'#141a2a',text:'#f3f4ff',radius:12,font:'simple'},
 {id:'paper',name:'Papier',primary:'#7d4027',background:'#fff7e5',text:'#3c2a23',radius:3,font:'serif'},
 {id:'pop',name:'Pop',primary:'#eed52c',background:'#f8f5ff',text:'#25223a',radius:5,font:'clear'}
];
export function setAppBackground(project,color){const old=project.theme.background;project.theme.background=color;for(const s of project.screens)if(!s.background||s.background===old)s.background=color;}
export function applyThemePreset(project,id){const preset=themePresets.find(t=>t.id===id);if(!preset)return false;setAppBackground(project,preset.background);const {id:_,name:__,...theme}=preset;Object.assign(project.theme,theme);return true;}
