/* ============================================================
   DATA
   ============================================================ */
const GRADS = {
  pink:   'linear-gradient(135deg,#FF8A8A,#C9468B 60%,#7A3FA0)',
  teal:   'linear-gradient(135deg,#2DD4BF,#2A7A8A 70%,#1E5A66)',
  warm:   'linear-gradient(135deg,#FFB36B,#E8635B 70%,#B0394F)',
  violet: 'linear-gradient(135deg,#9A7BF0,#5A6BE0 60%,#3A4FB0)',
  green:  'linear-gradient(135deg,#5BD6A0,#10B981 70%,#0E7C5A)'
};

const IDEAS = [
  { pillar: 'Education', title: 'The 10-minute mobility reset', desc: 'A save-worthy carousel of 5 desk-recovery moves members can do between meetings — gentle, doable, on-brand calm.', tags: ['Carousel','Reel-ready','High save-rate'], grad: 'teal' },
  { pillar: 'Community', title: 'Member spotlight: Dion, 6 months in', desc: "Quiet-confidence transformation story. Real member, real words, no before/after shame — just consistency and a coach who showed up.", tags: ['UGC','Testimonial','Founder-loved'], grad: 'warm' },
  { pillar: 'Launch', title: 'Sunrise Flow — book your mat', desc: 'New 6am vinyasa block. Lead with the feeling of an empty studio at first light, not the schedule grid.', tags: ['Announcement','Stories','CTA'], grad: 'violet' },
  { pillar: 'Coach', title: 'Meet Coach Maya · 60-sec reel', desc: "Talking-head intro that leads with her training philosophy, not her credentials. Warm, unhurried, human.", tags: ['Reel','Trust','Face-led'], grad: 'pink' },
  { pillar: 'Behind the scenes', title: 'Why we program in 6-week blocks', desc: 'A short explainer that turns your method into a reason to trust the studio. Positions Horizon as thoughtful, not hardcore.', tags: ['Education','Authority','Thread'], grad: 'green' }
];

const POSTS = [
  { plat:'ig', status:'pending', time:'12m ago', title:'Sunrise Flow launch — main grid post', caption:"There's a particular quiet to a studio at 5:58am — mats down, lights low, the city still asleep. Sunrise Flow starts Monday. 45 minutes of slow vinyasa to meet the day on your terms. Limited to 14 mats.", tags:'#SunriseFlow #BoutiqueFitness #MorningRitual', grad:'violet', ai:true },
  { plat:'ig', status:'pending', time:'31m ago', title:'Mobility reset carousel (slide 1 caption)', caption:'Save this for your next 3pm slump. Five moves, ten minutes, zero equipment — the reset your spine has been asking for. Swipe through, then come move with us. →', tags:'#MobilityMatters #DeskReset #HorizonFitness', grad:'teal', ai:true },
  { plat:'li', status:'pending', time:'1h ago', title:"We're hiring: Front-desk lead", caption:"The first face our members see matters more than any piece of equipment. We're looking for a front-desk lead who treats a 6am check-in like it's the most important moment of someone's day. Boutique studio, real benefits, a team that means it.", tags:'#Hiring #BoutiqueFitness #CommunityFirst', grad:'teal', ai:false },
  { plat:'fb', status:'pending', time:'2h ago', title:'Member spotlight: Dion', caption:"Six months ago Dion booked a single trial class and almost didn't come back. This week he hit his 50th session. No dramatic before/after — just a quieter kind of strong. Proud of you, Dion. 🤍", tags:'#MemberSpotlight #Consistency', grad:'warm', ai:true },
  { plat:'ig', status:'scheduled', time:'out 4:30pm', title:'Coach Maya intro reel', caption:'"I don\'t train people to punish their bodies. I train them to trust them." Meet Coach Maya — leading our new Strong & Steady block from July.', tags:'#MeetTheCoach #StrengthTraining', grad:'pink', ai:true },
  { plat:'li', status:'scheduled', time:'out Wed 9am', title:'Why we program in 6-week blocks', caption:'Most studios sell classes. We build programs. Here\'s the thinking behind our 6-week blocks — and why progressive overload beats a packed class schedule every time.', tags:'#TrainingPhilosophy #FitnessBusiness', grad:'green', ai:false },
  { plat:'ig', status:'published', time:'yesterday', title:'Saturday community run recap', caption:'42 of you showed up before sunrise on a Saturday. That\'s not a fitness class, that\'s a community. Same time next week. ☀️', tags:'#CommunityRun #HorizonFitness', grad:'warm', ai:false }
];

