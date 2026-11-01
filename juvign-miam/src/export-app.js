// This function is embedded unchanged in the standalone file.
function mountStandalone(payload) {
 const root=document.querySelector('#app');
 const screen=document.querySelector('#phone-screen');
 const config=payload.config;
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>Number(n).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
 let quantities=[0,0,0],page='menu',promo='',applied='',serial=0,pending=new Map();
 const names=['addQuantity','removeQuantity','lineTotal','subtotal','deliveryFee','discount','grandTotal'];
 const workerCode='const api=new Function('+JSON.stringify(payload.source+'\nreturn {'+names.join(',')+'};')+')();onmessage=({data})=>{try{postMessage({id:data.id,value:api[data.method](...data.args)})}catch(error){postMessage({id:data.id,error:error.message})}};';
 const url=URL.createObjectURL(new Blob([workerCode],{type:'text/javascript'}));
 const worker=new Worker(url);URL.revokeObjectURL(url);
 worker.onmessage=({data})=>{const item=pending.get(data.id);if(!item)return;clearTimeout(item.timer);pending.delete(data.id);data.error?item.reject(Error(data.error)):item.resolve(data.value);};
 const call=(method,args)=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>{worker.terminate();for(const item of pending.values()){clearTimeout(item.timer);item.reject(Error('Le code prend trop de temps. Rouvre ton fichier pour réessayer.'));}pending.clear();},1500);pending.set(id,{resolve,reject,timer});worker.postMessage({id,method,args});});
 const totals=async()=>{const lines=await Promise.all(payload.menu.map((p,i)=>call('lineTotal',[p.price,quantities[i]])));const amount=await call('subtotal',lines);const fee=amount?await call('deliveryFee',[amount]):0;const reduction=await call('discount',[applied,amount]);const total=await call('grandTotal',[amount,fee,reduction]);return {lines,amount,fee,reduction,total};};
 const header=(title,back=false)=>`<div class="app-top"><button class="location" data-action="${back?'menu':'location'}">${back?'← Retour':'⌖ Juvignac'}</button><div class="avatar">${esc(payload.name.slice(0,2).toUpperCase())}</div></div><h2 class="screen-title">${title}</h2>`;
 const stepper=i=>`<div class="quantity-controls"><button data-action="remove" data-item="${i}" aria-label="Retirer ${esc(payload.menu[i].name)}">−</button><span>${quantities[i]}</span><button data-action="add" data-item="${i}" aria-label="Ajouter ${esc(payload.menu[i].name)}">+</button></div>`;
 let rendered='';
 async function render() {
  const t=await totals(),count=quantities.reduce((a,b)=>a+b,0);
  let html='';
  if(page==='menu') html=header('Une petite faim ?')+`<div class="restaurant-hero"><img src="${payload.images[payload.menu[0].image]}" alt="${esc(payload.menu[0].name)}"><div class="hero-shade"></div><span class="hero-badge">${esc(payload.specialty)}</span><div class="hero-copy"><span>${esc(config.tagline)}</span><h3>${esc(payload.name)}</h3></div></div><div class="restaurant-meta"><b>Livraison ${money(config.deliveryPrice)}</b><span>Offerte dès ${money(config.freeDeliveryAt)} de plats</span></div><div class="menu-heading"><h3>La carte</h3></div><div class="food-list">${payload.menu.map((p,i)=>`<article class="food-item"><div class="food-copy"><span class="food-tag">${esc(p.tag)}</span><h4>${esc(p.name)}</h4><p>${esc(p.description)}</p><b>${money(p.price)}</b></div><div class="food-picture"><img src="${payload.images[p.image]}" alt="${esc(p.name)}">${stepper(i)}</div></article>`).join('')}</div>`;
  else if(page==='cart')html=header('Ton panier',true)+`<p class="cart-restaurant">${esc(payload.name)}</p>${count?`<div class="cart-items">${payload.menu.map((p,i)=>quantities[i]?`<div class="cart-item"><img src="${payload.images[p.image]}" alt=""><div><b>${esc(p.name)}</b><span>${money(p.price)} / pièce</span><div class="cart-quantity"><button data-action="remove" data-item="${i}" aria-label="Retirer ${esc(p.name)}">−</button><b>${quantities[i]}</b><button data-action="add" data-item="${i}" aria-label="Ajouter ${esc(p.name)}">+</button></div></div><strong>${money(t.lines[i])}</strong></div>`:'').join('')}</div><div class="promo-box"><label for="promo">Un code promo ?</label><div><input id="promo" value="${esc(promo)}" placeholder="Code promo"><button data-action="promo">Appliquer</button></div><small>${t.reduction?`${money(t.reduction)} de réduction.`:`${esc(config.promoCode)} : − ${money(config.promoValue)} dès ${money(config.promoMinimum)}.`}</small></div><div class="receipt"><div><span>Sous-total</span><b>${money(t.amount)}</b></div><div><span>Livraison</span><b>${t.fee?money(t.fee):'Offerte'}</b></div>${t.reduction?`<div><span>Réduction ${esc(config.promoCode)}</span><b>− ${money(t.reduction)}</b></div>`:''}<div class="receipt-total"><b>Total</b><strong>${money(t.total)}</strong></div></div>`:'<div class="empty-state"><h3>Ton panier est vide.</h3><button data-action="menu">Découvrir les plats →</button></div>'}`;
  else html=header('',true)+`<div class="order-success"><div class="success-seal">✓</div><h2>Commande confirmée.</h2><p>Commande simulée confirmée.</p><div class="order-ticket"><span>MON RESTAURANT</span><h3>${esc(payload.name)}</h3><div>${count} articles<b>${money(t.total)}</b></div><p>${esc(config.tagline)}</p></div><button class="app-primary" data-action="new">Nouvel essai →</button></div>`;
  screen.innerHTML=html;
  if(page==='menu'&&Array.isArray(payload.components)) {
   const title=screen.querySelector('.screen-title'),photo=screen.querySelector('.restaurant-hero'),meta=screen.querySelector('.restaurant-meta'),list=screen.querySelector('.food-list'),heading=screen.querySelector('.menu-heading');
   if(title)title.textContent=payload.name;
   const photoGroup=document.createElement('section'),menuGroup=document.createElement('section');
   if(photo)photoGroup.append(photo);if(meta)photoGroup.append(meta);if(heading)menuGroup.append(heading);if(list)menuGroup.append(list);
   const groups={title,photo:photoGroup,menu:menuGroup};
   for(const id of payload.components)if(groups[id])screen.append(groups[id]);
  }
  if(page!==rendered){screen.scrollTop=0;rendered=page;}
  if(page!=='success')screen.insertAdjacentHTML('beforeend',`<div class="phone-bottom"><button class="app-primary" data-action="${page==='cart'?'order':'cart'}" ${page==='cart'&&!count?'disabled':''}>${page==='cart'?'Confirmer la commande':`<span class="cart-count">${count}</span> Voir mon panier`}<b>${money(t.total)} →</b></button></div>`);
 }
 screen.addEventListener('input',event=>{if(event.target.id==='promo')promo=event.target.value;});
 let queue=Promise.resolve();
 screen.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button||button.disabled)return;const action=button.dataset.action,i=Number(button.dataset.item);queue=queue.then(async()=>{try{
  root.setAttribute('aria-busy','true');
  if(action==='add'||action==='remove'){const value=await call(action==='add'?'addQuantity':'removeQuantity',[quantities[i]]);if(Number.isInteger(value)&&value>=0&&value<=99)quantities[i]=value;}
  if(action==='menu'||action==='cart')page=action;
  if(action==='promo')applied=promo.trim();
  if(action==='order'&&quantities.some(q=>q>0))page='success';
  if(action==='new'){page='menu';quantities=[0,0,0];promo=applied='';}
  await render();
 }catch(error){document.querySelector('#status').textContent=error.message;}finally{root.setAttribute('aria-busy','false');}});});
 render().catch(error=>{document.querySelector('#status').textContent=error.message;});
}

