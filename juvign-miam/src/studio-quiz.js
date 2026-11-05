import {blankProject,component,operand,variable} from './studio-model.js';

export function quizQuestions(screen){
 const questions=[];
 for(const [index,answer] of screen.nodes.entries()){
  if(answer.type!=='select'||!answer.props.variable)continue;
  const previous=screen.nodes[index-1];
  const question=previous?.type==='image'&&previous.props.quizImageFor===answer.props.variable?screen.nodes[index-2]:previous;
  if(question?.type!=='text')continue;
  for(const button of screen.nodes.slice(index+1)){
   if(button.type!=='button'||button.props.quizScore)continue;
   const rule=button.events.click.find(action=>{
    const condition=action.conditions?.[0],success=action.then?.[0],failure=action.else?.[0];
    return action.type==='if'&&action.conditions.length===1&&condition.left?.kind==='variable'
     &&condition.left.name===answer.props.variable&&condition.op==='eq'&&condition.right?.kind==='literal'
     &&typeof condition.right.value==='string'&&success?.type==='set'&&failure?.type==='set'
     &&success.variable&&success.variable===failure.variable&&success.value?.kind==='literal'
     &&failure.value?.kind==='literal'&&typeof success.value.value==='string'&&typeof failure.value.value==='string';
   });
   if(!rule)continue;
   const result=screen.nodes.find(node=>node.type==='text'&&node.props.textVariable===rule.then[0].variable);
   if(!result)continue;
   const image=screen.nodes.find(node=>node.type==='image'&&node.props.quizImageFor===answer.props.variable);
   questions.push({question,answer,button,result,image,condition:rule.conditions[0],success:rule.then[0],failure:rule.else[0]});
   break;
  }
 }
 return questions;
}

export function createQuizQuestion(project,screen,text,answers,correct){
 const question=component('text',project),answer=component('select',project);
 const result=component('text',project),button=component('button',project);
 const feedback=variable(project,'quizResult','text','Pas encore répondu');
 feedback.label='Résultat du quiz';
 question.props.text=text;
 Object.assign(answer.props,{label:'Ta réponse',options:answers.join('\n')});
 Object.assign(result.props,{text:'Résultat : ',textVariable:feedback.name});
 button.props.text='Vérifier';
 button.events.click=[{type:'if',join:'and',conditions:[
  {left:operand('variable',answer.props.variable),op:'eq',right:operand('literal',correct)}
 ],then:[{type:'set',variable:feedback.name,value:operand('literal','Bonne réponse !')}],
 else:[{type:'set',variable:feedback.name,value:operand('literal','Mauvaise réponse.')}] }];
 const scoreIndex=screen.nodes.findIndex(node=>node.props.quizScore);
 screen.nodes.splice(scoreIndex<0?screen.nodes.length:scoreIndex,0,question,answer,result,button);
 return answer;
}

export function syncQuizSteps(screen,questions=quizQuestions(screen)){
 for(const node of screen.nodes)delete node.props.quizStep;
 if(!['steps','auto'].includes(screen.quizLayout))return;
 for(const [index,quiz] of questions.entries()){
  for(const node of [quiz.question,quiz.answer,quiz.button,quiz.result,quiz.image])if(node)node.props.quizStep=index;
 }
}

export function setQuizQuestionImage(project,screen,quiz,src,alt){
 const image=quiz.image||component('image',project);
 Object.assign(image.props,{quizImageFor:quiz.answer.props.variable,src,alt,srcVariable:''});
 if(!quiz.image){
  image.name='Image de la question';
  image.props.fit='contain';
  screen.nodes.splice(screen.nodes.indexOf(quiz.question)+1,0,image);
 }
 syncQuizSteps(screen);
 return image;
}

export function normalizeQuizImages(project){
 for(const screen of project.screens)for(const {question,image} of quizQuestions(screen)){
  if(!image||screen.nodes[screen.nodes.indexOf(question)+1]===image)continue;
  screen.nodes.splice(screen.nodes.indexOf(image),1);
  screen.nodes.splice(screen.nodes.indexOf(question)+1,0,image);
 }
}

