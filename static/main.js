// ══════════════════════════════════════════════
//  S-DES ALGORITHM
// ══════════════════════════════════════════════
const P10=[3,5,2,7,4,10,1,9,8,6];
const P8 =[6,3,7,4,8,5,10,9];
const IP =[2,6,3,1,4,8,5,7];
const IP1=[4,1,3,5,7,2,8,6];
const EP =[4,1,2,3,2,3,4,1];
const P4 =[2,4,3,1];
const S0=[[1,0,3,2],[3,2,1,0],[0,2,1,3],[3,1,3,2]];
const S1=[[0,1,2,3],[2,0,1,3],[3,0,1,0],[2,1,0,3]];

const perm=(b,t)=>t.map(i=>b[i-1]);
const xor=(a,b)=>a.map((x,i)=>x^b[i]);
const ls=(b,n)=>[...b.slice(n),...b.slice(0,n)];
const bs=a=>a.join('');
const bin2=(v)=>[(v>>1)&1,v&1];

function sbox(b4,tbl){
  const r=(b4[0]<<1)|b4[3], c=(b4[1]<<1)|b4[2];
  return{r,c,v:tbl[r][c],out:bin2(tbl[r][c])};
}

function keygen(k){
  const p10=perm(k,P10);
  const L=p10.slice(0,5),R=p10.slice(5);
  const l1L=ls(L,1),l1R=ls(R,1);
  const k1=perm([...l1L,...l1R],P8);
  const l2L=ls(l1L,2),l2R=ls(l1R,2);
  const k2=perm([...l2L,...l2R],P8);
  return{p10,L,R,l1L,l1R,k1,l2L,l2R,k2};
}

function fk(l,r,sub){
  const ep=perm(r,EP);
  const xk=xor(ep,sub);
  const xl=xk.slice(0,4),xr=xk.slice(4);
  const s0r=sbox(xl,S0),s1r=sbox(xr,S1);
  const pi=[...s0r.out,...s1r.out];
  const po=perm(pi,P4);
  const xl2=xor(l,po);
  return{ep,xk,xl,xr,s0r,s1r,pi,po,xl2};
}

function runSDES(inp,key,mode){
  const kg=keygen(key);
  const[uk1,uk2]=mode==='enc'?[kg.k1,kg.k2]:[kg.k2,kg.k1];
  const ip=perm(inp,IP);
  const iL=ip.slice(0,4),iR=ip.slice(4);
  const r1=fk(iL,iR,uk1);
  const swL=iR,swR=r1.xl2;
  const r2=fk(swL,swR,uk2);
  const pre=[...r2.xl2,...swR];
  const out=perm(pre,IP1);
  return{kg,ip,iL,iR,r1,swL,swR,r2,pre,out,uk1,uk2};
}

// ══════════════════════════════════════════════
//  UI STATE
// ══════════════════════════════════════════════
let mode='enc', stepsOpen=false, lastResult=null;

window.setMode = function(m){
  mode=m;
  document.getElementById('btn-enc').className='mode-btn'+(m==='enc'?' active-enc':'');
  document.getElementById('btn-dec').className='mode-btn'+(m==='dec'?' active-dec':'');
};

window.updateCounter = function(el,cid,max){
  el.value=el.value.replace(/[^01]/g,'');
  const n=el.value.length;
  const c=document.getElementById(cid);
  c.textContent=n+'/'+max;
  c.style.color=n===max?'var(--green)':n>0?'var(--blue)':'var(--muted)';
  if (n === max) {
    c.classList.add('success');
    c.addEventListener('animationend', () => c.classList.remove('success'), {once: true});
  } else {
    c.classList.remove('success');
  }
};

window.copyResult = function(){
  if(!lastResult)return;
  const txt=bs(lastResult.out);
  navigator.clipboard.writeText(txt).then(()=>{
    const b=document.getElementById('copy-btn');
    b.textContent='✓ Tersalin';b.classList.add('copied');
    setTimeout(()=>{b.textContent='Salin';b.classList.remove('copied')},2000);
  });
};

window.toggleSteps = function(){
  stepsOpen=!stepsOpen;
  const w=document.getElementById('steps-wrap');
  const b=document.getElementById('steps-btn');
  w.classList.toggle('open',stepsOpen);
  b.classList.toggle('open',stepsOpen);
};

