"""Author original small pixel UI PNGs. Requires Pillow; not needed by the app build."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / 'public/arena/ui'
ROOT.mkdir(parents=True, exist_ok=True)
INK = '#14243b'

def save(image, name):
    image.save(ROOT / (name + '.png'))

def frame(name, colors):
    im = Image.new('RGBA', (48, 48)); d = ImageDraw.Draw(im)
    for inset, color in enumerate(colors):
        d.rectangle((inset, inset, 47-inset, 47-inset), fill=color)
    for x,y in [(0,0),(44,0),(0,44),(44,44)]:
        d.rectangle((x,y,x+3,y+3),fill=(0,0,0,0))
    for x,y in [(6,6),(39,6),(6,39),(39,39)]:
        d.rectangle((x,y,x+2,y+2),fill=colors[2])
    save(im,name)

frame('frame-navy',[INK,INK,'#667e9b','#9ab0c5','#344862','#1f334d','#182c45','#182c45'])
frame('frame-gold',[INK,INK,'#9a602d','#ffdf85','#fff4ba','#d5a14d','#92703d','#192e46'])
frame('frame-cyan',[INK,INK,'#227b99','#a2f5f2','#e4ffeb','#5abcc6','#337c9a','#19384c'])
frame('frame-red',[INK,INK,'#8c2c46','#ff9a8c','#ffdcc4','#d44d5b','#85344a','#38283d'])
frame('frame-paper',[INK,INK,'#647d90','#c8d7d4','#fff8db','#e5e6c6','#bac8b3','#f5f1d6'])

def button(name, top, base, bottom):
    im=Image.new('RGBA',(160,40)); d=ImageDraw.Draw(im)
    d.polygon([(4,0),(155,0),(155,4),(159,4),(159,35),(155,35),(155,39),(4,39),(4,35),(0,35),(0,4),(4,4)],fill=INK)
    d.rectangle((4,4,155,31),fill=base); d.rectangle((4,4,155,7),fill=top)
    d.rectangle((4,32,155,35),fill=bottom); d.rectangle((8,8,151,10),fill=top)
    d.rectangle((4,8,7,27),fill=top); d.rectangle((152,11,155,31),fill=bottom)
    save(im,name)

button('button-gold','#fff5ad','#f2c45d','#b37938')
button('button-red','#ffbd9d','#e36365','#953954')
button('button-blue','#b1e6ed','#6ba0b9','#3a647f')
button('button-muted','#71869e','#3c5571','#233a54')

def ball(im, box, top='#e56b66'):
    d=ImageDraw.Draw(im); x,y,size=box
    d.ellipse((x,y,x+size-1,y+size-1),fill=INK)
    d.ellipse((x+2,y+2,x+size-3,y+size-3),fill='#f5f2db')
    d.pieslice((x+2,y+2,x+size-3,y+size-3),180,360,fill=top)
    d.rectangle((x+1,y+size//2-1,x+size-2,y+size//2+1),fill=INK)
    d.rectangle((x+size//2-3,y+size//2-3,x+size//2+3,y+size//2+3),fill=INK)
    d.rectangle((x+size//2-1,y+size//2-1,x+size//2+1,y+size//2+1),fill='#f5f2db')

im=Image.new('RGBA',(24,24)); ball(im,(0,0,24));save(im,'pokeball')
im=Image.new('RGBA',(24,24)); ball(im,(0,0,24),'#5e7996');save(im,'pokeball-empty')
im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im)
for x,y,sx,sy in [(0,0,1,1),(31,0,-1,1),(0,31,1,-1),(31,31,-1,-1)]:
    d.rectangle((min(x,x+sx*10),min(y,y+sy*3),max(x,x+sx*10),max(y,y+sy*3)),fill='#fff3a0')
    d.rectangle((min(x,x+sx*3),min(y,y+sy*10),max(x,x+sx*3),max(y,y+sy*10)),fill='#fff3a0')
save(im,'cursor')

im=Image.new('RGBA',(192,64));d=ImageDraw.Draw(im)
d.ellipse((0,8,191,63),fill=INK);d.ellipse((3,7,188,57),fill='#66786e')
d.ellipse((7,3,184,49),fill='#d5d7aa');d.ellipse((11,2,180,43),fill='#7fa66c')
d.ellipse((20,6,171,36),fill='#aac47b');d.ellipse((34,12,157,31),fill='#bed78d')
for x in range(18,177,16):d.rectangle((x,21+(x%3),x+4,23+(x%3)),fill='#9ab66e')
save(im,'platform')

def trainer(name,bot=False):
    im=Image.new('RGBA',(48,64));d=ImageDraw.Draw(im)
    if bot:
        d.rectangle((22,1,25,8),fill='#d6a85d');d.rectangle((20,0,27,3),fill='#fff0a6')
        d.rectangle((8,9,39,35),fill=INK);d.rectangle((10,11,37,31),fill='#6e94b4')
        d.rectangle((13,14,34,27),fill='#223e60');d.rectangle((15,18,20,22),fill='#a0fff0');d.rectangle((27,18,32,22),fill='#a0fff0')
        d.rectangle((17,30,30,35),fill='#c2e5d9');d.rectangle((13,36,34,53),fill=INK)
        d.rectangle((15,36,32,49),fill='#9bb9cc');d.rectangle((21,39,27,44),fill='#e86670')
        d.rectangle((8,38,12,49),fill='#6e94b4');d.rectangle((35,38,39,49),fill='#6e94b4')
    else:
        d.rectangle((14,4,33,10),fill=INK);d.rectangle((11,10,36,17),fill=INK)
        d.rectangle((14,7,32,13),fill='#d84f5e');d.rectangle((11,14,38,17),fill='#ff846b')
        d.rectangle((15,18,32,31),fill='#ffd5a1');d.rectangle((12,18,15,25),fill='#563c44');d.rectangle((31,18,34,25),fill='#563c44')
        d.rectangle((18,22,20,24),fill=INK);d.rectangle((27,22,29,24),fill=INK)
        d.rectangle((14,32,33,49),fill=INK);d.rectangle((16,32,31,44),fill='#d85164')
        d.rectangle((22,32,25,45),fill='#f3e8c7');d.rectangle((9,34,13,43),fill='#d85164');d.rectangle((34,34,38,43),fill='#d85164')
        d.rectangle((9,44,13,48),fill='#ffd5a1');d.rectangle((34,44,38,48),fill='#ffd5a1')
    d.rectangle((15,50,21,59),fill='#385b7e');d.rectangle((27,50,33,59),fill='#385b7e')
    d.rectangle((12,59,22,62),fill=INK);d.rectangle((26,59,36,62),fill=INK)
    save(im,name)
trainer('trainer');trainer('bot',True)

GLYPHS={
'P':['11110','10001','10001','11110','10000','10000','10000'],
'O':['01110','10001','10001','10001','10001','10001','01110'],
'K':['10001','10010','10100','11000','10100','10010','10001'],
'E':['11111','10000','10000','11110','10000','10000','11111'],
'A':['01110','10001','10001','11111','10001','10001','10001'],
'R':['11110','10001','10001','11110','10100','10010','10001'],
'N':['10001','11001','11001','10101','10011','10011','10001'],
'V':['10001','10001','10001','10001','10001','01010','00100'],
'S':['01111','10000','10000','01110','00001','00001','11110'],
}
def letters(im,text,x,y,scale,color):
    d=ImageDraw.Draw(im)
    for index,char in enumerate(text):
        for row,line in enumerate(GLYPHS[char]):
            for col,bit in enumerate(line):
                if bit=='1':d.rectangle((x+(index*6+col)*scale,y+row*scale,x+(index*6+col+1)*scale-1,y+(row+1)*scale-1),fill=color)
im=Image.new('RGBA',(214,72));layer=Image.new('RGBA',im.size)
letters(layer,'POKE',6,4,3,'#f6f3d4');letters(layer,'ARENA',5,31,5,'#ffe28b')
mask=layer.getchannel('A').filter(ImageFilter.MaxFilter(7));outline=Image.new('RGBA',im.size,'#152b49');outline.putalpha(mask);im.alpha_composite(outline);im.alpha_composite(layer)
d=ImageDraw.Draw(im);ball(im,(158,3,24));d.rectangle((76,0,79,3),fill='#f6f3d4');save(im,'logo')
im=Image.new('RGBA',(60,47));d=ImageDraw.Draw(im);d.polygon([(6,4),(53,1),(59,36),(9,46),(0,21)],fill=INK)
letters(im,'VS',7,8,4,'#fa9565');save(im,'vs')

TYPES={ 'normal':'#a5a58c','fire':'#eb7551','water':'#68a8dc','grass':'#88be68','electric':'#edcd57','poison':'#b58dc3','ghost':'#9584b6','fighting':'#d28b74','steel':'#9db8bf','dragon':'#9d99d9','ground':'#c5a36c','psychic':'#e58bb1','fairy':'#e4b3ca','flying':'#9db8de' }
for name,color in TYPES.items():
    im=Image.new('RGBA',(16,16));d=ImageDraw.Draw(im);d.rectangle((2,0,13,15),fill=INK);d.rectangle((0,2,15,13),fill=INK);d.rectangle((2,2,13,13),fill=color)
    if name=='electric':d.polygon([(8,2),(4,9),(8,9),(6,14),(12,6),(8,6),(10,2)],fill='#fff8cf')
    elif name=='fire':d.polygon([(8,2),(5,7),(4,10),(6,13),(11,13),(13,9),(10,5),(10,9),(8,8)],fill='#fff4c6')
    elif name=='water':d.polygon([(8,2),(3,10),(5,13),(11,13),(13,10)],fill='#eefbdf')
    elif name=='grass':d.polygon([(12,3),(5,4),(3,9),(5,12),(10,10)],fill='#f1f9cc');d.line((4,13,10,6),fill=INK,width=1)
    elif name in ['poison','ghost']:d.ellipse((3,3,12,12),fill='#f8f2dd');d.rectangle((5,7,6,8),fill=INK);d.rectangle((9,7,10,8),fill=INK)
    elif name in ['psychic','fairy']:d.polygon([(8,2),(9,6),(13,8),(9,9),(8,13),(6,9),(2,8),(6,6)],fill='#fff2d4')
    else:d.polygon([(8,3),(12,7),(9,12),(4,11),(3,6)],fill='#f2f1d8');d.rectangle((6,6,9,9),fill=color)
    save(im,'type-'+name)

print('Original pixel UI assets generated:', len(list(ROOT.glob('*.png'))))
