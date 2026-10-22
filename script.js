const WORDS = {
  "Animaux": ["ÉCUREUIL","HIPPOPOTAME","GIRAFE","PAPILLON","CROCODILE","HÉRISSON","KANGOUROU","PINGOUIN","RHINOCÉROS","CHAUVE-SOURIS","LIBELLULE","ESCARGOT","DAUPHIN","MÉDUSE","SANGLIER","FLAMANT ROSE","TORTUE","CHOUETTE","GUÉPARD","OURS BRUN"],
  "Cuisine": ["CROISSANT","RATATOUILLE","BAGUETTE","CAMEMBERT","CRÊPE","BOUILLABAISSE","QUICHE","MADELEINE","TARTIFLETTE","CASSOULET","ÉCLAIR","MACARON","CHOUCROUTE","POT-AU-FEU","CROQUE-MONSIEUR","FONDUE","BRIOCHE","VINAIGRETTE","GALETTE","PROFITEROLE"],
  "Pays et villes": ["ARGENTINE","AUSTRALIE","MADAGASCAR","NORVÈGE","SÉNÉGAL","JAPON","MEXIQUE","ISLANDE","MARSEILLE","STRASBOURG","BORDEAUX","MONTRÉAL","BRUXELLES","GENÈVE","CASABLANCA","DAKAR","VENISE","LISBONNE","TOMBOUCTOU","NOUVELLE-ZÉLANDE"],
  "Métiers": ["BOULANGER","POMPIER","ASTRONAUTE","VÉTÉRINAIRE","JARDINIER","PHARMACIEN","ARCHITECTE","MENUISIER","PLOMBIER","INFIRMIÈRE","JOURNALISTE","FACTEUR","BIBLIOTHÉCAIRE","CHARPENTIER","HORLOGER","APICULTEUR","PÂTISSIER","MÉCANICIEN","ÉLECTRICIEN","PROFESSEUR"],
  "Objets": ["PARAPLUIE","ORDINATEUR","TÉLESCOPE","BOUSSOLE","ESCALIER","AQUARIUM","CERF-VOLANT","TROTTINETTE","ACCORDÉON","SABLIER","LAMPADAIRE","RÉVEIL","TOURNEVIS","HAMAC","MONTGOLFIÈRE","BALANÇOIRE","CHANDELIER","PORTEFEUILLE","DICTIONNAIRE","MARIONNETTE"]
};
const ALL = "Tous les thèmes";
const MAX = 9;
const ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"];

const $ = id => document.getElementById(id);
const base = ch => ch.normalize("NFD").replace(/[̀-ͯ]/g, "").replace("Œ", "OE").replace("Æ", "AE");
const isLetter = ch => /[A-Z]/.test(base(ch));

let state = null;
let stats = { wins: 0, losses: 0, streak: 0 };
try { stats = Object.assign(stats, JSON.parse(localStorage.getItem("pendu-stats") || "{}")); } catch (e) {}
function saveStats() { try { localStorage.setItem("pendu-stats", JSON.stringify(stats)); } catch (e) {} }

function pickWord(cat) {
  const cats = cat === ALL ? Object.keys(WORDS) : [cat];
  const c = cats[Math.floor(Math.random() * cats.length)];
  const list = WORDS[c];
  let w;
  do { w = list[Math.floor(Math.random() * list.length)]; } while (state && list.length > 1 && w === state.word);
  return { word: w, category: c };
}

function newGame() {
  const { word, category } = pickWord($("cat").value);
  state = { word, category, guessed: [], misses: 0, over: false, chosenCat: $("cat").value };
  render(true);
}

function letters() { return [...new Set([...state.word].filter(isLetter).map(base))]; }
function found(l) { return state.guessed.includes(l); }
function won() { return letters().every(found); }

function guess(l) {
  if (!state || state.over || found(l)) return;
  state.guessed.push(l);
  if (!letters().includes(l)) state.misses++;
  finishIfOver();
  render(false, l);
}

function useClue() {
  if (!state || state.over || state.misses >= MAX - 1) return;
  const remaining = letters().filter(l => !found(l));
  if (!remaining.length) return;
  const l = remaining[Math.floor(Math.random() * remaining.length)];
  state.misses++;
  state.guessed.push(l);
  finishIfOver();
  render(false, l);
}

