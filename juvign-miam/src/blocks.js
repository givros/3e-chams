export const steps=[
 {title:'Ton restaurant',verb:'Invente son nom et choisis ce que tu sers.',minutes:10},
 {title:'Ton premier écran',verb:'Glisse les 4 éléments dans ton téléphone.',minutes:12},
 {title:'Ta carte',verb:'Invente tes 3 plats et fixe leurs prix.',minutes:15},
 {title:'Action du bouton',verb:'Relie le clic à la quantité, puis ajoute 2 plats.',minutes:15},
 {title:'Le bug du panier',verb:'Fais apparaître −1, puis empêche ce bug.',minutes:12},
 {title:'Le bon calcul',verb:'Assemble le calcul, puis teste 2 plats dans le panier.',minutes:15},
 {title:'Ta livraison',verb:'Construis ta condition et teste sa limite.',minutes:15},
 {title:'Commande finale',verb:'Crée ta promo et passe une commande complète.',minutes:16}
];
export const components=[
 {id:'title',label:'Titre du restaurant',symbol:'T',description:'Ton nom, bien visible'},
 {id:'photo',label:'Photo de couverture',symbol:'▧',description:'La première impression'},
 {id:'menu',label:'Carte des plats',symbol:'☷',description:'Tes plats et leurs prix'},
 {id:'cart',label:'Bouton du panier',symbol:'＋',description:'Le passage à la commande'}
];
export const specialties={
 burger:{label:'Burger',image:'burger',suggestions:['Mon burger signature','Mes frites','Ma boisson']},
 pizza:{label:'Pizza',image:'pizza',suggestions:['Ma pizza signature','Mon accompagnement','Ma boisson']},
 sushi:{label:'Sushi',image:'sushi',suggestions:['Mon plateau signature','Mon accompagnement','Ma boisson']},
 tacos:{label:'Tacos',image:'tacos',suggestions:['Mon tacos signature','Mes frites','Ma boisson']}
};
export function newProject(){return {
 version:2,started:false,index:0,completed:[],name:'',specialty:'burger',theme:'sunset',layout:'list',accent:'#ff5a2e',tagline:'',
 components:[],menu:[{name:'',price:10,image:'burger'},{name:'',price:4,image:'fries'},{name:'',price:3,image:'drink'}],
 add:{target:null,action:null},guard:false,operator:null,
 delivery:{comparator:null,threshold:25,fee:2.5},promo:{code:'',minimum:15,value:2,join:null},
 evidence:{},quantities:[0,0,0]
};}
export function validProject(p){
 const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
 return !!p&&p.version===2&&typeof p.started==='boolean'&&Number.isInteger(p.index)&&p.index>=0&&p.index<steps.length&&Array.isArray(p.completed)&&p.completed.every(i=>Number.isInteger(i)&&i>=0&&i<8)&&typeof p.name==='string'&&p.name.length<=35&&Object.hasOwn(specialties,p.specialty)&&['sunset','arcade','ocean'].includes(p.theme)&&['list','tiles','spotlight'].includes(p.layout)&&/^#[a-f0-9]{6}$/i.test(p.accent)&&typeof p.tagline==='string'&&p.tagline.length<=60&&Array.isArray(p.components)&&new Set(p.components).size===p.components.length&&p.components.every(id=>components.some(c=>c.id===id))&&Array.isArray(p.menu)&&p.menu.length===3&&p.menu.every(item=>item&&typeof item.name==='string'&&item.name.length<=35&&finite(item.price,1,25)&&['burger','pizza','sushi','tacos','fries','drink'].includes(item.image))&&p.add&&[null,'quantity','price'].includes(p.add.target)&&[null,'increment','double','reset'].includes(p.add.action)&&typeof p.guard==='boolean'&&[null,'multiply','plus','subtract'].includes(p.operator)&&p.delivery&&[null,'gte','gt'].includes(p.delivery.comparator)&&finite(p.delivery.threshold,10,50)&&finite(p.delivery.fee,1,6)&&p.promo&&typeof p.promo.code==='string'&&p.promo.code.length<=12&&finite(p.promo.minimum,5,35)&&finite(p.promo.value,1,8)&&p.promo.value<p.promo.minimum&&[null,'and','or'].includes(p.promo.join)&&p.evidence&&typeof p.evidence==='object'&&!Array.isArray(p.evidence)&&Array.isArray(p.quantities)&&p.quantities.length===3&&p.quantities.every(q=>Number.isInteger(q)&&q>=-1&&q<=99);
}
export function addQuantity(project,quantity){
 if(project.add.target!=='quantity')return quantity;
 return project.add.action==='increment'?quantity+1:project.add.action==='double'?quantity*2:project.add.action==='reset'?0:quantity;
}
export function removeQuantity(project,quantity){return project.guard?Math.max(0,quantity-1):quantity-1;}
export function lineTotal(project,price,quantity){return project.operator==='multiply'?price*quantity:project.operator==='plus'?price+quantity:project.operator==='subtract'?price-quantity:0;}
export function deliveryFee(project,amount){const d=project.delivery;return (d.comparator==='gte'&&amount>=d.threshold)||(d.comparator==='gt'&&amount>d.threshold)?0:d.fee;}
export function discount(project,code,amount){
 if(!project.promo.join||!project.promo.code.trim())return 0;
 const rightCode=code===project.promo.code,minimum=amount>=project.promo.minimum;
 return (project.promo.join==='and'?rightCode&&minimum:rightCode||minimum)?project.promo.value:0;
}
export function cartTotals(project,quantities,code=''){
 const lines=project.menu.map((p,i)=>lineTotal(project,p.price,quantities[i]));
 const amount=lines.reduce((a,b)=>a+b,0),fee=quantities.some(q=>q>0)?deliveryFee(project,amount):0,reduction=discount(project,code,amount);
 return {lines,amount,fee,reduction,total:amount+fee-reduction};
}
export function deliveryCases(project){const d=project.delivery;return [d.threshold-.01,d.threshold,d.threshold+1].map(amount=>({amount,actual:deliveryFee(project,amount),expected:amount>=d.threshold?0:d.fee}));}
export function promoCases(project){const p=project.promo;return [{code:p.code+'?',amount:p.minimum+1,expected:0},{code:p.code,amount:p.minimum-.01,expected:0},{code:p.code,amount:p.minimum,expected:p.value}].map(c=>({...c,actual:discount(project,c.code,c.amount)}));}
export function ready(project,index){const e=project.evidence;return [
 ()=>project.name.trim().length>=2,
 ()=>components.every(c=>project.components.includes(c.id)),
 ()=>project.menu.every(p=>p.name.trim().length>=2&&p.price>=1&&p.price<=25),
 ()=>project.add.target==='quantity'&&project.add.action==='increment'&&!!e.addTest,
 ()=>project.guard&&!!e.sawNegative&&!!e.zeroTest,
 ()=>project.operator==='multiply'&&!!e.lineTest,
 ()=>project.delivery.comparator==='gte'&&!!e.deliveryTest&&deliveryCases(project).every(c=>Math.abs(c.actual-c.expected)<.001),
 ()=>project.promo.code.trim().length>0&&project.promo.join==='and'&&project.promo.value<project.promo.minimum&&!!e.promoTest&&!!e.orderTest
 ][index]();}