// ══════════════════════════════════════════════
//  RENDER HELPERS
// ══════════════════════════════════════════════
function bCell(v,sz,col){
  const cls=v?`b1 ${col||''}`:'b0';
  return `<div class="bit-mini ${cls}" style="${sz?'width:'+sz+'px;height:'+sz+'px;font-size:'+(sz*.45)+'px':''}">${v}</div>`;
}
function bStrip(arr,sz,col){return`<div class="bstrip">${arr.map(b=>bCell(b,sz,col)).join('')}</div>`}
function bStripSm(arr,col){return`<div class="bstrip bstrip-sm">${arr.map(b=>bCell(b,28,col)).join('')}</div>`}

function splitView(l,r,lL='Kiri',lR='Kanan',col){
  return`<div class="split-view">
    <div class="split-half"><div class="split-label">${lL}</div>${bStripSm(l,col)}</div>
    <div class="split-pipe"></div>
    <div class="split-half"><div class="split-label">${lR}</div>${bStripSm(r,col)}</div>
  </div>`;
}

function xorBlock(a,b,res,lA,lB){
  const row=(op,arr,lbl,cl)=>
    `<div class="xor-row">
      <span class="xor-op">${op}</span>
      ${bStripSm(arr)}
      <span class="xor-lbl" style="color:${cl}">${lbl}</span>
    </div>`;
  return`<div class="xor-block">
    ${row('',a,lA,'var(--blue)')}
    ${row('⊕',b,lB,'#c084fc')}
    <hr class="xor-sep"/>
    ${row('=',res,'Hasil XOR','var(--green)')}
  </div>`;
}

function stepRow(lbl,hint,content){
  return`<div class="step-row">
    <div class="step-lbl">${lbl}<code>${hint}</code></div>
    <div>${content}</div>
  </div>`;
}

function sboxDetail(inp,tbl,name,res){
  const{r,c,v}=sbox(inp,tbl);
  return`<div class="sbox-detail">
    <div class="sbox-row"><span class="sbox-label">Input ${name}:</span>${bStripSm(inp)}</div>
    <div class="sbox-row"><span class="sbox-label">Row (bit 1,4):</span><span class="sbox-val">${inp[0]}${inp[3]} = ${r}</span></div>
    <div class="sbox-row"><span class="sbox-label">Col (bit 2,3):</span><span class="sbox-val">${inp[1]}${inp[2]} = ${c}</span></div>
    <div class="sbox-row"><span class="sbox-label">${name}[${r}][${c}] = ${v}:</span>${bStripSm(res,'g')}</div>
  </div>`;
}

function section(headCls,title,content,delay=0){
  return`<div class="step-section" style="animation-delay:${delay}ms">
    <div class="step-section-head ${headCls}">${title}</div>
    <div class="step-body">${content}</div>
  </div>`;
}