const PLAT_LABEL = { ig:'Instagram', li:'LinkedIn', fb:'Facebook', yt:'YouTube' };
const PLAT_TAGCLASS = { ig:'tag-ig', li:'tag-li', fb:'tag-fb', yt:'tag-yt' };
const PLAT_ICONCLASS = { ig:'plat-ig', li:'plat-li', fb:'plat-fb', yt:'plat-yt' };
const STATUS_LABEL = { pending:'Pending approval', scheduled:'Scheduled', published:'Published', approved:'Approved' };

const PLAT_SVG = {
  ig:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  li:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21H18.6v-5.4c0-1.3 0-2.95-1.8-2.95s-2.08 1.4-2.08 2.85V21H10z"/></svg>',
  fb:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.45 2.9h-2.35v7A10 10 0 0 0 22 12z"/></svg>',
  yt:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.5a3 3 0 0 0-2.1-2.1C19 4.9 12 4.9 12 4.9s-7 0-8.9.5A3 3 0 0 0 1 7.5 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.5a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23.5 12 31 31 0 0 0 23 7.5zM9.8 15.3V8.7l5.7 3.3z"/></svg>'
};

/* ============================================================
   TOKEN DEFINITIONS (for the drawer)
   ============================================================ */
const TOKENS = {
  aurora: { name:'Obsidian Aurora', lines:[
    ['/* canvas — near-black navy, darker than stock */',0],
    ['--color-canvas','#070D17'],['--color-surface','#0F1A2B'],['--color-surface-2','#16243A'],
    ['--color-border','#1E3047'],
    ['/* text */',0],['--color-text','#E9F1F8'],['--color-text-muted','#7C92A8'],['--color-text-strong','#FFFFFF'],
    ['/* accent — workhorse teal */',0],['--color-accent','#3A9AAA'],['--color-accent-bright','#54C5D4'],['--color-accent-deep','#1E5A66'],['--color-gold','#C9A84C'],
    ['/* AI moments only — holographic */',0],['--gradient-ai','linear-gradient(115deg,#2DD4BF,#4F8DF5,#9A7BF0,#C9A84C)'],
    ['/* type */',0],['--font-display',"'Sora', sans-serif"],['--font-body',"'Sora', sans-serif"],['--font-mono',"'DM Mono', monospace"],
    ['/* radius */',0],['--radius-sm','10px'],['--radius-md','14px'],['--radius-lg','18px'],['--radius-xl','26px'],
  ]},
  daylight: { name:'Studio Daylight', lines:[
    ['/* canvas — warm cream, soft-light studio */',0],
    ['--color-canvas','#F4EEE6'],['--color-surface','#FFFFFF'],['--color-surface-2','#F6F0E8'],
    ['--color-border','#E7DCCD'],
    ['/* text — navy ink on cream */',0],['--color-text','#2A3340'],['--color-text-muted','#8B8478'],['--color-text-strong','#15202E'],
    ['/* accent — teal + warm gold */',0],['--color-accent','#2A7A8A'],['--color-accent-bright','#2F8C9E'],['--color-accent-deep','#1E5A66'],['--color-gold','#B8923A'],
    ['/* AI moments — pastel aurora */',0],['--gradient-ai','linear-gradient(115deg,#FFD3B6,#E7D2FF,#BFE9DC,#FBE3A8)'],
    ['/* type */',0],['--font-display',"'Sora', sans-serif"],['--font-body',"'Sora', sans-serif"],['--font-mono',"'DM Mono', monospace"],
    ['/* radius — soft & generous */',0],['--radius-sm','12px'],['--radius-md','16px'],['--radius-lg','22px'],['--radius-xl','30px'],
  ]},
  noir: { name:'Editorial Noir', lines:[
    ['/* canvas — deep navy, gallery-dark */',0],
    ['--color-canvas','#0C121C'],['--color-surface','#131C29'],['--color-surface-2','#1A2533'],
    ['--color-border','#2A3849'],
    ['/* text — warm cream */',0],['--color-text','#EFEADD'],['--color-text-muted','#97A0A8'],['--color-text-strong','#FFFFFF'],
    ['/* accent — gold-led, teal support */',0],['--color-accent','#C9A84C'],['--color-accent-bright','#E0C56A'],['--color-accent-deep','#8A7227'],['--color-teal','#3A9AAA'],
    ['/* AI moments — gold→teal */',0],['--gradient-ai','linear-gradient(115deg,#E0C56A,#C9A84C,#3A9AAA,#54C5D4)'],
    ['/* type — editorial serif display */',0],['--font-display',"'Playfair Display', serif"],['--font-body',"'Sora', sans-serif"],['--font-mono',"'DM Mono', monospace"],
    ['/* radius — tight & editorial */',0],['--radius-sm','4px'],['--radius-md','7px'],['--radius-lg','10px'],['--radius-xl','14px'],
  ]},
  vapor: { name:'Frosted Vapor · Dark', lines:[
    ['/* canvas — navy under colored aurora blobs */',0],
    ['--color-canvas','#0A1322'],['--color-surface','rgba(255,255,255,0.055)'],['--color-surface-2','rgba(255,255,255,0.085)'],
    ['--color-border','rgba(255,255,255,0.14)'],
    ['/* text */',0],['--color-text','#EAF2FB'],['--color-text-muted','#A2B4C8'],['--color-text-strong','#FFFFFF'],
    ['/* accent — luminous teal through glass */',0],['--color-accent','#5FD0DE'],['--color-accent-bright','#7EE4F0'],['--color-accent-deep','#2A7A8A'],['--color-gold','#E6CE84'],
    ['/* AI moments — iridescent */',0],['--gradient-ai','linear-gradient(115deg,#5FE0D0,#5AA8FF,#B79CF5,#E6CE84)'],
    ['/* glass */',0],['--backdrop','saturate(160%) blur(22px)'],
    ['/* type */',0],['--font-display',"'Sora', sans-serif"],['--font-body',"'Sora', sans-serif"],['--font-mono',"'DM Mono', monospace"],
    ['/* radius */',0],['--radius-sm','12px'],['--radius-md','18px'],['--radius-lg','24px'],['--radius-xl','32px'],
  ]},
  opal: { name:'Frosted Vapor · Light', lines:[
    ['/* canvas — light, frosted glass over pastel aurora */',0],
    ['--color-canvas','#E7EDF6'],['--color-surface','rgba(255,255,255,0.62)'],['--color-surface-2','rgba(255,255,255,0.82)'],
    ['--color-border','rgba(120,140,175,0.26)'],
    ['/* text — slate ink */',0],['--color-text','#233246'],['--color-text-muted','#6B7B90'],['--color-text-strong','#0E1B2C'],
    ['/* accent — teal, reads through glass */',0],['--color-accent','#2A7A8A'],['--color-accent-bright','#1F8EA3'],['--color-accent-deep','#1E5A66'],['--color-gold','#B8923A'],
    ['/* AI moments — bright pastel iridescence */',0],['--gradient-ai','linear-gradient(115deg,#8FE0E8,#8FB6FF,#C7B0FF,#FFD7B0)'],
    ['/* glass */',0],['--backdrop','saturate(150%) blur(20px)'],
    ['/* type */',0],['--font-display',"'Sora', sans-serif"],['--font-body',"'Sora', sans-serif"],['--font-mono',"'DM Mono', monospace"],
    ['/* radius */',0],['--radius-sm','12px'],['--radius-md','18px'],['--radius-lg','24px'],['--radius-xl','32px'],
  ]},
  porcelain: { name:'Porcelain Sky', lines:[
    ['/* canvas — cool crisp porcelain */',0],
    ['--color-canvas','#F1F5FB'],['--color-surface','#FFFFFF'],['--color-surface-2','#EEF3FA'],
    ['--color-border','#E0E7F1'],
    ['/* text */',0],['--color-text','#1C2838'],['--color-text-muted','#76869B'],['--color-text-strong','#0B1626'],
    ['/* accent — teal on cool white */',0],['--color-accent','#2A7A8A'],['--color-accent-bright','#1F8EA3'],['--color-accent-deep','#1E5A66'],['--color-gold','#B8923A'],
    ['/* AI moments — cool iridescence */',0],['--gradient-ai','linear-gradient(115deg,#8ED7E6,#7FB4F2,#B6A6F2,#9EE6D2)'],
    ['/* type */',0],['--font-display',"'Sora', sans-serif"],['--font-body',"'Sora', sans-serif"],['--font-mono',"'DM Mono', monospace"],
    ['/* radius — crisp */',0],['--radius-sm','10px'],['--radius-md','14px'],['--radius-lg','18px'],['--radius-xl','26px'],
  ]}
};

