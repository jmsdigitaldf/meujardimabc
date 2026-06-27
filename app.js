const app = document.querySelector("#app");
const navItems = document.querySelectorAll("[data-view]");

// Gerenciamento de Perfil de Teste (Ciclo entre resident -> driver -> business -> admin)
const testRoles = ['resident', 'driver', 'business', 'admin'];
let currentRoleIndex = 0;
const urlParams = new URLSearchParams(window.location.search);
const userParam = urlParams.get('user');
if (testRoles.includes(userParam)) {
  currentRoleIndex = testRoles.indexOf(userParam);
}

// Vincula o botão de alternar usuário da barra de ferramentas
const toggleUserBtn = document.querySelector('#toggleUserRole');
if (toggleUserBtn) {
  const roleEmojiMap = { resident: '👤', driver: '🚗', business: '🏪', admin: '⚙️' };
  toggleUserBtn.textContent = roleEmojiMap[testRoles[currentRoleIndex]] || '👤';
  toggleUserBtn.title = `Perfil ativo: ${testRoles[currentRoleIndex].toUpperCase()} (Clique para alternar)`;
  
  toggleUserBtn.addEventListener('click', () => {
    currentRoleIndex = (currentRoleIndex + 1) % testRoles.length;
    window.location.search = `?user=${testRoles[currentRoleIndex]}`;
  });
}

// Inicialização das variáveis do Supabase no Frontend
let supabaseClient = null;
let currentSession = null;
let currentUser = null;

async function initSupabase() {
  try {
    const config = await fetch('/api/config').then(r => r.json());
    if (config.supabaseUrl && config.supabaseAnonKey) {
      supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      
      await supabaseClient.auth.getSession();
      
      supabaseClient.auth.onAuthStateChange(async (event, session) => {
        const previousSession = currentSession;
        currentSession = session;
        currentUser = session?.user || null;
        
        if (event === 'SIGNED_OUT') {
          const currentView = document.querySelector('.nav-item.is-active')?.dataset.view || 'home';
          const publicViews = ['home', 'explore', 'news', 'bus'];
          if (!publicViews.includes(currentView)) {
            renderAuthScreen();
          } else {
            setView(currentView);
          }
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (!previousSession) {
            await handlePostAuthRedirect();
          }
        }
      });
    }
  } catch (err) {
    console.error("Erro ao inicializar o Supabase client no frontend:", err);
  }
}

async function checkProfileRegistration() {
  if (!currentSession) return true; // Permite a Home pública sem sessão
  
  try {
    const token = currentSession.access_token;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const userQuery = userParam ? `?user=${userParam}` : '';
    const res = await fetch(`/api/profile${userQuery}`, { headers });
    
    if (res.status === 404) {
      const body = await res.json().catch(() => ({}));
      if (body.isRegistered === false) {
        renderCompleteProfileScreen();
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error("Erro ao verificar registro de perfil:", err);
    return true;
  }
}

function renderCompleteProfileScreen() {
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) bottomNav.style.display = 'none';

  const meta = currentUser?.user_metadata || {};
  const email = currentUser?.email || '';
  const fullName = meta.full_name || meta.name || '';
  const displayName = meta.custom_display_name || meta.display_name || fullName.split(' ')[0] || '';

  app.innerHTML = `
    <div class="auth-container animate-fade-in">
      <div class="auth-card">
        <div class="auth-header">
          <h2>Conclua seu Cadastro</h2>
          <p>Para continuar, confirme seus dados e informe o número de WhatsApp:</p>
        </div>

        <div id="completeProfileMsgContainer"></div>

        <form id="frmCompleteProfile">
          <div class="field">
            <span>Nome Completo</span>
            <input type="text" id="cpFullName" value="${fullName}" placeholder="Nome Sobrenome" required />
          </div>
          <div class="field">
            <span>Apelido (Como quer ser chamado)</span>
            <input type="text" id="cpDisplayName" value="${displayName}" placeholder="Apelido" required />
          </div>
          <div class="field">
            <span>E-mail</span>
            <input type="email" id="cpEmail" value="${email}" disabled style="background-color: #f1f3f4; cursor: not-allowed;" />
          </div>
          <div class="field">
            <span>Whatsapp (DDD + Número)</span>
            <input type="tel" id="cpWhatsapp" placeholder="Ex: 61999999999" required />
          </div>
          <div class="field">
            <span>Bairro</span>
            <input type="text" id="cpNeighborhood" value="Jardim ABC" disabled style="background-color: #f1f3f4; cursor: not-allowed;" />
          </div>
          <button type="submit" class="primary-button w-full mt-4">Salvar e Acessar</button>
        </form>
      </div>
    </div>
  `;

  document.querySelector('#frmCompleteProfile').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.querySelector('#cpFullName').value;
    const displayName = document.querySelector('#cpDisplayName').value;
    const whatsapp = document.querySelector('#cpWhatsapp').value;

    const msgContainer = document.querySelector('#completeProfileMsgContainer');
    if (msgContainer) msgContainer.innerHTML = '<div class="auth-message success">Salvando cadastro...</div>';

    const token = currentSession?.access_token;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const userQuery = userParam ? `?user=${userParam}` : '';
      const res = await fetch(`/api/profile${userQuery}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fullName, displayName, whatsapp, neighborhood: 'Jardim ABC' })
      });

      if (res.ok) {
        if (msgContainer) msgContainer.innerHTML = '<div class="auth-message success">Cadastro concluído! Carregando...</div>';
        setTimeout(async () => {
          await handlePostAuthRedirect();
        }, 1000);
      } else {
        const body = await res.json().catch(() => ({}));
        if (msgContainer) msgContainer.innerHTML = `<div class="auth-message error">${body.error || 'Erro ao salvar perfil.'}</div>`;
      }
    } catch (err) {
      if (msgContainer) msgContainer.innerHTML = `<div class="auth-message error">${err.message}</div>`;
    }
  });
}

// Renderiza a tela de login e cadastro (Google Sign-In + E-mail e Senha)
function renderAuthScreen() {
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) bottomNav.style.display = 'none';

  app.innerHTML = `
    <div class="auth-container animate-fade-in">
      <div class="auth-card">
        <div class="auth-header">
          <h2>Meu Jardim ABC</h2>
          <p>Tudo do bairro em um só lugar</p>
        </div>

        <div id="authMessageContainer"></div>



        <div class="auth-tabs">
          <button class="auth-tab active" id="tabLogin">Entrar</button>
          <button class="auth-tab" id="tabRegister">Cadastrar</button>
        </div>

        <!-- Form de Login -->
        <form id="frmLogin">
          <div class="field">
            <span>E-mail</span>
            <input type="email" id="loginEmail" placeholder="seu@email.com" required />
          </div>
          <div class="field">
            <span>Senha</span>
            <input type="password" id="loginPassword" placeholder="Sua senha" required />
          </div>
          <button type="submit" class="primary-button w-full mt-4">Entrar na Conta</button>
        </form>

        <!-- Form de Cadastro -->
        <form id="frmRegister" class="hidden">
          <div class="field">
            <span>Nome Completo</span>
            <input type="text" id="regFullName" placeholder="Nome Sobrenome" required />
          </div>
          <div class="field">
            <span>Apelido (Nome de Exibição)</span>
            <input type="text" id="regDisplayName" placeholder="Como quer ser chamado" required />
          </div>
          <div class="field">
            <span>E-mail</span>
            <input type="email" id="regEmail" placeholder="seu@email.com" required />
          </div>
          <div class="field">
            <span>Whatsapp (DDD + Número)</span>
            <input type="tel" id="regWhatsapp" placeholder="Ex: 61999999999" />
          </div>
          <div class="field">
            <span>Senha (mínimo 6 caracteres)</span>
            <input type="password" id="regPassword" placeholder="Crie uma senha forte" minlength="6" required />
          </div>
          <button type="submit" class="primary-button w-full mt-4">Criar Minha Conta</button>
        </form>
      </div>
    </div>
  `;

  const tabLogin = document.querySelector('#tabLogin');
  const tabRegister = document.querySelector('#tabRegister');
  const frmLogin = document.querySelector('#frmLogin');
  const frmRegister = document.querySelector('#frmRegister');

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    frmLogin.classList.remove('hidden');
    frmRegister.classList.add('hidden');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    frmRegister.classList.remove('hidden');
    frmLogin.classList.add('hidden');
  });



  frmLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.querySelector('#loginEmail').value;
    const password = document.querySelector('#loginPassword').value;
    if (!supabaseClient) return showAuthMsg("Erro de inicialização.", "error");

    showAuthMsg("Entrando...", "success");
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      showAuthMsg(error.message, "error");
    }
  });

  frmRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.querySelector('#regFullName').value;
    const displayName = document.querySelector('#regDisplayName').value;
    const email = document.querySelector('#regEmail').value;
    const whatsapp = document.querySelector('#regWhatsapp').value;
    const password = document.querySelector('#regPassword').value;
    if (!supabaseClient) return showAuthMsg("Erro de inicialização.", "error");

    showAuthMsg("Cadastrando...", "success");
    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          display_name: displayName,
          whatsapp: whatsapp,
          neighborhood: 'Jardim ABC'
        }
      }
    });

    if (error) {
      showAuthMsg(error.message, "error");
    } else {
      showAuthMsg("Cadastro realizado! Faça login com suas credenciais.", "success");
      tabLogin.click();
    }
  });

  function showAuthMsg(msg, type) {
    const container = document.querySelector('#authMessageContainer');
    if (container) container.innerHTML = `<div class="auth-message ${type}">${msg}</div>`;
  }
}

// Mostra a tela de boas-vindas do UX Startup apenas uma vez por sessão (DESATIVADO temporariamente para futuro uso como notificações do admin)
/*
if (!sessionStorage.getItem('welcomeShown') && !window.location.search.includes('user=')) {
  const welcomeOverlay = document.querySelector('#welcomeOverlay');
  if (welcomeOverlay) {
    welcomeOverlay.classList.remove('hidden');
    document.querySelectorAll('.welcome-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        welcomeOverlay.classList.add('hidden');
        sessionStorage.setItem('welcomeShown', 'true');
        if (action === 'publish') {
          setView('profile');
        } else {
          setView(action);
        }
      });
    });
  }
}
*/

// Helper genérico para buscar dados da API adicionando cabeçalhos de autenticação
async function apiFetch(url, options = {}) {
  try {
    const separator = url.includes('?') ? '&' : '?';
    const userQuery = userParam ? `user=${userParam}` : '';
    const fullUrl = `${url}${userQuery ? separator + userQuery : ''}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    if (currentSession?.access_token) {
      headers['Authorization'] = `Bearer ${currentSession.access_token}`;
    }
    
    const res = await fetch(fullUrl, {
      ...options,
      headers
    });
    
    if (res.status === 401) {
      currentSession = null;
      currentUser = null;
      renderAuthScreen();
      return null;
    }
    
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Erro HTTP: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`Erro na chamada API para ${url}:`, err.message);
    return null;
  }
}

