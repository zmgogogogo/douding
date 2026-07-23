import requests, io, time
from PIL import Image, ImageDraw

def make_test_img():
    img = Image.new('RGB', (400, 400), color=(200, 220, 240))
    draw = ImageDraw.Draw(img)
    for y in range(200, 400):
        for x in range(400):
            draw.point((x, y), (100, 160, 80))
    draw.ellipse([140, 90, 260, 210], fill=(220, 170, 140))
    draw.ellipse([188, 138, 212, 162], fill=(30, 30, 30))
    draw.rectangle([120, 300, 280, 380], fill=(220, 60, 50))
    return img

def call_api(img, extra_params=None):
    buf = io.BytesIO()
    img.save(buf, format='PNG'); buf.seek(0)
    data = {'targetWidth':'58','targetHeight':'0','brand':'全部','smartOptimize':'true','bgUnify':'true','bgMode':'auto','bgEdgeHardness':'70','skinUnify':'true','skinSmoothLevel':'medium','skinLayerCount':'3','denoiseLevel':'2','colorLimit':'16'}
    if extra_params: data.update(extra_params)
    t0=time.time()
    try:
        r=requests.post('http://localhost:3456/api/image-to-grid',data=data,files={'file':('t.png',buf,'image/png')},timeout=60)
        e=time.time()-t0
        if r.status_code==200 and r.json().get('code')==200:
            g=r.json()['data'].get('grid',[])
            cs=set()
            for row in g:
                for c in row:
                    if c and c.get('hex'): cs.add(c['hex'])
            return len(cs),e,None
        return 0,e,r.json().get('message','err')
    except Exception as ex:
        return 0,time.time()-t0,str(ex)

img=make_test_img()
tests=[("默认",{}),("smart=false",{'smartOptimize':'false'}),("transparent",{'bgMode':'transparent'}),("custom白",{'bgMode':'custom','bgColor':'#FFFFFF'}),("keep",{'bgMode':'keep'}),("skinLight",{'skinSmoothLevel':'light'}),("skinHeavy",{'skinSmoothLevel':'heavy'}),("skin2层",{'skinLayerCount':'2'}),("skin4层",{'skinLayerCount':'4'}),("denoise0",{'denoiseLevel':'0'}),("denoise3",{'denoiseLevel':'3'}),("color4",{'colorLimit':'4'}),("color32",{'colorLimit':'32'})]
print("="*60+"\nNode.js API 测试\n"+"="*60)
for n,p in tests:
    c,e,err=call_api(img,p)
    if err: print(f"  ❌ {n}: {err}")
    else: print(f"  {'✅' if c>=6 else '⚠️' if c>=3 else '❌'} {n}: {c}色 {e:.1f}s")