/* ============================================================
   NAV MODEL (shared by sidebar / wheel / dock)
   ============================================================ */
const NAV = [
  { key:'home', label:'Home', screen:'home', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>' },
  { key:'brainstorm', label:'Brainstorm', screen:'brainstorm', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"></path></svg>' },
  { key:'campaigns', label:'Campaigns', screen:null, icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>' },
  { key:'queue', label:'Content Queue', screen:'queue', badge:'7', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>' },
  { key:'calendar', label:'Calendar', screen:null, icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' },
  { key:'analytics', label:'Analytics', screen:null, icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>' }
];
function renderDashApprovals() {
  const el = document.getElementById('dashApprovals');
  const pending = POSTS.filter(p => p.status === 'pending').slice(0,4);
  el.innerHTML = pending.map((p,i) => `
    <div class="appr-row" data-idx="${i}">
      <div class="plat-ic ${PLAT_ICONCLASS[p.plat]}">${PLAT_SVG[p.plat]}</div>
      <div class="appr-meta">
        <div class="appr-title">${p.title}</div>
        <div class="appr-sub">${PLAT_LABEL[p.plat]} · ${p.ai ? 'AI draft' : 'manual'} · ${p.time}</div>
      </div>
      <div class="appr-mini">
        <button class="icon-btn ok" title="Approve"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
        <button class="icon-btn no" title="Reject"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
    </div>`).join('');
  el.querySelectorAll('.icon-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const row = e.currentTarget.closest('.appr-row');
      row.style.transition = 'opacity 280ms, transform 280ms';
      row.style.opacity = '0';
      row.style.transform = 'translateX(24px)';
      setTimeout(() => row.remove(), 280);
    });
  });
}

/* ============================================================
   RENDER — queue
   ============================================================ */
let currentFilter = 'all';
function renderQueue() {
  const list = document.getElementById('queueList');
  const posts = POSTS.filter(p => currentFilter === 'all' ? true : p.status === currentFilter);
  if (!posts.length) { list.innerHTML = `<div class="deck-empty"><p>Nothing in this view. Clear queue — nicely done.</p></div>`; return; }
  list.innerHTML = posts.map(p => {
    const statusClass = 'tag-' + p.status;
    return `
    <article class="approval">
      <div class="approval-img"><div class="grad" style="background:${GRADS[p.grad]}"></div></div>
      <div class="approval-body">
        <div class="approval-chips">
          <span class="tag ${PLAT_TAGCLASS[p.plat]}">${PLAT_SVG[p.plat]} ${PLAT_LABEL[p.plat]}</span>
          <span class="tag ${statusClass}">${STATUS_LABEL[p.status]}</span>
          ${p.ai ? '<span class="tag" style="color:var(--accent-bright);border-color:var(--accent);background:var(--accent-tint)">✦ AI draft</span>' : '<span class="tag" style="border-style:dashed;color:var(--text-muted)">manual</span>'}
          <span class="tag-time">${p.time}</span>
        </div>
        <div class="approval-title">${p.title}</div>
        <div class="approval-caption">${p.caption}</div>
        <div class="approval-tags">${p.tags}</div>
        <div class="approval-actions">
          ${p.status === 'pending' ? `
            <button class="btn btn-approve btn-sm act-approve"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Approve</button>
            <button class="btn btn-danger btn-sm act-reject"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Reject</button>
          ` : ''}
          <button class="btn btn-ghost btn-sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"></path></svg> Edit</button>
          <button class="btn btn-ghost btn-sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Variation</button>
          <button class="btn btn-ghost btn-sm spacer" aria-label="More">···</button>
        </div>
      </div>
    </article>`;
  }).join('');

  list.querySelectorAll('.act-approve, .act-reject').forEach(btn => {
    btn.addEventListener('click', e => {
      const card = e.currentTarget.closest('.approval');
      card.classList.add('removing');
      setTimeout(() => { card.style.height = card.offsetHeight + 'px'; card.style.marginTop = '-14px'; card.remove(); }, 280);
    });
  });
}

document.getElementById('filters').addEventListener('click', e => {
  const f = e.target.closest('.filter'); if (!f) return;
  document.querySelectorAll('.filter').forEach(x => x.classList.remove('active'));
  f.classList.add('active');
  currentFilter = f.dataset.filter;
  renderQueue();
});

/* ============================================================
   SWIPE DECK
   ============================================================ */
let deckItems = [];
const deckEl = document.getElementById('deck');

function buildDeck() {
  deckItems = IDEAS.map((d,i) => ({ ...d, id: 'idea-' + i + '-' + Math.random().toString(36).slice(2,6) }));
  paintDeck();
}

function paintDeck() {
  const visible = deckItems.slice(0, 3);
  deckEl.innerHTML = '';
  if (!deckItems.length) {
    deckEl.innerHTML = `
      <div class="deck-empty">
        <div class="e-orb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"></path></svg></div>
        <h3>Deck cleared</h3>
        <p>Your liked ideas are queued for drafting and saved ones moved to campaigns. Want a fresh batch?</p>
        <button class="btn btn-ai" onclick="buildDeck()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Generate 5 more</button>
      </div>`;
    document.getElementById('deckControls').style.display = 'none';
    updateDeckCounter();
    return;
  }
  document.getElementById('deckControls').style.display = 'flex';
  visible.reverse().forEach((item) => {
    const realIndex = deckItems.indexOf(item);
    const card = document.createElement('div');
    card.className = 'idea-card';
    card.dataset.id = item.id;
    const scale = 1 - realIndex * 0.045;
    const ty = realIndex * 14;
    card.style.transform = `translateY(${ty}px) scale(${scale})`;
    card.style.opacity = realIndex >= 3 ? '0' : (1 - realIndex * 0.12);
    card.style.zIndex = 30 - realIndex;
    card.innerHTML = `
      <div class="idea-top" style="display:flex;flex-direction:column;height:100%">
        <div class="idea-img">
          <div class="grad" style="background:${GRADS[item.grad]}"></div>
          <span class="pillar">${item.pillar}</span>
          <span class="aibadge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"></path></svg> AI idea</span>
        </div>
        <div class="idea-body">
          <div class="idea-title">${item.title}</div>
          <div class="idea-desc">${item.desc}</div>
          <div class="idea-foot">${item.tags.map(t => `<span class="chip">${t}</span>`).join('')}</div>
        </div>
      </div>
      <div class="stamp like">LIKE</div>
      <div class="stamp pass">PASS</div>
      <div class="stamp save">SAVE</div>`;
    deckEl.appendChild(card);
  });
  attachDrag(deckEl.querySelector('.idea-card[style*="z-index: 30"], .idea-card:last-child'));
  // top card is the last appended with highest z-index
  const top = [...deckEl.querySelectorAll('.idea-card')].reduce((a,b) => (+b.style.zIndex > +a.style.zIndex ? b : a));
  attachDrag(top);
  updateDeckCounter();
}

function updateDeckCounter() {
  const n = deckItems.length;
  document.getElementById('deckCounter').textContent = n ? `${n} idea${n===1?'':'s'} left · drag, or use the buttons / ← ↑ →` : 'Deck empty';
  document.getElementById('deckTag').textContent = n ? `${n} AI idea${n===1?'':'s'} in the deck` : 'deck cleared';
}

let drag = null;
function attachDrag(card) {
  if (!card || card._wired) return;
  card._wired = true;
  const top = card.querySelector('.idea-top');
  const like = card.querySelector('.stamp.like');
  const pass = card.querySelector('.stamp.pass');
  const save = card.querySelector('.stamp.save');

  const onDown = (e) => {
    drag = { card, startX: (e.touches?e.touches[0].clientX:e.clientX), startY: (e.touches?e.touches[0].clientY:e.clientY), dx:0, dy:0 };
    card.classList.add('dragging');
  };
  const onMove = (e) => {
    if (!drag || drag.card !== card) return;
    const cx = e.touches?e.touches[0].clientX:e.clientX;
    const cy = e.touches?e.touches[0].clientY:e.clientY;
    drag.dx = cx - drag.startX; drag.dy = cy - drag.startY;
    const rot = drag.dx / 16;
    card.style.transform = `translate(${drag.dx}px, ${drag.dy}px) rotate(${rot}deg)`;
    like.style.opacity = Math.max(0, Math.min(1, (drag.dx - 30)/90));
    pass.style.opacity = Math.max(0, Math.min(1, (-drag.dx - 30)/90));
    save.style.opacity = Math.max(0, Math.min(1, (-drag.dy - 30)/90));
    if (e.cancelable) e.preventDefault();
  };
  const onUp = () => {
    if (!drag || drag.card !== card) return;
    card.classList.remove('dragging');
    const { dx, dy } = drag;
    if (dy < -120 && Math.abs(dy) > Math.abs(dx)) commitSwipe('up');
    else if (dx > 120) commitSwipe('right');
    else if (dx < -120) commitSwipe('left');
    else {
      card.classList.add('snap');
      card.style.transform = card.style.transform.replace(/translate\([^)]*\) rotate\([^)]*\)/,'translateY(0) scale(1)');
      card.style.transform = 'translateY(0) scale(1)';
      like.style.opacity = pass.style.opacity = save.style.opacity = 0;
      setTimeout(() => card.classList.remove('snap'), 360);
    }
    drag = null;
  };
  top.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  top.addEventListener('touchstart', onDown, {passive:true});
  window.addEventListener('touchmove', onMove, {passive:false});
  window.addEventListener('touchend', onUp);
}

function commitSwipe(dir) {
  const cards = [...deckEl.querySelectorAll('.idea-card')];
  if (!cards.length) return;
  const top = cards.reduce((a,b) => (+b.style.zIndex > +a.style.zIndex ? b : a));
  top.classList.add('snap');
  const off = dir === 'right' ? 'translate(640px,-40px) rotate(18deg)' : dir === 'left' ? 'translate(-640px,-40px) rotate(-18deg)' : 'translate(0,-760px) rotate(-4deg)';
  top.style.transform = off; top.style.opacity = '0';
  setTimeout(() => { deckItems.shift(); paintDeck(); }, 300);
}

document.getElementById('deckControls').addEventListener('click', e => {
  const b = e.target.closest('.swipe-btn'); if (!b) return;
  commitSwipe(b.dataset.swipe);
});
window.addEventListener('keydown', e => {
  if (document.getElementById('screen-brainstorm').classList.contains('active')) {
    if (e.key === 'ArrowRight') commitSwipe('right');
    else if (e.key === 'ArrowLeft') commitSwipe('left');
    else if (e.key === 'ArrowUp') { e.preventDefault(); commitSwipe('up'); }
  }
});

/* ============================================================
   NAVIGATION (screens + sidebar / wheel / dock sync)
   ============================================================ */
function setActiveNav(key) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.nav === key));
  document.querySelectorAll('.mnav-item').forEach(n => n.classList.toggle('active', n.dataset.nav === key));
  document.querySelectorAll('.dock-item').forEach(n => n.classList.toggle('active', n.dataset.nav === key));
  document.querySelectorAll('.bar-item').forEach(n => n.classList.toggle('active', n.dataset.nav === key));
  const idx = NAV.findIndex(n => n.key === key);
  if (idx >= 0 && Math.round(wheelAngle) !== idx) setWheel(idx, true);
}
function go(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + screen).classList.add('active');
  setActiveNav(screen);
  document.getElementById('main').scrollTop = 0;
  try { localStorage.setItem('co-screen', screen); } catch(e) {}
}
document.addEventListener('click', e => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { e.preventDefault(); const t = nav.dataset.nav; if (['home','brainstorm','queue'].includes(t)) go(t); }
});

