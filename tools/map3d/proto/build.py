import base64,sys,json
mode=sys.argv[1]
sh=open('src/shell.html' if mode=='local' else 'src/shell-artifact.html').read()
if mode=='local': three='./node_modules/three/build/three.module.js'; add='./node_modules/three/examples/jsm/'
else: three='https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'; add='https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/'
out=sh.replace('__THREE__',three).replace('__ADDONS__',add).replace('__DATA__',open('site/data.json').read()).replace('__GLB__',base64.b64encode(open('site/spearman.glb','rb').read()).decode()).replace('__MAIN__',open('src/main.js').read())
open(sys.argv[2],'w').write(out); print(len(out))