function buildSteps(res,md){
  const kg=res.kg;
  const enc=md==='enc';
  const r1k=enc?'K1':'K2', r2k=enc?'K2':'K1';
  const r1kb=enc?kg.k1:kg.k2, r2kb=enc?kg.k2:kg.k1;

  const keySection=section('key','🔑 PEMBANGKITAN KUNCI — Key Generation',`
    ${stepRow('Kunci Awal','Input 10-bit',bStrip(res.inp_key,34))}
    ${stepRow('Permutasi P10','[3,5,2,7,4,10,1,9,8,6]',bStrip(kg.p10,34,'p'))}
    ${stepRow('Bagi → L5, R5','5-bit kiri | 5-bit kanan',splitView(kg.L,kg.R,'L5','R5','p'))}
    ${stepRow('Left Shift-1 (LS-1)','Geser kiri 1 posisi',splitView(kg.l1L,kg.l1R,'LS-1 Kiri','LS-1 Kanan','p'))}
    ${stepRow('Permutasi P8 → K1','[6,3,7,4,8,5,10,9]',
      bStripSm(kg.k1,'p')+`<div class="key-badge k1">K1 = ${bs(kg.k1)}</div>`)}
    ${stepRow('Left Shift-2 (LS-2)','Geser kiri 2 posisi dari LS-1',splitView(kg.l2L,kg.l2R,'LS-2 Kiri','LS-2 Kanan','a'))}
    ${stepRow('Permutasi P8 → K2','[6,3,7,4,8,5,10,9]',
      bStripSm(kg.k2,'a')+`<div class="key-badge k2">K2 = ${bs(kg.k2)}</div>`)}
  `,0);

  const mainSection=section('enc-head',`🔐 ${enc?'ENKRIPSI':'DEKRIPSI'} — Proses Utama`,`
    ${stepRow(`Input ${enc?'Plaintext':'Ciphertext'}`,'8-bit biner',bStrip(res.inp8,34))}
    ${stepRow('Initial Permutation (IP)','Tabel IP: [2,6,3,1,4,8,5,7]',bStrip(res.ip,34,'g'))}
    ${stepRow('Bagi IP → L, R','4-bit kiri | 4-bit kanan',splitView(res.iL,res.iR,'L (bit 1-4)','R (bit 5-8)'))}
  `,80);

  function roundSection(inputL,inputR,rnd,rkbits,rkname,delay){
    return section('round-head',`⚙️ ROUND FUNCTION ${delay<300?1:2} — menggunakan ${rkname}`,`
      ${stepRow('Input Round',`L: ${bs(inputL)} | R: ${bs(inputR)}`,splitView(inputL,inputR,'L','R'))}
      ${stepRow('Expansion EP','Tabel EP: [4,1,2,3,2,3,4,1]',
        `<div style="font-size:10px;color:var(--muted);margin-bottom:5px">R (4-bit) →</div>
         ${bStripSm(inputR)}
         <div style="font-size:10px;color:var(--muted);margin:6px 0 5px">↓ Setelah EP (8-bit):</div>
         ${bStripSm(rnd.ep,'a')}`)}
      ${stepRow(`XOR dengan ${rkname}`,`EP ⊕ ${rkname}`,
        xorBlock(rnd.ep,rkbits,rnd.xk,`EP (${bs(rnd.ep)})`,`${rkname} (${bs(rkbits)})`))}
      ${stepRow('Bagi → S0 | S1','4-bit kiri | 4-bit kanan',splitView(rnd.xl,rnd.xr,'Masuk S0','Masuk S1'))}
      ${stepRow('Substitusi S-Box','S0 dan S1',
        `<div style="display:flex;gap:12px;flex-wrap:wrap">
          ${sboxDetail(rnd.xl,S0,'S0',rnd.s0r.out)}
          ${sboxDetail(rnd.xr,S1,'S1',rnd.s1r.out)}
        </div>`)}
      ${stepRow('S0+S1 → Permutasi P4',`[${bs(rnd.pi)}] → Tabel P4: [2,4,3,1]`,
        `${bStripSm(rnd.pi)}
         <div style="font-size:10px;color:var(--muted);margin:6px 0 5px">↓ Setelah P4:</div>
         ${bStripSm(rnd.po,'g')}`)}
      ${stepRow('XOR P4 ⊕ L','',
        xorBlock(rnd.po,inputL,rnd.xl2,`P4 (${bs(rnd.po)})`,`L (${bs(inputL)})`))}
    `,delay);
  }

  const rd1=roundSection(res.iL,res.iR,res.r1,r1kb,r1k,160);

  const swapSection=section('round-head','🔄 SWAP (SW) — Tukar Kiri & Kanan',`
    ${stepRow('Sebelum Swap',`L'=${bs(res.r1.xl2)} | R=${bs(res.iR)}`,splitView(res.r1.xl2,res.iR,"L' (Hasil XOR)",'R (dari IP)'))}
    ${stepRow('Setelah Swap (SW)','Kiri ↔ Kanan ditukar',splitView(res.swL,res.swR,'SW Kiri (jadi L)','SW Kanan (jadi R)','a'))}
  `,240);

  const rd2=roundSection(res.swL,res.swR,res.r2,r2kb,r2k,320);

  const outSection=section('final-head','✅ OUTPUT AKHIR',`
    ${stepRow('Gabungan L\'+R',`Sebelum IP⁻¹: ${bs(res.pre)}`,splitView(res.r2.xl2,res.swR,"L' (Round 2)",'R (dari Swap)'))}
    ${stepRow('Inverse IP (IP⁻¹)','Tabel IP⁻¹: [4,1,3,5,7,2,8,6]',bStrip(res.out,34,'g'))}
    ${stepRow(`Hasil ${enc?'Ciphertext':'Plaintext'}`,'Output akhir S-DES',
      `<div class="result-value-box ${enc?'enc':'dec'}" style="display:inline-flex;align-items:center;gap:12px;padding:12px 18px;border-radius:12px">
        <span class="result-value ${enc?'enc':'dec'}" style="font-size:18px;letter-spacing:.2em">${bs(res.out)}</span>
      </div>`)}
  `,400);

  return keySection+mainSection+rd1+swapSection+rd2+outSection;
}

// ══════════════════════════════════════════════
//  MAIN PROCESS
// ══════════════════════════════════════════════
window.process = function(){
  const tv=document.getElementById('inp-text').value.trim();
  const kv=document.getElementById('inp-key').value.trim();
  const err=document.getElementById('err-box');
  const etxt=document.getElementById('err-txt');

  err.classList.remove('show');
  document.getElementById('inp-text').classList.remove('error');
  document.getElementById('inp-key').classList.remove('error');

  if(!/^[01]{8}$/.test(tv)){
    document.getElementById('inp-text').classList.add('error');
    etxt.textContent='Plaintext/Ciphertext harus tepat 8 bit biner (hanya karakter 0 dan 1).';
    err.classList.add('show');return;
  }
  if(!/^[01]{10}$/.test(kv)){
    document.getElementById('inp-key').classList.add('error');
    etxt.textContent='Kunci harus tepat 10 bit biner (hanya karakter 0 dan 1).';
    err.classList.add('show');return;
  }

  // show processing animation
  const proc=document.getElementById('proc-anim');
  proc.classList.add('show');

  setTimeout(()=>{
    proc.classList.remove('show');
    const inp8=tv.split('').map(Number);
    const key10=kv.split('').map(Number);
    const res=runSDES(inp8,key10,mode);
    res.inp8=inp8; res.inp_key=key10;
    lastResult=res;

    const enc=mode==='enc';
    const out=res.out;

    // Result bits
    const bitsEl=document.getElementById('res-bits');
    bitsEl.innerHTML='';
    out.forEach((b,i)=>{
      const el=document.createElement('div');
      el.className=`bit-cell ${b?'b1'+(enc?' green':''):'b0'}`;
      el.style.animationDelay=(i*50)+'ms';
      el.textContent=b;
      bitsEl.appendChild(el);
    });

    document.getElementById('res-idx').innerHTML=
      Array.from({length:8},(_,i)=>`<div class="bit-idx">${i+1}</div>`).join('');

    document.getElementById('result-tag').className='result-tag '+(enc?'enc':'dec');
    document.getElementById('result-tag').textContent=enc?'CIPHERTEXT':'PLAINTEXT';

    const vb=document.getElementById('res-val-box');
    const vv=document.getElementById('res-val');
    vb.className='result-value-box '+(enc?'enc':'dec');
    vv.className='result-value '+(enc?'enc':'dec');
    vv.textContent=bs(out);

    // Steps
    document.getElementById('steps-content').innerHTML=buildSteps(res,mode);

    // Show result
    const sec=document.getElementById('result-section');
    sec.classList.add('visible');
    requestAnimationFrame(()=>requestAnimationFrame(()=>sec.classList.add('animated')));

    // Reset toggle
    stepsOpen=false;
    document.getElementById('steps-wrap').classList.remove('open');
    document.getElementById('steps-btn').classList.remove('open');

    sec.scrollIntoView({behavior:'smooth',block:'start'});
  },600);
};

window.resetAll = function(){
  document.getElementById('inp-text').value='';
  document.getElementById('inp-key').value='';
  document.getElementById('cnt-text').textContent='0/8';
  document.getElementById('cnt-key').textContent='0/10';
  document.getElementById('cnt-text').style.color='var(--muted)';
  document.getElementById('cnt-key').style.color='var(--muted)';
  document.getElementById('inp-text').classList.remove('error');
  document.getElementById('inp-key').classList.remove('error');
  document.getElementById('err-box').classList.remove('show');
  const sec=document.getElementById('result-section');
  sec.classList.remove('animated');
  setTimeout(()=>sec.classList.remove('visible'),400);
  window.setMode('enc');
  stepsOpen=false;
  lastResult=null;
};