export function invalidate(project,from){project.completed=project.completed.filter(i=>i<from);const related={3:['addTest'],4:['sawNegative','zeroTest'],5:['lineTest'],6:['deliveryTest'],7:['promoTest','orderTest']};for(const [index,keys]of Object.entries(related))if(Number(index)>=from)for(const key of keys)delete project.evidence[key];}
export function generateCode(p){
 const text=JSON.stringify;
 return `const restaurantName = ${text(p.name||'Mon restaurant')};
const cuisine = ${text(p.specialty)};
const theme = ${text(p.theme)};
const menuLayout = ${text(p.layout)};
const screenComponents = ${text(p.components)};
const accentColor = ${text(p.accent)};
const tagline = ${text(p.tagline||'')};
const mainPhoto = ${text(p.menu[0].image)};
const mainName = ${text(p.menu[0].name||'Mon plat')};
const mainPrice = ${p.menu[0].price};
const sideName = ${text(p.menu[1].name||'Mon accompagnement')};
const sidePrice = ${p.menu[1].price};
const drinkName = ${text(p.menu[2].name||'Ma boisson')};
const drinkPrice = ${p.menu[2].price};
const freeDeliveryAt = ${p.delivery.threshold};
const deliveryPrice = ${p.delivery.fee};
const promoCode = ${text(p.promo.code)};
const promoMinimum = ${p.promo.minimum};
const promoValue = ${p.promo.value};

// Quand on clique sur Ajouter
function addQuantity(quantity) { return ${p.add.target!=='quantity'?'quantity':p.add.action==='increment'?'quantity + 1':p.add.action==='double'?'quantity * 2':p.add.action==='reset'?'0':'quantity'}; }
function removeQuantity(quantity) { return ${p.guard?'Math.max(0, quantity - 1)':'quantity - 1'}; }
// Le calcul assemblé avec les blocs
function lineTotal(unitPrice, quantity) { return ${p.operator==='multiply'?'unitPrice * quantity':p.operator==='plus'?'unitPrice + quantity':p.operator==='subtract'?'unitPrice - quantity':'0'}; }
function subtotal(first, second, third) { return first + second + third; }
// La condition de livraison
function deliveryFee(amount) { ${p.delivery.comparator?`if (amount ${p.delivery.comparator==='gte'?'>=':'>'} freeDeliveryAt) return 0; `:''}return deliveryPrice; }
// La promotion
function discount(code, amount) { ${p.promo.join?`if (code === promoCode ${p.promo.join==='and'?'&&':'||'} amount >= promoMinimum) return promoValue; `:''}return 0; }
function grandTotal(amount, fee, reduction) { return amount + fee - reduction; }`;
}
