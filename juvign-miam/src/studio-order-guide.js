import {blankProject,component,operand,variable} from './studio-model.js';
import {addScreenTemplate} from './screen-templates.js';

export function orderChallengeProject(level){
 const project=blankProject();
 project.name='Mon appli de commande';
 project.orderTutorial={level,step:'catalog',catalog:'',basket:'',receipt:'',tested:false,finished:false};
 return project;
}

export function orderParts(project){
 const guide=project.orderTutorial;
 const screen=id=>project.screens.find(item=>item.id===id);
 const catalog=screen(guide.catalog),basket=screen(guide.basket),receipt=screen(guide.receipt);
 const products=catalog?.nodes.find(node=>node.type==='products'),cart=basket?.nodes.find(node=>node.type==='cart');
 const menu=project.variables.find(item=>item.name===products?.props.variable);
 const openBasket=catalog?.nodes.find(node=>node.type==='button'&&node.props.orderOpenBasket);
 return {catalog,basket,receipt,products,cart,menu,openBasket};
}

export function installOrderModel(project,model){
 const guide=project.orderTutorial;
 const screen=addScreenTemplate(project,model);
 if(model==='catalog'){
  const empty=project.screens.find(item=>item!==screen&&!item.nodes.length);
  if(empty)project.screens=project.screens.filter(item=>item!==empty);
  guide.catalog=screen.id;guide.step='menu';
  const {menu}=orderParts(project);
  menu.initial=[{name:'',price:0,image:''}];
 }else if(model==='basket'){
  guide.basket=screen.id;
  const {catalog}=orderParts(project);
  const open=catalog.nodes.find(node=>node.events.click.some(action=>action.type==='navigate'&&action.screen===screen.id));
  if(open){open.props.orderOpenBasket=true;if(guide.level==='3e')open.events.click=[];}
  guide.step=guide.level==='3e'?'receipt':'test';
  const {cart}=orderParts(project);
  if(guide.level==='4e')cart.events.click=[
   {type:'set',variable:cart.props.variable,value:operand('literal',[])},
   {type:'toast',value:operand('literal','Commande enregistrée !')}
  ];
 }else{
  guide.receipt=screen.id;guide.step='links';
  const {catalog}=orderParts(project);
  const back=component('button',project);
  back.props.text='Retour à la carte';back.events.click=[{type:'navigate',screen:catalog.id}];
  screen.nodes.push(back);
 }
 return screen;
}

export function connectOrderCheckout(project,destination){
 const {cart,receipt}=orderParts(project);
 if(!cart||!receipt)return;
 if(destination!==receipt.id){cart.events.click=[];return;}
 const summary=receipt.nodes.find(node=>node.type==='list');
 const order=project.variables.find(item=>item.name===summary.props.variable);
 cart.events.click=[
  {type:'set',variable:order.name,value:operand('variable',cart.props.variable)},
  {type:'set',variable:cart.props.variable,value:operand('literal',[])},
  {type:'navigate',screen:receipt.id}
 ];
}