// Categoria mapeamento emoji
const categoryEmojis = {
  'Eletrônicos': '📱', 'Veículos': '🚗', 'Casa': '🏠',
  'Roupas': '👕', 'Alimentação': '🍔', 'Serviços': '🔧',
  'Pets': '🐶', 'Infantil': '👶', 'Outros': '📦', 'Geral': '📦'
};

// --- RENDERIZADORES DE TELAS ---

// 1. PÁGINA INICIAL
async function renderHome() {
  app.innerHTML = '<div class="text-center mt-4">Carregando portal do bairro...</div>';
  
  // Carrega informações do perfil (apenas se estiver logado) e feed inicial
  const profileData = (currentSession || userParam) ? await apiFetch('/api/profile') : null;
  const feedData = await apiFetch('/api/feed');

  const greetingName = profileData?.profile?.display_name || 'Vizinho';
  
  const news = feedData?.news || [];
  const products = feedData?.products || [];
  const alerts = feedData?.alerts || [];

  app.innerHTML = `
    <div class="animate-fade-in">
      <section class="hero">
        <div class="welcome-header">
          <h2>Bom dia, ${greetingName} 👋</h2>
          <p>Tudo do Jardim ABC na palma da sua mão.</p>
        </div>
        <div class="search-box">
          <input type="text" id="homeSearch" placeholder="O que você procura hoje?" />
          <button class="primary-button" style="padding: 10px 20px;" id="btnHomeSearch">Buscar</button>
        </div>
      </section>

      <!-- Grade de Atalhos -->
      <section class="shortcuts-grid">
        <div class="shortcut-card" data-view="explore">
          <span class="shortcut-icon">🛒</span>
          <strong>Comprar e vender</strong>
          <span>OLX local do bairro</span>
        </div>
        <div class="shortcut-card" data-view="news">
          <span class="shortcut-icon">📰</span>
          <strong>Notícias locais</strong>
          <span>O que acontece no bairro</span>
        </div>
        <div class="shortcut-card" data-view="bus">
          <span class="shortcut-icon">🚌</span>
          <strong>Horários de ônibus</strong>
          <span>Próximas partidas</span>
        </div>
        <div class="shortcut-card" id="btnShortcutMural">
          <span class="shortcut-icon">📢</span>
          <strong>Mural da comunidade</strong>
          <span>Avisos e comunicados</span>
        </div>
      </section>

      <!-- Mural e Avisos Importantes (Se houver) -->
      ${alerts.length > 0 ? `
        <section class="mb-4">
          <h2 class="section-title">📢 Avisos Importantes</h2>
          <div class="card-list">
            ${alerts.map(a => `
              <div class="feed-card" style="border-left: 5px solid ${a.is_urgent ? 'var(--yellow)' : 'var(--primary)'};">
                <div class="feed-body">
                  <div class="feed-tag ${a.is_urgent ? 'alerta' : ''}">${a.type}</div>
                  <h3>${a.title}</h3>
                  <p>${a.text}</p>
                  <div class="feed-meta">Publicado às ${a.time}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Últimas Notícias -->
      <section class="mb-4">
        <div class="section-title">
          <span>📰 Últimas Notícias</span>
          <span class="section-link" data-view="news">Ver tudo</span>
        </div>
        <div class="card-list">
          ${news.length > 0 ? news.map(n => `
            <div class="feed-card" data-news-id="${n.id}">
              ${n.cover_url ? `<img class="feed-image" src="${n.cover_url}" alt="${n.title}" />` : ''}
              <div class="feed-body">
                <div class="feed-tag">${n.category}</div>
                <h3>${n.title}</h3>
                <p>${n.summary}</p>
                <div class="feed-meta">Por <strong>${n.author_name || 'Redação'}</strong> • ${n.date}</div>
              </div>
            </div>
          `).join('') : '<p class="text-muted">Nenhuma notícia recente cadastrada.</p>'}
        </div>
      </section>

      <!-- Produtos adicionados hoje -->
      <section class="mb-4">
        <div class="section-title">
          <span>🛒 Classificados de Hoje</span>
          <span class="section-link" data-view="explore">Ver mercado</span>
        </div>
        <div class="product-grid">
          ${products.length > 0 ? products.map(p => `
            <div class="product-card" data-ad-id="${p.id}">
              <div class="product-image" style="background-image: url('${p.image_urls?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}')"></div>
              <div class="product-info">
                <span class="product-category">${categoryEmojis[p.category] || '📦'} ${p.category}</span>
                <span class="product-title">${p.title}</span>
                <span class="product-price">R$ ${(p.price_cents / 100).toFixed(2).replace('.', ',')}</span>
                <span class="product-location">📍 ${p.neighborhood}</span>
              </div>
            </div>
          `).join('') : '<p class="text-muted col-span-2">Nenhum produto anunciado hoje.</p>'}
        </div>
      </section>
    </div>
  `;

  // Vincular eventos
  document.querySelectorAll('.shortcuts-grid .shortcut-card, .section-title .section-link').forEach(el => {
    el.addEventListener('click', () => {
      const view = el.dataset.view;
      if (view) setView(view);
    });
  });

  // Atalho específico do Mural
  document.querySelector('#btnShortcutMural')?.addEventListener('click', () => {
    renderNews('Mural');
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      item.classList.toggle('is-active', item.dataset.view === 'news');
    });
  });

  // Busca na home
  document.querySelector('#btnHomeSearch')?.addEventListener('click', () => {
    const text = document.querySelector('#homeSearch').value;
    renderExplore(text);
  });

  // Clicar em notícia abre o detalhe (mural ou notícia)
  document.querySelectorAll('[data-news-id]').forEach(el => {
    el.addEventListener('click', async () => {
      const id = el.dataset.newsId;
      showNewsDetails(id);
    });
  });

  // Clicar em produto abre o detalhe
  document.querySelectorAll('[data-ad-id]').forEach(el => {
    el.addEventListener('click', () => {
      showAdDetails(el.dataset.adId);
    });
  });
}

