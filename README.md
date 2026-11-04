# Game Qifil Hafil

<!DOCTYPE html>

<html lang="id">

<head>

<meta charset="UTF-8">

<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>QIFIL DAN HAFIL - Saling Chat Saat Main</title>

<style>

  *{margin:0;padding:0;box-sizing:border-box;font-family:monospace}

  body{background:#1a1a2e;color:white;overflow:hidden}

  #topbar{display:flex;justify-content:space-between;padding:10px;background:#16213e}

  .qifil{color:#FF8FAB;font-weight:bold} .hafil{color:#6BA5FF;font-weight:bold}

  canvas{background:linear-gradient(#2a3a5a,#1e2d4a);display:block;margin:0 auto}

  #gameWrap{position:relative;height:calc(100vh - 50px)}

  #chatBox{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);width:480px;background:rgba(0,0,0,0.9);border-radius:15px;padding:12px;border:2px solid #555;z-index:100}

  .msg{margin:5px 0;padding:8px 12px;border-radius:12px;font-size:13px;max-width:85%;animation:pop 0.3s}

  @keyframes pop{0%{transform:scale(0.8)}100%{transform:scale(1)}}

  .msg.qifilMsg{background:#FF8FAB;color:#000;align-self:flex-start;margin-right:auto;text-align:left}

  .msg.hafilMsg{background:#6BA5FF;color:#000;align-self:flex-end;margin-left:auto;text-align:right}

  .msg.sysMsg{background:#FFD93D;color:#000;margin:5px auto;text-align:center;font-size:11px}

  #messages{display:flex;flex-direction:column;max-height:160px;overflow-y:auto;margin-bottom:8px;gap:2px}

  .quickChat{display:flex;gap:5px;margin-bottom:6px;flex-wrap:wrap}

  .quickBtn{font-size:10px;padding:4px 8px;background:#333;color:white;border-radius:10px;cursor:pointer}

  .quickBtn:hover{background:#555}

</style>

</head>

<body>

<div id="topbar">

  <div><span class="qifil">QIFIL</span> DAN <span class="hafil">HAFIL</span> | Room: <b id="roomCode"></b> | Level <span id="lvl">1</span></div>

  <div>💬 Bisa Saling Chat Saat Main! | <span class="qifil">QIFIL: WASD+E</span> | <span class="hafil">HAFIL: Arrow+Shift</span></div>

</div>



<div id="gameWrap">

  <canvas id="game" width="1280" height="720"></canvas>



  <div id="chatBox">

    <div style="color:white;font-size:12px;margin-bottom:6px">💬 <b>QIFIL & HAFIL SALING CHAT SAAT BERMAIN</b> - Ketik sambil jalan!</div>

    <div class="quickChat">

      <button class="quickBtn" onclick="quickSend('Sini!')">📍 Sini!</button>

      <button class="quickBtn" onclick="quickSend('Injak tombol hijau!')">🟩 Injak tombol!</button>

      <button class="quickBtn" onclick="quickSend('Tumpuk dong!')">🤸 Tumpuk dong!</button>

      <button class="quickBtn" onclick="quickSend('Aku bawa kunci!')">🔑 Bawa kunci!</button>

      <button class="quickBtn" onclick="quickSend('Awas duri!')">⚠️ Awas duri!</button>

      <button class="quickBtn" onclick="quickSend('Ayo ke pintu!')">🚪 Ke pintu!</button>

    </div>

    <div id="messages"></div>

    <div style="display:flex;gap:5px">

      <select id="charSelect" style="padding:6px;border-radius:6px"><option value="QIFIL">QIFIL PINK</option><option value="HAFIL">HAFIL BIRU</option></select>

      <input id="chatInput" placeholder="QIFIL & HAFIL saling chat saat main..." style="flex:1;padding:8px;border-radius:8px;border:none">

      <button onclick="sendChat()" style="background:#FF8FAB;padding:8px 15px;border-radius:8px;border:none;font-weight:bold;cursor:pointer">Kirim</button>

    </div>

    <div style="font-size:10px;color:#aaa;margin-top:4px">Tekan Enter untuk kirim, tetap bisa jalan sambil chat!</div>

  </div>

</div>



<script>

const canvas = document.getElementById('game');

const ctx = canvas.getContext('2d');

document.getElementById('roomCode').innerText = 'QF' + Math.random().toString(36).substring(2,6).toUpperCase().substring(0,6);



let messages = [];

let players = {

  qifil: {x:100,y:470,vx:0,vy:0,hasKey:false,color:'#FF8FAB',name:'QIFIL',chatBubble:'',chatTimer:0},

  hafil: {x:200,y:470,vx:0,vy:0,hasKey:false,color:'#6BA5FF',name:'HAFIL',chatBubble:'',chatTimer:0}

};

let keys = {};

let objects = {key:{x:650,y:320,collected:false}, button:{x:380,y:505,pressed:false}, door:{x:1150,y:400,open:false}, box:{x:480,y:470,w:50,h:50}};

let level = 1;



function quickSend(text){

  document.getElementById('chatInput').value = text;

  sendChat();

}

function sendChat(){

  const input = document.getElementById('chatInput');

  const charSel = document.getElementById('charSelect').value;

  if(!input.value.trim()) return;

  const msg = {username: charSel, character: charSel, message: input.value, time: new Date().toLocaleTimeString().slice(0,5)};

  messages.push(msg);

  // Munculin bubble chat di atas kepala karakter SAAT MAIN

  const p = charSel==='QIFIL' ? players.qifil : players.hafil;

  p.chatBubble = input.value;

  p.chatTimer = 180; // 3 detik bubble muncul di atas kepala

  input.value='';

  renderMessages();

  document.getElementById('messages').scrollTop = 9999;

}

function addSystem(text){

  messages.push({username:'System', character:'System', message:text, time: new Date().toLocaleTimeString().slice(0,5)});

  renderMessages();

}

function renderMessages(){

  document.getElementById('messages').innerHTML = messages.slice(-8).map(m=>`

    <div class="msg ${m.character==='QIFIL'?'qifilMsg':m.character==='HAFIL'?'hafilMsg':'sysMsg'}">

      <b>${m.character}:</b> ${m.message} <small style="opacity:0.6">${m.time}</small>

    </div>

  `).join('');

}



// KONTROL BISA JALAN

window.addEventListener('keydown', e=>{

  keys[e.key.toLowerCase()] = true;

  if(['w','a','s','d','e','arrowup','arrowleft','arrowright','shift'].includes(e.key.toLowerCase())){

    // Jangan prevent Enter biar bisa chat

    if(e.key!=='Enter') e.preventDefault();

  }

  if(e.key==='Enter'){ sendChat(); }

  // Tumpuk

  if(e.key.toLowerCase()==='e' || e.key==='Shift'){

    if(Math.abs(players.qifil.x - players.hafil.x) < 60){

      const isQ = e.key.toLowerCase()==='e';

      const p = isQ ? players.qifil : players.hafil;

      p.stacked = !p.stacked;

      addSystem(p.stacked ? `${p.name} numpuk!` : `${p.name} turun`);

    }

  }

});

window.addEventListener('keyup', e=> keys[e.key.toLowerCase()] = false);



function update(){

  for(const id of ['qifil','hafil']){

    const p = players[id];

    const isQ = id==='qifil';

    if(p.stacked){

      const other = isQ ? players.hafil : players.qifil;

      p.x = other.x; p.y = other.y - 50; continue;

    }

    const left = isQ ? keys['a'] : keys['arrowleft'];

    const right = isQ ? keys['d'] : keys['arrowright'];

    const jump = isQ ? keys['w'] : keys['arrowup'];

    if(left) p.vx = -5; else if(right) p.vx = 5; else p.vx *= 0.75;

    if(jump && p.y>=465) p.vy = -14;

    p.vy += 0.7; p.x += p.vx; p.y += p.vy;

    if(p.y>470){p.y=470;p.vy=0}

    if(p.x<0) p.x=0; if(p.x>1220) p.x=1220;

    if(p.chatTimer>0) p.chatTimer--;

    // Box

    if(Math.abs(p.x - objects.box.x)<50 && p.y>400) objects.box.x += p.vx*0.5;

    // Key

    if(!objects.key.collected && Math.abs(p.x-objects.key.x)<40 && Math.abs(p.y-objects.key.y)<60){

      objects.key.collected=true; p.hasKey=true; addSystem(`${p.name}: Aku dapat kunci! Sini ke pintu!`);

    }

    // Button

    if(Math.abs(p.x-objects.button.x)<45 && p.y>430){

      if(!objects.button.pressed){ objects.button.pressed=true; objects.door.open=true; addSystem(`${p.name}: Aku injak tombol! Pintu buka!`); }

    }

  }

  if(objects.door.open && (players.qifil.hasKey||players.hafil.hasKey) && Math.abs(players.qifil.x-objects.door.x)<80 && Math.abs(players.hafil.x-objects.door.x)<80){

    addSystem(`🎉 Level ${level} selesai! QIFIL & HAFIL kerja sama bagus!`);

    level++; document.getElementById('lvl').innerText=level;

    objects.key.collected=false; players.qifil.hasKey=false; players.hafil.hasKey=false; objects.button.pressed=false; objects.door.open=false;

    players.qifil.x=100; players.hafil.x=200;

  }

}

function draw(){

  ctx.clearRect(0,0,1280,720);

  ctx.fillStyle='#8B7355'; ctx.fillRect(0,520,1280,200);

  ctx.fillStyle='#444'; for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(750+i*40,520);ctx.lineTo(770+i*40,550);ctx.lineTo(790+i*40,520);ctx.fill();}

  ctx.fillStyle=objects.button.pressed?'#4ADE80':'#22c55e'; ctx.fillRect(objects.button.x-30,objects.button.y,60,15);

  ctx.fillStyle='#A0826D'; ctx.fillRect(objects.box.x,objects.box.y,objects.box.w,objects.box.h);

  if(!objects.key.collected){ctx.fillStyle='gold';ctx.fillRect(objects.key.x,objects.key.y,28,14);ctx.beginPath();ctx.arc(objects.key.x+28,objects.key.y+7,8,0,Math.PI*2);ctx.fill();}

  ctx.fillStyle=objects.door.open?'#4ADE80':'#5D4037'; ctx.fillRect(objects.door.x,objects.door.y,60,120);

  for(const id of ['qifil','hafil']){

    const p=players[id];

    ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,40,50);

    ctx.beginPath();ctx.arc(p.x+10,p.y-5,8,0,Math.PI*2);ctx.arc(p.x+30,p.y-5,8,0,Math.PI*2);ctx.fill();

    ctx.fillStyle='black';ctx.beginPath();ctx.arc(p.x+12,p.y+15,4,0,Math.PI*2);ctx.arc(p.x+28,p.y+15,4,0,Math.PI*2);ctx.fill();

    // Name tag QIFIL/HAFIL selalu di atas kepala

    ctx.fillStyle='white';ctx.fillRect(p.x-10,p.y-28,60,16);ctx.fillStyle=id==='qifil'?'#FF4D8D':'#4D8DFF';ctx.font='bold 11px monospace';ctx.fillText(p.name,p.x,p.y-17);

    // BUBBLE CHAT SAAT BERMAIN - SALING CHAT

    if(p.chatTimer>0 && p.chatBubble){

      ctx.fillStyle='white';ctx.strokeStyle='black';ctx.lineWidth=1;

      const bw = ctx.measureText(p.chatBubble).width + 20;

      ctx.fillRect(p.x - bw/2 +20, p.y-60, bw, 20); ctx.strokeRect(p.x - bw/2 +20, p.y-60, bw, 20);

      ctx.fillStyle='black';ctx.font='12px monospace';ctx.fillText(p.chatBubble, p.x - bw/2 +30, p.y-46);

    }

  }

}

function loop(){update();draw();requestAnimationFrame(loop);}

loop();

addSystem('Game mulai! QIFIL & HAFIL bisa saling chat saat bermain!');

addSystem('QIFIL: Halo Hafil! Sini bantu aku!');

addSystem('HAFIL: Oke Qifil! Aku injak tombol ya!');

</script>

</body>

</html>



icon & logo aplikasi sesuai gambar yang di upload

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://game-qifil-hafil.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9581187b-d792-4fc9-95da-be4583bb43aa).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