function finishIfOver() {
  if (won()) { state.over = "win"; stats.wins++; stats.streak++; saveStats(); }
  else if (state.misses >= MAX) { state.over = "lose"; stats.losses++; stats.streak = 0; saveStats(); }
}

function render(fresh, justGuessed) {
  $("wins").textContent = stats.wins;
  $("losses").textContent = stats.losses;
  $("streak").textContent = stats.streak;
  $("catname").textContent = state.category;
  const n = [...state.word].filter(isLetter).length;
  $("len").textContent = n + " lettres";
  $("left").textContent = MAX - state.misses;

  // Mot : un groupe par mot pour que les retours à la ligne ne coupent jamais au milieu
  const wordEl = $("word");
  wordEl.innerHTML = "";
  state.word.split(" ").forEach(part => {
    const chunk = document.createElement("div");
    chunk.className = "chunk";
    [...part].forEach(ch => {
      const s = document.createElement("span");
      s.className = "slot";
      if (!isLetter(ch)) { s.textContent = ch; s.classList.add("sep"); }
      else if (found(base(ch))) {
        s.textContent = ch;
        if (justGuessed && base(ch) === justGuessed) s.classList.add("pop");
      } else if (state.over === "lose") { s.textContent = ch; s.classList.add("missed"); }
      s.setAttribute("aria-label", s.textContent || "lettre cachée");
      chunk.appendChild(s);
    });
    wordEl.appendChild(chunk);
  });

  // Dessin
  document.querySelectorAll(".drawing .part").forEach((p, i) => {
    const on = i < state.misses;
    const wasOn = p.classList.contains("on");
    p.classList.toggle("on", on);
    p.classList.toggle("instant", on && (fresh || wasOn));
    p.classList.toggle("hanged", state.over === "lose" && i >= 5);
  });

  // Clavier
  document.querySelectorAll(".key").forEach(k => {
    const l = k.dataset.l;
    const g = found(l);
    k.classList.toggle("hit", g && letters().includes(l));
    k.classList.toggle("miss", g && !letters().includes(l));
    k.disabled = g || !!state.over;
  });

  const msg = $("msg");
  msg.className = "message";
  if (state.over === "win") { msg.textContent = state.misses === 0 ? "Sans faute, bravo !" : "Gagné ! Bien joué."; msg.classList.add("win"); }
  else if (state.over === "lose") { msg.textContent = "Perdu… le mot était « " + state.word + " »."; msg.classList.add("lose"); }
  else msg.textContent = state.misses === MAX - 1 ? "Attention, dernier essai !" : "";
  $("clue").disabled = !!state.over || state.misses >= MAX - 1;
}

// Initialisation de l'interface
const sel = $("cat");
[ALL, ...Object.keys(WORDS)].forEach(c => { const o = document.createElement("option"); o.value = o.textContent = c; sel.appendChild(o); });
ROWS.forEach(r => {
  const row = document.createElement("div");
  row.className = "row";
  [...r].forEach(l => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "key"; b.textContent = l; b.dataset.l = l;
    b.setAttribute("aria-label", "Lettre " + l);
    b.addEventListener("click", () => guess(l));
    row.appendChild(b);
  });
  $("kb").appendChild(row);
});
// Décor : écolier, hacker, espace ou nature (mémorisé dans le navigateur)
function setDecor(d) {
  document.documentElement.dataset.decor = d;
  $("decor").value = d;
  try { localStorage.setItem("pendu-decor", d); } catch (e) {}
}
$("decor").addEventListener("change", e => setDecor(e.target.value));
let savedDecor = "ecolier";
try { savedDecor = localStorage.getItem("pendu-decor") || "ecolier"; } catch (e) {}
setDecor(savedDecor);

$("new").addEventListener("click", newGame);
$("clue").addEventListener("click", useClue);
sel.addEventListener("change", newGame);
document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.tagName === "SELECT") return;
  if (e.key === "Enter" && state && state.over) { e.preventDefault(); newGame(); return; }
  const l = base((e.key || "").toUpperCase());
  if (/^[A-Z]$/.test(l)) guess(l);
});

function start(saved) {
  if (saved && saved.state) {
    state = saved.state;
    if (saved.state.chosenCat) sel.value = saved.state.chosenCat;
    render(true);
  } else newGame();
}
window.claude?.hot?.snapshot?.(() => ({ state }));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