/* ---- SCROLL-WHEEL NAV ---- */
const wheelTrack = document.getElementById('wheelTrack');
const navWheel = document.getElementById('navWheel');
let wheelAngle = 0;
const WHEEL_STEP_DEG = 25, WHEEL_RADIUS = 138, WHEEL_VISIBLE = 2.4;

function buildWheel() {
  wheelTrack.innerHTML = NAV.map((n,i) =>
    `<div class="wheel-item" data-wheel="${i}">${n.icon}<span class="wheel-label">${n.label}</span>${n.badge?`<span class="wheel-badge">${n.badge}</span>`:''}</div>`
  ).join('');
  layoutWheel();
}
function layoutWheel() {
  const sel = Math.round(wheelAngle);
  [...wheelTrack.children].forEach((el,i) => {
    const d = i - wheelAngle, ad = Math.abs(d);
    el.style.transform = `rotateX(${-d * WHEEL_STEP_DEG}deg) translateZ(${WHEEL_RADIUS}px)`;
    el.style.opacity = ad > WHEEL_VISIBLE ? 0 : Math.max(0, 1 - ad * 0.3);
    el.style.pointerEvents = ad > WHEEL_VISIBLE ? 'none' : 'auto';
    el.classList.toggle('sel', i === sel);
  });
}
function setWheel(idx, silent) {
  idx = Math.max(0, Math.min(NAV.length - 1, idx));
  wheelAngle = idx;
  layoutWheel();
  if (!silent && NAV[idx].screen) go(NAV[idx].screen);
}
let wheelLock = 0;
navWheel.addEventListener('wheel', e => {
  e.preventDefault();
  const now = Date.now(); if (now - wheelLock < 140) return; wheelLock = now;
  setWheel(Math.round(wheelAngle) + (e.deltaY > 0 ? 1 : -1), false);
}, { passive: false });
let wdrag = null;
navWheel.addEventListener('pointerdown', e => {
  wdrag = { y: e.clientY, a: wheelAngle, moved: false };
  navWheel.classList.add('grabbing');
  navWheel.setPointerCapture(e.pointerId);
});
navWheel.addEventListener('pointermove', e => {
  if (!wdrag) return;
  const dy = e.clientY - wdrag.y;
  if (Math.abs(dy) > 3) wdrag.moved = true;
  wheelAngle = Math.max(-0.45, Math.min(NAV.length - 0.55, wdrag.a - dy / 52));
  layoutWheel();
});
function endWheelDrag() {
  if (!wdrag) return;
  const moved = wdrag.moved; wdrag = null;
  navWheel.classList.remove('grabbing');
  if (moved) setWheel(Math.round(wheelAngle), false);
}
navWheel.addEventListener('pointerup', endWheelDrag);
navWheel.addEventListener('pointercancel', endWheelDrag);
wheelTrack.addEventListener('click', e => {
  const it = e.target.closest('.wheel-item'); if (!it || (wdrag && wdrag.moved)) return;
  setWheel(+it.dataset.wheel, false);
});