// 2. COMPRAR E VENDER (MERCADO / EXPLORAR)
async function renderExplore(searchText = '') {
  app.innerHTML = '<div class="text-center mt-4">Carregando anúncios locais...</div>';

  const categories = ['Todos', 'Eletrônicos', 'Veículos', 'Casa', 'Roupas', 'Alimentação', 'Serviços', 'Pets', 'Infantil', 'Outros'];
  let currentCategory = 'Todos';

  async function loadListings(cat = 'Todos', search = '') {
    const queryStr = `?category=${encodeURIComponent(cat)}&search=${encodeURIComponent(search)}`;
    const ads = await apiFetch(`/api/ads${queryStr}`) || [];

    const grid = document.querySelector('#listingsGrid');
    if (!grid) return;

    if (ads.length === 0) {
      grid.innerHTML = '<div style="grid-column: span 2; text-align: center; color: var(--text-muted); padding: 40px 0;">Nenhum anúncio encontrado nesta categoria.</div>';
      return;
    }

    grid.innerHTML = ads.map(p => `
      <div class="product-card" data-ad-id="${p.id}">
        <div class="product-image" style="background-image: url('${p.image_urls?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}')"></div>
        <button class="favorite-btn" data-fav-id="${p.id}" aria-label="Favoritar">🤍</button>
        <div class="product-info">
          <span class="product-category">${categoryEmojis[p.category] || '📦'} ${p.category}</span>
          <span class="product-title">${p.title}</span>
          <span class="product-price">R$ ${(p.price_cents / 100).toFixed(2).replace('.', ',')}</span>
          <span class="product-location">📍 ${p.neighborhood}</span>
        </div>
      </div>
    `).join('');

    // Re-vincula eventos nos cards
    grid.querySelectorAll('.product-card').forEach(el => {
      // Evita disparar detalhe se clicar no botão de favoritar
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('favorite-btn')) return;
        showAdDetails(el.dataset.adId);
      });
    });

    // Vincula favoritos
    grid.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetId = btn.dataset.favId;
        const res = await apiFetch('/api/favorites/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId })
        });
        if (res && res.success) {
          btn.textContent = res.favorited ? '❤️' : '🤍';
          btn.classList.toggle('active', res.favorited);
        }
      });
    });

    // Marcar anúncios que já estão favoritados
    if (currentSession || userParam) {
      const favs = await apiFetch('/api/favorites') || [];
      favs.forEach(f => {
        const btn = grid.querySelector(`.favorite-btn[data-fav-id="${f.id}"]`);
        if (btn) {
          btn.textContent = '❤️';
          btn.classList.add('active');
        }
      });
    }
  }

  app.innerHTML = `
    <div class="animate-fade-in">
      <div class="section-title">
        <span>🛒 Comprar e Vender</span>
        <button class="primary-button" id="btnOpenPublishAd" style="padding: 8px 16px; font-size: 13px;">+ Anunciar</button>
      </div>

      <!-- Barra de Pesquisa -->
      <div class="search-box mb-4">
        <input type="text" id="exploreSearch" placeholder="Buscar no mercado..." value="${searchText}" />
        <button class="primary-button" style="padding: 10px 20px;" id="btnSearchAds">Buscar</button>
      </div>

      <!-- Slider de Categorias -->
      <div class="category-row">
        ${categories.map((c, i) => `
          <button class="chip ${i === 0 ? 'is-active' : ''}" data-cat="${c}">
            <span class="chip-emoji">${categoryEmojis[c] || '📦'}</span>${c}
          </button>
        `).join('')}
      </div>

      <!-- Grade de Produtos -->
      <div class="product-grid" id="listingsGrid">
        Carregando anúncios...
      </div>
    </div>
  `;

  // Bind dos Chips de Categoria
  document.querySelectorAll('.category-row .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.category-row .chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      currentCategory = chip.dataset.cat;
      loadListings(currentCategory, document.querySelector('#exploreSearch').value);
    });
  });

  // Botão Pesquisa
  document.querySelector('#btnSearchAds').addEventListener('click', () => {
    loadListings(currentCategory, document.querySelector('#exploreSearch').value);
  });

  // Botão Anunciar
  document.querySelector('#btnOpenPublishAd').addEventListener('click', () => {
    showPublishForm("Comprar e Vender");
  });

  // Carrega listagem inicial
  loadListings(currentCategory, searchText);
}

// 3. NOTÍCIAS
async function renderNews(initialCategory = 'Todos') {
  app.innerHTML = '<div class="text-center mt-4">Carregando notícias do Jardim ABC...</div>';

  const categories = ['Todos', 'Polícia', 'Obras', 'Saúde', 'Eventos', 'Escolas', 'Utilidade Pública', 'Mural'];
  let currentCategory = initialCategory;

  async function loadNewsList(cat = 'Todos') {
    const list = await apiFetch(`/api/news?category=${encodeURIComponent(cat)}`) || [];
    const listContainer = document.querySelector('#newsListContainer');
    if (!listContainer) return;

    if (list.length === 0) {
      listContainer.innerHTML = '<div class="text-center text-muted" style="padding: 40px 0;">Nenhuma notícia ou comunicado nesta categoria.</div>';
      return;
    }

    listContainer.innerHTML = list.map(n => `
      <div class="feed-card animate-fade-in" data-news-id="${n.id}">
        ${n.cover_url ? `<img class="feed-image" src="${n.cover_url}" alt="${n.title}" />` : ''}
        <div class="feed-body">
          <div class="feed-tag ${n.is_urgent ? 'alerta' : ''}">${n.category}</div>
          <h3>${n.title}</h3>
          <p>${n.summary}</p>
          <div class="feed-meta">Por <strong>${n.author_name || 'Redação'}</strong> • ${n.date}</div>
        </div>
      </div>
    `).join('');

    listContainer.querySelectorAll('.feed-card').forEach(card => {
      card.addEventListener('click', () => {
        showNewsDetails(card.dataset.newsId);
      });
    });
  }

  app.innerHTML = `
    <div class="animate-fade-in">
      <div class="section-title">
        <span>📰 Notícias e Comunicados</span>
        <button class="primary-button" id="btnPublishMural" style="padding: 8px 16px; font-size: 13px;">📢 Postar no Mural</button>
      </div>

      <!-- Slider de Categorias -->
      <div class="category-row">
        ${categories.map(c => `
          <button class="chip ${c === currentCategory ? 'is-active' : ''}" data-news-cat="${c}">
            ${c}
          </button>
        `).join('')}
      </div>

      <!-- Lista de Notícias -->
      <div class="card-list" id="newsListContainer">
        Carregando notícias...
      </div>
    </div>
  `;

  // Bind Chips
  document.querySelectorAll('[data-news-cat]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-news-cat]').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      currentCategory = chip.dataset.newsCat;
      loadNewsList(currentCategory);
    });
  });

  // Botão Mural
  document.querySelector('#btnPublishMural').addEventListener('click', () => {
    showPublishForm("Mural");
  });

  loadNewsList(currentCategory);
}

