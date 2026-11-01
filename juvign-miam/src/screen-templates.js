import {component,uid,variable} from './studio-model.js';
export const screenTemplates=[
 {id:'welcome',name:'Accueil',description:'Photo, titre et bouton',image:'burger'},
 {id:'catalog',name:'Carte du restaurant',description:'Articles et ajout au panier',image:'pizza'},
 {id:'basket',name:'Panier',description:'Quantités, total et confirmation',image:'fries'},
 {id:'contact',name:'Formulaire',description:'Saisie et message de confirmation',image:'drink'},
 {id:'profile',name:'Profil',description:'Prénom et préférences',image:'sushi'},
 {id:'counter',name:'Compteur',description:'Ajouter, retirer et remettre à zéro',icon:'＋',color:'#eee3fc'},
 {id:'quiz',name:'Quiz',description:'Réponse, vérification et résultat',icon:'?',color:'#ffe7a9'},
 {id:'poll',name:'Sondage',description:'Deux choix et leurs compteurs de votes',icon:'☑',color:'#d8f2e7'},
 {id:'tasks',name:'Liste de tâches',description:'Écrire, ajouter et supprimer une tâche',icon:'☷',color:'#e1eaff'},
 {id:'budget',name:'Mon budget',description:'Budget, dépense et solde calculé',icon:'€',color:'#d8f2e7'},
 {id:'product',name:'Fiche produit',description:'Photo, description, prix et ajout au panier',image:'tacos'},
 {id:'promo',name:'Code promo',description:'Vérifier un code et appliquer une réduction',icon:'%',color:'#ffe0d3'},
 {id:'order',name:'Suivi de commande',description:'Faire avancer les étapes d’une livraison simulée',icon:'↗',color:'#e1eaff'},
 {id:'favorites',name:'Mes favoris',description:'Choisir, enregistrer et retirer des favoris',icon:'♥',color:'#ffe1ec'},
 {id:'booking',name:'Réservation',description:'Nom, créneau et validation du formulaire',icon:'▦',color:'#eee3fc'},
 {id:'scoreboard',name:'Match',description:'Deux équipes, leurs scores et remise à zéro',icon:'VS',color:'#ffe7a9'},
 {id:'calculator',name:'Calculatrice',description:'Deux nombres et un résultat automatique',icon:'×',color:'#e1eaff'}
];
export function addScreenTemplate(project,id){
 const template=screenTemplates.find(t=>t.id===id);if(!template)throw Error('Unknown screen template');
 const firstContent=project.screens.every(s=>!s.nodes.length);
 const screen={id:uid('screen'),name:template.name,background:project.theme.background,nodes:[]};
 const add=(type,text)=>{const n=component(type,project);if(text)n.props.text=text;screen.nodes.push(n);return n;};
 const lit=value=>({kind:'literal',value}),ref=name=>({kind:'variable',name});
 const data=(name,type,initial)=>variable(project,name,type,initial).name;
 const display=(text,name)=>{const n=add('text',text);n.props.textVariable=name;return n;};
 const button=(text,actions)=>{const n=add('button',text);n.events.click=actions;return n;};
 const set=(name,value)=>({type:'set',variable:name,value:lit(value)});
 const increment=(name,delta)=>({type:'increment',variable:name,delta});
 const input=(type,label,initial)=>{const n=add(type);n.props.label=label;if(initial!==undefined)project.variables.find(v=>v.name===n.props.variable).initial=initial;return n.props.variable;};
 const condition=(name,op,value)=>({left:ref(name),op,right:lit(value)});
 const choose=(conditions,then,otherwise=[])=>({type:'if',join:'and',conditions,then,else:otherwise});
 const message=text=>({type:'toast',value:lit(text)});
 add('heading',template.name);
 if(id==='counter'){const score=data('Compteur','number',0);display('Valeur : ',score);button('＋ 1',[increment(score,1)]);button('− 1',[increment(score,-1)]);button('Remettre à zéro',[set(score,0)]);}
 if(id==='quiz'){
  add('text','Quelle condition signifie « au moins 10 » ?');const answer=add('select');answer.props.label='Ta réponse';answer.props.options='Plus grand que 10\nSupérieur ou égal à 10\nÉgal à 10';
  const result=data('Résultat du quiz','text','Pas encore répondu');display('Résultat : ',result);
  button('Vérifier',[choose([condition(answer.props.variable,'eq','Supérieur ou égal à 10')],[set(result,'Bonne réponse !')],[set(result,'Essaie encore.')])]);
 }
 if(id==='poll'){const a=data('Votes pizza','number',0),b=data('Votes burger','number',0);add('text','Pizza ou burger ? Votes enregistrés sur cet appareil.');display('Pizza : ',a);display('Burger : ',b);button('Voter pizza',[increment(a,1)]);button('Voter burger',[increment(b,1)]);}
 if(id==='tasks'){
  const entry=input('input','Nouvelle tâche'),list=add('list');project.variables.find(v=>v.name===list.props.variable).initial=[];
  button('Ajouter la tâche',[choose([condition(entry,'neq','')],[{type:'append',variable:list.props.variable,value:ref(entry)},set(entry,'')],[message('Écris une tâche avant de l’ajouter.')])]);
 }
 if(id==='budget'||id==='calculator'){
  const a=input('number',id==='budget'?'Mon budget (€)':'Premier nombre',id==='budget'?20:6),b=input('number',id==='budget'?'Ma dépense (€)':'Deuxième nombre',id==='budget'?0:3);
  const result=variable(project,id==='budget'?'Solde restant':'Résultat','computed');result.formula={kind:'math',op:id==='budget'?'subtract':'multiply',a:ref(a),b:ref(b)};
  display(id==='budget'?'Il reste (€) : ':'Résultat de la multiplication : ',result.name);
 }
 if(id==='product'){add('image').props.src='assets/tacos.jpg';add('text','Tacos poulet, sauce au choix.');const products=add('products');project.variables.find(v=>v.name===products.props.variable).initial=[{name:'Tacos poulet',price:8.5,image:'assets/tacos.jpg'}];products.events.item.push(message('Article ajouté au panier.'));const basket=project.screens.find(s=>s.nodes.some(n=>n.type==='cart'));if(basket)button('Voir mon panier',[{type:'navigate',screen:basket.id}]);}
 if(id==='promo'){
  const code=input('input','Code promo'),discount=data('Réduction','number',0);add('text','Code à tester : MIAM10');display('Réduction (€) : ',discount);
  button('Appliquer',[choose([condition(code,'eq','MIAM10')],[set(discount,3),message('Réduction appliquée.')],[set(discount,0),message('Code inconnu.')])]);
  add('cart').props.discountVariable=discount;
 }
 if(id==='order'){
  const status=data('Étape de livraison','text','En préparation');add('text','Livraison simulée');display('Commande : ',status);
  button('Étape suivante',[choose([condition(status,'eq','En préparation')],[set(status,'En livraison')],[choose([condition(status,'eq','En livraison')],[set(status,'Livrée')],[message('La commande est déjà livrée.')])])]);button('Recommencer',[set(status,'En préparation')]);
 }
 if(id==='favorites'){
  const choice=add('select');choice.props.label='Choisir un favori';choice.props.options='Pizza\nBurger\nTacos\nSushis';const list=add('list');project.variables.find(v=>v.name===list.props.variable).initial=[];
  button('Enregistrer',[choose([condition(choice.props.variable,'neq','')],[{type:'append',variable:list.props.variable,value:ref(choice.props.variable)},set(choice.props.variable,'')],[message('Choisis un élément.')])]);
 }
 if(id==='booking'){
  add('text','Réservation simulée');const name=input('input','Ton prénom'),slot=add('select');slot.props.label='Créneau';slot.props.options='12 h 00\n12 h 30\n13 h 00';
  button('Réserver',[choose([condition(name,'neq',''),condition(slot.props.variable,'neq','')],[message('Réservation confirmée pour {{'+name+'}} à {{'+slot.props.variable+'}}.')],[message('Renseigne ton prénom et un créneau.')])]);
 }
 if(id==='scoreboard'){
  const a=data('Score équipe A','number',0),b=data('Score équipe B','number',0);display('Équipe A : ',a);button('＋ 1 pour A',[increment(a,1)]);display('Équipe B : ',b);button('＋ 1 pour B',[increment(b,1)]);button('Nouveau match',[set(a,0),set(b,0)]);
 }
 if(id==='welcome'){add('image').props.src='assets/burger.jpg';add('text','Bienvenue dans mon restaurant');const b=add('button','Voir la carte');b.events.click=[{type:'toast',value:{kind:'literal',value:'Choisis la destination du bouton dans Actions.'}}];}
 if(id==='catalog')add('products');
 if(id==='basket')add('cart');
 if(id==='contact'){add('input').props.label='Ton prénom';add('textarea').props.label='Ton message';const b=add('button','Envoyer');b.events.click=[{type:'toast',value:{kind:'literal',value:'Message simulé envoyé.'}}];}
 if(id==='profile'){add('input').props.label='Ton prénom';add('select').props.label='Ton plat préféré';screen.nodes.at(-1).props.options='Pizza\nBurger\nSushis';add('toggle').props.label='Recevoir les nouveautés';}
 if(id==='catalog'){
  const basket=project.screens.find(s=>s.nodes.some(n=>n.type==='cart'));
  if(basket){const b=add('button','Voir mon panier');b.events.click=[{type:'navigate',screen:basket.id}];const back=component('button',project);back.props.text='Retour à la carte';back.events.click=[{type:'navigate',screen:screen.id}];basket.nodes.push(back);}
 }
 if(id==='basket'){const catalogs=project.screens.filter(s=>s.nodes.some(n=>n.type==='products'));for(const s of catalogs){const b=component('button',project);b.props.text='Voir mon panier';b.events.click=[{type:'navigate',screen:screen.id}];s.nodes.push(b);}if(catalogs.length){const back=add('button','Retour à la carte');back.events.click=[{type:'navigate',screen:catalogs[0].id}];}}
 if(id==='catalog')for(const s of project.screens)for(const n of s.nodes)if(n.type==='button'&&n.props.text==='Voir la carte'&&n.events.click[0]?.type==='toast')n.events.click=[{type:'navigate',screen:screen.id}];
 if(id==='welcome'){const target=project.screens.find(s=>s.nodes.some(n=>n.type==='products'));if(target)screen.nodes.at(-1).events.click=[{type:'navigate',screen:target.id}];}
 project.screens.push(screen);if(firstContent)project.home=screen.id;return screen;
}
