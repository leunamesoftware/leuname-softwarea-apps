"""Monta o pacote desidratado: arte do ChatGPT SEM escrita + logo, nome e peso (padrão fixo)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
from scipy import ndimage as ndi
G='/usr/share/fonts/truetype/google-fonts/'
LOGO='/home/claude/leunamesite/SITE-SUPERMISTO/img/logo-supermisto.png'
def lora(sz,w=700):
    f=ImageFont.truetype(G+'Lora-Variable.ttf',sz)
    try: f.set_variation_by_axes([w])
    except Exception: pass
    return f
CREME=(250,238,218); OURO=(214,164,92); OURO2=(201,152,52)
def spaced(d,xy,txt,font,fill,sp=0,anchor_center=True):
    w=sum(d.textlength(c,font=font) for c in txt)+sp*(len(txt)-1)
    x=xy[0]-(w/2 if anchor_center else 0)
    for c in txt:
        d.text((x,xy[1]),c,font=font,fill=fill,anchor='ls'); x+=d.textlength(c,font=font)+sp
    return w
def fit(d,txt,maxw,start,w=700,sp=0.06):
    for sz in range(start,18,-2):
        f=lora(sz,w); tw=sum(d.textlength(c,font=f) for c in txt)+sz*sp*(len(txt)-1)
        if tw<=maxw: return f,sz*sp
    return lora(18,w),1
def monta(base,linhas,peso):
    """linhas: [(texto,cor,tamanhoMax)] ; devolve RGB com a solapa escrita"""
    im=base.convert('RGB').copy(); d=ImageDraw.Draw(im,'RGBA')
    cx=370   # centro da área livre da solapa
    lg=Image.open(LOGO).convert('RGBA'); lg=lg.resize((300,int(lg.height*300/lg.width)),Image.LANCZOS)
    im.paste(lg,(cx-150,62),lg)
    y=214
    for i,(txt,cor,mx) in enumerate(linhas):
        f,sp=fit(d,txt,430,mx); sz=f.size
        if i==len(linhas)-1:           # ornamento fixo antes da última linha (a pequena)
            yy=y+8; d.line((cx-175,yy,cx-30,yy),fill=OURO,width=2); d.line((cx+30,yy,cx+175,yy),fill=OURO,width=2)
            d.ellipse((cx-5,yy-5,cx+5,yy+5),fill=OURO); y+=26
        spaced(d,(cx,y+sz*0.72),txt,f,cor,sp); y+=int(sz*1.02)
    # selo de peso (canto inferior direito da solapa)
    bx0,by0,bx1,by1=1010,392,1160,466
    d.rounded_rectangle((bx0,by0,bx1,by1),radius=18,fill=(214,168,100),outline=(255,225,160),width=3)
    f,_=fit(d,peso,bx1-bx0-24,50,800,0.0)
    d.text(((bx0+bx1)/2,(by0+by1)/2+3),peso,font=f,fill=(62,28,14),anchor='mm')
    return im
def recorte(im):
    """Fundo branco -> transparente (preenche a partir das bordas)."""
    a=np.asarray(im.convert('RGB')).astype(int); branco=(a.min(2)>=247)
    lab,n=ndi.label(branco); bord=set(lab[0])|set(lab[-1])|set(lab[:,0])|set(lab[:,-1]); bord.discard(0)
    fundo=np.isin(lab,list(bord))
    fundo=ndi.binary_dilation(fundo,iterations=1)
    alpha=(~fundo).astype(float); alpha=ndi.gaussian_filter(alpha,0.9)
    out=im.convert('RGBA'); out.putalpha(Image.fromarray((alpha*255).astype('uint8')))
    ys,xs=np.where(alpha>0.05); pad=14
    return out.crop((max(0,xs.min()-pad),max(0,ys.min()-pad),min(out.width,xs.max()+pad),min(out.height,ys.max()+pad)))