// 4. ÔNIBUS
async function renderBus() {
  app.innerHTML = '<div class="text-center mt-4">Carregando horários de ônibus...</div>';

  const busData = await apiFetch('/api/bus');
  if (!busData || busData.routes.length === 0) {
    app.innerHTML = '<div class="text-center text-muted mt-4">Nenhuma linha de ônibus cadastrada.</div>';
    return;
  }

  const routes = busData.routes;
  let schedules = busData.schedules;
  let selectedRouteId = busData.selectedRouteId;

  function renderSchedulesSection() {
    const list = document.querySelector('#busSchedulesList');
    if (!list) return;

    if (schedules.length === 0) {
      list.innerHTML = '<p class="text-muted">Sem horários cadastrados para hoje.</p>';
      return;
    }

    // Identificar qual horário é o mais próximo
    const now = new Date();
    const currentHourStr = now.toLocaleTimeString('pt-BR', { hour12: false }).substring(0, 5);

    const selectedRoute = routes.find(r => r.id === selectedRouteId) || routes[0];

    list.innerHTML = `
      <div class="bus-info-header">
        <div>
          <span class="eyebrow" style="color: var(--secondary);">Linha ativa</span>
          <h3>${selectedRoute.name}</h3>
        </div>
        <span class="bus-price">Tarifa: ${busData.fare}</span>
      </div>
      <p class="mb-4" style="font-size: 14px; color: var(--text-muted);">
        ${selectedRoute.description || 'Horários válidos para dias úteis.'}
      </p>
      
      <div class="time-grid">
        ${schedules.map(s => {
          const isNext = s.time >= currentHourStr;
          return `
            <div class="time-chip ${isNext ? 'next' : ''}" title="${isNext ? 'Próxima partida' : 'Já partiu'}">
              ${s.time}
            </div>
          `;
        }).join('')}
      </div>
      
      <div class="mt-4" style="background: var(--bg-color); border-radius: 16px; padding: 16px; font-size: 13px; color: var(--text-muted); text-align: center;">
        🗺️ Integração com mapa em tempo real planejada para a Fase 2 do projeto.
      </div>
    `;
  }

  app.innerHTML = `
    <div class="animate-fade-in">
      <div class="section-title">
        <span>🚌 Horários de Ônibus</span>
      </div>

      <div class="field bus-selector">
        <span>Selecione a Linha</span>
        <select id="selectBusRoute">
          ${routes.map(r => `<option value="${r.id}" ${r.id === selectedRouteId ? 'selected' : ''}>${r.name}</option>`).join('')}
        </select>
      </div>

      <div class="bus-schedule-card" id="busSchedulesList">
        <!-- Renderizado dinamicamente -->
      </div>
    </div>
  `;

  // Bind do Seletor de Linhas
  document.querySelector('#selectBusRoute').addEventListener('change', async (e) => {
    const routeId = e.target.value;
    const data = await apiFetch(`/api/bus?routeId=${routeId}`);
    if (data) {
      schedules = data.schedules;
      selectedRouteId = routeId;
      renderSchedulesSection();
    }
  });

  renderSchedulesSection();
}

// 5. PERFIL & PAINEL ADMIN
async function renderProfile() {
  app.innerHTML = '<div class="text-center mt-4">Carregando perfil...</div>';

  const data = await apiFetch('/api/profile');
  if (!data) {
    app.innerHTML = '<div class="text-center text-muted mt-4">Erro ao carregar dados de usuário.</div>';
    return;
  }

  const p = data.profile;
  const stats = data.stats;
  const isAdmin = data.isAdmin;
  const isBusiness = data.isBusiness;
  const userDisplayName = p.display_name || p.full_name || 'Usuário';

  app.innerHTML = `
    <div class="animate-fade-in" id="profileTabContent">
      <div class="section-title">
        <span>👤 Meu Perfil</span>
      </div>

      <div class="profile-card">
        <div class="profile-avatar" style="background-image: url('${p.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}')"></div>
        <div class="profile-info">
          <h3>${userDisplayName}</h3>
          <p>📞 ${p.phone || p.whatsapp || 'Sem telefone'}</p>
          <p>📍 ${p.neighborhood}</p>
          <p style="margin-top: 4px;">
            <span class="profile-tier-badge ${isAdmin ? 'admin' : isBusiness ? 'business' : 'resident'}">
              ${isAdmin ? '⚙️ Administrador' : isBusiness ? '💼 Perfil Business' : '👤 Perfil Residente'}
            </span>
          </p>
        </div>
      </div>

      <!-- Upgrade para Business (se residente) -->
      ${(!isAdmin && !isBusiness) ? `
        <div class="upgrade-business-box animate-fade-in" style="background: linear-gradient(135deg, rgba(66, 133, 244, 0.1), rgba(52, 168, 83, 0.1)); border: 1px solid var(--border-color); padding: 18px; border-radius: 16px; margin: 16px 0; text-align: center;">
          <h4 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: var(--text-dark);">💼 Ative seu Perfil Business</h4>
          <p style="margin: 0 0 12px 0; font-size: 13px; color: var(--text-muted);">Publique produtos ilimitados no mercado e múltiplos avisos no mural do bairro.</p>
          <button class="primary-button w-full" id="btnUpgradeProfileBusiness" style="padding: 10px 16px; background-color: var(--primary);">Ativar Perfil Business</button>
        </div>
      ` : ''}

      ${isBusiness ? `
        <div class="upgrade-business-box animate-fade-in" style="background: rgba(52, 168, 83, 0.08); border: 1px solid rgba(52, 168, 83, 0.2); padding: 16px; border-radius: 16px; margin: 16px 0; text-align: center;">
          <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #2e7d32;">💼 Perfil Business Ativo</h4>
          <p style="margin: 0; font-size: 12px; color: #388e3c;">Parabéns! Você tem acesso ilimitado para cadastrar produtos e mural.</p>
        </div>
      ` : ''}

      <!-- Links do Menu do Perfil -->
      <div class="profile-menu-list">
        <div class="profile-menu-item" id="btnMyAds">
          <span>🛒 Meus Anúncios</span>
          <strong>${stats.ads} anúncios ➔</strong>
        </div>
        <div class="profile-menu-item" id="btnMyFavorites">
          <span>❤️ Meus Favoritos</span>
          <strong>${stats.favorites} itens ➔</strong>
        </div>
        ${isAdmin ? `
          <div class="profile-menu-item" id="btnAdminPanel" style="border-color: var(--primary); background: rgba(46, 125, 50, 0.05);">
            <span style="color: var(--primary); font-weight: 700;">⚙️ Painel Administrativo</span>
            <strong style="color: var(--primary);">Acessar ➔</strong>
          </div>
        ` : ''}
        <div class="profile-menu-item" id="btnSettings">
          <span>⚙️ Configurações da Conta</span>
          <span>Editar ➔</span>
        </div>
        <div class="profile-menu-item" id="btnLogout" style="border-color: #d32f2f; background: rgba(211, 47, 47, 0.05);">
          <span style="color: #d32f2f; font-weight: 700;">🚪 Sair da Conta</span>
          <strong style="color: #d32f2f;">Logout ➔</strong>
        </div>
      </div>
    </div>
  `;

  // Bind Eventos do Menu do Perfil
  document.querySelector('#btnMyAds').addEventListener('click', () => showUserAds(userDisplayName));
  document.querySelector('#btnMyFavorites').addEventListener('click', showFavoritesList);
  document.querySelector('#btnSettings').addEventListener('click', () => alert("Configurações da conta - funcionalidade planejada."));
  document.querySelector('#btnLogout').addEventListener('click', async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
      alert("Desconectado com sucesso!");
    } else {
      window.location.search = '';
    }
  });
  
  if (isAdmin) {
    document.querySelector('#btnAdminPanel').addEventListener('click', renderAdminPanel);
  }

  if (document.querySelector('#btnUpgradeProfileBusiness')) {
    document.querySelector('#btnUpgradeProfileBusiness').addEventListener('click', async () => {
      const token = currentSession?.access_token;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const userQuery = userParam ? `?user=${userParam}` : '';
      const upgradeRes = await fetch(`/api/profile/upgrade-business${userQuery}`, {
        method: 'POST',
        headers
      });
      if (upgradeRes.ok) {
        alert("Parabéns! Seu perfil Business foi ativado com sucesso.");
        renderProfile(); // Recarrega o perfil
      } else {
        alert("Erro ao ativar perfil Business.");
      }
    });
  }
}

