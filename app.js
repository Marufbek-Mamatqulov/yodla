/* ============================================================
   WIUT HUB – Vocabulary Database  |  app.js
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

  /* ---------- State ---------- */
  let allWords      = [];          // flat list after merging
  let filtered      = [];          // after filter + search
  let currentPage   = 1;
  const PAGE_SIZE   = 50;
  let activeFilter  = 'all';
  let activeSort    = 'az';
  let currentView   = 'table';
  let searchTerm    = '';

  const levelOrder = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };

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
      currentFilter.textContent = item.querySelector('span:not(.nav-badge):not(.level-dot)').textContent;
      currentPage = 1;
      applyFilters();
      sidebar.classList.remove('open');
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
    }, 200);
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
        currentFilter.textContent = lvl.toUpperCase();
        currentPage = 1;
        applyFilters();
      }
    });
  });

  /* ---------- Load Data ---------- */
  async function loadData() {
    loading.classList.remove('hidden');
    try {
      const resp = await fetch('data.json');
      const data = await resp.json();

      // Data is already a flat array
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
    } catch (err) {
      console.error('Failed to load data:', err);
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text-secondary)">
        <i class="fas fa-exclamation-circle" style="font-size:24px;margin-bottom:8px;display:block"></i>
        Failed to load data. Make sure data.json is in the same folder.</td></tr>`;
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

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || 0; };

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
  }

  /* ---------- Filter + Sort ---------- */
  // Map filter values to categories
  const filterToCat = {
    'phrasal': 'phrasal', 'verbs': 'verbs',
    'dest_b1': 'dest_b1', 'dest_b2': 'dest_b2', 'dest_c1c2': 'dest_c1c2'
  };

  function applyFilters() {
    filtered = allWords.filter(w => {
      if (activeFilter !== 'all') {
        if (filterToCat[activeFilter]) {
          if (w.category !== filterToCat[activeFilter]) return false;
        } else {
          // A1–C2 level filter
          if (w.level !== activeFilter || w.category !== 'level') return false;
        }
      }
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
          <p>Qidiruv yoki filterni o'zgartiring.</p>
        </div></td></tr>`;
      gridView.innerHTML = `<div class="empty-state">
        <i class="fas fa-search"></i>
        <h3>So'z topilmadi</h3>
        <p>Qidiruv yoki filterni o'zgartiring.</p>
      </div>`;
      return;
    }

    // Table
    tableBody.innerHTML = pageData.map((w, i) => {
      const num = start + i + 1;
      const lvlClass = getLevelClass(w);
      return `<tr data-idx="${start + i}">
        <td style="color:var(--text-secondary);font-size:12px">${num}</td>
        <td class="word-cell">${esc(w.english)}</td>
        <td class="uzbek-cell">${esc(w.uzbek) || '—'}</td>
        <td><span class="level-badge level-${lvlClass}">${esc(w.level)}</span></td>
      </tr>`;
    }).join('');

    // Grid
    gridView.innerHTML = pageData.map((w, i) => {
      const lvlClass = getLevelClass(w);
      return `<div class="grid-card" data-level="${lvlClass}" data-idx="${start + i}">
        <div class="grid-card-top">
          <div class="grid-card-word">${esc(w.english)}</div>
          <span class="level-badge level-${lvlClass}">${esc(w.level)}</span>
        </div>
        <div class="grid-card-guide">${esc(w.uzbek)}</div>
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
    if (ts) ts.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Pagination ---------- */
  function renderPagination() {
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (totalPages <= 1) { pagination.innerHTML = ''; return; }

    let html = '';

    // Prev
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

    // Next
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
    return lvl;
  }

  /* ---------- Modal ---------- */
  function openModal(w) {
    if (!w) return;
    const lvlClass = getLevelClass(w);
    modalContent.innerHTML = `
      <div class="modal-word">${esc(w.english)}</div>
      <div class="modal-badges">
        <span class="level-badge level-${lvlClass}">${esc(w.level)}</span>
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
        <div class="modal-section-title">Definition</div>
        <div class="modal-definition">${esc(w.definition)}</div>
      ` : ''}
    `;
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
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
