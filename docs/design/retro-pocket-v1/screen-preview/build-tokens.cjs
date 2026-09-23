const fs=require('node:fs');
const path=require('node:path');
const tokens=JSON.parse(fs.readFileSync(path.join(__dirname,'../system/tokens.json'),'utf8'));
const map={screen:'mint',lcd:'lcd',ink:'ink',primary:'apricot',secondary:'ivory'};
const lines=Object.entries(map).map(([key,ref])=>'--'+key+':'+tokens.primitive.color[ref].$value+';');
fs.writeFileSync(path.join(__dirname,'tokens.css'),'/* Generated from ../system/tokens.json */\n:root{\n'+lines.join('\n')+'\n}\n');
