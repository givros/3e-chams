import {restaurantTemplate,component,variable} from '../src/studio-model.js';
import {createProductDetails} from '../src/studio-detail.js';
import {createPlayer,playerCSS} from '../src/studio-player.js';
export function runDetailAudit(){
 const results=[],style=document.createElement('style');style.textContent=playerCSS;document.head.append(style);let root;
 const test=(name,fn)=>{root?.remove();root=document.createElement('div');root.className='app-player';root.style.cssText='width:390px;height:650px';document.body.append(root);try{fn();results.push({name,pass:true});}catch(error){results.push({name,pass:false,error:error.message});}};
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 test('filtered catalogue opens the selected article and returns to the catalogue',()=>{
  const p=restaurantTemplate(),source=p.screens[0].nodes.find(n=>n.type==='products'),selection=createProductDetails(p,source.id),search=component('search',p);p.screens[0].nodes.unshift(search);source.props.searchVariable=search.props.variable;
  const player=createPlayer(root,p),input=root.querySelector('input');input.value='Frites';input.dispatchEvent(new Event('input',{bubbles:true}));root.querySelector('[data-event="item"]').click();
  assert(player.getScreen()===selection.screen.id,'detail screen');assert(root.querySelector('.rt-product-detail h3').textContent==='Frites','selected item');assert(root.querySelector('.rt-detail-price').textContent.includes('4,00'),'selected price');
  root.querySelector('.rt-product-detail button').click();assert(player.getState().cart[0].name==='Frites','cart item');root.querySelector('[data-node="'+selection.screen.nodes[0].id+'"]').click();assert(player.getScreen()===p.home,'actual back');assert(root.querySelector('input').value==='Frites','search retained');
 });
 test('the same article merges across catalogue and detail views',()=>{const p=restaurantTemplate(),source=p.screens[0].nodes.find(n=>n.type==='products'),selection=createProductDetails(p,source.id),player=createPlayer(root,p),item=player.getState()[source.props.variable][0];player.run([{type:'cartAdd',variable:'cart',quantity:1}],{item,index:0,node:source});root.querySelector('[data-event="item"]').click();root.querySelector('.rt-product-detail button').click();assert(player.getState().cart.length===1,'same identity');assert(player.getState().cart[0].quantity===2,'same quantity');});
 test('text bindings format prices and preserve suffix text',()=>{const p=restaurantTemplate(),price=variable(p,'ticket','number',8.5),text=component('text',p);text.props.text='Prix : ';text.props.textVariable=price.name;text.props.textFormat='money';text.props.textSuffix=' TTC';p.screens[0].nodes.unshift(text);createPlayer(root,p);assert(root.querySelector('.rt-copy').textContent.includes('8,50'),'price formatting');assert(root.querySelector('.rt-copy').textContent.endsWith(' TTC'),'suffix');});
 test('image components can be bound to text data',()=>{const p=restaurantTemplate(),photo=variable(p,'photo','text','assets/sushi.jpg'),image=component('image',p);image.props.srcVariable=photo.name;p.screens[0].nodes.unshift(image);createPlayer(root,p);assert(root.querySelector('.rt-image').getAttribute('src')==='assets/sushi.jpg','image binding');});
 root?.remove();style.remove();return {total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass)};
}
