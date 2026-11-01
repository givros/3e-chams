import {component,uid} from './studio-model.js';
export const screenTemplates=[
 {id:'welcome',name:'Accueil',description:'Photo, titre et bouton',image:'burger'},
 {id:'catalog',name:'Carte du restaurant',description:'Articles et ajout au panier',image:'pizza'},
 {id:'basket',name:'Panier',description:'Quantités, total et confirmation',image:'fries'},
 {id:'contact',name:'Formulaire',description:'Saisie et message de confirmation',image:'drink'},
 {id:'profile',name:'Profil',description:'Prénom et préférences',image:'sushi'}
];
export function addScreenTemplate(project,id){
 const template=screenTemplates.find(t=>t.id===id);if(!template)throw Error('Unknown screen template');
 const firstContent=project.screens.every(s=>!s.nodes.length);
 const screen={id:uid('screen'),name:template.name,background:project.theme.background,nodes:[]};
 const add=(type,text)=>{const n=component(type,project);if(text)n.props.text=text;screen.nodes.push(n);return n;};
 add('heading',template.name);
 if(id==='welcome'){add('image').props.src='assets/burger.jpg';add('text','Bienvenue dans mon restaurant');const b=add('button','Voir la carte');b.events.click=[{type:'toast',value:{kind:'literal',value:'Choisis la destination du bouton dans Actions.'}}];}
 if(id==='catalog')add('products');
 if(id==='basket')add('cart');
 if(id==='contact'){add('input').props.label='Ton prénom';add('textarea').props.label='Ton message';const b=add('button','Envoyer');b.events.click=[{type:'toast',value:{kind:'literal',value:'Message simulé envoyé.'}}];}
 if(id==='profile'){add('input').props.label='Ton prénom';add('select').props.label='Ton plat préféré';screen.nodes.at(-1).props.options='Pizza\nBurger\nSushis';add('toggle').props.label='Recevoir les nouveautés';}
 if(id==='catalog'){
  const basket=project.screens.find(s=>s.nodes.some(n=>n.type==='cart'));
  if(basket){const b=add('button','Voir mon panier');b.events.click=[{type:'navigate',screen:basket.id}];}
 }
 if(id==='basket')for(const s of project.screens.filter(s=>s.nodes.some(n=>n.type==='products'))){const b=component('button',project);b.props.text='Voir mon panier';b.events.click=[{type:'navigate',screen:screen.id}];s.nodes.push(b);}
 if(id==='catalog')for(const s of project.screens)for(const n of s.nodes)if(n.type==='button'&&n.props.text==='Voir la carte'&&n.events.click[0]?.type==='toast')n.events.click=[{type:'navigate',screen:screen.id}];
 if(id==='welcome'){const target=project.screens.find(s=>s.nodes.some(n=>n.type==='products'));if(target)screen.nodes.at(-1).events.click=[{type:'navigate',screen:target.id}];}
 project.screens.push(screen);if(firstContent)project.home=screen.id;return screen;
}
