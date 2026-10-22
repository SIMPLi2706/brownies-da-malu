(function(){
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
    { name:"Brownie no Copo (250ml)", desc:"Creme de baunilha, pedaços de brownie e calda de chocolate. Prático e gostoso!", price:"R$ 18", rawPrice:18, img:"img/sabor-brownie-no-copo-250ml.jpg" }
  ];
  const grid = document.getElementById('flavorGrid');
  if (grid) {
    grid.innerHTML = '';
    flavors.forEach(f => {
      const card = document.createElement('div');
      card.className = 'flavor-card reveal';
      card.innerHTML = `
        <div class="flavor-photo"><img src="${f.img}" alt="Brownie de ${f.name}" loading="lazy"></div>
        <div class="flavor-body">
          <h3>${f.name}</h3>
          <p>${f.desc}</p>
          <div class="flavor-foot">
            <span class="flavor-price">${f.price}</span>
            <button class="flavor-btn btn-order-trigger" data-name="${f.name}" data-price="${f.price}" data-raw="${f.rawPrice}" data-img="${f.img}">Pedir</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

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

  // ===================== SISTEMA DE MODAIS & SUPABASE =====================
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

  function openAuthModal() {
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
          ? `${app.currentProfile.endereco}, nº ${app.currentProfile.numero} - ${app.currentProfile.bairro} (${app.currentProfile.cidade})`
          : 'Nenhum endereço cadastrado ainda.';
        document.getElementById('loggedUserAddress').textContent = addr;
        document.getElementById('loggedUserPhone').textContent = app.currentProfile?.telefone ? `WhatsApp: ${app.currentProfile.telefone}` : '';
      }
    } else {
      if (loggedOutView) loggedOutView.style.display = 'block';
      if (loggedInView) loggedInView.style.display = 'none';
    }
    abrirModal('authModal');
  }

  if (navAuthBtn) navAuthBtn.addEventListener('click', openAuthModal);
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
        alert('Login efetuado com sucesso!');
        fecharModal('authModal');
      } catch (err) {
        alert('Erro ao entrar: ' + (err.message || 'Verifique e-mail e senha.'));
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
          alert('Conta criada com sucesso! 🤎\n\nEnviamos um link de confirmação para o seu e-mail para ativar sua conta. (Dica: você também pode desativar a confirmação de e-mail no painel do Supabase para logins imediatos sem precisar de e-mail).');
        } else {
          alert('Cadastro realizado com sucesso! Seja bem-vindo(a)! 🤎');
        }
        formRegister.reset();
        fecharModal('authModal');
      } catch (err) {
        alert('Atenção: ' + (err.message || 'Tente novamente.'));
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
      alert('Você saiu da sua conta.');
      fecharModal('authModal');
    });
  }

  // ---------- Modal Pedido / Checkout ----------
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
      const addr = app.currentProfile.endereco ? `${app.currentProfile.endereco}, ${app.currentProfile.numero} - ${app.currentProfile.bairro}` : '';
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

      // Salva no Supabase (Memória de Pedidos)
      try {
        if (window.BrownieApp && window.BrownieApp.supabase) {
          const salvo = await window.BrownieApp.criarPedido({
            sabor: currentOrderFlavor.name,
            preco: currentOrderFlavor.price,
            quantidade: currentQty,
            tipoEntrega,
            enderecoEntrega,
            observacoes
          });
          if (salvo?.codigo_pedido) {
            codigoPedido = salvo.codigo_pedido;
          }
        }
      } catch (err) {
        console.warn('Pedido continuará via WhatsApp mesmo sem banco:', err);
      }

      // Monta texto formatado para o WhatsApp
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

      // Abre WhatsApp
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
        const item = p.itens?.[0] || {};
        const card = document.createElement('div');
        card.className = 'order-history-card';
        card.innerHTML = `
          <div class="order-history-head">
            <span class="order-history-code">${p.codigo_pedido || 'Pedido'}</span>
            <span class="order-badge ${p.status || 'pendente'}">${p.status || 'pendente'}</span>
          </div>
          <div style="font-size:0.95rem; font-weight:700;">${item.quantidade || 1}x ${item.sabor || 'Brownie'}</div>
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
        alert('Muito obrigado! Sua avaliação foi publicada com carinho 🤎');
        formReview.reset();
        fecharModal('reviewModal');
      } catch (err) {
        alert('Erro ao enviar avaliação: ' + (err.message || 'Verifique a conexão com o Supabase.'));
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
})();
