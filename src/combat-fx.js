// Six separately drawn frames per effect, shaded for an oblique pixel arena.
// Preserve solid sprite shading while removing broad low-opacity background haze.
export const FX_SHEETS=['elements','force','slashes','field'];
export const FX_MAP={0:[0,0],1:[0,1],2:[0,2],3:[0,3],4:[1,0],5:[1,1],6:[1,2],7:[1,3],8:[2,0],9:[2,1],10:[2,2],11:[2,3],12:[3,0],13:[3,1],14:[3,2],15:[3,3]};
export function clipSpriteMaterial(image){
 const out=document.createElement('canvas');out.width=image.width;out.height=image.height;const ctx=out.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,out.width,out.height);for(let i=0;i<pixels.data.length;i+=4){const a=pixels.data[i+3];pixels.data[i+3]=a<190?0:a>235?255:Math.min(255,(a-190)*5);}
 ctx.putImageData(pixels,0,0);return out;
}
export function fxFrame(age,duration=.5,loop=false){if(loop)return 1+(Math.floor(age*14)%3);return Math.min(5,Math.max(0,Math.floor(age/duration*6)));}
export function drawFX(ctx,assets,fx,x,y,size=50,angle=0,age=0,duration=.5,loop=false,alpha=1){
 const map=FX_MAP[fx]||FX_MAP[11],image=assets['vfx-'+FX_SHEETS[map[0]]];if(!image)return;
 const w=image.width/6,h=image.height/4,frame=fxFrame(age,duration,loop);
 ctx.save();ctx.globalAlpha=alpha;const upright=[4,6,7,9,12,13,14,15].includes(fx),raise=fx===12?size*.23:[4,7,9,13].includes(fx)?size*.08:0;ctx.translate(Math.round(x),Math.round(y-raise));ctx.rotate(upright?0:angle);ctx.imageSmoothingEnabled=false;
 ctx.drawImage(image,frame*w,map[1]*h,w,h,-size/2,-size/2,size,size);ctx.restore();
}

const LIGHT_COLORS={0:'236,209,101',1:'238,125,55',2:'88,162,218',3:'123,185,102',4:'155,95,195',5:'231,170,101',6:'170,142,102',7:'98,177,228',8:'156,131,210',9:'215,150,205',10:'155,203,220',11:'238,216,150',12:'238,209,100',13:'237,115,55',14:'89,165,211',15:'164,116,210'};
export function contactLight(ctx,fx,x,y,size=50,alpha=.2){
 const rgb=LIGHT_COLORS[fx]||LIGHT_COLORS[11];ctx.save();ctx.translate(x,y+7);ctx.scale(1,.32);const r=Math.max(15,Math.min(110,size));
 const g=ctx.createRadialGradient(0,0,2,0,0,r);g.addColorStop(0,`rgba(${rgb},${alpha})`);g.addColorStop(.45,`rgba(${rgb},${alpha*.4})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
}
