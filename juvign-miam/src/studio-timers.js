// Independent clock controller; its source is also embedded in exported apps.
export function createAppTimers({onTick=()=>{},onFinish=()=>{},now=()=>performance.now(),schedule=setInterval,cancel=clearInterval}={}){
 const entries=new Map();let interval=null;
 const duration=value=>Math.min(86400,Math.max(1,Math.round(Number(value)||60)));
 const seconds=timer=>Math.max(0,Math.ceil(timer.remaining/1000));
 function emit(timer,force=false){const value=seconds(timer),key=value+':'+timer.running;if(force||timer.last!==key){timer.last=key;onTick(timer.id,value,timer.running);}}
 function manage(){const running=[...entries.values()].some(timer=>timer.running);if(running&&interval===null)interval=schedule(tick,200);else if(!running&&interval!==null){cancel(interval);interval=null;}}
 function tick(){const time=now();for(const timer of [...entries.values()]){if(!timer.running||entries.get(timer.id)!==timer)continue;timer.remaining=Math.max(0,timer.deadline-time);if(timer.remaining===0){timer.running=false;timer.ended=true;emit(timer);if(entries.get(timer.id)===timer)onFinish(timer.id);}else emit(timer);}manage();}
 function pause(id){const timer=entries.get(id);if(!timer)return;if(timer.running)timer.remaining=Math.max(0,timer.deadline-now());timer.running=false;emit(timer);manage();}
 function start(id){const timer=entries.get(id);if(!timer||timer.running)return;if(timer.remaining<=0){timer.remaining=timer.duration*1000;timer.ended=false;}timer.deadline=now()+timer.remaining;timer.running=true;timer.started=true;emit(timer);manage();}
 function reset(id){const timer=entries.get(id);if(!timer)return;timer.remaining=timer.duration*1000;timer.running=false;timer.ended=false;timer.started=false;emit(timer,true);manage();}
 function clear(){if(interval!==null)cancel(interval);interval=null;entries.clear();}
 function configure(definitions,active=true){
  if(!active){clear();return;}const ids=new Set(definitions.map(def=>def.id));for(const timer of entries.values())if(!ids.has(timer.id))pause(timer.id);
  for(const def of definitions){let timer=entries.get(def.id);const value=duration(def.duration);if(!timer){timer={id:def.id,duration:value,remaining:Math.min(value,Math.max(0,Number.isFinite(def.initialSeconds)?def.initialSeconds:value))*1000,running:false,ended:false};timer.ended=timer.remaining===0;entries.set(def.id,timer);emit(timer);if(def.autoStart&&timer.remaining>0)start(def.id);}else if(timer.duration!==value){timer.duration=value;reset(def.id);}}
  manage();
 }
 return {configure,start,pause,reset,clear,destroy:clear,tick,snapshot:id=>{const timer=entries.get(id);return timer?{seconds:seconds(timer),running:timer.running,ended:timer.ended,started:!!timer.started}:null;}};
}