export function updateQuizScore(project,screen){
 const questions=quizQuestions(screen);
 syncQuizSteps(screen,questions);
 let button=screen.nodes.find(node=>node.type==='button'&&node.props.quizScore);
 if(questions.length<2){
  if(button)screen.nodes.splice(screen.nodes.indexOf(button),1);
  return;
 }
 let score=project.variables.find(data=>data.name===button?.props.quizScore&&data.type==='number');
 if(!score){
  score=variable(project,'quizScore','number',0);
  score.label='Score du quiz';
 }
 if(!button){
  button=component('button',project);
  button.props.text='Corriger tout le quiz';
  screen.nodes.push(button);
 }
 button.props.quizScore=score.name;
 button.events.click=[
  {type:'set',variable:score.name,value:operand('literal',0)},
  ...questions.map(({condition,success,failure})=>({
   type:'if',join:'and',conditions:[structuredClone(condition)],
   then:[structuredClone(success),{type:'increment',variable:score.name,delta:1}],
   else:[structuredClone(failure)]
  })),
  {type:'toast',value:operand('literal','Score : {{'+score.name+'}} / '+questions.length)}
 ];
}

export const quizTutorialTarget=5;
export const unsetQuizAnswer=String.fromCharCode(0);

export function quizTutorialProject(){
 const project=blankProject(),screen=project.screens[0];
 project.name='Mon quiz';
 screen.quizTutorial={theme:'',tested:''};
 return project;
}

export function quizQuestionReady({question,answer,condition}){
 const options=String(answer.props.options).split(String.fromCharCode(10));
 return !!question.props.text.trim()&&options.length>=2&&options.every(text=>text.trim()&&!/^Réponse [0-9]+$/.test(text))
  &&new Set(options).size===options.length&&options.includes(condition.right.value);
}

export function quizDemoProject(){
 const project=blankProject(),screen=project.screens[0],title=component('heading',project);
 screen.name=title.props.text='Quiz animaux';
 screen.nodes.push(title);
 const examples=[
  ['Quel animal est un mammifère marin ?',['La pieuvre','Le dauphin','La sardine'],1,'beach','Une plage au bord de la mer'],
  ['Quel animal construit des barrages ?',['Le castor','Le blaireau','Le renard'],0,'forest','Une forêt'],
  ['Comment appelle-t-on le petit de cet animal ?',['Le veau','Le poulain','L’agneau'],1,'horse','Un cheval'],
  ['À quelle famille appartient cet animal ?',['Les canidés','Les félins','Les rongeurs'],1,'cat','Un chat'],
  ['Quel sens ce chien utilise-t-il surtout pour suivre une piste ?',['La vue','L’ouïe','L’odorat'],2,'dog','Un chien']
 ];
 for(const [question,options,correct,photo,alt] of examples){
  const answer=createQuizQuestion(project,screen,question,options,options[correct]);
  const quiz=quizQuestions(screen).find(entry=>entry.answer===answer);
  const illustration=setQuizQuestionImage(project,screen,quiz,'assets/'+photo+'.jpg',alt);
  illustration.props.height=112;
 }
 screen.quizLayout='steps';
 updateQuizScore(project,screen);
 return project;
}

export function quizTutorialProgress(screen){
 const tutorial=screen.quizTutorial;
 const questions=quizQuestions(screen);
 const complete=questions.filter(quizQuestionReady).length;
 const themed=!!tutorial.theme?.trim(),layout=['all','steps','auto'].includes(screen.quizLayout);
 const illustrated=questions.some(quiz=>!!quiz.image?.props.src);
 const ready=themed&&layout&&(illustrated||tutorial.finished)&&questions.length>0&&complete===questions.length;
 const signature=ready?JSON.stringify([tutorial.theme,screen.quizLayout,...questions.map(({question,answer,condition})=>[question.props.text,answer.props.options,condition.right.value])]):'';
 return {themed,layout,complete,illustrated,ready,signature,tested:ready&&tutorial.tested===signature,questions};
}