/* ---- FLOATING DOCK ---- */
function buildDock() {
  const dock = document.getElementById('dock');
  dock.innerHTML =
    `<div class="dock-brand"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></div>
     <div class="dock-sep"></div>` +
    NAV.map(n => `<button class="dock-item" data-nav="${n.screen||''}">${n.icon}<span class="dock-tip">${n.label}</span>${n.badge?`<span class="dock-count">${n.badge}</span>`:''}</button>`).join('') +
    `<div class="dock-sep"></div>
     <button class="dock-client" title="Horizon Fitness"><span class="client-avatar">HF</span></button>`;
}

/* ---- FULL-WIDTH BAR (top / bottom) ---- */
function buildBar() {
  const bar = document.getElementById('barNav');
  bar.innerHTML =
    `<div class="bar-brand"><div class="bar-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></div><span class="bar-name">Content Operator</span></div>` +
    NAV.map(n => `<button class="bar-item" data-nav="${n.screen||''}">${n.icon}<span>${n.label}</span>${n.badge?`<span class="bar-count">${n.badge}</span>`:''}</button>`).join('') +
    `<div class="bar-spacer"></div>
     <div class="bar-client"><span class="client-avatar">HF</span><span><span class="bc-name">Horizon Fitness</span><br><span class="bc-tag">Boutique fitness</span></span></div>`;
}

