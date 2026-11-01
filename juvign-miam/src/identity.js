export const defaults = {
  cuisine:'burger', theme:'sunset', menuLayout:'list',
  tagline:'Frais. Local. Généreux.', accentColor:'', mainPhoto:'auto',
  mainName:'Le Smash du coin', mainPrice:9.9,
  sideName:'Frites bien dorées', sidePrice:4.5,
  drinkName:'La pause fraîche', drinkPrice:3.5,
  freeDeliveryAt:20, deliveryPrice:2.9,
  promoCode:'MIAM', promoMinimum:15, promoValue:3
};

export const cuisines = {
  burger:{label:'Burgers',description:'Ton burger signature, préparé à ta façon.',image:'burger'},
  pizza:{label:'Pizzas',description:'Ta pizza signature, tout juste sortie du four.',image:'pizza'},
  sushi:{label:'Sushis',description:'Ta sélection signature, fraîche et généreuse.',image:'sushi'},
  tacos:{label:'Tacos',description:'Ton tacos signature, garni à ta façon.',image:'tacos'}
};

export function configuration(api) {
  const config=Object.fromEntries(Object.entries(defaults).map(([key,value])=>[key,api[key]===undefined?value:api[key]]));
  if(api.mainName===undefined&&config.cuisine!=='burger')config.mainName={pizza:'Ta pizza signature',sushi:'Ta sélection sushi',tacos:'Ton tacos signature'}[config.cuisine]||defaults.mainName;
  return config;
}

export function checkField(key,value,config) {
  const options={cuisine:Object.keys(cuisines),theme:['sunset','arcade','ocean'],menuLayout:['list','tiles','spotlight'],mainPhoto:['auto',...Object.keys(cuisines)]};
  if(options[key]) {
    if(!options[key].includes(value))throw Error(`${key} : choisis un texte parmi ${options[key].map(x=>'"'+x+'"').join(', ')}.`);
    return;
  }
  if(key==='accentColor') {
    if(value!==''&&(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value)))throw Error('accentColor : utilise une couleur comme "#dd2255", ou "" pour garder le thème.');
    return;
  }
  if(['mainName','sideName','drinkName','promoCode','tagline'].includes(key)) {
    const max=key==='promoCode'?12:key==='tagline'?60:35;
    if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(`${key} : écris un texte de 1 à ${max} caractères.`);
    return;
  }
  const ranges={mainPrice:[2,25],sidePrice:[1,12],drinkPrice:[1,10],freeDeliveryAt:[10,50],deliveryPrice:[1,6],promoMinimum:[5,35],promoValue:[1,8]};
  const range=ranges[key];
  if(!range||typeof value!=='number'||!Number.isFinite(value)||value<range[0]||value>range[1]||Math.abs(value*100-Math.round(value*100))>.0001)throw Error(`${key} : choisis un nombre entre ${range?.[0]} et ${range?.[1]}, avec au maximum deux décimales (un point, pas une virgule).`);
  const cheapest=Math.min(config.mainPrice,config.sidePrice,config.drinkPrice);
  if(['freeDeliveryAt','promoMinimum'].includes(key)&&value<=cheapest)throw Error(`${key} doit dépasser le prix de ton article le moins cher (${cheapest} €), pour pouvoir tester les deux cas.`);
  if(key==='promoValue'&&value>=config.promoMinimum)throw Error('La réduction doit rester inférieure à son montant minimum.');
}

export function ruleCases(kind,config) {
  if(kind==='delivery')return [
    {key:'deliveryFee',args:[config.freeDeliveryAt-.01],expected:config.deliveryPrice},
    {key:'deliveryFee',args:[config.freeDeliveryAt],expected:0},
    {key:'deliveryFee',args:[config.freeDeliveryAt+7],expected:0}
  ];
  return [
    {key:'discount',args:[config.promoCode,config.promoMinimum],expected:config.promoValue},
    {key:'discount',args:[config.promoCode,config.promoMinimum-.01],expected:0},
    {key:'discount',args:[config.promoCode+'?',config.promoMinimum+10],expected:0}
  ];
}

// Add compatible settings to older workshops without replacing student work.
export function migrateSource(source,fields=Object.keys(defaults)) {
  if(!source.trim())return source;
  const missing=fields.filter(key=>!new RegExp('\\b(?:const|let|var)\\s+'+key+'\\b').test(source));
  return source+(missing.length?'\n\n'+missing.map(key=>`const ${key} = ${JSON.stringify(defaults[key])};`).join('\n'):'');
}

export function prepareSeed(source,seed) {
  return seed.split('\n').filter(line=>{
    const key=line.match(/^const (\w+)\s*=/)?.[1];
    return !key||!new RegExp('\\b(?:const|let|var)\\s+'+key+'\\b').test(source);
  }).join('\n');
}

export const visualKeys=['restaurantName','cuisine','theme','menuLayout','tagline','accentColor','mainPhoto'];
// Read literal visual settings only. Incomplete student functions are never run.
export function visualDraft(source) {
  const values={};
  const pattern=/^\s*(?:const|let|var)\s+(\w+)\s*=\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*;?\s*$/gm;
  for(const match of source.matchAll(pattern)) {
    if(!visualKeys.includes(match[1]))continue;
    try {
      const value=match[2][0]==='"'?JSON.parse(match[2]):match[2].slice(1,-1).replace(/\\'/g,"'").replace(/\\\\/g,'\\');
      if(match[1]==='restaurantName'){if(!value.trim()||value.length>35)continue;}
      else checkField(match[1],value,{...defaults,...values});
      values[match[1]]=value;
    }catch{}
  }
  return values;
}

export function onlyVisualChange(before,after) {
  const remove=source=>source.split('\n').filter(line=>!visualKeys.some(key=>new RegExp('^\\s*(?:const|let|var)\\s+'+key+'\\s*=').test(line))).join('\n').trim();
  return remove(before)===remove(after);
}

export function accentText(hex) {
  const channels=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  const luminance=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
  return (luminance+.05)/.05>=4.5?'#000000':'#ffffff';
}
