from solapa_des import *
def caixa(im):
    a=np.asarray(im.convert('RGB')).astype(int)
    esc=(a[...,0]<125)&(a[...,1]<75)&(a[...,2]<60)&(a[...,0]>a[...,2])
    H=a.shape[0]; top=esc[:int(H*0.5)]
    ys=np.where(top.mean(1)>0.35)[0]; xs=np.where(top.mean(0)>0.2)[0]
    return int(xs[0]),int(ys[0]),int(xs[-1]),int(ys[-1])
def monta2(base,linhas,peso):
    im=base.convert('RGB').copy(); d=ImageDraw.Draw(im,'RGBA')
    x0,y0,x1,y1=caixa(im); s=(y1-y0)/457.0
    cx=x0+248*s
    lg=Image.open(LOGO).convert('RGBA'); lw=int(300*s); lg=lg.resize((lw,int(lg.height*lw/lg.width)),Image.LANCZOS)
    im.paste(lg,(int(cx-lw/2),int(y0+36*s)),lg)
    y=y0+190*s
    for i,(txt,cor,mx) in enumerate(linhas):
        f,sp=fit(d,txt,430*s,int(mx*s)); sz=f.size
        if i==len(linhas)-1:
            yy=y+8*s; d.line((cx-175*s,yy,cx-30*s,yy),fill=OURO,width=max(2,int(2*s))); d.line((cx+30*s,yy,cx+175*s,yy),fill=OURO,width=max(2,int(2*s)))
            d.ellipse((cx-5*s,yy-5*s,cx+5*s,yy+5*s),fill=OURO); y+=26*s
        spaced(d,(cx,y+sz*0.72),txt,f,cor,sp); y+=int(sz*1.02)
    bx1=x1-35*s; bx0=bx1-150*s; by1=y1-19*s; by0=by1-74*s
    d.rounded_rectangle((bx0,by0,bx1,by1),radius=18*s,fill=(214,168,100),outline=(255,225,160),width=max(2,int(3*s)))
    f,_=fit(d,peso,bx1-bx0-24*s,int(50*s),800,0.0)
    d.text(((bx0+bx1)/2,(by0+by1)/2+3*s),peso,font=f,fill=(62,28,14),anchor='mm')
    return im
