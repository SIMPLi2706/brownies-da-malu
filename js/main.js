(function(){
  // ===================== TOAST NOTIFICATION SYSTEM =====================
  function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '🤎' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Fechar aviso">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 320);
      }
    }, 3800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ===================== BUSCA INTELIGENTE DE CEP (VIACEP) =====================
  async function buscarCep(cepRaw, prefix = 'reg') {
    const cep = String(cepRaw || '').replace(/\D/g, '');
    if (cep.length !== 8) {
      showToast('Digite um CEP válido com 8 números.', 'info');
      return;
    }

    const addrField = document.getElementById(`${prefix}Address`);
    const neighField = document.getElementById(`${prefix}Neighborhood`);
    const numField = document.getElementById(`${prefix}Number`);
    const statusEl = document.getElementById(`${prefix}CepStatus`);

    if (statusEl) statusEl.textContent = 'Buscando endereço... ⏳';

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();

      if (data.erro) {
        if (statusEl) statusEl.textContent = 'CEP não localizado. Pode digitar o endereço manualmente.';
        showToast('CEP não encontrado. Digite o endereço manualmente.', 'info');
        return;
      }

      if (addrField && data.logradouro) addrField.value = data.logradouro;
      if (neighField && data.bairro) neighField.value = data.bairro;
      if (statusEl) statusEl.textContent = `✓ ${data.logradouro ? data.logradouro + ' - ' : ''}${data.bairro || ''} (${data.localidade || 'Porto Velho'}-${data.uf || 'RO'})`;

      showToast(`Endereço localizado: ${data.logradouro || data.bairro}! 📍`, 'success');

      if (numField) numField.focus();
    } catch (err) {
      if (statusEl) statusEl.textContent = 'Erro ao consultar CEP. Digite manualmente.';
    }
  }

  function aplicarMascaraCep(input) {
    if (!input) return;
    input.addEventListener('input', () => {
      let v = input.value.replace(/\D/g, '').slice(0, 8);
      if (v.length > 5) {
        v = v.slice(0, 5) + '-' + v.slice(5);
      }
      input.value = v;
    });
  }

  // ---------- Mobile nav ----------
  const burger = document.getElementById('burger');
  const panel = document.getElementById('mobilePanel');
  if (burger && panel) {
    burger.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('open');
      burger.classList.toggle('open', isOpen);
      burger.setAttribute('aria-expanded', isOpen);
    });
    panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      panel.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }));
    document.addEventListener('click', (e) => {
      if (panel.classList.contains('open') && !panel.contains(e.target) && !burger.contains(e.target)) {
        panel.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---------- Scalloped / doily SVG path generator ----------
  function scallopPath(cx, cy, r, bumps, bulge){
    const pts = [];
    for (let i = 0; i < bumps; i++){
      const a = (i / bumps) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} `;
    for (let i = 0; i < bumps; i++){
      const [x1,y1] = pts[i];
      const [x2,y2] = pts[(i+1) % bumps];
      const mx = (x1+x2)/2, my = (y1+y2)/2;
      const ang = Math.atan2(my - cy, mx - cx);
      const cxp = mx + Math.cos(ang) * bulge;
      const cyp = my + Math.sin(ang) * bulge;
      d += `Q ${cxp.toFixed(1)} ${cyp.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)} `;
    }
    d += 'Z';
    return d;
  }

  const heroScallop = document.getElementById('heroScallop');
  if (heroScallop){
    const d = scallopPath(300, 300, 240, 26, 22);
    heroScallop.innerHTML = `<path d="${d}" fill="var(--red)" opacity="0.5"></path>
      <path d="${scallopPath(300,300,240,26,22)}" fill="none" stroke="var(--red)" stroke-width="3" stroke-dasharray="6 8" opacity="0.5" transform="scale(0.94)" transform-origin="300 300"></path>`;
  }

  const aboutDoily = document.getElementById('aboutDoily');
  if (aboutDoily){
    const d = scallopPath(150, 150, 140, 20, 12);
    aboutDoily.innerHTML = `<path d="${d}" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="5 7"></path>`;
  }

  // ---------- Flavor data ----------
  const flavors = [
    { name:"Chocolate com Maracujá", desc:"Mousse cremosa de maracujá sobre o brownie de chocolate molhadinho.", price:"R$ 14", rawPrice:14, img:"img/sabor-chocolate-com-maracuja.jpg" },
    { name:"Ninho com Morango", desc:"Creme de leite Ninho com morango fresquinho no brownie de chocolate.", price:"R$ 14", rawPrice:14, img:"img/sabor-ninho-com-morango.jpg" },
    { name:"Chocolate Tradicional", desc:"Brownie bem macio com recheio cremoso de chocolate.", price:"R$ 12", rawPrice:12, img:"img/sabor-chocolate-tradicional.jpg" },
    { name:"Brownie de Paçoca", desc:"Creme suave com paçoca crocante em cada mordida.", price:"R$ 12", rawPrice:12, img:"img/sabor-brownie-de-pacoca.jpg" },
    { name:"Brownie no Pote — Dois Amores", desc:"Camadas generosas de brigadeiro de chocolate, creme de Ninho aveludado e pedaços suculentos de brownie.", price:"R$ 18", rawPrice:18, img:"img/sabor-copo-dois-amores.jpg" },
    { name:"Brownie no Pote — Chocolate Tradicional", desc:"Mousse cremosa de puro chocolate em harmonia com brownie macio e pedaços crocantes em cada colherada.", price:"R$ 18", rawPrice:18, img:"img/sabor-copo-chocolate-tradicional.jpg" },
    { name:"Brownie no Pote — Doce de Leite com Ninho", desc:"Doce de leite artesanal cremoso, creme suave de Leite Ninho e muito brownie para saborear de colher.", price:"R$ 18", rawPrice:18, img:"img/sabor-copo-doce-de-leite-com-ninho.jpg" }
  ];

  // ===================== CARRINHO MULTISSABORES =====================
  const BrownieCart = {
    items: {}, // { [name]: { flavor, qty } }

    init() {
      try {
        const saved = localStorage.getItem('brownie_cart_data');
        if (saved) this.items = JSON.parse(saved);
      } catch(e) {}
      this.updateUI();
    },

    addItem(flavor) {
      let stockStatus = {};
      try {
        const rawStock = localStorage.getItem('malu_stock_status');
        if (rawStock) stockStatus = JSON.parse(rawStock);
      } catch(e) {}

      if (stockStatus[flavor.name] === false) {
        showToast(`O sabor ${flavor.name} está esgotado hoje na cozinha! 👩‍🍳`, 'info');
        return;
      }

      if (!this.items[flavor.name]) {
        this.items[flavor.name] = { flavor, qty: 1 };
      } else {
        this.items[flavor.name].qty += 1;
      }
      this.save();
      this.updateUI();
      showToast(`1x ${flavor.name} adicionado à sacola! 🛍️`, 'success');
    },

    changeQty(flavorName, delta) {
      if (!this.items[flavorName]) return;
      this.items[flavorName].qty += delta;
      if (this.items[flavorName].qty <= 0) {
        delete this.items[flavorName];
      }
      this.save();
      this.updateUI();
    },

    deleteItem(flavorName) {
      delete this.items[flavorName];
      this.save();
      this.updateUI();
    },

    clear() {
      this.items = {};
      this.save();
      this.updateUI();
    },

    getCount() {
      return Object.values(this.items).reduce((acc, it) => acc + (it.qty || 0), 0);
    },

    getTotal() {
      return Object.values(this.items).reduce((acc, it) => acc + (it.flavor.rawPrice * it.qty), 0);
    },

    save() {
      try {
        localStorage.setItem('brownie_cart_data', JSON.stringify(this.items));
      } catch(e) {}
    },

    updateUI() {
      const count = this.getCount();
      const total = this.getTotal();
      const formattedTotal = `R$ ${total.toFixed(2).replace('.', ',')}`;

      // Barra flutuante
      const floatingBar = document.getElementById('floatingCartBar');
      const floatingCount = document.getElementById('floatingCartCount');
      const floatingTotal = document.getElementById('floatingCartTotal');

      if (floatingBar) {
        floatingBar.classList.toggle('active', count > 0);
        floatingBar.setAttribute('aria-hidden', count === 0 ? 'true' : 'false');
      }
      if (floatingCount) floatingCount.textContent = count;
      if (floatingTotal) floatingTotal.textContent = formattedTotal;

      // Resumo dentro do Modal da Sacola
      const cartSubtotal = document.getElementById('cartSubtotal');
      const cartFinalTotal = document.getElementById('cartFinalTotal');
      if (cartSubtotal) cartSubtotal.textContent = formattedTotal;
      if (cartFinalTotal) cartFinalTotal.textContent = formattedTotal;

      this.renderCartModalList();
    },

    renderCartModalList() {
      const container = document.getElementById('cartItemsList');
      if (!container) return;

      const entries = Object.values(this.items);
      if (entries.length === 0) {
        container.innerHTML = `
          <div class="cart-empty-state">
            <span>🧺</span>
            <p style="margin:0; font-weight:700;">Sua sacola está vazia.</p>
            <p style="margin:4px 0 0; font-size:0.85rem;">Escolha seus sabores favoritos no cardápio!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      entries.forEach(it => {
        const row = document.createElement('div');
        row.className = 'cart-item-row';
        const itemTotal = `R$ ${(it.flavor.rawPrice * it.qty).toFixed(2).replace('.', ',')}`;
        row.innerHTML = `
          <div class="cart-item-info">
            <img src="${it.flavor.img}" alt="${it.flavor.name}" class="cart-item-img">
            <div>
              <div class="cart-item-title">${it.flavor.name}</div>
              <div class="cart-item-price">${it.flavor.price} cada • <strong>${itemTotal}</strong></div>
            </div>
          </div>
          <div class="cart-qty-wrap">
            <button type="button" class="cart-qty-btn" data-action="minus" data-name="${it.flavor.name}">-</button>
            <span class="cart-qty-num">${it.qty}</span>
            <button type="button" class="cart-qty-btn" data-action="plus" data-name="${it.flavor.name}">+</button>
            <button type="button" class="cart-del-btn" data-action="del" data-name="${it.flavor.name}" title="Remover item">🗑️</button>
          </div>
        `;
        container.appendChild(row);
      });
    }
  };

  // Renderiza cardápio com botões duplos (+ Sacola e Pedir Já)
  const grid = document.getElementById('flavorGrid');
  if (grid) {
    grid.innerHTML = '';
    let stockStatus = {};
    try {
      const rawStock = localStorage.getItem('malu_stock_status');
      if (rawStock) stockStatus = JSON.parse(rawStock);
    } catch(e) {}

    flavors.forEach(f => {
      const isOutOfStock = stockStatus[f.name] === false;
      const card = document.createElement('div');
      card.className = `flavor-card reveal ${isOutOfStock ? 'flavor-out-of-stock' : ''}`;
      card.innerHTML = `
        <div class="flavor-photo" style="position:relative;">
          <img src="${f.img}" alt="Brownie de ${f.name}" loading="lazy">
          ${isOutOfStock ? '<span style="position:absolute; top:12px; right:12px; background:var(--red); color:#fff; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px; box-shadow:0 4px 10px rgba(0,0,0,0.3);">Esgotado hoje</span>' : ''}
        </div>
        <div class="flavor-body">
          <h3>${f.name}</h3>
          <p>${f.desc}</p>
          <div class="flavor-foot">
            <span class="flavor-price">${f.price}</span>
            <div class="flavor-actions-group">
              ${isOutOfStock ? `
                <button class="flavor-btn" disabled style="opacity:0.55; cursor:not-allowed; background:#888; color:#fff;">Esgotado</button>
              ` : `
                <button class="flavor-btn btn-add-cart" data-name="${f.name}">+ Sacola</button>
                <button class="flavor-btn flavor-btn-alt btn-order-trigger" data-name="${f.name}" data-price="${f.price}" data-raw="${f.rawPrice}" data-img="${f.img}">Pedir Já</button>
              `}
            </div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // Delegador de cliques no cardápio
  document.addEventListener('click', (e) => {
    const btnAdd = e.target.closest('.btn-add-cart');
    if (btnAdd) {
      const flavorName = btnAdd.dataset.name;
      const found = flavors.find(x => x.name === flavorName);
      if (found) BrownieCart.addItem(found);
      return;
    }

    const cartQtyBtn = e.target.closest('.cart-qty-btn');
    if (cartQtyBtn) {
      const action = cartQtyBtn.dataset.action;
      const name = cartQtyBtn.dataset.name;
      if (action === 'plus') BrownieCart.changeQty(name, 1);
      if (action === 'minus') BrownieCart.changeQty(name, -1);
      return;
    }

    const cartDelBtn = e.target.closest('.cart-del-btn');
    if (cartDelBtn) {
      const name = cartDelBtn.dataset.name;
      BrownieCart.deleteItem(name);
      return;
    }
  });

  // ---------- Marquee content ----------
  const brownieBit = `<svg viewBox="0 0 64 64" fill="none"><rect x="14" y="14" width="36" height="28" rx="5" fill="currentColor"/><path d="M18 22c3-3 6 2 9-1s5 3 8 0 6 2 9-1" stroke="var(--red)" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  const marqueeItems = ['brownie da malu', 'feito à mão', 'sempre fresquinho', 'peça pelo whatsapp', 'porto velho - ro'];
  const track = document.getElementById('marqueeTrack');
  if (track) {
    let marqueeHtml = '';
    for (let r = 0; r < 2; r++){
      marqueeItems.forEach(t => { marqueeHtml += `<span>${brownieBit} ${t}</span>`; });
    }
    track.innerHTML = marqueeHtml;
  }

  // ---------- Testimonials Iniciais / Fallback ----------
  const fallbackTestimonials = [
    { name:'Fernanda A.', quote:'O brownie de Ninho com Morango sumiu em cinco minutos aqui em casa. Já virou pedido fixo!', initials:'FA' },
    { name:'Rafael M.', quote:'Entrega certinha no horário combinado e o sabor tradicional é surpreendentemente bom, bem molhadinho.', initials:'RM' },
    { name:'Camila S.', quote:'Pedi a caixa presente pro aniversário da minha mãe e ela amou. Recomendo demais!', initials:'CS' },
  ];
  const star = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L10 14.8 4.8 17.5l1-5.8L1.5 7.6l5.9-.8L10 1.5Z"/></svg>`;
  const testGrid = document.getElementById('testGrid');
  if (testGrid && testGrid.children.length === 0) {
    fallbackTestimonials.forEach(t => {
      const card = document.createElement('div');
      card.className = 'test-card reveal';
      card.innerHTML = `
        <span class="quote-mark">&ldquo;</span>
        <p class="quote">${t.quote}</p>
        <div class="test-person">
          <div class="test-avatar">${t.initials}</div>
          <div>
            <div class="test-name">${t.name}</div>
            <div class="test-stars">${star.repeat(5)}</div>
          </div>
        </div>
      `;
      testGrid.appendChild(card);
    });
  }

  // ---------- Scroll reveal ----------
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)){
    revealEls.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  }

  // ===================== SISTEMA DE MODAIS =====================
  function abrirModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
      el.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function fecharModal(id) {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (el) {
      el.classList.remove('active');
      el.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const overlay = e.target.closest('.modal-overlay');
      if (overlay) fecharModal(overlay);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fecharModal(overlay);
    });
  });

  // ---------- Modal Auth ----------
  const navAuthBtn = document.getElementById('navAuthBtn');
  const navAuthBtnMobile = document.getElementById('navAuthBtnMobile');

  function openAuthModal(defaultTab = 'loginTab') {
    const app = window.BrownieApp;
    const loggedOutView = document.getElementById('authLoggedOutView');
    const loggedInView = document.getElementById('authLoggedInView');

    if (app && app.currentUser) {
      if (loggedOutView) loggedOutView.style.display = 'none';
      if (loggedInView) {
        loggedInView.style.display = 'block';
        const name = app.currentProfile?.nome || app.currentUser.user_metadata?.nome || 'Cliente';
        document.getElementById('loggedUserName').textContent = `Olá, ${name}! 🤎`;
        const addr = app.currentProfile?.endereco
          ? `${app.currentProfile.endereco}, nº ${app.currentProfile.numero || 'S/N'} - ${app.currentProfile.bairro || ''} (${app.currentProfile.cidade || 'Porto Velho - RO'})`
          : 'Nenhum endereço cadastrado ainda.';
        document.getElementById('loggedUserAddress').textContent = addr;
        document.getElementById('loggedUserPhone').textContent = app.currentProfile?.telefone ? `WhatsApp: ${app.currentProfile.telefone}` : '';
      }
    } else {
      if (loggedOutView) loggedOutView.style.display = 'block';
      if (loggedInView) loggedInView.style.display = 'none';

      // Alterna aba inicial
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === defaultTab));
      document.getElementById('loginTab').style.display = defaultTab === 'loginTab' ? 'block' : 'none';
      document.getElementById('registerTab').style.display = defaultTab === 'registerTab' ? 'block' : 'none';
    }
    abrirModal('authModal');
  }

  if (navAuthBtn) navAuthBtn.addEventListener('click', () => openAuthModal());
  if (navAuthBtnMobile) navAuthBtnMobile.addEventListener('click', () => {
    if (panel) panel.classList.remove('open');
    openAuthModal();
  });

  // Abas Login / Cadastro
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('loginTab').style.display = target === 'loginTab' ? 'block' : 'none';
      document.getElementById('registerTab').style.display = target === 'registerTab' ? 'block' : 'none';
    });
  });

  // Máscaras e busca de CEP no cadastro
  const regCep = document.getElementById('regCep');
  const btnBuscarCepReg = document.getElementById('btnBuscarCepReg');
  aplicarMascaraCep(regCep);
  if (regCep) {
    regCep.addEventListener('blur', () => {
      if (regCep.value.replace(/\D/g, '').length === 8) {
        buscarCep(regCep.value, 'reg');
      }
    });
    regCep.addEventListener('keyup', (e) => {
      if (regCep.value.replace(/\D/g, '').length === 8) {
        buscarCep(regCep.value, 'reg');
      }
    });
  }
  if (btnBuscarCepReg) {
    btnBuscarCepReg.addEventListener('click', () => {
      if (regCep) buscarCep(regCep.value, 'reg');
    });
  }

  // Login Form
  const formLogin = document.getElementById('formLogin');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const submitBtn = formLogin.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Acessando...';
        await window.BrownieApp.fazerLogin(email, password);
        showToast('Login efetuado com sucesso! 🤎', 'success');
        fecharModal('authModal');
      } catch (err) {
        showToast(err.message || 'Erro ao entrar. Verifique os dados.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // Register Form
  const formRegister = document.getElementById('formRegister');
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        nome: document.getElementById('regName').value.trim(),
        telefone: document.getElementById('regPhone').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value,
        endereco: document.getElementById('regAddress').value.trim(),
        numero: document.getElementById('regNumber').value.trim(),
        bairro: document.getElementById('regNeighborhood').value.trim(),
        ponto_referencia: document.getElementById('regRef').value.trim(),
      };
      const submitBtn = formRegister.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Cadastrando...';
        const res = await window.BrownieApp.cadastrarUsuario(payload);
        if (res?.requiresEmailConfirmation) {
          showToast('Conta criada! Enviamos um link de confirmação para o seu e-mail.', 'info');
        } else {
          showToast('Cadastro realizado com sucesso! Seja bem-vindo(a)! 🤎', 'success');
        }
        formRegister.reset();
        fecharModal('authModal');

        // Esconde barra de boas-vindas
        const topBar = document.getElementById('topWelcomeBar');
        if (topBar) topBar.classList.remove('visible');
      } catch (err) {
        showToast(err.message || 'Não foi possível cadastrar. Tente novamente.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // Logout
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await window.BrownieApp.sair();
      showToast('Você saiu da sua conta.', 'info');
      fecharModal('authModal');
    });
  }

  // ===================== ONBOARDING: NA CARA DO CLIENTE NOVO =====================
  function setupWelcomeOnboarding() {
    const isDismissed = localStorage.getItem('malu_welcome_dismissed');
    const isLogged = !!window.BrownieApp.currentUser;

    const topBar = document.getElementById('topWelcomeBar');
    const btnTopBarRegister = document.getElementById('btnTopBarRegister');
    const btnDismissTopBar = document.getElementById('btnDismissTopBar');

    const btnWelcomeRegister = document.getElementById('btnWelcomeRegister');
    const btnWelcomeLogin = document.getElementById('btnWelcomeLogin');
    const btnWelcomeDismiss = document.getElementById('btnWelcomeDismiss');

    // Barra no topo
    if (!isLogged && topBar) {
      topBar.classList.add('visible');
    }

    if (btnTopBarRegister) {
      btnTopBarRegister.addEventListener('click', () => openAuthModal('registerTab'));
    }
    if (btnDismissTopBar) {
      btnDismissTopBar.addEventListener('click', () => {
        if (topBar) topBar.classList.remove('visible');
      });
    }

    // Modal de Boas-Vindas no primeiro acesso
    if (!isDismissed && !isLogged) {
      setTimeout(() => {
        if (!window.BrownieApp.currentUser) {
          abrirModal('welcomeModal');
        }
      }, 1200);
    }

    if (btnWelcomeRegister) {
      btnWelcomeRegister.addEventListener('click', () => {
        fecharModal('welcomeModal');
        localStorage.setItem('malu_welcome_dismissed', 'true');
        openAuthModal('registerTab');
      });
    }
    if (btnWelcomeLogin) {
      btnWelcomeLogin.addEventListener('click', () => {
        fecharModal('welcomeModal');
        localStorage.setItem('malu_welcome_dismissed', 'true');
        openAuthModal('loginTab');
      });
    }
    if (btnWelcomeDismiss) {
      btnWelcomeDismiss.addEventListener('click', () => {
        fecharModal('welcomeModal');
        localStorage.setItem('malu_welcome_dismissed', 'true');
        const target = document.getElementById('sabores');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  // ---------- Modal Pedido Rápido (Item Único) ----------
  let currentOrderFlavor = null;
  let currentQty = 1;

  function updateOrderTotal() {
    if (!currentOrderFlavor) return;
    const total = currentOrderFlavor.rawPrice * currentQty;
    document.getElementById('qtyValue').textContent = currentQty;
    document.getElementById('orderModalTotal').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-order-trigger');
    if (!btn) return;

    currentOrderFlavor = {
      name: btn.dataset.name,
      price: btn.dataset.price,
      rawPrice: parseFloat(btn.dataset.raw) || 14,
      img: btn.dataset.img
    };
    currentQty = 1;

    document.getElementById('orderModalImg').src = currentOrderFlavor.img;
    document.getElementById('orderModalName').textContent = currentOrderFlavor.name;
    document.getElementById('orderModalPrice').textContent = currentOrderFlavor.price;
    updateOrderTotal();

    // Auto-preenche com perfil se estiver logado
    const app = window.BrownieApp;
    if (app && app.currentProfile) {
      document.getElementById('orderCustomerName').value = app.currentProfile.nome || '';
      document.getElementById('orderCustomerPhone').value = app.currentProfile.telefone || '';
      const addr = app.currentProfile.endereco ? `${app.currentProfile.endereco}, ${app.currentProfile.numero || 'S/N'} - ${app.currentProfile.bairro || ''}` : '';
      document.getElementById('orderAddress').value = addr;
    }

    abrirModal('orderModal');
  });

  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  if (qtyMinus) {
    qtyMinus.addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty--;
        updateOrderTotal();
      }
    });
  }
  if (qtyPlus) {
    qtyPlus.addEventListener('click', () => {
      currentQty++;
      updateOrderTotal();
    });
  }

  const deliverySelect = document.getElementById('orderDeliveryType');
  const deliveryAddressGroup = document.getElementById('deliveryAddressGroup');
  if (deliverySelect && deliveryAddressGroup) {
    deliverySelect.addEventListener('change', () => {
      deliveryAddressGroup.style.display = deliverySelect.value === 'retirada' ? 'none' : 'block';
    });
  }

  const formCheckout = document.getElementById('formCheckout');
  if (formCheckout) {
    formCheckout.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentOrderFlavor) return;

      const nomeCliente = document.getElementById('orderCustomerName').value.trim();
      const telefoneCliente = document.getElementById('orderCustomerPhone').value.trim();
      const tipoEntrega = document.getElementById('orderDeliveryType').value;
      const enderecoEntrega = document.getElementById('orderAddress').value.trim();
      const observacoes = document.getElementById('orderNotes').value.trim();
      const totalFormatado = document.getElementById('orderModalTotal').textContent;

      let codigoPedido = 'BM-' + Math.floor(1000 + Math.random() * 9000);

      try {
        if (window.BrownieApp && window.BrownieApp.supabase) {
          const salvo = await window.BrownieApp.criarPedido({
            sabor: currentOrderFlavor.name,
            preco: currentOrderFlavor.price,
            quantidade: currentQty,
            tipoEntrega,
            enderecoEntrega,
            observacoes,
            nomeCliente,
            telefoneCliente
          });
          if (salvo?.codigo_pedido) {
            codigoPedido = salvo.codigo_pedido;
          }
        }
      } catch (err) {
        console.warn('Gravando pedido via WhatsApp fallback:', err);
      }

      let msg = `*Pedido ${codigoPedido} - Brownie da Malu*\n\n`;
      msg += `🍫 *Item:* ${currentQty}x ${currentOrderFlavor.name}\n`;
      msg += `💰 *Total Estimado:* ${totalFormatado}\n`;
      msg += `👤 *Cliente:* ${nomeCliente}\n`;
      msg += `📞 *WhatsApp:* ${telefoneCliente}\n`;
      msg += `🛵 *Modalidade:* ${tipoEntrega === 'retirada' ? 'Retirada no local' : 'Entrega em domicílio'}\n`;
      if (tipoEntrega === 'entrega' && enderecoEntrega) {
        msg += `📍 *Endereço:* ${enderecoEntrega}\n`;
      }
      if (observacoes) {
        msg += `📝 *Obs:* ${observacoes}\n`;
      }
      msg += `\n_Pedido registrado no site. Podemos confirmar?_`;

      fecharModal('orderModal');
      showToast(`Pedido ${codigoPedido} registrado com sucesso! 🤎`, 'success');

      const waUrl = `https://wa.me/5569993844237?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank', 'noopener');
    });
  }

  // ===================== MODAL DA SACOLA / CHECKOUT MULTISSABORES =====================
  const btnOpenCart = document.getElementById('btnOpenCartModal');
  const cartCep = document.getElementById('cartCep');
  const btnBuscarCepCart = document.getElementById('btnBuscarCepCart');
  const cartDeliveryType = document.getElementById('cartDeliveryType');
  const cartDeliveryFields = document.getElementById('cartDeliveryFields');
  const btnCheckoutCart = document.getElementById('btnCheckoutCart');

  aplicarMascaraCep(cartCep);
  if (cartCep) {
    cartCep.addEventListener('blur', () => {
      if (cartCep.value.replace(/\D/g, '').length === 8) {
        buscarCep(cartCep.value, 'cart');
      }
    });
    cartCep.addEventListener('keyup', () => {
      if (cartCep.value.replace(/\D/g, '').length === 8) {
        buscarCep(cartCep.value, 'cart');
      }
    });
  }
  if (btnBuscarCepCart) {
    btnBuscarCepCart.addEventListener('click', () => {
      if (cartCep) buscarCep(cartCep.value, 'cart');
    });
  }

  if (cartDeliveryType && cartDeliveryFields) {
    cartDeliveryType.addEventListener('change', () => {
      const isRetirada = cartDeliveryType.value === 'retirada';
      const cepGroup = document.getElementById('cartCepGroup');
      const addrGroup = document.getElementById('cartAddressGroup');
      const bairroGroup = document.getElementById('cartBairroGroup');
      if (cepGroup) cepGroup.style.display = isRetirada ? 'none' : 'block';
      if (addrGroup) addrGroup.style.display = isRetirada ? 'none' : 'grid';
      if (bairroGroup) bairroGroup.style.display = isRetirada ? 'none' : 'grid';
    });
  }

  if (btnOpenCart) {
    btnOpenCart.addEventListener('click', () => {
      // Preenche dados do cliente se estiver logado
      const app = window.BrownieApp;
      if (app && app.currentProfile) {
        const p = app.currentProfile;
        const nameField = document.getElementById('cartCustomerName');
        const phoneField = document.getElementById('cartCustomerPhone');
        const addrField = document.getElementById('cartAddress');
        const numField = document.getElementById('cartNumber');
        const neighField = document.getElementById('cartNeighborhood');
        const refField = document.getElementById('cartRef');

        if (nameField && !nameField.value) nameField.value = p.nome || '';
        if (phoneField && !phoneField.value) phoneField.value = p.telefone || '';
        if (addrField && !addrField.value) addrField.value = p.endereco || '';
        if (numField && !numField.value) numField.value = p.numero || '';
        if (neighField && !neighField.value) neighField.value = p.bairro || '';
        if (refField && !refField.value) refField.value = p.ponto_referencia || '';
      }
      BrownieCart.updateUI();
      abrirModal('cartModal');
    });
  }

  if (btnCheckoutCart) {
    btnCheckoutCart.addEventListener('click', async () => {
      const entries = Object.values(BrownieCart.items);
      if (entries.length === 0) {
        showToast('Sua sacola está vazia! Escolha brownies no cardápio.', 'info');
        return;
      }

      const nomeCliente = document.getElementById('cartCustomerName')?.value.trim() || '';
      const telefoneCliente = document.getElementById('cartCustomerPhone')?.value.trim() || '';
      const tipoEntrega = document.getElementById('cartDeliveryType')?.value || 'entrega';
      const endereco = document.getElementById('cartAddress')?.value.trim() || '';
      const numero = document.getElementById('cartNumber')?.value.trim() || '';
      const bairro = document.getElementById('cartNeighborhood')?.value.trim() || '';
      const ref = document.getElementById('cartRef')?.value.trim() || '';
      const obs = document.getElementById('cartNotes')?.value.trim() || '';

      if (!nomeCliente) {
        showToast('Por favor, digite seu nome.', 'info');
        document.getElementById('cartCustomerName')?.focus();
        return;
      }
      if (!telefoneCliente) {
        showToast('Por favor, informe seu WhatsApp.', 'info');
        document.getElementById('cartCustomerPhone')?.focus();
        return;
      }

      let enderecoFormatado = '';
      if (tipoEntrega === 'entrega') {
        if (!endereco) {
          showToast('Por favor, digite seu endereço de entrega.', 'info');
          document.getElementById('cartAddress')?.focus();
          return;
        }
        enderecoFormatado = `${endereco}, nº ${numero || 'S/N'}${bairro ? ' - ' + bairro : ''}${ref ? ' (' + ref + ')' : ''}`;
      } else {
        enderecoFormatado = 'Retirada combinada no local';
      }

      const totalNum = BrownieCart.getTotal();
      const totalFormatado = `R$ ${totalNum.toFixed(2).replace('.', ',')}`;
      let codigoPedido = 'BM-' + Math.floor(1000 + Math.random() * 9000);

      // Prepara lista para o banco e WhatsApp
      const itensBanco = entries.map(it => ({
        sabor: it.flavor.name,
        preco: it.flavor.price,
        quantidade: it.qty,
        subtotal: it.flavor.rawPrice * it.qty
      }));

      // Salva no Supabase
      try {
        if (window.BrownieApp && window.BrownieApp.supabase) {
          const salvo = await window.BrownieApp.criarPedido({
            itens: itensBanco,
            valorTotal: totalNum,
            tipoEntrega,
            enderecoEntrega: enderecoFormatado,
            observacoes: obs,
            nomeCliente,
            telefoneCliente
          });
          if (salvo?.codigo_pedido) {
            codigoPedido = salvo.codigo_pedido;
          }
        }
      } catch (err) {
        console.warn('Erro ao salvar no Supabase, prosseguindo com WhatsApp:', err);
      }

      // Monta texto formatado e elegante para o WhatsApp
      let msg = `*Pedido ${codigoPedido} - Brownie da Malu*\n\n`;
      msg += `🛍️ *Itens da Sacola:*\n`;
      entries.forEach(it => {
        const sub = `R$ ${(it.flavor.rawPrice * it.qty).toFixed(2).replace('.', ',')}`;
        msg += `• ${it.qty}x ${it.flavor.name} (${sub})\n`;
      });
      msg += `\n💰 *Total Estimado:* ${totalFormatado}\n`;
      msg += `👤 *Cliente:* ${nomeCliente}\n`;
      msg += `📞 *WhatsApp:* ${telefoneCliente}\n`;
      msg += `🛵 *Modalidade:* ${tipoEntrega === 'retirada' ? 'Retirada no local' : 'Entrega em domicílio'}\n`;
      if (tipoEntrega === 'entrega') {
        msg += `📍 *Endereço:* ${enderecoFormatado}\n`;
      }
      if (obs) {
        msg += `📝 *Observações:* ${obs}\n`;
      }
      msg += `\n_Pedido gerado na sacola do site. Aguardo confirmação!_ 🍫`;

      // Limpa sacola e fecha modal
      BrownieCart.clear();
      fecharModal('cartModal');
      showToast(`Pedido ${codigoPedido} gerado com sucesso! Abrindo WhatsApp... 🤎`, 'success');

      const waUrl = `https://wa.me/5569993844237?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank', 'noopener');
    });
  }

  // ---------- Modal Histórico de Pedidos ----------
  const btnOpenOrders = document.getElementById('btnOpenOrdersModal');
  if (btnOpenOrders) {
    btnOpenOrders.addEventListener('click', async () => {
      fecharModal('authModal');
      abrirModal('ordersModal');

      const container = document.getElementById('ordersListContainer');
      container.innerHTML = '<p style="text-align:center;">Buscando histórico de pedidos...</p>';

      const pedidos = await window.BrownieApp.listarMeusPedidos();
      if (!pedidos || pedidos.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--chocolate-light);">Você ainda não tem pedidos salvos. Faça seu primeiro pedido no cardápio! 🍫</p>';
        return;
      }

      container.innerHTML = '';
      pedidos.forEach(p => {
        const dataFormatada = new Date(p.criado_em).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
        const itens = Array.isArray(p.itens) ? p.itens : [];
        const itensTexto = itens.map(i => `${i.quantidade || 1}x ${i.sabor || 'Brownie'}`).join(', ');

        const card = document.createElement('div');
        card.className = 'order-history-card';
        card.innerHTML = `
          <div class="order-history-head">
            <span class="order-history-code">${p.codigo_pedido || 'Pedido'}</span>
            <span class="order-badge ${p.status || 'pendente'}">${p.status || 'pendente'}</span>
          </div>
          <div style="font-size:0.95rem; font-weight:700;">${itensTexto || '1x Brownie'}</div>
          <div style="font-size:0.85rem; color:var(--chocolate-light);">${dataFormatada} • R$ ${Number(p.valor_total).toFixed(2).replace('.', ',')}</div>
          <div style="font-size:0.8rem; color:var(--chocolate-dark);">${p.tipo_entrega === 'retirada' ? 'Retirada no local' : 'Entrega: ' + (p.endereco_entrega || '')}</div>
        `;
        container.appendChild(card);
      });
    });
  }

  // ---------- Modal Depoimento / Avaliação ----------
  const btnOpenReview = document.getElementById('btnOpenReviewModal');
  if (btnOpenReview) {
    btnOpenReview.addEventListener('click', () => {
      const app = window.BrownieApp;
      if (app && app.currentProfile) {
        document.getElementById('reviewName').value = app.currentProfile.nome || '';
      }
      abrirModal('reviewModal');
    });
  }

  // Star Rating Picker
  let selectedRating = 5;
  const reviewStars = document.getElementById('reviewStars');
  if (reviewStars) {
    const stars = reviewStars.querySelectorAll('.star');
    stars.forEach(s => {
      s.addEventListener('click', () => {
        selectedRating = parseInt(s.dataset.rating, 10);
        stars.forEach(st => {
          st.classList.toggle('active', parseInt(st.dataset.rating, 10) <= selectedRating);
        });
      });
    });
  }

  const formReview = document.getElementById('formReview');
  if (formReview) {
    formReview.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = document.getElementById('reviewName').value.trim();
      const cidade = document.getElementById('reviewCity').value.trim();
      const comentario = document.getElementById('reviewComment').value.trim();
      const submitBtn = formReview.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
        await window.BrownieApp.enviarDepoimento({
          nome,
          cidade,
          estrelas: selectedRating,
          comentario
        });
        showToast('Muito obrigado! Sua avaliação foi publicada com carinho 🤎', 'success');
        formReview.reset();
        fecharModal('reviewModal');
      } catch (err) {
        showToast(err.message || 'Erro ao enviar avaliação.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // Inicializa Carrinho e Onboarding de Novo Cliente
  BrownieCart.init();
  setTimeout(setupWelcomeOnboarding, 500);

})();
