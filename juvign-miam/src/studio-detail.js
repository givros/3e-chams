import {findNode,component,variable,uid} from './studio-model.js';
export function createProductDetails(project,sourceId){
 const source=findNode(project,sourceId);if(source?.node.type!=='products')throw Error('Sélectionne une liste de produits.');
 const original=project.variables.find(v=>v.name===source.node.props.variable);if(original?.type!=='list')throw Error('Choisis d’abord la liste de données de ce catalogue.');
 const first=original.initial.find(item=>item&&typeof item==='object'&&!Array.isArray(item));
 const selected=variable(project,'Article sélectionné','list',first&&typeof first==='object'?[structuredClone(first)]:[]);selected.fields=structuredClone(original?.fields||[]);
 const detail=component('productDetail',project),unused=detail.props.variable;project.variables=project.variables.filter(v=>v.name!==unused);
 Object.assign(detail.props,{variable:selected.name,nameField:source.node.props.nameField,priceField:source.node.props.priceField,imageField:source.node.props.imageField,identityVariable:source.node.props.identityVariable||source.node.props.variable});
 const cart=source.node.events.item.find(a=>a.type==='cartAdd'&&project.variables.some(v=>v.name===a.variable&&v.type==='list'));
 if(cart)detail.events.item=[structuredClone(cart),{type:'toast',value:{kind:'literal',value:'Article ajouté au panier.'}}];
 else detail.events.item.push({type:'toast',value:{kind:'literal',value:'Article ajouté au panier.'}});
 let name='Détail article',suffix=2;while(project.screens.some(s=>s.name===name))name='Détail article '+suffix++;
 const screen={id:uid('screen'),name,background:source.screen.background||project.theme.background,menuHidden:true,nodes:[component('back',project),detail]};
 source.node.props.itemButton='Voir';source.node.events.item=[{type:'set',variable:selected.name,value:{kind:'literal',value:[]}},{type:'append',variable:selected.name,value:{kind:'item'}},{type:'navigate',screen:screen.id}];
 project.screens.push(screen);return {screen,node:detail,selection:selected};
}