// --- DETALHES DE ANÚNCIO (MARKETPLACE) ---
async function showAdDetails(id) {
  const ad = await apiFetch(`/api/ads/${id}`);
  if (!ad) {
    alert("Erro ao carregar detalhes do anúncio.");
    return;
  }

  if (ad.is_featured && !currentSession && !userParam) {
    setPostAuthRedirect({ type: 'adDetails', id: id });
    renderAuthScreen();
    return;
  }

  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) bottomNav.style.display = 'flex';

  navItems.forEach(item => {
    item.classList.toggle('is-active', item.dataset.view === 'explore');
  });

  const price = (ad.price_cents / 100).toFixed(2).replace('.', ',');
  const images = ad.image_urls && ad.image_urls.length > 0 ? ad.image_urls : ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'];

  app.innerHTML = `
    <div class="animate-fade-in detail-view">
      <div id="detailMainImage" class="detail-image" style="background-image: url('${images[0]}')"></div>
      
      ${images.length > 1 ? `
        <div class="detail-thumbnails" style="display: flex; gap: 8px; padding: 12px 20px; background: var(--white); overflow-x: auto; border-bottom: 1px solid var(--border-color); scrollbar-width: none;">
          ${images.map((img, index) => `
            <div class="detail-thumb-item ${index === 0 ? 'active' : ''}" 
                 data-img-index="${index}"
                 style="width: 50px; height: 50px; border-radius: 8px; border: 2px solid ${index === 0 ? 'var(--primary)' : 'var(--border-color)'}; background-image: url('${img}'); background-size: cover; background-position: center; cursor: pointer; flex-shrink: 0; transition: var(--transition);">
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="detail-body">
        <span class="feed-tag">${ad.category}</span>
        <div class="detail-price">R$ ${price}</div>
        <h2 class="detail-title">${ad.title}</h2>
        <div class="detail-location">📍 Publicado por <strong>${ad.seller_name}</strong> em ${ad.neighborhood} no dia ${ad.date}</div>
        
        <p class="detail-description">${ad.description || 'Sem descrição fornecida.'}</p>

        <a class="whatsapp-button" href="https://wa.me/55${ad.whatsapp}?text=Olá,%20vi%20seu%20anúncio%20'${encodeURIComponent(ad.title)}'%20no%20app%20Meu%20Jardim%20ABC.%20Ainda%20está%20disponível?" target="_blank">
          💬 Conversar no WhatsApp
        </a>

        <button class="secondary-button w-full mt-4" id="btnBackToExplore">⬅️ Voltar</button>
      </div>
    </div>
  `;

  if (images.length > 1) {
    document.querySelectorAll('.detail-thumb-item').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const index = parseInt(thumb.dataset.imgIndex, 10);
        document.querySelector('#detailMainImage').style.backgroundImage = `url('${images[index]}')`;
        document.querySelectorAll('.detail-thumb-item').forEach(t => t.style.borderColor = 'var(--border-color)');
        thumb.style.borderColor = 'var(--primary)';
      });
    });
  }

  document.querySelector('#btnBackToExplore').addEventListener('click', () => {
    setView('explore');
  });
}

// --- DETALHES DE NOTÍCIA ---
async function showNewsDetails(id) {
  app.innerHTML = '<div class="text-center mt-4">Carregando detalhes...</div>';
  const n = await apiFetch(`/api/news/${id}`);

  if (!n || n.error) {
    alert("Não foi possível carregar esta publicação.");
    setView('news');
    return;
  }

  app.innerHTML = `
    <div class="animate-fade-in" style="background: var(--white); border-radius: 28px; border: 1px solid var(--border-color); padding: 24px;">
      ${n.cover_url ? `<img src="${n.cover_url}" style="width: 100%; height: 220px; object-fit: cover; border-radius: 16px; margin-bottom: 20px;" />` : ''}
      <span class="feed-tag ${n.is_urgent ? 'alerta' : ''}">${n.category}</span>
      <h2 style="font-size: 24px; font-weight: 800; margin: 12px 0; line-height: 1.3;">${n.title}</h2>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">📅 Publicado por <strong>${n.author_name || 'Redação'}</strong> em ${n.date || 'Hoje'}</p>
      
      <div style="font-size: 16px; line-height: 1.6; color: var(--text-dark); border-top: 1px solid var(--border-color); padding-top: 20px; margin-bottom: 24px;">
        ${n.body || n.summary}
      </div>

      <button class="primary-button w-full" id="btnBackToNews">⬅️ Voltar</button>
    </div>
  `;

  document.querySelector('#btnBackToNews').addEventListener('click', () => {
    setView('news');
  });
}

