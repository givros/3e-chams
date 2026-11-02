import {blankProject,component} from '../src/studio-model.js';
import {themePresets,applyThemePreset,readableText} from '../src/studio-theme.js';
import {createPlayer,playerCSS} from '../src/studio-player.js';
export function runThemeAudit(){
 const results=[],css=document.createElement('style');css.textContent=playerCSS;document.head.append(css);const root=document.createElement('div');root.className='app-player';root.style.cssText='width:390px;height:600px';document.body.append(root);
 const p=blankProject(),button=component('button',p),input=component('input',p),products=component('products',p);p.screens[0].nodes.push(button,input,products);const player=createPlayer(root,p);
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const test=(name,fn)=>{try{fn();results.push({name,pass:true});}catch(error){results.push({name,pass:false,error:error.message});}};
 for(const theme of themePresets)test('palette '+theme.name,()=>{applyThemePreset(p,theme.id);player.update(p);const css=getComputedStyle(root.querySelector('[data-node="'+button.id+'"]')),expected=readableText(theme.primary)==='#ffffff'?'rgb(255, 255, 255)':'rgb(0, 0, 0)';assert(css.color===expected,'button contrast');assert(css.borderRadius===theme.radius+'px','radius inheritance');});
 test('individual color and radius overrides survive theme changes',()=>{button.style.color='#123456';button.style.background='#fedcba';button.style.radius=24;applyThemePreset(p,'night');player.update(p);const css=getComputedStyle(root.querySelector('[data-node="'+button.id+'"]'));assert(css.color==='rgb(18, 52, 86)','text override');assert(css.borderRadius==='24px','radius override');});
 test('text fields on dark themes retain readable local surfaces',()=>{input.style.background='';input.style.color='';player.update(p);const css=getComputedStyle(root.querySelector('input'));assert(css.backgroundColor==='rgb(255, 255, 255)','input background');assert(css.color==='rgb(0, 0, 0)','input text');});
 test('selected fonts apply to buttons and input controls',()=>{p.theme.font='serif';player.update(p);assert(getComputedStyle(root.querySelector('button')).fontFamily.includes('Georgia'),'button font');assert(getComputedStyle(root.querySelector('input')).fontFamily.includes('Georgia'),'input font');});
 root.remove();css.remove();return {total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass)};
}
