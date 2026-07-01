/* ============================================================
   WORD BOX – 22,000+ So'zlar Bazasi  |  app.js  |  v3.0
   ============================================================ */

;(function () {
  'use strict';

  /* ---------- DOM refs ---------- */
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];

  const sidebar       = $('#sidebar');
  const sidebarClose  = $('#sidebarClose');
  const hamburger     = $('#hamburger');
  const searchInput   = $('#searchInput');
  const currentFilter = $('#currentFilter');
  const themeToggle   = $('#themeToggle');
  const tableBody     = $('#tableBody');
  const tableView     = $('#tableView');
  const gridView      = $('#gridView');
  const pagination    = $('#pagination');
  const loading       = $('#loading');
  const resultCount   = $('#resultCount');
  const sortBtn       = $('#sortBtn');
  const sortMenu      = $('#sortMenu');
  const modalOverlay  = $('#modalOverlay');
  const modalContent  = $('#modalContent');
  const modalClose    = $('#modalClose');
  const backToTop     = $('#backToTop');
  const statsContainer = $('#statsContainer');
  const heroSection   = $('#heroSection');

  /* ---------- State ---------- */
  let allWords      = [];
  let filtered      = [];
  let currentPage   = 1;
  const PAGE_SIZE   = 50;
  let activeFilter  = 'all';
  let activeSort    = 'az';
  let currentView   = 'table';
  let searchTerm    = '';

  const levelOrder = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };

  /* ---------- Filter map ---------- */
  const filterMap = {
    'all':         null,
    'A1':          w => w.level === 'A1' && w.category === 'level',
    'A2':          w => w.level === 'A2' && w.category === 'level',
    'B1':          w => w.level === 'B1' && w.category === 'level',
    'B2':          w => w.level === 'B2' && w.category === 'level',
    'C1':          w => w.level === 'C1' && w.category === 'level',
    'C2':          w => w.level === 'C2' && w.category === 'level',
    'verbs':       w => w.category === 'verbs',
    'phrasal':     w => w.category === 'phrasal',
    'dest_b1':     w => w.category === 'dest_b1',
    'dest_b2':     w => w.category === 'dest_b2',
    'dest_c1c2':   w => w.category === 'dest_c1c2',
    'essential':   w => w.category === 'essential',
    'essential_1': w => w.level === 'Essential 1',
    'essential_2': w => w.level === 'Essential 2',
    'essential_3': w => w.level === 'Essential 3',
    'essential_4': w => w.level === 'Essential 4',
    'essential_5': w => w.level === 'Essential 5',
  };

  /* ---------- Theme ---------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    themeToggle.innerHTML = t === 'dark'
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }
  applyTheme(localStorage.getItem('theme') || 'light');
  themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  /* ---------- Sidebar toggle (mobile) ---------- */
  hamburger.addEventListener('click', () => sidebar.classList.add('open'));
  sidebarClose.addEventListener('click', () => sidebar.classList.remove('open'));
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        e.target !== hamburger && !hamburger.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });

  /* ---------- Nav items ---------- */
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.dataset.game) {
        sidebar.classList.remove('open');
        openGameSetup(item.dataset.game);
        return;
      }
      $$('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      activeFilter = item.dataset.filter;
      const label = item.querySelector('span:not(.nav-badge):not(.level-dot)');
      currentFilter.textContent = label ? label.textContent : 'Barcha so\'zlar';
      currentPage = 1;
      applyFilters();
      sidebar.classList.remove('open');

      // Show/hide hero
      if (heroSection) {
        heroSection.style.display = activeFilter === 'all' ? '' : 'none';
      }
    });
  });

  /* ---------- Search ---------- */
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchTerm = searchInput.value.trim().toLowerCase();
      currentPage = 1;
      applyFilters();
    }, 180);
  });

  // Ctrl+K shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'Escape') {
      if (gameOverlay.classList.contains('open')) closeGame();
      else if (modalOverlay.classList.contains('open')) closeModal();
      else if (document.activeElement === searchInput) searchInput.blur();
    }
  });

  /* ---------- Sort ---------- */
  sortBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sortMenu.classList.toggle('open');
  });
  document.addEventListener('click', () => sortMenu.classList.remove('open'));

  $$('[data-sort]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      activeSort = a.dataset.sort;
      sortMenu.classList.remove('open');
      applyFilters();
    });
  });

  /* ---------- View Toggle ---------- */
  $$('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      if (currentView === 'table') {
        tableView.classList.remove('hidden');
        gridView.classList.add('hidden');
      } else {
        tableView.classList.add('hidden');
        gridView.classList.remove('hidden');
      }
      renderPage();
    });
  });

  /* ---------- Back-to-top ---------- */
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Stat cards click → filter ---------- */
  $$('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const lvl = card.dataset.level;
      if (lvl) {
        $$('.nav-item').forEach(n => {
          n.classList.toggle('active', n.dataset.filter === lvl);
        });
        activeFilter = lvl;
        currentFilter.textContent = card.querySelector('.stat-label')?.textContent || lvl.toUpperCase();
        currentPage = 1;
        applyFilters();
        if (heroSection) heroSection.style.display = 'none';
      }
    });
  });

  /* ---------- Load Data ---------- */
  async function loadData() {
    loading.classList.remove('hidden');
    try {
      const resp = await fetch('data.json');
      const data = await resp.json();

      allWords = (data.words || []).map(w => ({
        english: w.english || '',
        uzbek: w.uzbek || '',
        level: w.level || '',
        category: w.category || '',
        topic: w.topic || '',
        definition: w.definition || ''
      }));

      updateStats();
      applyFilters();

      // Update hero total
      const heroTotal = $('#heroTotal');
      if (heroTotal) heroTotal.textContent = allWords.length.toLocaleString();

    } catch (err) {
      console.error('Failed to load data:', err);
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:60px;color:var(--text-secondary)">
        <i class="fas fa-exclamation-triangle" style="font-size:32px;margin-bottom:12px;display:block;color:#ef4444"></i>
        <strong>Ma'lumotlarni yuklashda xatolik</strong><br>
        <span style="font-size:13px">data.json fayli mavjudligiga ishonch hosil qiling.</span></td></tr>`;
    } finally {
      loading.classList.add('hidden');
    }
  }

  /* ---------- Update Stats ---------- */
  function updateStats() {
    const levelCounts = {};
    const catCounts = {};
    allWords.forEach(w => {
      levelCounts[w.level] = (levelCounts[w.level] || 0) + 1;
      catCounts[w.category] = (catCounts[w.category] || 0) + 1;
    });

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = (val || 0).toLocaleString();
    };

    // Stat cards
    set('statA1', levelCounts['A1']);
    set('statA2', levelCounts['A2']);
    set('statB1', levelCounts['B1']);
    set('statB2', levelCounts['B2']);
    set('statC1', levelCounts['C1']);
    set('statC2', levelCounts['C2']);
    set('statPhrasal', levelCounts['Phrasal']);
    set('statVerbs', levelCounts['Verbs']);
    set('statDestB1', levelCounts['Dest B1']);
    set('statDestB2', levelCounts['Dest B2']);
    set('statDestC', levelCounts['Dest C1C2']);
    set('statEssential', catCounts['essential']);

    // Nav badges
    set('totalBadge', allWords.length);
    set('a1Badge', levelCounts['A1']);
    set('a2Badge', levelCounts['A2']);
    set('b1Badge', levelCounts['B1']);
    set('b2Badge', levelCounts['B2']);
    set('c1Badge', levelCounts['C1']);
    set('c2Badge', levelCounts['C2']);
    set('phrasalBadge', levelCounts['Phrasal']);
    set('verbsBadge', levelCounts['Verbs']);
    set('destB1Badge', levelCounts['Dest B1']);
    set('destB2Badge', levelCounts['Dest B2']);
    set('destCBadge', levelCounts['Dest C1C2']);
    set('ess1Badge', levelCounts['Essential 1']);
    set('ess2Badge', levelCounts['Essential 2']);
    set('ess3Badge', levelCounts['Essential 3']);
    set('ess4Badge', levelCounts['Essential 4']);
    set('ess5Badge', levelCounts['Essential 5']);
  }

  /* ---------- Filter + Sort ---------- */
  function applyFilters() {
    const filterFn = filterMap[activeFilter];

    filtered = allWords.filter(w => {
      // Category/level filter
      if (filterFn && !filterFn(w)) return false;

      // Search
      if (searchTerm) {
        return (
          w.english.toLowerCase().includes(searchTerm) ||
          w.uzbek.toLowerCase().includes(searchTerm) ||
          (w.definition || '').toLowerCase().includes(searchTerm) ||
          (w.topic || '').toLowerCase().includes(searchTerm)
        );
      }
      return true;
    });

    filtered.sort((a, b) => {
      switch (activeSort) {
        case 'az':  return a.english.localeCompare(b.english);
        case 'za':  return b.english.localeCompare(a.english);
        case 'level-asc':
          return (levelOrder[a.level] || 99) - (levelOrder[b.level] || 99) || a.english.localeCompare(b.english);
        case 'level-desc':
          return (levelOrder[b.level] || 99) - (levelOrder[a.level] || 99) || a.english.localeCompare(b.english);
        default: return 0;
      }
    });

    resultCount.textContent = filtered.length.toLocaleString();
    renderPage();
    renderPagination();
  }

  /* ---------- Render ---------- */
  function renderPage() {
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = filtered.slice(start, start + PAGE_SIZE);

    if (pageData.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4">
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <h3>So'z topilmadi</h3>
          <p>Qidiruv so'zini yoki filterni o'zgartirib ko'ring.</p>
        </div></td></tr>`;
      gridView.innerHTML = `<div class="empty-state">
        <i class="fas fa-search"></i>
        <h3>So'z topilmadi</h3>
        <p>Qidiruv so'zini yoki filterni o'zgartirib ko'ring.</p>
      </div>`;
      return;
    }

    // Table
    tableBody.innerHTML = pageData.map((w, i) => {
      const num = start + i + 1;
      const lvlClass = getLevelClass(w);
      return `<tr data-idx="${start + i}">
        <td style="color:var(--text-secondary);font-size:12px;font-weight:500">${num}</td>
        <td class="word-cell">${esc(w.english)}</td>
        <td class="uzbek-cell">${esc(w.uzbek) || '<span style="color:#cbd5e1">—</span>'}</td>
        <td><span class="level-badge level-${lvlClass}">${esc(formatLevel(w.level))}</span></td>
      </tr>`;
    }).join('');

    // Grid
    gridView.innerHTML = pageData.map((w, i) => {
      const lvlClass = getLevelClass(w);
      return `<div class="grid-card" data-level="${lvlClass}" data-idx="${start + i}">
        <div class="grid-card-top">
          <div class="grid-card-word">${esc(w.english)}</div>
          <span class="level-badge level-${lvlClass}">${esc(formatLevel(w.level))}</span>
        </div>
        <div class="grid-card-guide">${esc(w.uzbek) || '—'}</div>
        ${w.definition ? `<div class="grid-card-def">${esc(w.definition)}</div>` : ''}
        ${w.topic ? `<div class="grid-card-meta"><span class="topic-tag">${esc(w.topic)}</span></div>` : ''}
      </div>`;
    }).join('');

    // Attach click events for modal
    $$('tr[data-idx]', tableBody).forEach(tr => {
      tr.addEventListener('click', () => openModal(filtered[+tr.dataset.idx]));
    });
    $$('.grid-card[data-idx]', gridView).forEach(card => {
      card.addEventListener('click', () => openModal(filtered[+card.dataset.idx]));
    });

    // Scroll to top of table section
    const ts = $('.table-section');
    if (ts && currentPage > 1) ts.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Format level display ---------- */
  function formatLevel(level) {
    const map = {
      'Essential 1': 'Ess. 1',
      'Essential 2': 'Ess. 2',
      'Essential 3': 'Ess. 3',
      'Essential 4': 'Ess. 4',
      'Essential 5': 'Ess. 5',
      'Dest B1': 'Dest B1',
      'Dest B2': 'Dest B2',
      'Dest C1C2': 'Dest C1&C2',
    };
    return map[level] || level;
  }

  /* ---------- Pagination ---------- */
  function renderPagination() {
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (totalPages <= 1) { pagination.innerHTML = ''; return; }

    let html = '';

    html += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" data-page="prev">
      <i class="fas fa-chevron-left"></i></button>`;

    const pages = getPaginationRange(currentPage, totalPages);
    pages.forEach(p => {
      if (p === '...') {
        html += `<span class="page-dots">…</span>`;
      } else {
        html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
      }
    });

    html += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" data-page="next">
      <i class="fas fa-chevron-right"></i></button>`;

    pagination.innerHTML = html;

    $$('.page-btn', pagination).forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled')) return;
        const p = btn.dataset.page;
        if (p === 'prev') currentPage = Math.max(1, currentPage - 1);
        else if (p === 'next') currentPage = Math.min(totalPages, currentPage + 1);
        else currentPage = +p;
        renderPage();
        renderPagination();
      });
    });
  }

  function getPaginationRange(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    if (cur <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...', total);
    } else if (cur >= total - 3) {
      pages.push(1, '...');
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1, '...', cur - 1, cur, cur + 1, '...', total);
    }
    return pages;
  }

  function getLevelClass(w) {
    const lvl = w.level;
    if (['A1','A2','B1','B2','C1','C2'].includes(lvl)) return lvl;
    if (lvl === 'Phrasal') return 'phrasal';
    if (lvl === 'Verbs') return 'Verbs';
    if (lvl === 'Dest B1') return 'DestB1';
    if (lvl === 'Dest B2') return 'DestB2';
    if (lvl === 'Dest C1C2') return 'DestC';
    if (lvl.startsWith('Essential')) return lvl.replace(' ', '');
    return lvl;
  }

  /* ---------- Modal ---------- */
  function openModal(w) {
    if (!w) return;
    const lvlClass = getLevelClass(w);
    modalContent.innerHTML = `
      <div class="modal-word">${esc(w.english)}</div>
      <div class="modal-badges">
        <span class="level-badge level-${lvlClass}">${esc(formatLevel(w.level))}</span>
        ${w.category ? `<span class="topic-tag">${esc(getCategoryLabel(w.category))}</span>` : ''}
        ${w.topic ? `<span class="topic-tag">${esc(w.topic)}</span>` : ''}
      </div>
      <div class="modal-divider"></div>
      <div class="modal-section-title">O'zbekcha tarjima</div>
      ${w.uzbek
        ? `<div class="modal-definition">${esc(w.uzbek)}</div>`
        : `<div class="modal-no-def">Tarjima mavjud emas.</div>`
      }
      ${w.definition ? `
        <div class="modal-divider"></div>
        <div class="modal-section-title">Definition (inglizcha)</div>
        <div class="modal-definition">${esc(w.definition)}</div>
      ` : ''}
    `;
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // Android WebView uchun qo'shimcha
    modalOverlay.style.display = 'flex';
  }

  function getCategoryLabel(cat) {
    const map = {
      'level': 'CEFR',
      'verbs': "Fe'llar",
      'phrasal': 'Phrasal Verbs',
      'dest_b1': 'Destination B1',
      'dest_b2': 'Destination B2',
      'dest_c1c2': 'Destination C1&C2',
      'essential': '4000 Essential'
    };
    return map[cat] || cat;
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    // Android WebView uchun qo'shimcha
    setTimeout(() => {
      if (!modalOverlay.classList.contains('open')) {
        modalOverlay.style.display = 'none';
      }
    }, 300);
  }

  modalClose.addEventListener('click', closeModal);
  
  // Touch support for modal overlay
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  
  // Touch support for closing on swipe down
  let touchStartY = 0;
  modalOverlay.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  
  modalOverlay.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    // If swiped down more than 100px, close modal
    if (touchEndY - touchStartY > 100) {
      closeModal();
    }
  }, { passive: true });

  /* ---------- Helpers ---------- */
  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /* ================================================================
     GAMES
     ================================================================ */
  const gameOverlay = $('#gameOverlay');
  const gameBody    = $('#gameBody');
  const gameClose   = $('#gameClose');

  let gameState = {};

  function closeGame() {
    gameOverlay.classList.remove('open');
    document.body.style.overflow = '';
    if (gameState.timer) clearInterval(gameState.timer);
    gameState = {};
  }
  gameClose.addEventListener('click', closeGame);
  gameOverlay.addEventListener('click', (e) => { if (e.target === gameOverlay) closeGame(); });

  const gameMeta = {
    flashcards: { title: 'Flashcards', icon: 'fa-clone', desc: "Kartochkani bosib ag'daring va tarjimasini ko'ring." },
    quiz:       { title: 'Test (Quiz)', icon: 'fa-circle-question', desc: "To'g'ri tarjimani tanlang va ballarni to'plang." },
    match:      { title: "Juftlik topish", icon: 'fa-shuffle', desc: "Inglizcha so'zni o'zbekcha tarjimasi bilan moslashtiring." },
    typing:     { title: 'Tez yozish', icon: 'fa-keyboard', desc: "Tarjimani ko'rib, inglizcha so'zni tez va to'g'ri yozing." },
  };

  const roundOptions = {
    flashcards: [10, 20, 30],
    quiz:       [10, 15, 20],
    match:      [6, 8, 10],
    typing:     [30, 60, 90],
  };

  const levelChoices = [
    { v: 'all', l: "Barcha so'zlar" },
    { v: 'A1', l: 'A1 — Boshlang\'ich' },
    { v: 'A2', l: 'A2 — Elementar' },
    { v: 'B1', l: 'B1 — O\'rta' },
    { v: 'B2', l: 'B2 — Yuqori o\'rta' },
    { v: 'C1', l: 'C1 — Ilg\'or' },
    { v: 'C2', l: 'C2 — Professional' },
    { v: 'verbs', l: "Fe'llar" },
    { v: 'phrasal', l: 'Phrasal Verbs' },
    { v: 'dest_b1', l: 'Destination B1' },
    { v: 'dest_b2', l: 'Destination B2' },
    { v: 'dest_c1c2', l: 'Destination C1&C2' },
    { v: 'essential_1', l: 'Essential — Book 1' },
    { v: 'essential_2', l: 'Essential — Book 2' },
    { v: 'essential_3', l: 'Essential — Book 3' },
    { v: 'essential_4', l: 'Essential — Book 4' },
    { v: 'essential_5', l: 'Essential — Book 5' },
  ];

  function poolFor(levelKey) {
    const fn = filterMap[levelKey];
    const pool = fn ? allWords.filter(fn) : allWords;
    return pool.filter(w => w.english && w.uzbek);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sample(arr, n) {
    return shuffle(arr).slice(0, n);
  }

  function openGameSetup(game) {
    if (!allWords.length) return;
    const meta = gameMeta[game];
    if (!meta) return;
    gameOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (gameState.timer) clearInterval(gameState.timer);
    gameState = {};

    const rounds = roundOptions[game];
    const midIdx = 1;
    let selectedRound = rounds[midIdx];

    gameBody.innerHTML = `
      <div class="game-setup">
        <div class="game-setup-icon"><i class="fas ${meta.icon}"></i></div>
        <h2 class="game-setup-title">${meta.title}</h2>
        <p class="game-setup-desc">${meta.desc}</p>
        <div class="game-field">
          <label>Bo'lim</label>
          <select id="gameLevelSelect">
            ${levelChoices.map(c => `<option value="${c.v}">${esc(c.l)}</option>`).join('')}
          </select>
        </div>
        <div class="game-field">
          <label>${game === 'typing' ? 'Vaqt (soniya)' : game === 'match' ? "Juftliklar soni" : "Savollar soni"}</label>
          <div class="game-round-choices" id="gameRoundChoices">
            ${rounds.map((r, i) => `<button class="round-chip ${i === midIdx ? 'active' : ''}" data-round="${r}">${r}</button>`).join('')}
          </div>
        </div>
        <button class="game-start-btn" id="gameStartBtn"><i class="fas fa-play"></i> Boshlash</button>
        <div id="gameSetupError"></div>
      </div>
    `;

    $$('.round-chip', gameBody).forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.round-chip', gameBody).forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedRound = +chip.dataset.round;
      });
    });

    $('#gameStartBtn', gameBody).addEventListener('click', () => {
      const level = $('#gameLevelSelect', gameBody).value;
      const pool = poolFor(level);
      const errBox = $('#gameSetupError', gameBody);
      if (pool.length < 4) {
        errBox.innerHTML = `<p style="color:#ef4444;text-align:center;margin-top:12px;font-size:13px">Bu bo'limda yetarli so'z yo'q. Boshqa bo'lim tanlang.</p>`;
        return;
      }
      startGame(game, pool, selectedRound);
    });
  }

  function startGame(game, pool, n) {
    if (game === 'flashcards') startFlashcards(pool, n);
    else if (game === 'quiz') startQuiz(pool, n);
    else if (game === 'match') startMatch(pool, n);
    else if (game === 'typing') startTyping(pool, n);
  }

  function renderGameSummary(opts) {
    gameBody.innerHTML = `
      <div class="game-summary">
        <div class="game-summary-icon"><i class="fas fa-trophy"></i></div>
        <h2>${esc(opts.title)}</h2>
        <div class="game-summary-stats">
          ${opts.stats.map(s => `<div class="summary-stat ${s.cls || ''}"><div class="summary-num">${esc(String(s.value))}</div><div>${esc(s.label)}</div></div>`).join('')}
        </div>
        <div class="game-summary-actions">
          <button class="game-start-btn" id="gameRestart"><i class="fas fa-rotate-right"></i> Qayta boshlash</button>
          <button class="game-secondary-btn" id="gameBackToSetup"><i class="fas fa-arrow-left"></i> Bo'limni o'zgartirish</button>
        </div>
      </div>
    `;
    $('#gameRestart', gameBody).addEventListener('click', opts.onRestart);
    $('#gameBackToSetup', gameBody).addEventListener('click', opts.onBack);
  }

  /* ---------- Flashcards ---------- */
  function startFlashcards(pool, n) {
    const words = sample(pool, Math.min(n, pool.length));
    let idx = 0, known = 0, unknown = 0;

    function render() {
      if (idx >= words.length) return finish();
      const w = words[idx];
      gameBody.innerHTML = `
        <div class="game-header">
          <div class="game-progress"><div class="game-progress-bar" style="width:${(idx / words.length) * 100}%"></div></div>
          <div class="game-counter">${idx + 1} / ${words.length}</div>
        </div>
        <div class="flashcard-wrap">
          <div class="flashcard" id="flashcard">
            <div class="flashcard-face flashcard-front">
              <span class="flashcard-hint">Inglizcha</span>
              <div class="flashcard-word">${esc(w.english)}</div>
              <span class="flashcard-tap">Tarjimani ko'rish uchun bosing</span>
            </div>
            <div class="flashcard-face flashcard-back">
              <span class="flashcard-hint">O'zbekcha</span>
              <div class="flashcard-word">${esc(w.uzbek)}</div>
              ${w.definition ? `<div class="flashcard-def">${esc(w.definition)}</div>` : ''}
            </div>
          </div>
        </div>
        <div class="flashcard-actions">
          <button class="fc-btn fc-no" id="fcNo"><i class="fas fa-xmark"></i> Bilmayman</button>
          <button class="fc-btn fc-yes" id="fcYes"><i class="fas fa-check"></i> Bilaman</button>
        </div>
      `;
      const card = $('#flashcard', gameBody);
      card.addEventListener('click', () => card.classList.toggle('flipped'));
      $('#fcNo', gameBody).addEventListener('click', (e) => { e.stopPropagation(); unknown++; idx++; render(); });
      $('#fcYes', gameBody).addEventListener('click', (e) => { e.stopPropagation(); known++; idx++; render(); });
    }

    function finish() {
      const pct = Math.round((known / words.length) * 100);
      renderGameSummary({
        title: 'Yakunlandi!',
        stats: [
          { value: known, label: 'Bilaman', cls: 'summary-good' },
          { value: unknown, label: 'Bilmayman', cls: 'summary-bad' },
          { value: pct + '%', label: 'Natija' },
        ],
        onRestart: () => startFlashcards(pool, n),
        onBack: () => openGameSetup('flashcards'),
      });
    }

    render();
  }

  /* ---------- Quiz ---------- */
  function startQuiz(pool, n) {
    const words = sample(pool, Math.min(n, pool.length));
    let idx = 0, score = 0, answered = false;

    function render() {
      if (idx >= words.length) return finish();
      const w = words[idx];
      answered = false;
      const distractors = sample(pool.filter(p => p.uzbek !== w.uzbek), Math.min(3, pool.length - 1));
      const options = shuffle([w, ...distractors]);

      gameBody.innerHTML = `
        <div class="game-header">
          <div class="game-progress"><div class="game-progress-bar" style="width:${(idx / words.length) * 100}%"></div></div>
          <div class="game-counter">${idx + 1} / ${words.length} &nbsp;·&nbsp; <i class="fas fa-star" style="color:#f59e0b"></i> ${score}</div>
        </div>
        <div class="quiz-question">${esc(w.english)}</div>
        <div class="quiz-options" id="quizOptions">
          ${options.map(o => `<button class="quiz-opt" data-correct="${o.uzbek === w.uzbek}">${esc(o.uzbek)}</button>`).join('')}
        </div>
        <div class="quiz-next-wrap" id="quizNextWrap"></div>
      `;

      $$('.quiz-opt', gameBody).forEach(btn => {
        btn.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          if (btn.dataset.correct === 'true') score++;
          $$('.quiz-opt', gameBody).forEach(b => {
            b.disabled = true;
            if (b.dataset.correct === 'true') b.classList.add('correct');
            else if (b === btn) b.classList.add('wrong');
          });
          $('#quizNextWrap', gameBody).innerHTML = `<button class="game-start-btn" id="quizNext">${idx + 1 < words.length ? "Keyingisi" : "Natijani ko'rish"} <i class="fas fa-arrow-right"></i></button>`;
          $('#quizNext', gameBody).addEventListener('click', () => { idx++; render(); });
        });
      });
    }

    function finish() {
      const pct = Math.round((score / words.length) * 100);
      renderGameSummary({
        title: 'Test yakunlandi!',
        stats: [
          { value: `${score}/${words.length}`, label: "To'g'ri", cls: 'summary-good' },
          { value: pct + '%', label: 'Natija' },
        ],
        onRestart: () => startQuiz(pool, n),
        onBack: () => openGameSetup('quiz'),
      });
    }

    render();
  }

  /* ---------- Match ---------- */
  function startMatch(pool, pairsCount) {
    const words = sample(pool, Math.min(pairsCount, pool.length));
    const tiles = shuffle(
      words.flatMap((w, i) => [
        { key: i, text: w.english },
        { key: i, text: w.uzbek },
      ])
    );

    let firstPick = null;
    let matchedCount = 0;
    let moves = 0;
    let locked = false;
    const startTime = Date.now();

    function statsHtml() {
      return `<span><i class="fas fa-shuffle"></i> ${moves} harakat</span><span><i class="fas fa-layer-group"></i> ${matchedCount}/${words.length} juft</span>`;
    }

    function render() {
      gameBody.innerHTML = `
        <div class="game-header">
          <div class="match-stats" id="matchStats">${statsHtml()}</div>
        </div>
        <div class="match-grid" id="matchGrid">
          ${tiles.map((t, i) => `
            <button class="match-tile" data-i="${i}">
              <span class="match-tile-inner">${esc(t.text)}</span>
            </button>
          `).join('')}
        </div>
      `;
      $$('.match-tile', gameBody).forEach(btn => {
        btn.addEventListener('click', () => onPick(+btn.dataset.i));
      });
    }

    function updateStats() {
      const el = $('#matchStats', gameBody);
      if (el) el.innerHTML = statsHtml();
    }

    function onPick(i) {
      if (locked) return;
      const btn = $(`.match-tile[data-i="${i}"]`, gameBody);
      if (!btn || btn.classList.contains('matched') || btn.classList.contains('open')) return;

      btn.classList.add('open');

      if (firstPick === null) {
        firstPick = i;
        return;
      }

      moves++;
      const a = tiles[firstPick], b = tiles[i];
      const btnA = $(`.match-tile[data-i="${firstPick}"]`, gameBody);

      if (a.key === b.key && firstPick !== i) {
        matchedCount++;
        btnA.classList.add('matched');
        btn.classList.add('matched');
        firstPick = null;
        updateStats();
        if (matchedCount === words.length) {
          setTimeout(finish, 500);
        }
      } else {
        locked = true;
        setTimeout(() => {
          btnA.classList.remove('open');
          btn.classList.remove('open');
          firstPick = null;
          locked = false;
          updateStats();
        }, 700);
        updateStats();
      }
    }

    function finish() {
      const seconds = Math.round((Date.now() - startTime) / 1000);
      renderGameSummary({
        title: 'Ajoyib!',
        stats: [
          { value: moves, label: 'Harakat', cls: 'summary-good' },
          { value: seconds + 's', label: 'Vaqt' },
        ],
        onRestart: () => startMatch(pool, pairsCount),
        onBack: () => openGameSetup('match'),
      });
    }

    render();
  }

  /* ---------- Typing ---------- */
  function startTyping(pool, seconds) {
    let queue = shuffle(pool);
    let qIdx = 0;
    let score = 0, wrong = 0;
    let timeLeft = seconds;
    let currentWord = null;

    function nextWord() {
      if (qIdx >= queue.length) { queue = shuffle(pool); qIdx = 0; }
      currentWord = queue[qIdx++];
    }

    function render() {
      gameBody.innerHTML = `
        <div class="game-header">
          <div class="typing-timer" id="typingTimer"><i class="fas fa-clock"></i> ${timeLeft}s</div>
          <div class="game-counter"><i class="fas fa-star" style="color:#f59e0b"></i> ${score} &nbsp; <i class="fas fa-xmark" style="color:#ef4444"></i> ${wrong}</div>
        </div>
        <div class="typing-card">
          <span class="flashcard-hint">O'zbekcha tarjima</span>
          <div class="typing-word">${esc(currentWord.uzbek)}</div>
        </div>
        <input type="text" class="typing-input" id="typingInput" placeholder="Inglizcha yozing..." autocomplete="off" spellcheck="false">
        <div class="typing-feedback" id="typingFeedback"></div>
      `;
      const input = $('#typingInput', gameBody);
      input.focus();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
    }

    function submit() {
      const input = $('#typingInput', gameBody);
      if (!input) return;
      const val = input.value.trim().toLowerCase();
      if (!val) return;
      const feedback = $('#typingFeedback', gameBody);
      if (val === currentWord.english.toLowerCase()) {
        score++;
        feedback.innerHTML = `<span class="fb-good"><i class="fas fa-check"></i> To'g'ri!</span>`;
      } else {
        wrong++;
        feedback.innerHTML = `<span class="fb-bad"><i class="fas fa-xmark"></i> To'g'risi: ${esc(currentWord.english)}</span>`;
      }
      input.disabled = true;
      nextWord();
      setTimeout(() => { if (timeLeft > 0) render(); }, 350);
    }

    function tick() {
      timeLeft--;
      const timerEl = $('#typingTimer', gameBody);
      if (timerEl) timerEl.innerHTML = `<i class="fas fa-clock"></i> ${timeLeft}s`;
      if (timeLeft <= 0) {
        clearInterval(gameState.timer);
        finish();
      }
    }

    function finish() {
      const total = score + wrong;
      renderGameSummary({
        title: 'Vaqt tugadi!',
        stats: [
          { value: score, label: "To'g'ri", cls: 'summary-good' },
          { value: wrong, label: 'Xato', cls: 'summary-bad' },
          { value: total, label: 'Jami' },
        ],
        onRestart: () => startTyping(pool, seconds),
        onBack: () => openGameSetup('typing'),
      });
    }

    nextWord();
    render();
    gameState.timer = setInterval(tick, 1000);
  }

  /* ---------- Init ---------- */
  loadData();

})();