// --- FORMULÁRIO DE PUBLICAÇÃO ---
function showPublishForm(initialType = "Comprar e Vender") {
  if (!currentSession && !userParam) {
    setPostAuthRedirect({ type: 'publish', initialType: initialType });
    renderAuthScreen();
    return;
  }

  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) bottomNav.style.display = 'flex';

  const categories = ['Eletrônicos', 'Veículos', 'Casa', 'Roupas', 'Alimentação', 'Serviços', 'Pets', 'Infantil', 'Outros'];
  let selectedImagesBase64 = [];

  app.innerHTML = `
    <div class="animate-fade-in" style="background: var(--white); border-radius: 28px; border: 1px solid var(--border-color); padding: 24px;">
      <h2 class="mb-4">Criar Publicação</h2>
      
      <form id="frmPublish">
        <div class="field">
          <span>Tipo de publicação</span>
          <select id="pubType">
            <option value="Comprar e Vender" ${initialType === 'Comprar e Vender' ? 'selected' : ''}>🛒 Anúncio de Compra e Venda</option>
            <option value="Mural" ${initialType === 'Mural' ? 'selected' : ''}>📢 Comunicado / Mural</option>
          </select>
        </div>

        <div class="field" id="adCategoryField">
          <span>Categoria do Produto</span>
          <select id="pubCategory">
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>

        <div class="field" id="adPriceField">
          <span>Preço (R$)</span>
          <input type="number" id="pubPrice" step="0.01" placeholder="Ex: 45,00" />
        </div>

        <div class="field" id="adPhotosField">
          <span>Fotos da Publicação</span>
          <label for="pubPhotos" class="custom-file-upload">
            <div class="upload-icon">📸</div>
            <strong>Toque ou arraste fotos aqui</strong>
            <small>PNG, JPG ou JPEG (máximo 6 arquivos)</small>
          </label>
          <input type="file" id="pubPhotos" accept="image/*" multiple style="display: none;" />
          <div id="photosPreviewContainer"></div>
        </div>

        <div class="field">
          <span>Título da publicação</span>
          <input type="text" id="pubTitle" placeholder="Ex: Vendo Bicicleta Aro 29 em ótimo estado" required />
        </div>

        <div class="field">
          <span>Descrição detalhada</span>
          <textarea id="pubDescription" rows="5" placeholder="Descreva os detalhes da publicação..." required></textarea>
        </div>

        <button type="submit" class="primary-button w-full mt-4">🚀 Publicar Agora</button>
        <button type="button" class="secondary-button w-full mt-4" id="btnCancelPublish">Cancelar</button>
      </form>
    </div>
  `;

  const pubType = document.querySelector('#pubType');
  const catField = document.querySelector('#adCategoryField');
  const priceField = document.querySelector('#adPriceField');
  const photosField = document.querySelector('#adPhotosField');
  const photosInput = document.querySelector('#pubPhotos');
  const previewContainer = document.querySelector('#photosPreviewContainer');

  function toggleFields() {
    if (pubType.value === "Comprar e Vender") {
      catField.style.display = 'flex';
      priceField.style.display = 'flex';
      photosField.style.display = 'flex';
      photosField.querySelector('span').textContent = 'Fotos do Produto (Até 6 fotos)';
    } else {
      catField.style.display = 'none';
      priceField.style.display = 'none';
      photosField.style.display = 'flex';
      photosField.querySelector('span').textContent = 'Imagem do Comunicado (Opcional)';
    }
  }

  pubType.addEventListener('change', toggleFields);
  toggleFields();

  // Tratamento de Fotos do Produto (Redimensionamento via Canvas e conversão para Base64 compacta)
  photosInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files).slice(0, 6);
    previewContainer.innerHTML = '';
    selectedImagesBase64 = [];

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 400; // tamanho máximo
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Comprime imagem para JPEG para ficar extremamente leve no banco
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          selectedImagesBase64.push(dataUrl);

          // Criar miniatura moderna com botão de remover
          const thumb = document.createElement('div');
          thumb.className = 'photo-preview-item animate-fade-in';
          thumb.style.backgroundImage = `url('${dataUrl}')`;
          
          const removeBtn = document.createElement('button');
          removeBtn.className = 'remove-btn';
          removeBtn.innerHTML = '×';
          removeBtn.type = 'button';
          removeBtn.addEventListener('click', () => {
            const index = selectedImagesBase64.indexOf(dataUrl);
            if (index > -1) {
              selectedImagesBase64.splice(index, 1);
            }
            thumb.remove();
          });
          
          thumb.appendChild(removeBtn);
          previewContainer.appendChild(thumb);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  document.querySelector('#btnCancelPublish').addEventListener('click', () => {
    setView(initialType === 'Mural' ? 'news' : 'explore');
  });

  document.querySelector('#frmPublish').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = pubType.value;
    const title = document.querySelector('#pubTitle').value;
    const description = document.querySelector('#pubDescription').value;
    const category = document.querySelector('#pubCategory').value;
    const price = document.querySelector('#pubPrice').value;

    const token = currentSession?.access_token;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const userQuery = userParam ? `?user=${userParam}` : '';

    try {
      const response = await fetch(`/api/publish${userQuery}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, title, description, price, category, images: selectedImagesBase64 })
      });

      if (response.ok) {
        alert("Publicado com sucesso!");
        if (type === 'Mural') {
          renderNews('Mural');
          document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.classList.toggle('is-active', item.dataset.view === 'news');
          });
        } else {
          setView('explore');
        }
      } else {
        const errBody = await response.json().catch(() => ({}));
        if (response.status === 403 && (errBody.code === 'LIMIT_ADS' || errBody.code === 'LIMIT_MURAL')) {
          const confirmUpgrade = confirm(`${errBody.message}\n\nDeseja ativar seu perfil Business agora para poder publicar?`);
          if (confirmUpgrade) {
            const upgradeRes = await fetch(`/api/profile/upgrade-business${userQuery}`, {
              method: 'POST',
              headers
            });
            if (upgradeRes.ok) {
              alert("Perfil Business ativado com sucesso! Agora você pode publicar sem limites. Tente enviar sua publicação novamente.");
            } else {
              alert("Erro ao ativar perfil Business.");
            }
          }
        } else {
          alert(errBody.error || "Erro ao publicar anúncio.");
        }
      }
    } catch (err) {
      alert("Erro ao conectar com o servidor.");
    }
  });
}

// --- MEUS ANÚNCIOS ---
async function showUserAds(name) {
  app.innerHTML = '<div class="text-center mt-4">Carregando seus anúncios...</div>';
  const profileData = await apiFetch('/api/profile');
  const ads = await apiFetch('/api/ads') || [];
  
  // Filtra anúncios do vendedor logado
  const myAds = ads.filter(ad => ad.seller_name === name);

  app.innerHTML = `
    <div class="animate-fade-in">
      <div class="section-title">
        <span>🛒 Meus Anúncios</span>
        <span class="section-link" id="btnBackToProfile">Voltar Perfil</span>
      </div>
      <div class="product-grid">
        ${myAds.length > 0 ? myAds.map(p => `
          <div class="product-card" data-ad-id="${p.id}">
            <div class="product-image" style="background-image: url('${p.image_urls?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}')"></div>
            <div class="product-info">
              <span class="product-category">${categoryEmojis[p.category] || '📦'} ${p.category}</span>
              <span class="product-title">${p.title}</span>
              <span class="product-price">R$ ${(p.price_cents / 100).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        `).join('') : '<p class="text-muted col-span-2">Você ainda não publicou nenhum anúncio.</p>'}
      </div>
    </div>
  `;

  document.querySelector('#btnBackToProfile').addEventListener('click', renderProfile);
  document.querySelectorAll('[data-ad-id]').forEach(el => {
    el.addEventListener('click', () => {
      showAdDetails(el.dataset.adId);
    });
  });
}

// --- FAVORITOS ---
async function showFavoritesList() {
  app.innerHTML = '<div class="text-center mt-4">Carregando seus favoritos...</div>';
  const favs = await apiFetch('/api/favorites') || [];

  app.innerHTML = `
    <div class="animate-fade-in">
      <div class="section-title">
        <span>❤️ Meus Favoritos</span>
        <span class="section-link" id="btnBackToProfile">Voltar Perfil</span>
      </div>
      <div class="product-grid">
        ${favs.length > 0 ? favs.map(p => `
          <div class="product-card" data-ad-id="${p.id}">
            <div class="product-image" style="background-image: url('${p.image_urls?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}')"></div>
            <div class="product-info">
              <span class="product-category">${categoryEmojis[p.category] || '📦'} ${p.category}</span>
              <span class="product-title">${p.title}</span>
              <span class="product-price">R$ ${(p.price_cents / 100).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        `).join('') : '<p class="text-muted col-span-2">Nenhum favorito salvo ainda.</p>'}
      </div>
    </div>
  `;

  document.querySelector('#btnBackToProfile').addEventListener('click', renderProfile);
  document.querySelectorAll('[data-ad-id]').forEach(el => {
    el.addEventListener('click', () => {
      showAdDetails(el.dataset.adId);
    });
  });
}

// --- PAINEL ADMINISTRATIVO REAL (CRUD NO CLIENTE) ---
async function renderAdminPanel() {
  app.innerHTML = '<div class="text-center mt-4">Carregando Painel Admin...</div>';
  
  app.innerHTML = `
    <div class="animate-fade-in admin-layout">
      <div class="admin-header">
        <span class="eyebrow" style="color: var(--primary);">Painel de Controle</span>
        <h2>Administração Meu Jardim ABC</h2>
      </div>

      <div class="admin-tabs">
        <button class="admin-tab-btn active" id="tabAdminNews">Notícias</button>
        <button class="admin-tab-btn" id="tabAdminBus">Ônibus</button>
        <button class="admin-tab-btn" id="tabAdminAds">Anúncios</button>
        <button class="admin-tab-btn" id="tabAdminUsers">Usuários</button>
        <button class="admin-tab-btn" id="tabAdminBroadcast" style="background: #ffe082; color: #5d4037;">📢 Broadcast</button>
        <button class="admin-tab-btn" id="btnExitAdmin" style="background: var(--primary); color: white;">Voltar Perfil</button>
      </div>

      <div id="adminTabContent">
        <!-- Renderizado dinamicamente com base nas abas -->
      </div>
    </div>
  `;

  // Bind dos botões das abas
  document.querySelector('#tabAdminNews').addEventListener('click', () => switchAdminTab('news'));
  document.querySelector('#tabAdminBus').addEventListener('click', () => switchAdminTab('bus'));
  document.querySelector('#tabAdminAds').addEventListener('click', () => switchAdminTab('ads'));
  document.querySelector('#tabAdminUsers').addEventListener('click', () => switchAdminTab('users'));
  document.querySelector('#tabAdminBroadcast').addEventListener('click', () => switchAdminTab('broadcast'));
  document.querySelector('#btnExitAdmin').addEventListener('click', renderProfile);

  // Inicializa na aba notícias
  switchAdminTab('news');
}

async function switchAdminTab(tabName) {
  const content = document.querySelector('#adminTabContent');
  if (!content) return;

  // Atualiza classe ativa dos botões
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === `tabAdmin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  });

  content.innerHTML = '<div class="text-center">Buscando dados...</div>';

  if (tabName === 'news') {
    const list = await apiFetch('/api/admin/news') || [];
    content.innerHTML = `
      <div class="animate-fade-in">
        <h3 class="mb-4">Gerenciar Notícias</h3>
        <button class="primary-button mb-4" id="btnAdminAddNews" style="font-size: 13px;">+ Criar Notícia</button>
        
        <table class="admin-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Categoria</th>
              <th>Urgente</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(n => `
              <tr>
                <td><strong>${n.title}</strong></td>
                <td>${n.category}</td>
                <td>${n.is_urgent ? '⚠️ Sim' : 'Não'}</td>
                <td>${n.date}</td>
                <td>
                  <button class="admin-action-btn delete" data-delete-news-id="${n.id}">Excluir</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Ação Adicionar
    document.querySelector('#btnAdminAddNews').addEventListener('click', showAddNewsForm);

    // Ação Deletar
    content.querySelectorAll('[data-delete-news-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm("Deseja realmente excluir esta notícia?")) return;
        const res = await apiFetch(`/api/admin/news/${btn.dataset.deleteNewsId}`, { method: 'DELETE' });
        if (res && res.success) {
          switchAdminTab('news');
        }
      });
    });

  } else if (tabName === 'bus') {
    const data = await apiFetch('/api/admin/bus');
    if (!data) return;
    content.innerHTML = `
      <div class="animate-fade-in">
        <h3 class="mb-4">Gerenciar Horários de Ônibus</h3>
        
        <form id="frmAdminAddBus" class="mb-4" style="background: var(--bg-color); padding: 16px; border-radius: 16px;">
          <div class="field">
            <span>Selecione a Linha</span>
            <select id="adminBusRouteId" required>
              ${data.routes.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <span>Horário de Partida (HH:MM)</span>
            <input type="time" id="adminBusTime" required />
          </div>
          <div class="field">
            <span>Notas/Observações</span>
            <input type="text" id="adminBusNotes" placeholder="Ex: Apenas dias úteis" />
          </div>
          <button type="submit" class="primary-button" style="font-size: 13px;">+ Adicionar Horário</button>
        </form>

        <table class="admin-table">
          <thead>
            <tr>
              <th>Linha</th>
              <th>Horário</th>
              <th>Notas</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${data.schedules.map(s => `
              <tr>
                <td>${s.route}</td>
                <td><strong>${s.time}</strong></td>
                <td>${s.notes || '-'}</td>
                <td>
                  <button class="admin-action-btn delete" data-delete-bus-id="${s.id}">Remover</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Formulário Adicionar
    document.querySelector('#frmAdminAddBus').addEventListener('submit', async (e) => {
      e.preventDefault();
      const routeId = document.querySelector('#adminBusRouteId').value;
      const departureTime = document.querySelector('#adminBusTime').value;
      const notes = document.querySelector('#adminBusNotes').value;

      const res = await apiFetch('/api/admin/bus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId, departureTime, notes })
      });

      if (res && res.success) {
        switchAdminTab('bus');
      }
    });

    // Remover
    content.querySelectorAll('[data-delete-bus-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm("Remover este horário de ônibus?")) return;
        const res = await apiFetch(`/api/admin/bus/${btn.dataset.deleteBusId}`, { method: 'DELETE' });
        if (res && res.success) {
          switchAdminTab('bus');
        }
      });
    });

  } else if (tabName === 'ads') {
    const list = await apiFetch('/api/admin/ads') || [];
    content.innerHTML = `
      <div class="animate-fade-in">
        <h3 class="mb-4">Moderar Anúncios (Classificados)</h3>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Categoria</th>
              <th>Vendedor</th>
              <th>Preço</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(ad => `
              <tr>
                <td><strong>${ad.title}</strong></td>
                <td>${ad.category}</td>
                <td>${ad.seller}</td>
                <td>R$ ${(ad.price_cents / 100).toFixed(2).replace('.', ',')}</td>
                <td>${ad.status}</td>
                <td>
                  <button class="admin-action-btn delete" data-delete-ad-id="${ad.id}">Excluir</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Ação Deletar
    content.querySelectorAll('[data-delete-ad-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm("Deseja banir/excluir este anúncio permanentemente?")) return;
        const res = await apiFetch(`/api/admin/ads/${btn.dataset.deleteAdId}`, { method: 'DELETE' });
        if (res && res.success) {
          switchAdminTab('ads');
        }
      });
    });

  } else if (tabName === 'users') {
    const list = await apiFetch('/api/admin/users') || [];
    content.innerHTML = `
      <div class="animate-fade-in">
        <h3 class="mb-4">Gerenciar Usuários e Moradores</h3>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(u => `
              <tr>
                <td><strong>${u.name}</strong></td>
                <td>${u.email || '-'}</td>
                <td>${u.phone || '-'}</td>
                <td><span style="color: ${u.status === 'blocked' ? 'red' : 'green'}; font-weight: bold;">${u.status}</span></td>
                <td>
                  ${u.status !== 'blocked' ? `<button class="admin-action-btn delete" data-block-user-id="${u.id}">Bloquear</button>` : 'Bloqueado'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    content.querySelectorAll('[data-block-user-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm("Deseja bloquear este usuário permanentemente?")) return;
        const res = await apiFetch(`/api/admin/users/${btn.dataset.blockUserId}`, { method: 'DELETE' });
        if (res && res.success) {
          switchAdminTab('users');
        }
      });
    });

  } else if (tabName === 'broadcast') {
    content.innerHTML = `
      <div class="animate-fade-in" style="background: var(--bg-color); padding: 20px; border-radius: 20px;">
        <h3 class="mb-4">📢 Enviar Notificação Geral / Alerta</h3>
        <p class="mb-4" style="font-size: 13px; color: var(--text-muted);">
          Essa ferramenta dispara um aviso urgente que ficará no topo da tela inicial de todos os moradores.
        </p>

        <form id="frmAdminBroadcast">
          <div class="field">
            <span>Título do Alerta Urgente</span>
            <input type="text" id="bcastTitle" placeholder="Ex: Falta de água na quadra 18 hoje" required />
          </div>
          <div class="field">
            <span>Mensagem / Conteúdo</span>
            <textarea id="bcastBody" rows="4" placeholder="Informe os detalhes do ocorrido ou aviso importante..." required></textarea>
          </div>
          <button type="submit" class="primary-button w-full mt-4" style="background: #e65100; box-shadow: 0 4px 10px rgba(230,81,0,0.2);">🔥 Disparar Alerta Geral</button>
        </form>
      </div>
    `;

    document.querySelector('#frmAdminBroadcast').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.querySelector('#bcastTitle').value;
      const body = document.querySelector('#bcastBody').value;

      const res = await apiFetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary: body,
          body,
          category: 'Utilidade Pública',
          is_urgent: true
        })
      });

      if (res && res.success) {
        alert("Alerta geral disparado com sucesso!");
        switchAdminTab('news');
      }
    });
  }
}

