const http = require("http");
const url  = require("url");

let pendingCommand = null;

const STRUCTURES = {
  "village":           "minecraft:village_plains",
  "plains village":    "minecraft:village_plains",
  "desert village":    "minecraft:village_desert",
  "savanna village":   "minecraft:village_savanna",
  "taiga village":     "minecraft:village_taiga",
  "snowy village":     "minecraft:village_snowy",
  "mansion":           "minecraft:woodland_mansion",
  "woodland mansion":  "minecraft:woodland_mansion",
  "monument":          "minecraft:ocean_monument",
  "ocean monument":    "minecraft:ocean_monument",
  "stronghold":        "minecraft:stronghold",
  "igloo":             "minecraft:igloo",
  "shipwreck":         "minecraft:shipwreck",
  "ruins":             "minecraft:ruins",
  "pyramid":           "minecraft:desert_pyramid",
  "desert temple":     "minecraft:desert_pyramid",
  "desert pyramid":    "minecraft:desert_pyramid",
  "jungle temple":     "minecraft:jungle_temple",
  "witch hut":         "minecraft:swamp_hut",
  "outpost":           "minecraft:pillager_outpost",
  "ancient city":      "minecraft:ancient_city",
  "mineshaft":         "minecraft:mineshaft",
  "fortress":          "minecraft:nether_fortress",
  "bastion":           "minecraft:bastion_remnant",
  "end city":          "minecraft:end_city",
  "end ship":          "minecraft:end_ship",
};

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Voice Structure Spawner</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0e0e1a;color:#e0e0ff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;padding:32px 16px;gap:20px;min-height:100vh}
h1{font-size:1.6rem;background:linear-gradient(135deg,#7c6aff,#4ad9ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
#btn{width:130px;height:130px;border-radius:50%;border:none;font-size:3rem;cursor:pointer;background:linear-gradient(135deg,#5c4aff,#3ab8ff)}
#btn.on{background:linear-gradient(135deg,#ff4a7a,#ff914a)}
#heard{min-height:44px;width:100%;max-width:480px;background:#1a1a2e;border-radius:12px;padding:12px 16px;text-align:center;font-size:1rem;color:#aaaadd}
#log{width:100%;max-width:480px;background:#111124;border-radius:12px;padding:12px;height:200px;overflow-y:auto;font-size:.82rem}
.ok{color:#4cff91}.bad{color:#ff7777}.inf{color:#8888cc}
</style>
</head>
<body>
<h1>Voice Structure Spawner</h1>
<button id="btn">🎙️</button>
<div id="heard">Tap mic and say a structure name!</div>
<div id="log"></div>
<script>
const btn=document.getElementById("btn");
const heard=document.getElementById("heard");
const log=document.getElementById("log");
let listening=false,rec;
function addLog(t,c){const d=document.createElement("div");d.className=c;d.textContent=t;log.prepend(d);}
async function sendVoice(text){
  const r=await fetch("/voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});
  const j=await r.json();
  if(j.spawning){heard.textContent="Spawning: "+j.matched;addLog("Spawned: "+j.matched,"ok");}
  else{heard.textContent="Not recognized: "+text;addLog("No match: "+text,"bad");}
}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function start(){
  rec=new SR();rec.continuous=true;rec.interimResults=true;rec.lang="en-US";
  rec.onstart=()=>{listening=true;btn.className="on";btn.textContent="🔴";heard.textContent="Listening...";};
  rec.onresult=(e)=>{let fin="";for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)fin+=e.results[i][0].transcript;}if(fin)sendVoice(fin.trim());};
  rec.onerror=(e)=>{if(e.error!=="no-speech")addLog("Error: "+e.error,"bad");};
  rec.onend=()=>{if(listening)rec.start();};
  rec.start();
}
function stop(){listening=false;rec?.stop();btn.className="";btn.textContent="🎙️";}
btn.addEventListener("click",()=>listening?stop():start());
addLog("Ready!","inf");
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const path = url.parse(req.url).pathname;
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS"){res.writeHead(204);res.end();return;}

  if(req.method==="GET"&&path==="/"){
    res.writeHead(200,{"Content-Type":"text/html"});
    res.end(PAGE);return;
  }
  if(req.method==="POST"&&path==="/voice"){
    let body="";
    req.on("data",c=>body+=c);
    req.on("end",()=>{
      const {text}=JSON.parse(body);
      const spoken=text.trim().toLowerCase();
      let matched=null,id=null;
      if(STRUCTURES[spoken]){matched=spoken;id=STRUCTURES[spoken];}
      else{for(const key of Object.keys(STRUCTURES)){if(spoken.includes(key)){matched=key;id=STRUCTURES[key];break;}}}
      if(matched){pendingCommand=`place structure ${id} ~ ~ ~`;res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify({spawning:true,matched,id}));}
      else{res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify({spawning:false}));}
    });return;
  }
  if(req.method==="GET"&&path==="/command"){
    res.writeHead(200,{"Content-Type":"application/json"});
    if(pendingCommand){const cmd=pendingCommand;pendingCommand=null;res.end(JSON.stringify({command:cmd}));}
    else{res.end(JSON.stringify({command:null}));}
    return;
  }
  res.writeHead(404);res.end("not found");
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log("Running on port "+PORT));
