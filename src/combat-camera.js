import { WORLD } from './combat-data.js';
export function viewportTransform(width,height){const scale=Math.min(width/WORLD.width,height/WORLD.height);return{scale,x:(width-WORLD.width*scale)/2,y:(height-WORLD.height*scale)/2};}
export function cameraTransform(width,height,camera){const base=viewportTransform(width,height),c=camera||{x:800,y:450,zoom:1};return{scale:base.scale*c.zoom,x:base.x+WORLD.width*base.scale/2-c.x*base.scale*c.zoom,y:base.y+WORLD.height*base.scale/2-c.y*base.scale*c.zoom};}
export function screenToWorld(x,y,width,height,camera){const v=cameraTransform(width,height,camera);return{x:(x-v.x)/v.scale,y:(y-v.y)/v.scale};}
export function updateCamera(state,dt,reducedMotion=false){
 const c=state.camera;if(!c||state.paused)return;
 if(reducedMotion||c.mode==='fixed'){c.x=800;c.y=450;c.zoom=1;return;}
 const [a,b]=state.teams.map((t,i)=>t[state.active[i]]);dt=Math.min(dt,.05);
 // Wide, quiet framing: a 22% maximum zoom, a center dead zone, and capped velocity.
 const distance=Math.hypot(a.x-b.x,a.y-b.y),desired=1+.22*Math.max(0,Math.min(1,(720-distance)/500));
 const delta=desired-c.zoom;
 if(Math.abs(delta)>.015)c.zoom+=Math.sign(delta)*Math.min(Math.abs(delta)*(1-Math.exp(-dt*1.1)),dt*(delta>0?.07:.22));
 const halfW=800/c.zoom,halfH=450/c.zoom;
 const centerX=Math.max(halfW,Math.min(1600-halfW,(a.x+b.x)/2));
 const centerY=Math.max(halfH,Math.min(900-halfH,(a.y+b.y)/2));
 for(const [key,target]of [['x',centerX],['y',centerY]]){const d=target-c[key],deadZone=key==='x'?65:40;if(Math.abs(d)>deadZone)c[key]+=Math.sign(d)*Math.min((Math.abs(d)-deadZone)*(1-Math.exp(-dt*1.2)),dt*32);}
 // Keep edge fighters visible even during a retreat; never zoom in across them.
 const needX=Math.max(Math.abs(a.x-c.x),Math.abs(b.x-c.x))+100,needY=Math.max(Math.abs(a.y-c.y),Math.abs(b.y-c.y))+145;
 const safe=Math.max(1,Math.min(1.22,800/needX,450/needY));c.zoom=Math.min(c.zoom,safe);
}