// Formulário de Criação de Notícia pelo Admin
function showAddNewsForm() {
  const content = document.querySelector('#adminTabContent');
  if (!content) return;

  const categories = ['Polícia', 'Obras', 'Saúde', 'Eventos', 'Escolas', 'Utilidade Pública', 'Mural'];
  let selectedCoverImageBase64 = null;

  content.innerHTML = `
    <div class="animate-fade-in" style="background: var(--bg-color); padding: 20px; border-radius: 20px;">
      <h3 class="mb-4">Escrever Notícia / Comunicado</h3>
      
      <form id="frmAdminAddNews">
        <div class="field">
          <span>Categoria</span>
          <select id="adminNewsCat">
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <span>Título</span>
          <input type="text" id="adminNewsTitle" placeholder="Digite o título da notícia" required />
        </div>
        
        <div class="field" id="adminNewsPhotoField">
          <span>Foto de Capa (Opcional)</span>
          <label for="adminNewsPhoto" class="custom-file-upload">
            <div class="upload-icon">🖼️</div>
            <strong>Selecione uma imagem de capa</strong>
            <small>PNG, JPG ou JPEG</small>
          </label>
          <input type="file" id="adminNewsPhoto" accept="image/*" style="display: none;" />
          <div id="adminNewsPhotoPreview"></div>
        </div>

        <div class="field">
          <span>Resumo (Aparece na listagem)</span>
          <input type="text" id="adminNewsSummary" placeholder="Breve introdução da notícia" required />
        </div>
        <div class="field">
          <span>Texto Completo</span>
          <textarea id="adminNewsBody" rows="5" placeholder="Escreva a matéria ou comunicado aqui..." required></textarea>
        </div>
        <div class="field" style="flex-direction: row; gap: 10px; align-items: center; cursor: pointer;">
          <input type="checkbox" id="adminNewsUrgent" />
          <span>⚠️ Marcar como aviso urgente (Topo do feed)</span>
        </div>
        <button type="submit" class="primary-button w-full mt-4">Postar Notícia</button>
        <button type="button" class="secondary-button w-full mt-4" id="btnCancelAddNews">Cancelar</button>
      </form>
    </div>
  `;

  const photoInput = document.querySelector('#adminNewsPhoto');
  const previewContainer = document.querySelector('#adminNewsPhotoPreview');

  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    previewContainer.innerHTML = '';
    selectedCoverImageBase64 = null;

    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 600; // Capa com largura máxima de 600px
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          selectedCoverImageBase64 = dataUrl;

          const thumb = document.createElement('div');
          thumb.className = 'photo-preview-item animate-fade-in';
          thumb.style.width = '120px';
          thumb.style.height = '70px';
          thumb.style.backgroundImage = `url('${dataUrl}')`;
          
          const removeBtn = document.createElement('button');
          removeBtn.className = 'remove-btn';
          removeBtn.innerHTML = '×';
          removeBtn.type = 'button';
          removeBtn.addEventListener('click', () => {
            selectedCoverImageBase64 = null;
            thumb.remove();
            photoInput.value = '';
          });
          
          thumb.appendChild(removeBtn);
          previewContainer.appendChild(thumb);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  document.querySelector('#btnCancelAddNews').addEventListener('click', () => switchAdminTab('news'));

  document.querySelector('#frmAdminAddNews').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.querySelector('#adminNewsTitle').value;
    const summary = document.querySelector('#adminNewsSummary').value;
    const body = document.querySelector('#adminNewsBody').value;
    const category = document.querySelector('#adminNewsCat').value;
    const is_urgent = document.querySelector('#adminNewsUrgent').checked;

    const res = await apiFetch('/api/admin/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, summary, body, category, is_urgent, image: selectedCoverImageBase64 })
    });

    if (res && res.success) {
      alert("Notícia criada com sucesso!");
      switchAdminTab('news');
    } else {
      alert("Erro ao criar notícia.");
    }
  });
}

