// Each row contains six separately drawn animation frames. Runtime alpha clipping
// is a sprite material: translucent glow pixels are not drawn into this pixel game.
export const FX_SHEETS=['elements','force','slashes','field'];
export const FX_MAP={0:[0,0],1:[0,1],2:[0,2],3:[0,3],4:[1,0],5:[1,1],6:[1,2],7:[1,3],8:[2,0],9:[2,1],10:[2,2],11:[2,3],12:[3,0],13:[3,1],14:[3,2],15:[3,3]};
export function clipSpriteMaterial(image){
 const out=document.createElement('canvas');out.width=image.width;out.height=image.height;const ctx=out.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,out.width,out.height);for(let i=0;i<pixels.data.length;i+=4){pixels.data[i+3]=pixels.data[i+3]<230?0:255;}
 ctx.putImageData(pixels,0,0);return out;
}
export function fxFrame(age,duration=.5,loop=false){if(loop)return 1+(Math.floor(age*14)%3);return Math.min(5,Math.max(0,Math.floor(age/duration*6)));}
export function drawFX(ctx,assets,fx,x,y,size=50,angle=0,age=0,duration=.5,loop=false,alpha=1){
 const map=FX_MAP[fx]||FX_MAP[11],image=assets['vfx-'+FX_SHEETS[map[0]]];if(!image)return;
 const w=image.width/6,h=image.height/4,frame=fxFrame(age,duration,loop);
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);ctx.imageSmoothingEnabled=false;
 ctx.drawImage(image,frame*w,map[1]*h,w,h,-size/2,-size/2,size,size);ctx.restore();
}