const safeJSON=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function standaloneHTML(payload,css) {
 const color=payload.config.accentColor;
 const accent=color?`--student-accent:${color};--student-on-accent:${payload.onAccent};`:'';
 return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'unsafe-eval'; worker-src blob:; connect-src 'none'; base-uri 'none'"><title>${escapeHTML(payload.name)}</title><style>${css.replace(/<\/style/gi,'')}\nbody.standalone{min-width:0;margin:0;display:grid;place-items:center;background:#fff3df;min-height:100vh;padding:22px;font-family:'Trebuchet MS',Arial,sans-serif}body.standalone .phone{width:390px;height:820px;max-height:calc(100vh - 85px);min-height:550px;margin:0}#status{text-align:center;font-size:11px;max-width:390px;line-height:1.6;color:#826f80;margin:18px 0 0}</style></head><body class="standalone"><main><div id="app" class="phone" data-theme="${escapeHTML(payload.config.theme)}" data-menu-layout="${escapeHTML(payload.config.menuLayout)}" data-custom-accent="${!!color}" style="${accent}"><div class="phone-hardware"><span>9:41</span><div class="island"></div><span>▮▮ ▰</span></div><div id="phone-screen" class="phone-screen"></div><div class="home-indicator"></div></div><p id="status">Créé avec mon code · commande fictive, aucun paiement</p></main><script>(${mountStandalone.toString()})(${safeJSON(payload)});</script></body></html>`;
}

export async function createStandalone(payload) {
 const urls=[...new Set(payload.menu.map(p=>p.image))];
 const [css,photos]=await Promise.all([
   Promise.all(['style.css','street-food.css'].map(async file=>{const response=await fetch(file);if(!response.ok)throw Error('Impossible de charger la présentation.');return response.text();})).then(parts=>parts.join('\n')),
   Promise.all(urls.map(async name=>{const response=await fetch(`assets/${name}.jpg`);if(!response.ok)throw Error('Impossible de charger une photo.');const blob=new Blob([await response.arrayBuffer()],{type:'image/jpeg'});const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});return [name,data];}))
 ]);
 return standaloneHTML({...payload,images:Object.fromEntries(photos)},css);
}