// --- MANIPULAÇÃO DE REDIRECIONAMENTO PÓS-AUTENTICAÇÃO ---
function setPostAuthRedirect(target) {
  sessionStorage.setItem('postAuthRedirect', JSON.stringify(target));
}

function getAndClearPostAuthRedirect() {
  const data = sessionStorage.getItem('postAuthRedirect');
  if (data) {
    sessionStorage.removeItem('postAuthRedirect');
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
  return null;
}

async function handlePostAuthRedirect() {
  const target = getAndClearPostAuthRedirect();
  if (!target) {
    setView('home');
    return;
  }
  
  if (target.type === 'view') {
    await setView(target.name);
  } else if (target.type === 'adDetails') {
    await showAdDetails(target.id);
  } else if (target.type === 'newsDetails') {
    await showNewsDetails(target.id);
  } else if (target.type === 'publish') {
    showPublishForm(target.initialType);
  } else {
    await setView('home');
  }
}

// --- MECANISMO DE NAVEGAÇÃO PRINCIPAL ---
async function setView(view) {
  const publicViews = ['home', 'explore', 'news', 'bus'];

  if (!publicViews.includes(view) && !currentSession && !userParam) {
    setPostAuthRedirect({ type: 'view', name: view });
    renderAuthScreen();
    return;
  }

  if (currentSession || userParam) {
    const isComplete = await checkProfileRegistration();
    if (!isComplete) return;
  }

  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) bottomNav.style.display = 'flex';

  const renderers = {
    home: renderHome,
    explore: () => renderExplore(),
    news: () => renderNews(),
    bus: renderBus,
    profile: renderProfile
  };

  if (renderers[view]) {
    await renderers[view]();
  }

  navItems.forEach(item => {
    item.classList.toggle('is-active', item.dataset.view === view);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Vincula a barra de navegação inferior
document.body.addEventListener("click", (event) => {
  const target = event.target.closest("[data-view]");
  if (!target) return;
  
  if (target.classList.contains('nav-item') || target.classList.contains('brand-button')) {
    setView(target.dataset.view);
  }
});

// Inicialização segura com Supabase e carregamento da Home
initSupabase().then(() => {
  const activeView = document.querySelector('.nav-item.is-active')?.dataset.view;
  if (!activeView) {
    const hasRedirect = sessionStorage.getItem('postAuthRedirect');
    if (hasRedirect && (currentSession || userParam)) {
      handlePostAuthRedirect();
    } else {
      setView("home");
    }
  }
});
