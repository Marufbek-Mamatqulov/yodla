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
      if (modalOverlay.classList.contains('open')) closeModal();
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
  }

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  /* ---------- Helpers ---------- */
  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /* ---------- Init ---------- */
  loadData();

})();
