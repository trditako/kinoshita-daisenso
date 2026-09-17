const CACHE_NAME = "kinoshita-daisen-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// 第1～3章のクリア報酬キャラを、既存ゲームのカード形式へ正規化します。
// 古いキャッシュが残っている端末でも、最新の index.html を確実に表示できるようにします。
const REWARD_FIX = `<script>
(function(){
  try{
    if(typeof cards==='undefined' || !Array.isArray(cards)) return;
    const rewards=[
      {name:'突撃ハーランド木下',rarity:'SR',cost:777,hp:2500,atk:1500,range:60,spd:2.5,interval:.7,recharge:25,icon:'🏃',motion:'power',attackType:'area',kb:2,series:'日本編 第1章クリア報酬',specialReward:true,trait:'無',ability:{name:'突撃ハーランド',desc:'高速で前線へ進み、範囲攻撃を行う'}} ,
      {name:'異常木下',rarity:'SSR',cost:3000,hp:15000,atk:3000,range:200,spd:.3,interval:.5,recharge:45,icon:'👁️',motion:'super',attackType:'single',kb:5,series:'日本編 第2章クリア報酬',specialReward:true,trait:'赤',ability:{name:'異常な力',desc:'高HP・高火力・超長射程の単体攻撃'}} ,
      {name:'吉田',rarity:'SR',cost:200,hp:6000,atk:1111,range:100,spd:1.2,interval:.65,recharge:3,icon:'🧑',motion:'basic',attackType:'area',kb:2,series:'日本編 第3章クリア報酬',specialReward:true,trait:'赤',ability:{name:'吉田の一撃',desc:'短い再出撃時間で範囲攻撃を行う'}}
    ];
    for(const r of rewards){
      let c=cards.find(x=>x&&x.name===r.name);
      if(!c){cards.push({...r});c=cards[cards.length-1];}
      Object.assign(c,r);
    }
    const ids=rewards.map(r=>cards.findIndex(c=>c.name===r.name));
    if(typeof ownedFlags!=='undefined' && Array.isArray(ownedFlags)){
      while(ownedFlags.length<cards.length) ownedFlags.push(false);
      if(typeof chapterClears!=='undefined' && Array.isArray(chapterClears)){
        if(Number(chapterClears[0]||0)>=48 && ids[0]>=0) ownedFlags[ids[0]]=true;
        if(Number(chapterClears[1]||0)>=48 && ids[1]>=0) ownedFlags[ids[1]]=true;
        if(Number(chapterClears[2]||0)>=48 && ids[2]>=0) ownedFlags[ids[2]]=true;
      }
      if(typeof syncOwnedCount==='function') syncOwnedCount();
      if(typeof normalizeFormation==='function') normalizeFormation();
      if(typeof save==='function') save();
    }
    // サーバーAI/端末AIの両方に、章クリア報酬を反映。
    const applyAI=()=>{
      if(typeof aiProfiles==='undefined' || !Array.isArray(aiProfiles)) return;
      for(const ai of aiProfiles){
        if(!ai) continue;
        ai.chapterClears=Array.isArray(ai.chapterClears)?ai.chapterClears:[0,0,0];
        ai.ownedCharacters=Array.isArray(ai.ownedCharacters)?ai.ownedCharacters:[];
        [0,1,2].forEach(ch=>{
          if(Number(ai.chapterClears[ch]||0)>=48){
            const id=ids[ch];
            if(id>=0 && !ai.ownedCharacters.includes(id)) ai.ownedCharacters.push(id);
            if(ai.charLevels) ai.charLevels[id]=Math.max(1,Number(ai.charLevels[id]||1));
          }
        });
        ai.ownedCharacters=[...new Set(ai.ownedCharacters.filter(i=>Number.isInteger(i)&&i>=0&&i<cards.length))];
        if(typeof ai.formation==='undefined'||!Array.isArray(ai.formation)) ai.formation=[0];
        ai.formation=ai.formation.filter(i=>ai.ownedCharacters.includes(i)).slice(0,10);
        if(!ai.formation.length) ai.formation=[0];
      }
      if(typeof saveRank==='function') saveRank();
      if(typeof renderAIAccountList==='function' && document.getElementById('aiManager')?.style.display!=='none') renderAIAccountList();
    };
    applyAI();
    setTimeout(applyAI,1000);
    setTimeout(applyAI,5000);
    if(typeof renderCards==='function') renderCards();
    if(typeof renderFormation==='function') renderFormation();
    if(typeof renderKinoshitaBook==='function') renderKinoshitaBook();
  }catch(e){console.warn('chapter reward normalization skipped',e);}
})();
</script>`;

function withRewardFix(response) {
  return response.text().then(text => {
    if (text.includes('突撃ハーランド木下') && text.includes('異常木下') && text.includes('吉田')) {
      const normalized = text.replace('</body></html>', REWARD_FIX + '</body></html>');
      return new Response(normalized, {headers:{'Content-Type':'text/html; charset=utf-8'}});
    }
    return response;
  });
}

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const isHtml = event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    event.request.url.endsWith("/index.html") ||
    event.request.url.endsWith("/kinoshita-daisenso/");

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (isHtml) return withRewardFix(response).then(fixed => {
          const copy = fixed.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return fixed;
        });
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
