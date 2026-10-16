import { WORLD } from './combat-data.js';
export function viewportTransform(width,height){const scale=Math.min(width/WORLD.width,height/WORLD.height);return{scale,x:(width-WORLD.width*scale)/2,y:(height-WORLD.height*scale)/2};}
export function cameraTransform(width,height,camera){const base=viewportTransform(width,height),c=camera||{x:800,y:450,zoom:1};return{scale:base.scale*c.zoom,x:base.x+WORLD.width*base.scale/2-c.x*base.scale*c.zoom,y:base.y+WORLD.height*base.scale/2-c.y*base.scale*c.zoom};}
export function screenToWorld(x,y,width,height,camera){const v=cameraTransform(width,height,camera);return{x:(x-v.x)/v.scale,y:(y-v.y)/v.scale};}
export function updateCamera(state,dt,reducedMotion=false){
 const c=state.camera;if(!c||state.paused)return;
 if(reducedMotion){c.x=800;c.y=450;c.zoom=1;return;}
 const [a,b]=state.teams.map((t,i)=>t[state.active[i]]);
 const targetZoom=Math.max(1,Math.min(1.85,1600/(Math.abs(a.x-b.x)+570),900/(Math.abs(a.y-b.y)+470)));
 const t=1-Math.exp(-Math.min(dt,.1)*(targetZoom<c.zoom?7:3.4));c.zoom+=(targetZoom-c.zoom)*t;
 const halfW=800/c.zoom,halfH=450/c.zoom;
 const tx=Math.max(halfW,Math.min(1600-halfW,(a.x+b.x)/2)),ty=Math.max(halfH,Math.min(900-halfH,(a.y+b.y)/2-28));
 const follow=1-Math.exp(-Math.min(dt,.1)*5);c.x+=(tx-c.x)*follow;c.y+=(ty-c.y)*follow;
}
