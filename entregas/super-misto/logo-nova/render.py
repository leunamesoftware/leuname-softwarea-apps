import sys
from playwright.sync_api import sync_playwright
svg=open(sys.argv[1]).read().replace('<svg ','<svg style="display:block" ',1)
w=int(svg.split('width="')[1].split('"')[0]); h=int(svg.split('height="')[1].split('"')[0])
with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
  pg=b.new_page(viewport={'width':w,'height':h})
  pg.set_content('<html><body style="margin:0;background:transparent">'+svg+'</body></html>'); pg.screenshot(path=sys.argv[2],omit_background=True)
  pg.set_content('<html><body style="margin:0;background:#F4F8F5">'+svg+'</body></html>'); pg.screenshot(path='previa.png')
  b.close()