/* ---- LAYOUT MODE ---- */
function setNav(mode) {
  document.body.setAttribute('data-nav', mode);
  document.querySelectorAll('.layout-btn').forEach(b => b.classList.toggle('active', b.dataset.layout === mode));
  if (mode === 'wheel') layoutWheel();
  try { localStorage.setItem('co-nav', mode); } catch(e) {}
}
/* ============================================================
   FROSTED VAPOR — light / dark mode toggle
   dark = Frosted Vapor, light = its frosted-glass light twin
   ============================================================ */
function setTheme(key) {
  document.body.setAttribute('data-theme', key);
  const vb = document.getElementById('vbMode'); if (vb) vb.textContent = key === 'opal' ? 'Light' : 'Dark';
  renderTokens(key);
  try { localStorage.setItem('co-theme', key); } catch(e) {}
}
function setMode(mode) { setTheme(mode === 'light' ? 'opal' : 'vapor'); try { localStorage.setItem('co-mode', mode); } catch(e) {} }
document.getElementById('modeToggle').addEventListener('click', () => {
  setMode(document.body.dataset.theme === 'opal' ? 'dark' : 'light');
});

/* ============================================================
   TOKENS DRAWER
   ============================================================ */
function renderTokens(key) {
  const t = TOKENS[key];
  document.getElementById('drawerTitle').textContent = t.name;
  const html = t.lines.map(([a,b]) => {
    if (b === 0) return `<span class="cmt">${a}</span>`;
    return `<span class="prop">${a}</span>: <span class="val">${b}</span>;`;
  }).join('\n');
  document.getElementById('tokenPre').innerHTML = html;
}
const scrim = document.getElementById('drawerScrim');
const drawer = document.getElementById('drawer');
function openDrawer() { scrim.classList.add('open'); drawer.classList.add('open'); }
function closeDrawer() { scrim.classList.remove('open'); drawer.classList.remove('open'); }
document.getElementById('tokensBtn').addEventListener('click', openDrawer);
document.getElementById('drawerClose').addEventListener('click', closeDrawer);
scrim.addEventListener('click', closeDrawer);
document.getElementById('copyTokens').addEventListener('click', e => {
  const key = document.body.getAttribute('data-theme');
  const text = TOKENS[key].lines.map(([a,b]) => b===0 ? a : `  ${a}: ${b};`).join('\n');
  const wrapped = '@theme {\n' + text + '\n}';
  navigator.clipboard?.writeText(wrapped).then(() => { e.target.textContent = 'Copied ✓'; setTimeout(() => e.target.textContent = 'Copy tokens', 1600); }).catch(() => {});
});

/* ============================================================
   INIT
   ============================================================ */
renderDashApprovals();
renderQueue();
buildDeck();
buildWheel();
buildDock();
buildBar();
let savedMode = 'dark';
try { savedMode = localStorage.getItem('co-mode') || 'dark'; } catch(e) {}
if (!['dark','light'].includes(savedMode)) savedMode = 'dark';
setMode(savedMode);
setNav('dock');
let savedScreen = 'home';
try { savedScreen = localStorage.getItem('co-screen') || 'home'; } catch(e) {}
if (!['home','brainstorm','queue'].includes(savedScreen)) savedScreen = 'home';
go(savedScreen);