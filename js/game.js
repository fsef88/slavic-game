// ============================================================
//  GAME — игровой цикл, обновление, отрисовка, сброс
// ============================================================
function update(dt) { return; }
function draw() { return; }
function resetRun(daily) { return; }
function endRun(victory) { return; }
function levelUp() { return; }
function showCards() { return; }
function closeCards() { return; }
function buildGrid() { return; }
function update(dt){
 if(paused||over||runEnded)return;
 time+=dt;
 // движение
 let mx=0,my=0;
 if(keys['d']||keys['KeyD']||keys['arrowright'])mx+=1;
 if(keys['a']||keys['KeyA']||keys['arrowleft'])mx-=1;
 if(keys['s']||keys['KeyS']||keys['arrowdown'])my+=1;
 if(keys['w']||keys['KeyW']||keys['arrowup'])my-=1;
 if(touchMove.active){mx+=touchMove.x;my+=touchMove.y;}
 const ml=dist(mx,my);P.moving=ml>0;if(ml>0){mx/=ml;my/=ml;P.fx=mx;P.fy=my;P.x+=mx*P.spd*dt;P.y+=my*P.spd*dt;}
 // ГРАНИЦЫ МИРА: игрок НЕ МОЖЕТ уйти за пределы 0..WORLD (был баг — камера упиралась, игрок уходил)
 // Используем эффективный размер мира с учётом экрана: края мира — это края экрана
 P.x=clamp(P.x, P.r, WORLD-P.r);
 P.y=clamp(P.y, P.r, WORLD-P.r);
 // ЗАЩИТА ОТ NaN: если какой-то баг дал NaN в P.x/y, последующие вычисления
 // (dist, dist2, нормализация) породят NaN везде. safeNum сбрасывает к центру мира.
 P.x=safeNum(P.x,1000);P.y=safeNum(P.y,1000);
 P.hp=safeNum(P.hp,100);P.maxhp=safeNum(P.maxhp,100);
 P.spd=safeNum(P.spd,200);P.dmgMul=safeNum(P.dmgMul,1);
 P.rateMul=safeNum(P.rateMul,1);P.specialRate=safeNum(P.specialRate,1);
 P.animT+=dt;if(P.atk>0)P.atk-=dt;
 if(P.regen&&P.hp<P.maxhp){
  P.hp=Math.min(P.maxhp,P.hp+P.regen*dt);
  // реген-пульсация — используем кэшированный UI.regen
  if(UI.regen){UI.regen.style.opacity=P.regen>0?'1':'0';UI.regen.textContent='+'+P.regen.toFixed(1);}
 }
 // ИСПРАВЛЕНО: иначе зелёная надпись "+1.5" навечно застывает над полной полоской.
 // Раньше этот блок был вложен в if(regen && hp<maxhp) — как только HP заполнялось,
 // мы просто переставали заходить и не сбрасывали opacity в '0'.
 if(UI.regen&&(!(P.regen>0&&P.hp<P.maxhp)))UI.regen.style.opacity='0';
 // ТАЙМЕР БАФФА СПЕЦАТАКИ — привязан к игровому времени, не к real-time
 if(P.specialBuffT>0){
  P.specialBuffT-=dt;
  if(P.specialBuffT<=0){
   P.specialBuffT=0;
   // Снимаем ТОЛЬКО специальный буст, базовый rateMul не трогаем
   P.specialRate=1;
  }
 }
 if(P.armor&&P.hp<P.maxhp)P.hp=Math.min(P.maxhp,P.hp+0.1*P.armor*dt);
 // СПАВН: один враг на старте (сразу даёт ощущение "игра живая") + потом непрерывный поток
 // (первый враг уже заспавнен в init-блоке, поэтому здесь только доп. поток)
 if(time>0.5){
  spawnTimer-=dt;
  // Стартовый rate 0.4/сек, рост +4% каждые 90с — спокойный темп для мобильного
  const rate=0.4*(1+0.04*Math.floor(time/90));
  while(spawnTimer<=0){
   // Проверяем сколько врагов В ПРЕДЕЛАХ ЭКРАНА (радиус = max(W,H)*0.4)
   // На мобильном 1080×WORLD = 960px — это видимая зона примерно
   const nearR=Math.max(W,H)*0.4;
   const nearR2=nearR*nearR;
   let nearCount=0;
   for(const e of enemies){
    if(dist2(e.x-P.x,e.y-P.y)<nearR2)nearCount++;
   }
   // Лимит "на экране": 3 врага. Если больше — НЕ спавним.
   // Общий лимит: 15 (мобильному больше не нужно — тормозит)
   // ИСПРАВЛЕНО: рядом могут быть ВСЕ враги — спавн не блокируется.
   // Решение: если на экране 3+, спавним ПО ДАЛЬНЕЙ стороне (за 1000+ пикселей).
   // Это не нарушает лимит 15, но и не блокирует игру.
   if(enemies.length<15){
    if(nearCount<3)spawn(false);
    else spawn(true);
   }
   spawnTimer+=1/rate;
  }
 }
 // На 1:30 — выбор божества (в забеге)
 if(time>=90&&!boonShown)maybeShowBoonSelect();
 // На 2:30 — выбор класса (если не выбран)
 if(time>=150&&!classChosen)maybeShowClassSelect();
 eliteT-=dt;if(eliteT<=0&&!bossSpawned){eliteT=75;spawnElite();}
 if(!bossSpawned&&time>=bossT){bossSpawned=true;spawnBoss();}
 // заряд спецатаки
 if(specialCharge<specialMax)specialCharge=Math.min(specialMax,specialCharge+dt*0.05);
 // кнопка спецатаки — кэшированная ссылка
 if(UI.tbtnSpecial){if(specialCharge>=specialMax)UI.tbtnSpecial.classList.add('ready');else UI.tbtnSpecial.classList.remove('ready');}
 // оружия
 // ИСПРАВЛЕНО: buildGrid() вызывается ПЕРЕД doSword/doBolt, чтобы spatial hash
 // был свежим. Раньше buildGrid вызывался ПОСЛЕ оружий, и атаки
 // использовали устаревшие позиции врагов (лаг 1 кадр).
 buildGrid();
 for(const w of weapons){w.t-=dt;if(w.t<=0){w.t+=w.cd/(P.rateMul*P.specialRate)/(P.swordRate||1);if(w.id==='sword')doSword();else if(w.id==='bolt')doBolt();}}
 // орбита
 // ИСПРАВЛЕНО: орбита наносит ТИХИЙ урон каждый кадр (без частиц/текста),
 // а визуальные эффекты (flash + dmgText) лимитированы кулдауном 0.4с на врага.
 // Раньше hitEnemy() на каждом кадре генерил 1 flash + 6 частиц + 65% dmgText
 // = 60 раз/сек на 1 врага = 360 частик/сек. На 10 врагов = 3600 частиц/сек → freeze.
 if(hasOrbit){
  orbAngle+=dt*3;
  for(let i=0;i<orbCount;i++){
   const a=orbAngle+i*(Math.PI*2/orbCount);
   const ox=P.x+Math.cos(a)*70,oy=P.y+Math.sin(a)*70;
   for(const e of enemies){
    if(dist(e.x-ox,e.y-oy)<e.r+10){
     // Чистый урон без частиц (множитель 15 вместо 60*0.25=15 — то же значение)
     dealDamage(e,8*P.dmgMul*dt*15);
     // Визуал только раз в 0.4с на каждого врага
     e.orbT=(e.orbT||0)-dt;
     if(e.orbT<=0){
      spawnFlash(e.x,e.y-e.r*0.6,0,'#b478ff');
      spawnDmgText(e.x+rnd(-12,12),e.y-e.r,Math.round(8*P.dmgMul*15),'void');
      e.orbT=0.4;
     }
    }
   }
  }
 }
 // зоны яда
 if(poison.on){
  poison.t-=dt;
  if(poison.t<=0&&enemies.length){
   poison.t+=1.3;
   // ВЫБОР ЦЕЛИ: только видимые враги (spatial hash в радиусе 500), иначе яд
   // улетает за экран, т.к. массив enemies может содержать кучу мобов
   // за 1200+ пикселей (которые ещё не деспавнились).
   // Фоллбэк на enemies — если рядом никого, берём случайного, иначе 1.3 сек
   // кулдауна пропадёт впустую.
   const visibleEnemies=enemiesNear(P.x,P.y,500);
   const targetList=visibleEnemies.length>0?visibleEnemies:enemies;
   const e=targetList[Math.floor(seedRandom()*targetList.length)];
   zones.push({x:e.x,y:e.y,r:48+12*poison.lvl,t:3,max:3,dmg:6*poison.lvl*P.dmgMul});
  }
 }
 for(const z of zones){z.t-=dt;for(const e of enemies){if(dist(e.x-z.x,e.y-z.y)<z.r+e.r)dealDamage(e,z.dmg*dt);}}
 zones=zones.filter(z=>z.t>0);
 // ИСПРАВЛЕНО: очистка собранных аномалий. Раньше splice в tryClaimAnomaly ломал
 // for...of итератор, и соседние аномалии пропускались. Теперь они остаются в массиве
 // с флагом claimed=true, и здесь мы массово удаляем их в одном проходе.
 anomalies=anomalies.filter(a=>!a.claimed);
 // spatial hash
 const thornR=thorn.on?(68+16*thorn.lvl):0;
 const thornR2=thornR*thornR;
 const frostR=(frost.on?(88+16*frost.lvl):0)*(P.frostR||1);
 const frostR2=frostR*frostR;
  // враги — один проход с AI поведением
 // Сначала отталкивание между врагами (используем spatial hash — O(n) вместо O(n²))
 // Сетка УЖЕ построена перед оружиями (line ~1424) и позиции не менялись —
 // второй buildGrid() был лишним, удалён.
 const SEP_R=80; // радиус отталкивания
 const SEP_R2=SEP_R*SEP_R;
 for(const e of enemies){
  if(e.spawnT>0)continue; // спавнящиеся не отталкиваются
  const cx=Math.floor(e.x/CELL),cy=Math.floor(e.y/CELL);
  for(let ix=cx-1;ix<=cx+1;ix++)for(let iy=cy-1;iy<=cy+1;iy++){
   const arr=grid.get(ix+','+iy);if(!arr)continue;
   for(const o of arr){
    if(o===e||o.spawnT>0)continue;
    const dx=o.x-e.x,dy=o.y-e.y;
    const d2v=dx*dx+dy*dy;
    if(d2v<SEP_R2&&d2v>1){
     const d=Math.sqrt(d2v);
     const push=(SEP_R-d)/SEP_R*200*dt; // сила отталкивания
     e.kx-=(dx/d)*push;
     e.ky-=(dy/d)*push;
    }
   }
  }
 }
 // Мягкий лимит плотности: если врагов слишком много РЯДОМ — замедляем их подход
 // Радиус "плотной зоны" = 70% от половины минимальной стороны экрана
 const DENSITY_R=Math.min(W,H)*0.35;
 const DENSITY_R2=DENSITY_R*DENSITY_R;
 for(const e of enemies){
  if(e.spawnT>0)continue; // fade-in не трогаем
  const ddx=P.x-e.x,ddy=P.y-e.y;
  const ddd2=ddx*ddx+ddy*ddy;
  if(ddd2<DENSITY_R2&&ddd2>1){
   // В плотной зоне — замедление (враг "упирается в невидимую стену" из других врагов)
   const factor=Math.max(0.2, 1-((DENSITY_R2-ddd2)/DENSITY_R2)*0.7);
   e.densitySlow=factor;
  }else{
   e.densitySlow=1;
  }
 }
 for(const e of enemies){
  e.kx=e.kx||0;e.ky=e.ky||0;e.slow=Math.min(1,(e.slow||1)+dt*1.5);
  if(e.frozen>0)e.frozen-=dt;
  if(e.poisoned>0)e.poisoned-=dt;
  if(e.fireT>0)e.fireT-=dt;
  if(e.spawnT>0)e.spawnT-=dt; // fade-in спавн-эффект
  const dx=P.x-e.x,dy=P.y-e.y;
  const d2=dist2(dx,dy);
  const d=Math.sqrt(d2)||1; // 1 sqrt на врага, не 2
  // Враги во время fade-in (spawnT>0) — НЕВИДИМЫ для игрока в плане урона
  // Не двигаются активно, не наносят контактный урон
  const isSpawning=e.spawnT>0;
  // AI поведение
  let spd=isSpawning?0:(e.spd*e.slow*(e.frozen>0?0.5:1)*(e.densitySlow||1));
  // zigzag (imp)
  if(e.ai==='zigzag'){
   e.zigzagT-=dt;
   if(e.zigzagT<=0){e.zigzagT=rnd(0.4,1);e.zigzag+=Math.PI/2+rnd(-0.4,0.4);}
   const perpA=e.zigzag+Math.PI/2;
   e.kx+=Math.cos(perpA)*60*dt;
   e.ky+=Math.sin(perpA)*60*dt;
  }
  // kamikaze (wraith) — быстрее когда далеко
  if(e.ai==='kamikaze'){
   if(d>150)spd*=1.5;
  }
  // tank (troll) — медленнее
  if(e.ai==='tank'){
   spd*=0.7;
  }
  // shooter (shaman) — стреляет на дистанции
  if(e.ai==='shooter'){
   if(d>200&&d<400&&e.fireT<=0){
    e.fireT=2;
    // снаряд в сторону игрока
    const dmg=e.dmg*0.5*P.dmgMul;
    P.hp-=dmg*dt*0.5;
    spawnDmgText(P.x,P.y-P.r,Math.round(dmg),'void');
    spawnFlash(P.x,P.y,0,'#b478ff');
   }
  }
  e.x+=dx/d*spd*dt+e.kx*dt;e.y+=dy/d*spd*dt+e.ky*dt;e.kx*=0.82;e.ky*=0.82;
  e.at=(e.at||0)+dt;if(e.flash>0)e.flash-=dt;if(e.hit>0)e.hit-=dt;
  if(e.boltT>0)e.boltT-=dt;
  if(e.poisoned>0)dealDamage(e,4*dt);
  if(thornR>0&&d2<thornR2+e.r*e.r){dealDamage(e,7*thorn.lvl*P.dmgMul*dt);if(Math.random()<0.05)e.poisoned=2;}
  if(frostR>0&&d2<frostR2+e.r*e.r){e.slow=Math.min(e.slow,0.45);dealDamage(e,2.5*frost.lvl*P.dmgMul*dt);if(Math.random()<0.04)e.frozen=1.5;}
  if(e.boss){
   e.slamT-=dt;
   if(e.slamT<=0){
    e.slamT=e.phase===2?2.2:3.6;
    const n=e.phase===2?5:3;
    for(let i=0;i<n;i++){
     // ЗАЩИТА: clamp в границы мира, иначе у края карты hazard появлялся
     // на невидимой территории, наносил урон и не давал визуального сигнала
     hazards.push({
      x:clamp(P.x+rnd(-170,170), 0, WORLD),
      y:clamp(P.y+rnd(-150,150), 0, WORLD),
      r:72,state:'tele',t:0.9
     });
    }
    sfxDeath();
   }
   if(e.phase===1&&e.hp<e.maxhp*0.5){e.phase=2;shake=10;}
  }
  if(e.hitT>0)e.hitT-=dt;
  // контактный урон (импульс) — спавнящиеся враги не бьют
  // ИСПРАВЛЕНО: единый cooldown через hitT для ВСЕХ врагов.
  // Раньше wasInRange сбрасывался ДИСТАНЦИОННО (когда d >= e.r + P.r).
  // Меч отталкивает врага (e.kx), враг на 1 кадр выходит за радиус — флаг сбрасывается —
  // следующий кадр враг возвращается и бьёт БЕЗ кулдауна. Двойной/тройной урон в секунду.
  // Теперь: hitT кулдаун (1.2с для мобов, 0.7с для боссов/троллей),
  // wasInRange сбрасывается только при d > e.r + P.r + 25 (явный отход, не микро-отскок).
  if(!isSpawning && d<e.r+P.r){
   if(e.hitT<=0){
    let dmg=e.dmg*(e.dmgMod||1);
    if(e.type==='troll'||e.boss){
     if(e.wasInRange)dmg*=0.5; // повторные удары боссов/троллей слабее
     e.hitT=0.7;
    }else{
     e.hitT=1.2; // рядовые мобы бьют раз в 1.2 сек
    }
    if(P.armor)dmg*=(1-P.armor*0.5);
    P.hp-=dmg;
    e.wasInRange=true;
    sfxHurt();
    shake=Math.max(shake,3);
    // ВАМПИРИЗМ Воина срабатывает ТОЛЬКО при УБИЙСТВЕ (см. onKillHeal в killDrops),
    // а не от получения урона. Это описано в CLASSES для warrior.
   }
  }else{
   // Сбрасываем флаг только при ЯВНОМ отдалении (не при микро-отскоке)
   if(d>e.r+P.r+25)e.wasInRange=false;
  }
 }
 markExplored(P.x,P.y);
 for(let i=0;i<3;i++)markExplored(P.x+rnd(-180,180),P.y+rnd(-180,180));
 for(const a of anomalies)tryClaimAnomaly(a);
 for(const p of ACTIVE.particles){p.life-=dt;p.vy+=(p.g||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.9;if(p.life<=0)poolRelease(POOL.particles,p);}
 shake=Math.max(0,shake-dt*20);
 for(const f of ACTIVE.flashes){f.t-=dt;if(f.t<=0)poolRelease(POOL.flashes,f);}
 for(const h of hazards){h.t-=dt;if(h.state==='tele'&&h.t<=0){h.state='active';h.t=1.3;}else if(h.state==='active'&&dist2(P.x-h.x,P.y-h.y)<h.r*h.r){P.hp-=24*dt;sfxHurt();}}
 hazards=hazards.filter(h=>!(h.state==='active'&&h.t<=0));
 // Подбор кристаллов: копим XP и сразу раздаём все levelUp'ы,
 // прежде чем помечать драгоценность мёртвой — без этого при 5 крупных кристаллах
 // на одном кадре лишние levelUp'ы теряются (был bug).
 for(const g of ACTIVE.gems){
  g.pop=(g.pop||0)+dt;
  if(g.vx){g.x+=g.vx*dt;g.y+=g.vy*dt;g.vx*=0.86;g.vy*=0.86;}
  const gdx=P.x-g.x,gdy=P.y-g.y;
  const gd2=dist2(gdx,gdy);
  if(gd2<P.pickup*P.pickup){
   const gd=Math.sqrt(gd2)||1;
   g.ms=(g.ms||140)+1100*dt;g.x+=gdx/gd*g.ms*dt;g.y+=gdy/gd*g.ms*dt;
  }
  if(gd2<(P.r+8)*(P.r+8)){
   poolRelease(POOL.gems,g);
   const xpMul=P.xpMul||(currentBoon==='veles'?1.5:1);
   xp+=g.v*xpMul;sfxPick();
  }
 }
 // САМОРЕГУЛИРУЮЩАЯСЯ ОЧЕРЕДЬ ЛЕВЕЛОВ: если хватает XP — поднимаем уровень.
 // levelUp() сам ставит paused=true и вызывает showCards(), который
 // перерисовывает cardrow. Пока карты на экране — update(dt) не вызывается
 // (paused=true), и следующий levelUp не случится. Игрок видит каждое меню.
 // pendingLevelUps больше не нужен — опыт сам "дозреет" после закрытия карт.
 if(xp>=xpNext)levelUp();
 slashes.forEach(s=>s.t-=dt);slashes=slashes.filter(s=>s.t>0);
 for(const t of ACTIVE.dmgTexts){t.t-=dt;t.y-=30*dt;if(t.t<=0)poolRelease(POOL.dmgTexts,t);}
 bolts.forEach(b=>b.t-=dt);bolts=bolts.filter(b=>b.t>0);
 // ДЕСПАВН: удаляем мёртвых ИЛИ слишком далеких врагов за один проход.
 // ИСПРАВЛЕНО: радиус деспавна ДИНАМИЧЕСКИ = макс. возможная дистанция спавна + запас.
 // Раньше было жёстко 1200, что на мобильном (H=WORLD) было МЕНЬШЕ радиуса спавна (2150).
 // В итоге враг спавнился за экраном и в том же кадре удалялся фильтром.
 // Формула спавна: max(W,H)/2 + 250 (база) + 700 (forceDistant) = max+950 макс.
 // Берём с запасом +200 для деспавна.
 const maxSpawnDist=Math.max(W,H)/2+950;
 const despawnR2=(maxSpawnDist+200)*(maxSpawnDist+200);
 enemies=enemies.filter(e=>{
  // мёртвые — наружу
  if(!isFinite(e.hp)||e.hp<=0)return false;
  // боссы и элиты — никогда не деспавним
  if(e.boss||e.elite)return true;
  return dist2(e.x-P.x,e.y-P.y)<despawnR2;
 });
 // HP проверка
 if(P.hp<=0&&!over&&!won)endRun(false);
 // low HP vignette — кэшированная ссылка
 UI.lowHpV.style.opacity=(P.hp/P.maxhp<0.3)?'1':'0';
 // ПЕРИОДИЧЕСКАЯ ПРОВЕРКА ДОСТИЖЕНИЙ — раз в 1 секунду (для time-bound наград)
 achCheckT-=dt;
 if(achCheckT<=0){
  achCheckT=1;
  checkAch();
 }
 // Границы камеры: центрируем на игроке, но не выходим за пределы мира
 // camMaxX/Y — насколько можно сдвинуть камеру, чтобы край экрана = краю мира
 // Если W > world (маленький мир), то max=0; если W < world, то max = world - W
 const camMaxX=Math.max(0,WORLD-W);
 const camMaxY=Math.max(0,WORLD-H);
 // Камера центрирована на игроке, но не выходит за [0, camMax]
 // Это работает для ЛЮБОГО размера экрана — и для 1080×WORLD, и для десктопа
 cam.x=P.x-W/2;
 cam.y=P.y-H/2;
}

function doSword(){
 const ang=Math.atan2(P.fy,P.fx),arc=2.2,reach=(70+18)*P.areaMul;
 slashes.push({ang,reach,t:0.18});P.atk=0.28;sfxSwing();
 // ИСПРАВЛЕНО: ищем меч по id, не по индексу [0]. У Шамана weapons=[bolt],
 // weapons[0]={id:'bolt'} — и evo проверялась у молниИ, а не у меча.
 // Если игрок позже возьмёт меч карточкой «Гроза Перуна»/«Заточка меча»,
 // новый меч окажется на индексе 1+, и мы всё равно найдём правильный.
 const swordW=weapons.find(w=>w.id==='sword');
 const evo=swordW&&swordW.evo;
 // spatial hash: только враги в радиусе reach
 const candidates=enemiesNear(P.x,P.y,reach+P.r);
 for(const e of candidates){
  const dx=e.x-P.x,dy=e.y-P.y,d=dist(dx,dy);
  if(d<reach+e.r){
   let da=Math.atan2(dy,dx)-ang;
   while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
   if(Math.abs(da)<arc/2){
    let dmg=22*P.dmgMul*(1+0.25*(swordLvl-1))*(evo?2.2:1);
    let isCrit=P.crit&&seedRandom()<P.crit;
    if(isCrit){dmg*=2;sfxCrit();}
    hitEnemy(e,dmg,'phys',isCrit);
    if(evo&&Math.random()<0.3)e.poisoned=2;
    for(let i=0;i<3;i++){const a=Math.random()*6.28,sp=rnd(60,180);if(!spawnParticle(e.x-dx*0.3,e.y-dy*0.3,Math.cos(a)*sp,Math.sin(a)*sp,rnd(.3,.6),'#7a2412',150,1))break;}
   }
  }
 }
}
function doBolt(){
 if(!enemies.length)return;
 // spatial hash для ближайших
 // ИСПРАВЛЕНО: фильтруем мёртвых (e.hp > 0). В том же кадре меч мог убить врага,
 // а молния сработает после меча в той же итерации update() — без фильтра
 // она бы тратила bolt-цепочку на труп.
 const candidates=enemiesNear(P.x,P.y,420);
 const near=candidates.filter(e=>(e.boltT||0)<=0&&e.hp>0);
 if(!near.length)return;
 const w=weapons.find(w=>w.id==='bolt');
 const evo=w&&w.evo;
 const e=near[Math.floor(seedRandom()*near.length)];
 e.boltT=1.0;
 let dmg=24*P.dmgMul*boltLvl*(evo?2.5:1);
 if(e.boss&&P.bossMul)dmg*=P.bossMul;
 hitEnemy(e,dmg,'elec');
 bolts.push({x:e.x,y:e.y,t:0.18});
 for(let i=0;i<4;i++){const a=Math.random()*6.28,sp=rnd(80,200);if(!spawnParticle(e.x,e.y,Math.cos(a)*sp,Math.sin(a)*sp,rnd(.2,.5),'#8fd0ff',-50,0))break;}
 if(frost.on&&Math.random()<0.4)e.frozen=2;
 if(evo){let prev=e;for(let k=0;k<3;k++){
  // ИСПРАВЛЕНО: spatial hash вместо линейного поиска + кулдаун boltT на каждой цели
  // чтобы молния не прыгала бесконечно между двумя ближайшими
  // Также: e.hp > 0 — не прыгаем на трупы
  const nexts=enemiesNear(prev.x,prev.y,180);
  const next=nexts.find(en=>en!==prev&&(en.boltT||0)<=0&&en.hp>0);
  if(!next)break;
  next.boltT=1.0; // ставим кулдаун на новой цели
  bolts.push({x:next.x,y:next.y,t:0.18});
  hitEnemy(next,dmg*0.5,'elec');
  prev=next;
 }}
}
 // lifesteal срабатывает ТОЛЬКО при УБИЙСТВЕ врага, а не от получения урона
function onKillHeal(amount){
 if(P.lifesteal&&amount>0){
  // вампиризм: +1 HP за убийство + бонус от урона.
  // CAP=10: босс (2600 HP) дал бы +131 HP, элита (240) — +13.
  // Без cap это обесценивает урон от босса и убивает напряжение.
  // +10 за килл босса = значимо, но не имба.
  // Cap настраиваемый — если нужно поднять/опустить, меняй тут.
  const heal=Math.min(10,1+Math.floor(amount*P.lifesteal*0.1));
  const before=P.hp;
  P.hp=Math.min(P.maxhp,P.hp+heal);
  if(P.hp>before)spawnDmgText(P.x,P.y-P.r-20,`+${Math.round(P.hp-before)}`,'frost');
 }
}
function killDrops(e){
 if(e.dead)return;e.dead=true;e.hp=0;kills++;gold++;sfxDeath();
 onKillHeal(e.maxhp); // <-- ВАМПИРИЗМ при УБИЙСТВЕ
 // кровавый взрыв
 for(let i=0;i<6;i++){const a=Math.random()*6.28,sp=rnd(80,200);if(!spawnParticle(e.x,e.y-e.r*0.5,Math.cos(a)*sp,Math.sin(a)*sp-30,rnd(.4,.8),'#7a2412',200,1))break;}
 if(e.boss){gold+=200;won=true;bossE=null;shake=20;flashScreen('#ffcf6a',0.5);endRun(true);return;}
 if(e.elite){
  gold+=25;
  for(let i=0;i<8;i++)spawnGem(e.x+rnd(-20,20),e.y+rnd(-20,20),2,'#b478ff',rnd(-90,90),rnd(-120,-30));
  P.hp=Math.min(P.maxhp,P.hp+15);
  // РЕЛИКВИЯ ВЫДАЁТСЯ ТОЛЬКО ПОСЛЕ УБИЙСТВА элиты (не на спавне!)
  if(e.hasRelic){
   const r=RELICS[Math.floor(seedRandom()*RELICS.length)];
   addRelic(r);
  }
  if(!over&&!won&&!paused){paused=true;showCards();}
 }
 for(let i=0;i<(e.xp>1?3:1);i++)spawnGem(e.x+rnd(-8,8),e.y+rnd(-8,8),e.type==='troll'?2:1,e.type==='troll'?'#b478ff':(e.type==='imp'?'#78ff8c':e.type==='shaman'?'#ff7a3c':e.type==='wraith'?'#6080a0':'#5adcff'),rnd(-70,70),rnd(-110,-30));
 for(let i=0;i<Math.floor(10*partMul);i++){const a=Math.random()*6.28,sp=rnd(50,180);if(!spawnParticle(e.x,e.y-e.r*0.5,Math.cos(a)*sp,Math.sin(a)*sp-50,rnd(.35,.75),['#6a4a28','#7fb04a','#4a5a2a','#9ac06a'][i%4],300,0))break;}
 spawnFlash(e.x,e.y-e.r*0.6,1,'#bfe08a');hitstop=Math.max(hitstop,0.05);
}
function dealDamage(e,dmg){e.hp-=dmg;if(e.hp<=0)killDrops(e);}
function hitEnemy(e,dmg,tag,crit){
 tag=tag||'phys';
 e.flash=0.1;e.hit=0.18;
 const dx=e.x-P.x,dy=e.y-P.y,d=dist(dx,dy)||1;e.kx=(e.kx||0)+dx/d*90;e.ky=(e.ky||0)+dy/d*90;
 // ВАЖНО: не мутируем входной dmg, чтобы caller мог использовать оригинальное значение
 if(e.weak===tag)dmg*=1.5;
 if(tag==='phys'&&e.weak==='elec')dmg*=0.7;
 if(e.boss&&P.bossMul)dmg*=P.bossMul;
 spawnFlash(e.x,e.y-e.r*0.6,0,'#ffe6a0');
 for(let i=0;i<Math.floor(6*partMul);i++){const a=Math.random()*6.28,sp=rnd(70,220);if(!spawnParticle(e.x,e.y-e.r*0.5,Math.cos(a)*sp,Math.sin(a)*sp-50,rnd(.25,.55),['#ffe6a0','#7a5a34','#8fd06a'][i%3],300,0))break;}
 shake=Math.min(shake+(crit?5:2),10);
 if(crit){const finalDmg=Math.round(dmg);spawnDmgText(e.x+rnd(-12,12),e.y-e.r-10,finalDmg,tag,true);}else if(Math.random()<0.65){const finalDmg=Math.round(dmg);spawnDmgText(e.x+rnd(-12,12),e.y-e.r,finalDmg,tag);}
 dealDamage(e,dmg);
}
function fmt(t){const m=Math.floor(t/60),s=Math.floor(t%60);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}

// ============================================================
//  RENDER
function draw(){
 // ЗАЩИТА: если canvas не инициализирован (W=0,H=0), не рисовать
 if(W===0||H===0){return;}
 const frameStart=performance.now();
 // Координаты игрока на экране — вычисляем один раз в начале
 const px=P.x-cam.x,py=P.y-cam.y;
 ctx.fillStyle=theme==='winter'?'#3a4a5a':theme==='night'?'#0a0a18':'#1a2410';
 ctx.fillRect(0,0,W,H);if(GT.complete&&GT.naturalWidth){var _ts=320;if(!_gbuf||_gbW!==W||_gbH!==H){_gbuf=document.createElement('canvas');_gbuf.width=W+_ts;_gbuf.height=H+_ts;var _gc=_gbuf.getContext('2d');for(var _yy=0;_yy<H+_ts;_yy+=_ts)for(var _xx=0;_xx<W+_ts;_xx+=_ts)_gc.drawImage(GT,_xx,_yy,_ts,_ts);_gbW=W;_gbH=H;}var _ox=((cam.x%_ts)+_ts)%_ts,_oy=((cam.y%_ts)+_ts)%_ts;ctx.drawImage(_gbuf,-_ox,-_oy);}
 ctx.save();ctx.translate((Math.random()*2-1)*shake,(Math.random()*2-1)*shake);
 // ground (кешированные — больше не создаём gradient каждый кадр)
 for(const b of []){const gx=((b.x-cam.x*0.6)%WORLD+WORLD)%WORLD-200;const gy=((b.y-cam.y*0.6)%WORLD+WORLD)%WORLD-200;ctx.globalAlpha=0.5;ctx.drawImage(b.cachedG,gx-b.cachedG.width/2,gy-b.cachedG.height/2);}
 ctx.globalAlpha=1;
 // gspots удалены — 240 arc-op/кадр съедали FPS (см. аудит #6)
 // зоны
 for(const z of zones){ctx.save();ctx.globalAlpha=Math.min(1,z.t/z.max)*0.45;ctx.fillStyle='#6cd06a';ctx.shadowColor='#8fff8a';ctx.shadowBlur=16;ctx.beginPath();ctx.arc(z.x-cam.x,z.y-cam.y,z.r,0,7);ctx.fill();ctx.restore();}
 // хазарды
 for(const h of hazards){const hx=h.x-cam.x,hy=h.y-cam.y;if(Math.abs(hx)>W||Math.abs(hy)>H)continue;ctx.save();if(h.state==='tele'){const k=1-h.t/0.9;ctx.globalAlpha=0.45+0.3*Math.abs(Math.sin(time*18));ctx.strokeStyle='#ff7a3c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(hx,hy,h.r*(0.45+0.55*k),0,7);ctx.stroke();}else{ctx.globalAlpha=0.34;ctx.fillStyle='#ff7a3c';ctx.beginPath();ctx.arc(hx,hy,h.r,0,7);ctx.fill();ctx.globalAlpha=0.6;ctx.strokeStyle='#ffb060';ctx.lineWidth=2;ctx.stroke();}ctx.restore();}
 // гемы
 for(const g of ACTIVE.gems){const s=Math.min(1,(g.pop||0)*6),bob=Math.sin(time*4+g.x*0.05)*2;ctx.save();ctx.translate(g.x-cam.x,g.y-cam.y-6+bob);ctx.scale(s,s);ctx.shadowColor=g.col;ctx.shadowBlur=10;ctx.fillStyle=g.col;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,0);ctx.lineTo(0,6);ctx.lineTo(-4,0);ctx.closePath();ctx.fill();ctx.restore();}
 // ВРАГИ с правильным AI визуалом
 const visR=Math.max(W,H)*0.6,visR2=visR*visR;
 for(const e of enemies){
  if(warpOn&&!isExplored(e.x,e.y)&&dist2(e.x-P.x,e.y-P.y)>visR2)continue;
  // CULLING: cam = левый-верхний угол, мерить надо от ЦЕНТРА камеры
  // (раньше было Math.abs(e.x-cam.x)>W/2+50 — ломалось, т.к. cam это угол, не центр)
  // ИСПРАВЛЕНО: динамический отступ. У босса drawH=172, у элиты 138 — с жесткими 60px
  // половина их туши "схлопывалась" на краю экрана. Теперь margin = размер спрайта.
  const cullMargin=Math.max(60,e.drawH||60);
  if(Math.abs(e.x-(cam.x+W/2))>W/2+cullMargin||Math.abs(e.y-(cam.y+H/2))>H/2+cullMargin)continue;
  const x=e.x-cam.x,y=e.y-cam.y;
  const flip=(P.x-e.x)<0;
  shadow(x,y+e.r*0.3+e.drawH*0.14,e.drawH*0.30);
  if(e.elite||e.boss){const gc=e.boss?'rgba(200,90,255,':'rgba(120,255,140,';ctx.save();ctx.globalCompositeOperation='lighter';const gr=ctx.createRadialGradient(x,y-e.drawH*0.3,4,x,y-e.drawH*0.3,e.drawH*0.55);gr.addColorStop(0,gc+'0.30)');gr.addColorStop(1,gc+'0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y-e.drawH*0.3,e.drawH*0.55,0,7);ctx.fill();ctx.restore();}
  // Стандартный рендер врага — пропускаем во время spawn-эффекта
  if(e.spawnT<=0){
   if(!(e.frames&&drawSprite(e.frames,x,y+e.r*0.3,e.drawH,flip,e.at||0))){
    const sz=e.r*(e.size||1);
    ctx.beginPath();ctx.arc(x,y,sz,0,7);ctx.fillStyle=e.flash>0?'#fff':e.col;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='rgba(150,190,180,.55)';ctx.stroke();
    ctx.fillStyle=e.eye;ctx.beginPath();ctx.arc(x-sz*.3,y-sz*.15,sz*.16,0,7);ctx.arc(x+sz*.3,y-sz*.15,sz*.16,0,7);ctx.fill();
   }
  }
  if(e.hit>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=e.hit*4;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x,y-e.drawH*0.28,e.drawH*0.16,e.drawH*0.26,0,0,7);ctx.fill();ctx.restore();}
  if(e.frozen>0){ctx.save();ctx.globalAlpha=0.4;ctx.fillStyle='#bfe0ff';ctx.beginPath();ctx.arc(x,y-e.drawH*0.3,e.drawH*0.2,0,7);ctx.fill();ctx.restore();}
  if(e.poisoned>0){ctx.save();ctx.globalAlpha=0.5;ctx.fillStyle='#9ac06a';ctx.beginPath();ctx.arc(x,y-e.drawH*0.3+10,e.drawH*0.12,0,7);ctx.fill();ctx.restore();}
  // СПАВН-EFFECT: враг проявляется из тумана медленно и заметно
  if(e.spawnT>0){
   const sa=1-e.spawnT/2.5; // 0→1 за 2.5 сек
   // 1) Внешний пульсирующий круг тумана — виден издалека, яркий сначала
   ctx.save();
   const ringPulse=0.6+0.4*Math.sin(time*6);
   ctx.globalAlpha=(1-sa)*0.5*ringPulse;
   ctx.strokeStyle='#7fb04a';
   ctx.lineWidth=3;
   ctx.shadowColor='#9ac06a';
   ctx.shadowBlur=10;
   ctx.beginPath();
   ctx.ellipse(x,y+e.r*0.5,e.r*3.2*(0.7+0.3*sa),e.r*1.4*(0.7+0.3*sa),0,0,7);
   ctx.stroke();
   ctx.restore();
   // 2) Внутренний зелёный туман под врагом
   ctx.save();
   ctx.globalAlpha=(1-sa)*0.6+0.1;
   ctx.fillStyle='#3a4a2c';
   ctx.beginPath();
   ctx.ellipse(x,y+e.r*0.5,e.r*2*(0.5+0.5*sa),e.r*0.85*(0.5+0.5*sa),0,0,7);
   ctx.fill();
   ctx.restore();
   // 3) Враг проявляется полупрозрачным
   ctx.save();
   ctx.globalAlpha=sa*0.85;
   if(e.frames&&drawSprite(e.frames,x,y+e.r*0.3,e.drawH,flip,e.at||0)){
    // нарисовано
   }else{
    const sz=e.r*(e.size||1);
    ctx.beginPath();ctx.arc(x,y,sz,0,7);ctx.fillStyle=e.col;ctx.fill();
    ctx.fillStyle=e.eye;ctx.beginPath();ctx.arc(x-sz*.3,y-sz*.15,sz*.16,0,7);ctx.arc(x+sz*.3,y-sz*.15,sz*.16,0,7);ctx.fill();
   }
   ctx.restore();
   // 4) Вертикальные потоки "энергии" из земли (всё время fade-in)
   for(let i=0;i<3;i++){
    const a=time*4+i*2.1;
    const px2=x+Math.cos(a)*e.r*0.8;
    const py2=y-e.r*0.3+Math.sin(a*1.7)*e.r*0.3;
    ctx.save();
    ctx.globalAlpha=(1-sa)*0.4;
    ctx.fillStyle='#9ac06a';
    ctx.beginPath();
    ctx.arc(px2,py2,2,0,7);
    ctx.fill();
    ctx.restore();
   }
  }
 }
 // particles
 for(const p of ACTIVE.particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.c;ctx.fillRect(p.x-cam.x-1.5,p.y-cam.y-1.5,3,3);}ctx.globalAlpha=1;
 // flashes
 for(const f of ACTIVE.flashes){const k=1-f.t/f.max,r=(f.big?28:17)*(0.4+k);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=f.t/f.max;ctx.strokeStyle=f.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(f.x-cam.x,f.y-cam.y,r,0,7);ctx.stroke();ctx.globalAlpha=(f.t/f.max)*0.6;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(f.x-cam.x,f.y-cam.y,r*0.4,0,7);ctx.fill();ctx.restore();}
 // slashes
 // ИСПРАВЛЕНО: ищем меч по id, не по индексу [0] (Шаман не имеет меча на индексе 0)
 const _swordForSlash=weapons.find(w=>w.id==='sword');
 const _slashEvo=_swordForSlash&&_swordForSlash.evo;
 for(const s of slashes){ctx.save();ctx.translate(P.x-cam.x,P.y-cam.y);ctx.rotate(s.ang);ctx.globalAlpha=s.t/0.18*0.9;ctx.strokeStyle=_slashEvo?'#ffaa44':'#ffe6a0';ctx.lineWidth=_slashEvo?9:7;ctx.beginPath();ctx.arc(0,0,s.reach*0.8,-0.8,0.8);ctx.stroke();ctx.restore();}
 // bolts
 for(const b of bolts){ctx.save();ctx.globalAlpha=b.t/0.18;ctx.strokeStyle='#bfe0ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-cam.x,b.y-cam.y-40);ctx.lineTo(b.x-cam.x,b.y-cam.y);ctx.stroke();ctx.shadowColor='#8fd0ff';ctx.shadowBlur=12;ctx.stroke();ctx.restore();}
 // orbit
 if(hasOrbit){for(let i=0;i<orbCount;i++){const a=orbAngle+i*(Math.PI*2/orbCount);const ox=P.x+Math.cos(a)*70-cam.x,oy=P.y+Math.sin(a)*70-cam.y;ctx.fillStyle='#2a2233';ctx.strokeStyle='#7a5aa0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(ox,oy,9,0,7);ctx.fill();ctx.stroke();}}
 // player
 const hset=P.atk>0?HERO.atk:(P.moving?HERO.walk:HERO.idle);
 if(frost.on){const R=frostR;ctx.save();ctx.globalAlpha=.15;ctx.fillStyle='#bfe0ff';ctx.beginPath();ctx.arc(px,py-6,R,0,7);ctx.fill();ctx.restore();}
 if(thorn.on){const R=thornR;ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle='#7fb04a';ctx.lineWidth=3;ctx.setLineDash([6,9]);ctx.beginPath();ctx.arc(px,py-6,R,0,7);ctx.stroke();ctx.restore();}
 shadow(px,py+P.r*0.3+68*0.14,26);
 const hg=ctx.createRadialGradient(px,py-14,3,px,py-14,52);hg.addColorStop(0,'rgba(255,205,110,.30)');hg.addColorStop(1,'rgba(255,205,110,0)');ctx.fillStyle=hg;ctx.beginPath();ctx.arc(px,py-14,52,0,7);ctx.fill();
 const _br=1+0.025*Math.sin(time*2.2),_pop=P.atk>0?1+0.09*Math.sin(Math.max(0,Math.min(1,1-P.atk/0.28))*Math.PI):1;if(!drawSprite(hset,px,py+P.r*0.3,68*_br*_pop,P.fx<0,P.animT)){
  ctx.beginPath();ctx.arc(px,py,P.r,0,7);ctx.fillStyle='#6b5a3a';ctx.fill();ctx.lineWidth=3.5;ctx.strokeStyle='#ffcf6a';ctx.stroke();
  ctx.fillStyle='#c9a04a';ctx.beginPath();ctx.arc(px+P.fx*10,py+P.fy*10,5,0,7);ctx.fill();}
 // damage numbers
 ctx.font='bold 13px system-ui';ctx.textAlign='center';
 for(const t of ACTIVE.dmgTexts){ctx.globalAlpha=Math.min(1,t.t*2);ctx.fillStyle=t.color;const size=t.crit?'bold 16px':'bold 13px';ctx.font=size;ctx.fillText(t.v,t.x-cam.x,t.y-cam.y);}ctx.globalAlpha=1;ctx.font='bold 13px system-ui';
 // спец-индикатор
 if(specialCharge>=specialMax){
  ctx.save();ctx.globalAlpha=0.4+0.4*Math.sin(time*4);ctx.strokeStyle='#b478ff';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(px,py-6,24+Math.sin(time*6)*2,0,7);ctx.stroke();ctx.restore();
 }
 // туман войны
 if(warpOn){
  const fogSize=EXPLORED_CELL*1.4;
  for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){
   const ccx=Math.floor(P.x/EXPLORED_CELL)+dx,ccy=Math.floor(P.y/EXPLORED_CELL)+dy;
   if(isExplored(ccx*EXPLORED_CELL,ccy*EXPLORED_CELL))continue;
   const sx=ccx*EXPLORED_CELL-cam.x,sy=ccy*EXPLORED_CELL-cam.y;
   if(Math.abs(sx-px)>W/2+200||Math.abs(sy-py)>H/2+200)continue;
   const distToP=Math.hypot(sx-px,sy-py);
   if(distToP>900)continue;
   const alpha=Math.max(0,Math.min(0.85,1-distToP/700));
   ctx.fillStyle=`rgba(8,12,6,${alpha})`;
   ctx.fillRect(sx-fogSize/2,sy-fogSize/2,fogSize,fogSize);
  }
 }
 ctx.restore();
 // ambient
 const fg=ctx.createLinearGradient(0,0,0,H);fg.addColorStop(0,'rgba(30,40,34,.22)');fg.addColorStop(.5,'rgba(20,28,24,0)');fg.addColorStop(1,'rgba(14,20,16,.28)');ctx.fillStyle=fg;ctx.fillRect(0,0,W,H);
 if(theme!=='winter'){
  // motes — 28 drawImage вместо 28 arc (быстрее)
 for(const m of motes){const mx=((m.x+Math.sin(time*0.2+m.ph)*30)%W+W)%W,my=((m.y-time*m.sp)%H+H)%H;if(mx<0||mx>W||my<0||my>H)continue;const al=0.12+0.14*Math.sin(time*2+m.ph);ctx.globalAlpha=Math.max(0,al);ctx.drawImage(_moteCanv,mx-2,my-2);}ctx.globalAlpha=1;
  for(const f of fireflies){const fx=((f.x+Math.sin(time*0.5+f.ph)*40)%W+W)%W,fy=((f.y+Math.cos(time*0.4+f.ph)*30)%H+H)%H;if(fx<0||fx>W||fy<0||fy>H)continue;const al=0.3+0.4*Math.sin(time*3+f.ph);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.max(0,al);ctx.drawImage(_fireflyCanv,fx-3,fy-3);ctx.restore();}ctx.globalAlpha=1;
 }else{
  for(let i=0;i<20;i++){const x=(time*20+i*73)%W,y=(time*30+i*97)%H;ctx.fillStyle='rgba(220,230,240,0.6)';ctx.fillRect(x,y,2,2);}
 }
 for(const l of leaves){if(theme==='winter')break;const lx=((l.x+Math.sin(time*0.3+l.ph)*50+time*6)%W+W)%W,ly=((l.y+time*l.sp)%H+H)%H;if(lx<-20||lx>W+20||ly<-20||ly>H+20)continue;ctx.save();ctx.translate(lx,ly);ctx.rotate(l.rot+time*0.6);ctx.globalAlpha=.5;ctx.drawImage(_leafCanv,-6,-2.5);ctx.restore();}ctx.globalAlpha=1;
 const vg=ctx.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.85);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
 // HUD sync — кэшированные ссылки
 UI.timeEl.textContent=fmt(time);
 UI.lvlEl.textContent=level;
 UI.killsEl.textContent=kills;
 UI.goldEl.textContent=gold;
 UI.hp.style.width=Math.max(0,P.hp/P.maxhp*100)+'%';
 if(P.hp/P.maxhp<0.3)UI.hp.classList.add('hp-low');else UI.hp.classList.remove('hp-low');
 UI.hpNum.textContent=Math.max(0,Math.round(P.hp));
 UI.hpText.textContent=Math.max(0,Math.round(P.hp))+'/'+P.maxhp;
 UI.xpFill.style.width=(xp/xpNext*100)+'%';
 UI.weaponsEl.innerHTML='';
 for(const w of weapons){
  const el=document.createElement('span');
  el.className='wicon'+(w.evo?' evo':'');
  el.innerHTML=(w.id==='sword'?'⚔':'⚡')+`<span class="lvl">${w.id==='sword'?swordLvl:boltLvl}</span>`;
  UI.weaponsEl.appendChild(el);
 }
 if(bossSpawned){UI.bosseft.style.display='none';}else{UI.bosseft.style.display='';UI.bosstimer.textContent=fmt(Math.max(0,bossT-time));}
 if(bossE&&!bossE.dead)UI.bosshp.style.width=Math.max(0,bossE.hp/bossE.maxhp*100)+'%';
 for(const a of anomalies){
  if(a.domEl&&!a.claimed){
   a.domEl.style.left=(a.x-cam.x-16)+'px';
   a.domEl.style.top=(a.y-cam.y-16)+'px';
  }
 }
  // Отладка: показать FPS в углу (вызывается из frame() с throttle 5 FPS, см. выше)
  if(!window.__fpsLast)window.__fpsLast=performance.now();
  if(!window.__fpsCount)window.__fpsCount=0;
  window.__fpsCount++;
  if(performance.now()-window.__fpsLast>1000){
   const fps=window.__fpsCount;
   window.__fpsCount=0;window.__fpsLast=performance.now();
   const el=document.getElementById('fpsDebug');
   if(!el){
    const d=document.createElement('div');
    d.id='fpsDebug';d.style.cssText='position:fixed;top:90px;right:6px;background:rgba(0,0,0,.7);color:#0f0;padding:2px 6px;font-size:10px;z-index:100;font-family:monospace;border-radius:2px';
    document.body.appendChild(d);
   }
   document.getElementById('fpsDebug').textContent=fps+'fps t='+time.toFixed(0)+'s e='+enemies.length;
  }
  const dt=performance.now()-frameStart;
 if(dt>20)partMul=Math.max(0.3,partMul*0.9);
function drawMinimap(){
 if(currentCurse==='blind')return;
 const mm=miniCv.parentElement;
 const mw=mm.clientWidth,mh=mm.clientHeight;
 miniCtx.fillStyle='rgba(10,14,8,.75)';
 miniCtx.fillRect(0,0,mw,mh);
 const scale=Math.min(mw/W,mh/H)*0.6;
 const cx=mw/2,cy=mh/2;
 for(const g of ACTIVE.gems){miniCtx.fillStyle=g.col;miniCtx.fillRect(cx+(g.x-P.x)*scale-1,cy+(g.y-P.y)*scale-1,2,2);}
 for(const e of enemies){
  if(dist2(e.x-P.x,e.y-P.y)>2250000)continue; // 1500^2
  miniCtx.fillStyle=e.boss?'#c95a3c':e.elite?'#b478ff':'#5a4030';
  miniCtx.beginPath();miniCtx.arc(cx+(e.x-P.x)*scale,cy+(e.y-P.y)*scale,e.boss?3:1.5,0,7);miniCtx.fill();
 }
 for(const a of anomalies){miniCtx.fillStyle='#ffcf6a';miniCtx.beginPath();miniCtx.arc(cx+(a.x-P.x)*scale,cy+(a.y-P.y)*scale,2.5,0,7);miniCtx.fill();}
 miniCtx.fillStyle='#ffcf6a';
 miniCtx.beginPath();miniCtx.arc(cx,cy,3,0,7);miniCtx.fill();
}

// ============================================================
//  LOOP — setInterval гарантирует работу даже при тротлинге rAF
// ============================================================
let last=performance.now(),acc=0,loopStarted=false,lastDraw=0,miniTimer=0;
function frame(now){
 try{
  const d=(now-last)/1000;last=now;
  acc+=Math.min(d,0.1);
  let steps=0;
  while(acc>=1/60&&steps<5){
   if(hitstop>0){hitstop-=1/60;acc-=1/60;}
   else{update(1/60);acc-=1/60;}
   steps++;
  }
  if(acc>1/60)acc=0;
  // FPS CAP: пропускаем draw() если не прошло достаточно времени
  // ИСПРАВЛЕНО: fpsCap теперь реально работает.
  // - fpsCap=0 (∞): рисуем каждый кадр (макс FPS)
  // - fpsCap=60: пропускаем draw если прошло < 16.6мс с прошлой отрисовки
  // - fpsCap=30: пропускаем draw если прошло < 33.3мс (экономия батареи)
  // update() всё равно зовётся на 60Hz (физика не тормозит),
  // только визуал капается до целевого FPS.
  if(fpsCap>0){
   // ИСПРАВЛЕНО: Плавный FPS Cap с компенсацией дрейфа кадров.
   // Раньше lastDraw=now был сразу — при дрифте таймера кадры «съезжали»,
   // и в среднем FPS был ниже целевого. Теперь lastDraw корректируется
   // на (now-lastDraw)%targetDt — это выравнивает кадры по сетке targetDt.
   const targetDt=1000/fpsCap;
   if(now-lastDraw<targetDt){
    requestAnimationFrame(frame);
    return;
   }
   lastDraw=now-(now-lastDraw)%targetDt;
  }else{
   lastDraw=now;
  }
  draw();
  // МИНИКАРТА: не нужно 60 FPS, 5 FPS (раз в 0.2с) достаточно.
  // Экономит: ~55 циклов drawMinimap() в секунду.
  // На полноэкранной миникарте 100×100 это копейки, но на слабых телефонах заметно.
  if(now-miniTimer>200){
   drawMinimap();
   miniTimer=now;
  }
 }catch(e){
  console.error('FRAME:',e);
  paused=false;
 }
 // Рекурсивный rAF — синхронизация с V-Sync монитора, нет tearing на 60/120Hz.
 // Если tab в фоне, Chrome тротлит rAF до 1Hz (setInterval тоже тротлится).
 requestAnimationFrame(frame);
}
// Запускаем loop на первом user input (tap/click/keypress)
// Chrome тротлит setInterval/rAF в фоновых вкладках/iframe — но rAF даёт V-Sync
function startLoop(){
 if(loopStarted)return;
 loopStarted=true;
 console.log('Loop started by user input');
 // Рекурсивный rAF — V-Sync с монитором, нет tearing.
 // Если tab уходит в фон, rAF тротлится Chrome, но игра не падает.
 lastDraw=performance.now();
 requestAnimationFrame(frame);
}
// Сразу пытаемся запустить (сработает если tab в фокусе)
setTimeout(()=>{if(!loopStarted){startLoop();}},50);
// Запускаем на любом user input
addEventListener('touchstart',()=>startLoop(),{passive:true});
addEventListener('pointerdown',()=>startLoop(),{passive:true});
addEventListener('keydown',()=>startLoop(),{passive:true});
addEventListener('click',()=>startLoop(),{passive:true});
// Также подписываемся на visibility — когда tab становится видимым
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden)startLoop();
});
// Дополнительный watchdog: если loop не запущен, запустить через 1с
setTimeout(()=>{if(!loopStarted)startLoop();},1000);

// ============================================================
//  СТАРТ — сразу в бой (без меню)
// ============================================================
try{
 // СБРОС ВСЕХ ФЛАГОВ ДЛЯ ЧИСТОГО ТЕСТА
 // (localStorage может хранить битые значения от прошлых версий)
 try{localStorage.removeItem('cl_tutdone');}catch(e){}
 try{localStorage.removeItem('cl_perks');}catch(e){}
 try{localStorage.removeItem('cl_tree');}catch(e){}
 try{localStorage.removeItem('cl_ach');}catch(e){}
 try{localStorage.removeItem('cl_stats');}catch(e){}
 currentClass='warrior';
 classChosen=true;
 boonShown=true; // не показывать выбор божества
 currentBoon=null;
 P.maxhp=100;P.hp=100;P.x=WORLD/2;P.y=WORLD/2;
 paused=false;
 enemies=[];
 // СПАВН ПЕРВОГО ВРАГА СРАЗУ (синхронно, до requestAnimationFrame)
 // Стартует ЗА пределами экрана, с fade-in эффектом (spawnT:2.5)
 // От центра камеры, чтобы при упоре камеры в край мира не появлялся в центре
 // ВАЖНО: cam={x:0,y:0} в этот момент — update() ещё не вызывался. Используем
 // запланированный центр камеры = стартовые координаты игрока (1000,1000).
 const cx0=1000,cy0=1000;
 const a0=randomVisual()*Math.PI*2;
 const dist0=Math.max(W,H)/2+rnd(100,250);
 let sx0=cx0+Math.cos(a0)*dist0,sy0=cy0+Math.sin(a0)*dist0;
 // Проверяем что в пределах мира; если нет — зажимаем в мир (фоллбэк)
 sx0=clamp(sx0,0,WORLD);sy0=clamp(sy0,0,WORLD);
 const e0=ETYPES.rootling;
 enemies.push({...e0,x:sx0,y:sy0,hp:e0.hp*diffMul,maxhp:e0.hp*diffMul,type:'rootling',flash:0,kx:0,ky:0,at:0,slow:1,hitT:0,wasInRange:false,boltT:0,frozen:0,poisoned:0,zigzag:a0,zigzagT:0,ai:e0.ai,dmgMod:e0.dmgMod,fireT:0,spawnT:2.5,warnT:1.5});
 console.log('Init: first enemy at', sx0, sy0, 'player at', P.x, P.y);
