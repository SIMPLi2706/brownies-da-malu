/**
 * Brownie da Malu - Painel Administrativo Completo
 * Gerenciamento em tempo real de Pedidos, Métricas, Clientes, Cardápio e Depoimentos
 */

(function(){
  // ===================== ESTADO GLOBAL DO PAINEL =====================
  const AdminState = {
    authenticated: false,
    soundEnabled: true,
    orders: [],
    clients: [],
    reviews: [],
    currentStatusFilter: 'todos',
    currentDateFilter: 'todos',
    searchQuery: '',
    selectedOrderForWa: null,
    stockStatus: {}, // { [name]: false (esgotado) | true (disponível) }
    expenses: [],
    expenseCategoryFilter: 'todas',
    productCosts: {
      "Brownie no Pote — Dois Amores": 6.50,
      "Brownie no Pote — Chocolate Tradicional": 6.00,
      "Brownie no Pote — Doce de Leite com Ninho": 6.20,
      "Chocolate com Maracujá": 5.00,
      "Ninho com Morango": 5.20,
      "Chocolate Tradicional": 4.00,
      "Brownie de Paçoca": 4.20
    },
    
    // Lista base de sabores para controle de cardápio e pedido manual
    flavors: [
      { name: "Brownie no Pote — Dois Amores", price: "R$ 18", rawPrice: 18, img: "img/sabor-copo-dois-amores.jpg", desc: "Brigadeiro, creme de Ninho e brownie molhadinho." },
      { name: "Brownie no Pote — Chocolate Tradicional", price: "R$ 18", rawPrice: 18, img: "img/sabor-copo-chocolate-tradicional.jpg", desc: "Mousse cremosa de puro chocolate e brownie artesanal." },
      { name: "Brownie no Pote — Doce de Leite com Ninho", price: "R$ 18", rawPrice: 18, img: "img/sabor-copo-doce-de-leite-com-ninho.jpg", desc: "Doce de leite artesanal, Ninho cremoso e muito brownie." },
      { name: "Chocolate com Maracujá", price: "R$ 14", rawPrice: 14, img: "img/sabor-chocolate-com-maracuja.jpg", desc: "Mousse de maracujá sobre brownie molhadinho." },
      { name: "Ninho com Morango", price: "R$ 14", rawPrice: 14, img: "img/sabor-ninho-com-morango.jpg", desc: "Creme de Ninho com morango e brownie." },
      { name: "Chocolate Tradicional", price: "R$ 12", rawPrice: 12, img: "img/sabor-chocolate-tradicional.jpg", desc: "Brownie macio com recheio cremoso de chocolate." },
      { name: "Brownie de Paçoca", price: "R$ 12", rawPrice: 12, img: "img/sabor-brownie-de-pacoca.jpg", desc: "Creme suave com paçoca crocante." }
    ]
  };

  // Hash criptográfico seguro (SHA-256 com salt) das credenciais da Malu
  // Nenhum e-mail ou senha fica exposto em texto puro no código!
  const _AUTH_SALT = 'brownie_da_malu_admin_2026_secure_salt_';
  const _SECURE_HASH = 'd9f4f5ff00893da4f5b0b9391bf5ce0c51970e03c8108b17fa76a1feca1d3b8c';

  async function computeAuthHash(email, pass) {
    const str = _AUTH_SALT + String(email || '').trim().toLowerCase() + ':' + String(pass || '').trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ===================== AUTENTICAÇÃO E BLOQUEIO (GATE) =====================
  function initAuth() {
    const savedAuth = localStorage.getItem('malu_admin_auth') || sessionStorage.getItem('malu_admin_auth');
    if (savedAuth === 'true') {
      AdminState.authenticated = true;
      document.getElementById('loginGate').classList.add('hidden');
    }

    // Verifica se já há sessão ativa no Supabase
    const sb = getSupabase();
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && session.user.email?.toLowerCase().includes('marialuizada')) {
          AdminState.authenticated = true;
          document.getElementById('loginGate').classList.add('hidden');
          carregarDadosCompletos();
        }
      }).catch(() => {});
    }

    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('adminEmail');
        const passInput = document.getElementById('adminPass');
        const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
        const pass = passInput ? passInput.value.trim() : '';
        const remember = document.getElementById('rememberMe').checked;
        const submitBtn = document.getElementById('btnLoginSubmit');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando... ⏳';

        let isAuthenticated = false;

        // 1. Verificação Criptográfica com Hash Seguro SHA-256 (Zero texto puro no código)
        try {
          const computedHash = await computeAuthHash(email, pass);
          if (computedHash === _SECURE_HASH) {
            isAuthenticated = true;
          }
        } catch (err) {
          console.warn('Erro ao processar hash:', err);
        }

        // 2. Autenticação direta no Supabase Auth
        const sbClient = getSupabase();
        if (sbClient) {
          try {
            const { data: authData, error: authError } = await sbClient.auth.signInWithPassword({
              email,
              password: pass
            });
            if (!authError && authData?.session) {
              isAuthenticated = true;
            }
          } catch (authErr) {
            console.warn('Tentativa Supabase auth:', authErr);
          }
        }

        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar no Painel 🍫';

        if (isAuthenticated) {
          AdminState.authenticated = true;
          if (remember) {
            localStorage.setItem('malu_admin_auth', 'true');
          } else {
            sessionStorage.setItem('malu_admin_auth', 'true');
          }
          document.getElementById('loginGate').classList.add('hidden');
          showToast('Bem-vinda de volta, Malu! 👩‍🍳🤎', 'success');
          carregarDadosCompletos();
        } else {
          showToast('E-mail ou senha de administradora incorretos.', 'error');
          if (passInput) {
            passInput.value = '';
            passInput.focus();
          }
        }
      });
    }

    const btnTogglePass = document.getElementById('btnTogglePass');
    if (btnTogglePass) {
      btnTogglePass.addEventListener('click', () => {
        const input = document.getElementById('adminPass');
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    }

    const btnLogout = document.getElementById('btnLogoutAdmin');
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        if (confirm('Deseja realmente sair do painel da Malu?')) {
          localStorage.removeItem('malu_admin_auth');
          sessionStorage.removeItem('malu_admin_auth');
          AdminState.authenticated = false;
          const sbClient = getSupabase();
          if (sbClient) {
            try { await sbClient.auth.signOut(); } catch(e) {}
          }
          document.getElementById('loginGate').classList.remove('hidden');
          const passInput = document.getElementById('adminPass');
          if (passInput) passInput.value = '';
        }
      });
    }
  }

  // ===================== SÍNTESE SONORA DE NOVO PEDIDO =====================
  function playSweetChime() {
    if (!AdminState.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Nota 1 (E5 - 659Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Nota 2 (B5 - 987Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.15);
      gain2.gain.setValueAtTime(0.3, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.9);
    } catch (e) {
      console.warn('Alerta sonoro não pôde ser reproduzido:', e);
    }
  }

  function initSoundToggle() {
    const btn = document.getElementById('btnToggleSound');
    const icon = document.getElementById('soundIcon');
    const text = document.getElementById('soundText');
    if (!btn) return;

    btn.addEventListener('click', () => {
      AdminState.soundEnabled = !AdminState.soundEnabled;
      btn.classList.toggle('active', AdminState.soundEnabled);
      if (AdminState.soundEnabled) {
        icon.textContent = '🔔';
        text.textContent = 'Som: Ligado';
        playSweetChime();
        showToast('Som de notificação ativado! 🔔', 'info');
      } else {
        icon.textContent = '🔕';
        text.textContent = 'Som: Mudo';
        showToast('Som de notificação desativado', 'info');
      }
    });
  }

  // ===================== TOAST NOTIFICATIONS =====================
  function showToast(message, type = 'info') {
    let container = document.getElementById('adminToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `admin-toast ${type === 'new-order' ? 'toast-new-order' : ''}`;
    const icon = type === 'success' ? '🤎' : type === 'error' ? '⚠️' : type === 'new-order' ? '🔔' : 'ℹ️';
    
    toast.innerHTML = `
      <span style="font-size:1.3rem;">${icon}</span>
      <span style="flex:1;">${escapeHtml(message)}</span>
      <button style="color:#888; font-size:1.1rem; padding:0 4px;" aria-label="Fechar">&times;</button>
    `;

    toast.querySelector('button').addEventListener('click', () => toast.remove());
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 320);
      }
    }, 4500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ===================== SUPABASE & CARREGAMENTO DE DADOS =====================
  function getSupabase() {
    return window.BrownieApp?.supabase || null;
  }

  async function carregarDadosCompletos() {
    const sb = getSupabase();
    if (!sb) {
      console.warn('Supabase não conectado. Carregando modo local.');
      carregarPedidosLocais();
      return;
    }

    try {
      // 1. Carregar Pedidos
      const { data: pedidos, error: errPedidos } = await sb
        .from('pedidos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (!errPedidos && pedidos) {
        AdminState.orders = pedidos;
      } else {
        console.warn('Erro ao buscar pedidos no Supabase:', errPedidos);
        carregarPedidosLocais();
      }

      // 2. Carregar Clientes / Perfis
      const { data: perfis, error: errPerfis } = await sb
        .from('perfis')
        .select('*')
        .order('criado_em', { ascending: false });

      if (!errPerfis && perfis) {
        AdminState.clients = perfis;
      }

      // 3. Carregar Depoimentos
      const { data: depoimentos, error: errDep } = await sb
        .from('depoimentos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (!errDep && depoimentos) {
        AdminState.reviews = depoimentos;
      }

      await carregarCustosEDespesas();
    } catch (e) {
      console.error('Falha na sincronização com Supabase:', e);
      carregarPedidosLocais();
      await carregarCustosEDespesas();
    }

    atualizarTodaUI();
  }

  // Fallback caso não haja pedidos ainda no Supabase
  function carregarPedidosLocais() {
    const saved = localStorage.getItem('malu_local_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Nunca carregar dados de demonstração antigos (IDs 1, 2 ou 3 que foram deletados)
        const demoIds = [1, 2, 3];
        const demoCodes = ['BM-8421', 'BM-7319', 'BM-6102'];
        AdminState.orders = parsed.filter(o =>
          !demoIds.includes(o.id) && !demoCodes.includes(o.codigo_pedido)
        );
      } catch(e) {}
    }
    if (!AdminState.orders) {
      AdminState.orders = [];
    }
  }

  // ===================== SUPABASE REALTIME LISTENER =====================
  function setupRealtimeListener() {
    const sb = getSupabase();
    if (!sb) return;

    try {
      sb.channel('admin-pedidos-channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'pedidos' },
          (payload) => {
            const newOrder = payload.new;
            // Evita duplicatas
            if (!AdminState.orders.some(o => o.id === newOrder.id || o.codigo_pedido === newOrder.codigo_pedido)) {
              AdminState.orders.unshift(newOrder);
              playSweetChime();
              showToast(`Novo pedido recebido de ${newOrder.nome_cliente}! #${newOrder.codigo_pedido} (R$ ${Number(newOrder.valor_total).toFixed(2).replace('.', ',')})`, 'new-order');
              atualizarTodaUI();
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'pedidos' },
          (payload) => {
            const updated = payload.new;
            const idx = AdminState.orders.findIndex(o => o.id === updated.id);
            if (idx !== -1) {
              AdminState.orders[idx] = updated;
              atualizarTodaUI();
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'pedidos' },
          (payload) => {
            const deleted = payload.old;
            AdminState.orders = AdminState.orders.filter(o => o.id !== deleted.id);
            atualizarTodaUI();
          }
        )
        .subscribe((status) => {
          const indicator = document.getElementById('liveStatusText');
          if (indicator) {
            if (status === 'SUBSCRIBED') {
              indicator.textContent = 'Conectado em tempo real 🟢';
            } else {
              indicator.textContent = 'Modo sincronizado 🔄';
            }
          }
        });
    } catch (e) {
      console.warn('Realtime subscription fallback:', e);
    }
  }

  // ===================== RENDERIZAÇÃO DA UI =====================
  function atualizarTodaUI() {
    atualizarKpisEMetricas();
    renderizarPedidos();
    renderizarClientes();
    renderizarCardapio();
    renderizarDepoimentos();
    atualizarCustosELucro();
  }

  // 1. KPIs e Métricas
  function atualizarKpisEMetricas() {
    const today = new Date().toDateString();
    
    let revToday = 0;
    let countToday = 0;
    let revTotal = 0;
    let pendingCount = 0;
    let activeCount = 0;
    let totalItems = 0;
    let deliveriesCount = 0;

    const flavorCounts = {};
    const neighborhoodCounts = {};

    AdminState.orders.forEach(o => {
      const orderDate = new Date(o.criado_em).toDateString();
      const val = parseFloat(o.valor_total) || 0;
      const status = (o.status || 'pendente').toLowerCase();

      if (status !== 'cancelado') {
        revTotal += val;
        if (orderDate === today) {
          revToday += val;
          countToday++;
        }
      }

      if (status === 'pendente') pendingCount++;
      if (status === 'preparando' || status === 'entrega') activeCount++;

      if (o.tipo_entrega === 'entrega') deliveriesCount++;

      // Extrai bairro para métrica
      if (o.endereco_entrega) {
        const parts = o.endereco_entrega.split('-');
        if (parts.length > 1) {
          const neigh = parts[parts.length - 1].replace(/porto velho.*/i, '').trim();
          if (neigh && neigh.length > 2) {
            neighborhoodCounts[neigh] = (neighborhoodCounts[neigh] || 0) + 1;
          }
        }
      }

      // Conta itens vendidos
      const items = Array.isArray(o.itens) ? o.itens : [];
      items.forEach(it => {
        const qty = parseInt(it.quantidade, 10) || 1;
        const name = it.sabor || it.name || 'Brownie';
        totalItems += qty;
        flavorCounts[name] = (flavorCounts[name] || 0) + qty;
      });
    });

    // Atualiza contadores dos cards
    document.getElementById('kpiRevenueToday').textContent = `R$ ${revToday.toFixed(2).replace('.', ',')}`;
    document.getElementById('kpiRevenueTodaySub').textContent = `${countToday} pedido${countToday === 1 ? '' : 's'} hoje`;
    
    document.getElementById('kpiPendingCount').textContent = pendingCount;
    document.getElementById('kpiActiveCount').textContent = activeCount;

    document.getElementById('kpiRevenueTotal').textContent = `R$ ${revTotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('kpiTotalOrdersSub').textContent = `${AdminState.orders.length} pedidos no total`;

    // Badges das abas
    const badgePending = document.getElementById('badgePendingOrders');
    if (badgePending) {
      badgePending.textContent = pendingCount;
      badgePending.classList.toggle('hidden', pendingCount === 0);
    }

    // Badge da bottom nav mobile (sincronizar com pedidos pendentes)
    const mobileBadge = document.getElementById('mobileBadgePedidos');
    if (mobileBadge) {
      mobileBadge.textContent = pendingCount;
      mobileBadge.classList.toggle('hidden', pendingCount === 0);
    }

    const badgeClients = document.getElementById('badgeTotalClients');
    if (badgeClients) {
      badgeClients.textContent = AdminState.clients.length || AdminState.orders.length;
    }

    // Contadores das pílulas de filtro
    document.getElementById('countAll').textContent = AdminState.orders.length;
    document.getElementById('countPendente').textContent = pendingCount;
    document.getElementById('countPreparando').textContent = AdminState.orders.filter(o => o.status === 'preparando').length;
    document.getElementById('countEntrega').textContent = AdminState.orders.filter(o => o.status === 'entrega').length;
    document.getElementById('countEntregue').textContent = AdminState.orders.filter(o => o.status === 'entregue').length;
    document.getElementById('countCancelado').textContent = AdminState.orders.filter(o => o.status === 'cancelado').length;

    // Métricas avançadas (Aba 2)
    const validOrdersCount = AdminState.orders.filter(o => o.status !== 'cancelado').length;
    const avgTicket = validOrdersCount > 0 ? (revTotal / validOrdersCount) : 0;
    const avgItems = validOrdersCount > 0 ? (totalItems / validOrdersCount) : 0;
    const delivRate = AdminState.orders.length > 0 ? Math.round((deliveriesCount / AdminState.orders.length) * 100) : 0;

    document.getElementById('kpiAvgTicket').textContent = `R$ ${avgTicket.toFixed(2).replace('.', ',')}`;
    document.getElementById('kpiAvgItems').textContent = avgItems.toFixed(1);
    document.getElementById('kpiDeliveryRate').textContent = `${delivRate}%`;
    document.getElementById('kpiDeliveryRateSub').textContent = `${deliveriesCount} entregas vs ${AdminState.orders.length - deliveriesCount} retiradas`;

    // Renderiza ranking de sabores
    renderizarRankingSabores(flavorCounts);
    renderizarRankingBairros(neighborhoodCounts);
  }

  function renderizarRankingSabores(flavorCounts) {
    const container = document.getElementById('flavorRankList');
    if (!container) return;

    const entries = Object.entries(flavorCounts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      container.innerHTML = '<p style="color:#888; font-size:0.9rem;">Nenhum sabor computado ainda.</p>';
      return;
    }

    const max = entries[0][1] || 1;
    container.innerHTML = entries.slice(0, 6).map(([name, count]) => {
      const pct = Math.round((count / max) * 100);
      return `
        <div class="flavor-rank-item">
          <div class="flavor-rank-top">
            <span>${escapeHtml(name)}</span>
            <span style="color:var(--red); font-weight:800;">${count} un</span>
          </div>
          <div class="flavor-rank-bar-bg">
            <div class="flavor-rank-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderizarRankingBairros(neighborhoodCounts) {
    const container = document.getElementById('neighborhoodRankList');
    if (!container) return;

    const entries = Object.entries(neighborhoodCounts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      container.innerHTML = '<p style="color:#888; font-size:0.9rem;">Nenhum bairro registrado ainda.</p>';
      return;
    }

    container.innerHTML = entries.slice(0, 5).map(([name, count]) => `
      <div class="neighborhood-item">
        <span class="neighborhood-name">📍 ${escapeHtml(name)}</span>
        <span class="neighborhood-count">${count} pedido${count === 1 ? '' : 's'}</span>
      </div>
    `).join('');
  }

  // 2. Renderização de Pedidos com Filtro
  function renderizarPedidos() {
    const grid = document.getElementById('ordersGrid');
    if (!grid) return;

    const filtered = filtrarPedidos();

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <h3>Nenhum pedido encontrado</h3>
          <p>Não há pedidos para os filtros selecionados no momento.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(o => {
      const dateStr = formatarDataHora(o.criado_em);
      const status = (o.status || 'pendente').toLowerCase();
      const statusBadge = obterBadgeStatus(status);
      const isDelivery = (o.tipo_entrega || 'entrega') === 'entrega';
      const items = Array.isArray(o.itens) ? o.itens : [];
      const valorTotal = (parseFloat(o.valor_total) || 0).toFixed(2).replace('.', ',');

      return `
        <div class="order-card status-${status}" data-id="${o.id || o.codigo_pedido}">
          <div class="order-card-header">
            <div class="order-code-wrap">
              <span class="order-code">#${escapeHtml(o.codigo_pedido)}</span>
              <span class="order-time">🕒 ${dateStr}</span>
            </div>
            <span class="order-status-badge badge-${status}">${statusBadge}</span>
          </div>

          <div class="order-card-body">
            <div class="customer-info-box">
              <div>
                <div class="customer-name">👤 ${escapeHtml(o.nome_cliente || 'Cliente')}</div>
                <div class="customer-phone">📞 ${escapeHtml(o.telefone_cliente || 'Sem telefone')}</div>
              </div>
              <button type="button" class="btn-wa-direct btn-open-wa-modal" data-id="${o.id || o.codigo_pedido}" title="Enviar mensagem no WhatsApp">
                💬 WhatsApp
              </button>
            </div>

            <div class="delivery-info-box">
              <div class="delivery-badge-row">
                <span class="delivery-type-label">${isDelivery ? '🛵 Entrega em Domicílio' : '🛍️ Retirada no Local'}</span>
                ${isDelivery && o.endereco_entrega ? `
                  <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.endereco_entrega)}" target="_blank" rel="noopener" class="btn-maps-link">
                    🗺️ Maps
                  </a>
                ` : ''}
              </div>
              <div class="delivery-address-text">${escapeHtml(o.endereco_entrega || (isDelivery ? 'Endereço a combinar' : 'Retirada na loja'))}</div>
            </div>

            <div class="order-items-list">
              ${items.map(it => `
                <div class="order-item-row">
                  <div class="item-qty-name">
                    <span class="item-qty-badge">${it.quantidade || 1}x</span>
                    <span class="item-name">${escapeHtml(it.sabor || it.name || 'Brownie')}</span>
                  </div>
                  <span class="item-subtotal">R$ ${(parseFloat(it.subtotal || it.preco || 0)).toFixed(2).replace('.', ',')}</span>
                </div>
              `).join('')}
            </div>

            ${o.observacoes ? `
              <div class="order-notes-box">
                <strong>Observações:</strong> ${escapeHtml(o.observacoes)}
              </div>
            ` : ''}
          </div>

          <div class="order-card-foot">
            <div class="order-total-row">
              <span class="total-label">Total do Pedido</span>
              <span class="total-value">R$ ${valorTotal}</span>
            </div>

            <div class="order-actions-row">
              <select class="status-select order-status-changer" data-id="${o.id || o.codigo_pedido}">
                <option value="pendente" ${status === 'pendente' ? 'selected' : ''}>⏳ Pendente</option>
                <option value="preparando" ${status === 'preparando' ? 'selected' : ''}>👩‍🍳 Em Preparo</option>
                <option value="entrega" ${status === 'entrega' ? 'selected' : ''}>🛵 Saiu p/ Entrega</option>
                <option value="entregue" ${status === 'entregue' ? 'selected' : ''}>✅ Entregue</option>
                <option value="cancelado" ${status === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
              </select>

              <button type="button" class="btn-icon-action btn-print-order" data-id="${o.id || o.codigo_pedido}" title="Imprimir Comanda">
                🖨️
              </button>

              <button type="button" class="btn-icon-action btn-icon-danger btn-delete-order" data-id="${o.id || o.codigo_pedido}" title="Excluir Pedido">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    adicionarEventosCardsPedidos();
  }

  function filtrarPedidos() {
    return AdminState.orders.filter(o => {
      // 1. Filtro de Status
      const status = (o.status || 'pendente').toLowerCase();
      if (AdminState.currentStatusFilter !== 'todos' && status !== AdminState.currentStatusFilter) {
        return false;
      }

      // 2. Filtro de Data
      const orderDate = new Date(o.criado_em);
      const now = new Date();
      if (AdminState.currentDateFilter === 'hoje') {
        if (orderDate.toDateString() !== now.toDateString()) return false;
      } else if (AdminState.currentDateFilter === 'ontem') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (orderDate.toDateString() !== yesterday.toDateString()) return false;
      } else if (AdminState.currentDateFilter === '7dias') {
        const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (AdminState.currentDateFilter === 'mes') {
        if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) return false;
      }

      // 3. Busca de Texto
      if (AdminState.searchQuery) {
        const q = AdminState.searchQuery.toLowerCase();
        const code = (o.codigo_pedido || '').toLowerCase();
        const name = (o.nome_cliente || '').toLowerCase();
        const phone = (o.telefone_cliente || '').toLowerCase();
        const items = Array.isArray(o.itens) ? o.itens.map(i => (i.sabor || i.name || '').toLowerCase()).join(' ') : '';
        
        if (!code.includes(q) && !name.includes(q) && !phone.includes(q) && !items.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }

  function obterBadgeStatus(status) {
    switch(status) {
      case 'pendente': return '⏳ Pendente';
      case 'preparando': return '👩‍🍳 Preparando';
      case 'entrega': return '🛵 Na Rota';
      case 'entregue': return '✅ Concluído';
      case 'cancelado': return '❌ Cancelado';
      default: return status;
    }
  }

  function formatarDataHora(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Hoje às ${hora}`;
    }
    return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`;
  }

  // Eventos dos botões dos cards
  function adicionarEventosCardsPedidos() {
    // 1. Mudança de status
    document.querySelectorAll('.order-status-changer').forEach(select => {
      select.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const newStatus = e.target.value;
        await atualizarStatusPedido(id, newStatus);
      });
    });

    // 2. Abertura do modal do WhatsApp
    document.querySelectorAll('.btn-open-wa-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        const order = AdminState.orders.find(o => String(o.id) === String(id) || o.codigo_pedido === id);
        if (order) abrirModalWa(order);
      });
    });

    // 3. Imprimir comanda
    document.querySelectorAll('.btn-print-order').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        const order = AdminState.orders.find(o => String(o.id) === String(id) || o.codigo_pedido === id);
        if (order) imprimirComanda(order);
      });
    });

    // 4. Excluir pedido
    document.querySelectorAll('.btn-delete-order').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        if (confirm('Tem certeza que deseja excluir este pedido do sistema?')) {
          await excluirPedido(id);
        }
      });
    });
  }

  // Ações de Pedidos (Update e Delete)
  async function atualizarStatusPedido(id, newStatus) {
    const order = AdminState.orders.find(o => String(o.id) === String(id) || o.codigo_pedido === id);
    if (!order) return;

    order.status = newStatus;
    const sb = getSupabase();
    if (sb && order.id) {
      try {
        await sb.from('pedidos').update({ status: newStatus }).eq('id', order.id);
      } catch(e) {
        console.warn('Erro ao atualizar status no Supabase:', e);
      }
    }

    localStorage.setItem('malu_local_orders', JSON.stringify(AdminState.orders));
    showToast(`Pedido #${order.codigo_pedido} marcado como: ${obterBadgeStatus(newStatus)}`, 'success');
    atualizarTodaUI();
  }

  async function excluirPedido(id) {
    const sb = getSupabase();
    const order = AdminState.orders.find(o => String(o.id) === String(id) || o.codigo_pedido === id);
    if (sb && order?.id) {
      try {
        await sb.from('pedidos').delete().eq('id', order.id);
      } catch(e) {
        console.warn('Erro ao excluir no Supabase:', e);
      }
    }

    AdminState.orders = AdminState.orders.filter(o => String(o.id) !== String(id) && o.codigo_pedido !== id);
    localStorage.setItem('malu_local_orders', JSON.stringify(AdminState.orders));
    showToast('Pedido removido com sucesso!', 'info');
    atualizarTodaUI();
  }

  // ===================== MODAL DO WHATSAPP COM MENSAGENS PRONTAS =====================
  function abrirModalWa(order) {
    AdminState.selectedOrderForWa = order;
    const modal = document.getElementById('waMessageModal');
    const container = document.getElementById('waMessageOptions');
    const sub = document.getElementById('waModalSubtitle');
    if (!modal || !container) return;

    const cleanPhone = (order.telefone_cliente || '').replace(/\D/g, '');
    const clientName = (order.nome_cliente || 'Cliente').split(' ')[0];
    const itemsText = (order.itens || []).map(i => `${i.quantidade}x ${i.sabor || i.name}`).join(', ');

    sub.textContent = `Enviar mensagem para ${order.nome_cliente} (${order.telefone_cliente || 'Sem número'}):`;

    const messages = [
      {
        title: '👩‍🍳 1. Confirmar e Iniciar Preparo',
        desc: 'Avisa o cliente que o pedido foi aceito e já está sendo preparado com muito carinho.',
        text: `Olá ${clientName}! Aqui é a Malu 👩‍🍳🤎\n\nConfirmando que recebemos seu pedido #${order.codigo_pedido} (${itemsText}) no valor de R$ ${(parseFloat(order.valor_total)||0).toFixed(2).replace('.', ',')}.\n\nJá estamos preparando seus brownies fresquinhos! Assim que sair para você, te aviso por aqui ✨.`
      },
      {
        title: '🛵 2. Avisar que Saiu para Entrega',
        desc: 'Informa que o motoboy já pegou os brownies e está a caminho.',
        text: `Olá ${clientName}! Boas notícias: seu pedido #${order.codigo_pedido} acabou de sair para entrega! 🛵💨\n\nNosso entregador já está a caminho do seu endereço:\n📍 ${order.endereco_entrega || 'Seu endereço'}.\n\nQualquer dúvida é só chamar!`
      },
      {
        title: '🛍️ 3. Pronto para Retirada no Local',
        desc: 'Avisa que os brownies já estão embalados esperando o cliente buscar.',
        text: `Olá ${clientName}! Seu pedido #${order.codigo_pedido} já está prontinho e embalado esperando por você para retirada! 🍫✨\n\nPode passar quando quiser!`
      },
      {
        title: '⭐ 4. Entrega Concluída e Agradecimento',
        desc: 'Agradece a preferência e convida o cliente a avaliar no site.',
        text: `Olá ${clientName}! Seu pedido #${order.codigo_pedido} foi entregue! 🤎\n\nMuito obrigada por escolher o Brownie da Malu! Esperamos de coração que ame cada mordida.\n\nSe puder deixar sua avaliação no nosso site, ficaremos muito felizes: https://brownies-da-malu.vercel.app/#depoimentos ⭐`
      }
    ];

    container.innerHTML = messages.map(m => `
      <button type="button" class="wa-option-btn" data-text="${encodeURIComponent(m.text)}">
        <div class="wa-option-title">${m.title}</div>
        <div class="wa-option-preview">${escapeHtml(m.desc)}</div>
      </button>
    `).join('');

    container.querySelectorAll('.wa-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        const phoneFormatted = cleanPhone.length <= 11 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;
        const url = `https://wa.me/${phoneFormatted}?text=${text}`;
        window.open(url, '_blank');
        fecharModalWa();
      });
    });

    modal.classList.add('active');
  }

  function fecharModalWa() {
    const modal = document.getElementById('waMessageModal');
    if (modal) modal.classList.remove('active');
  }

  // ===================== IMPRESSÃO DE COMANDA (CUPOM / 80MM) =====================
  function imprimirComanda(order) {
    const area = document.getElementById('printSlipArea');
    if (!area) return;

    const items = Array.isArray(order.itens) ? order.itens : [];
    const isDelivery = (order.tipo_entrega || 'entrega') === 'entrega';
    const total = (parseFloat(order.valor_total) || 0).toFixed(2).replace('.', ',');
    const dataHora = formatarDataHora(order.criado_em);

    area.innerHTML = `
      <div class="print-slip">
        <div class="print-slip-center">
          <strong style="font-size:16px;">BROWNIE DA MALU</strong><br>
          <em>Feito à mão com muito carinho</em><br>
          Porto Velho - RO<br>
          (69) 9.9384-4237
        </div>
        <div class="print-slip-divider"></div>
        <div>
          <strong>PEDIDO:</strong> #${escapeHtml(order.codigo_pedido)}<br>
          <strong>DATA:</strong> ${dataHora}<br>
          <strong>CLIENTE:</strong> ${escapeHtml(order.nome_cliente || 'Cliente')}<br>
          <strong>TEL:</strong> ${escapeHtml(order.telefone_cliente || 'N/A')}<br>
          <strong>TIPO:</strong> ${isDelivery ? '🛵 ENTREGA EM DOMICÍLIO' : '🛍️ RETIRADA NO LOCAL'}<br>
          ${isDelivery ? `<strong>ENDEREÇO:</strong> ${escapeHtml(order.endereco_entrega || '')}<br>` : ''}
        </div>
        <div class="print-slip-divider"></div>
        <div><strong>ITENS DO PEDIDO:</strong></div>
        ${items.map(it => `
          <div style="display:flex; justify-content:space-between; margin:4px 0;">
            <span>${it.quantidade || 1}x ${escapeHtml(it.sabor || it.name)}</span>
            <span>R$ ${(parseFloat(it.subtotal || it.preco || 0)).toFixed(2).replace('.', ',')}</span>
          </div>
        `).join('')}
        ${order.observacoes ? `
          <div class="print-slip-divider"></div>
          <div><strong>OBS:</strong> ${escapeHtml(order.observacoes)}</div>
        ` : ''}
        <div class="print-slip-divider"></div>
        <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:bold;">
          <span>TOTAL:</span>
          <span>R$ ${total}</span>
        </div>
        <div class="print-slip-divider"></div>
        <div class="print-slip-center" style="font-size:10px;">
          Obrigado pela preferência! 🤎<br>
          Instagram: @browniesdamalu_
        </div>
      </div>
    `;

    window.print();
  }

  // ===================== NOVO PEDIDO MANUAL (BALCÃO / TELEFONE) =====================
  function initManualOrder() {
    const modal = document.getElementById('manualOrderModal');
    const openBtn = document.getElementById('btnOpenManualOrderModal');
    const closeBtn = document.getElementById('btnCloseManualOrderModal');
    const form = document.getElementById('manualOrderForm');
    const itemsArea = document.getElementById('manualItemsSelectArea');
    const totalDisplay = document.getElementById('manualOrderTotalDisplay');

    if (!modal || !form || !itemsArea) return;

    openBtn.addEventListener('click', () => {
      // Popula sabores para seleção
      itemsArea.innerHTML = AdminState.flavors.map((f, i) => `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.88rem;">
          <span>${escapeHtml(f.name)} (${f.price})</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <button type="button" class="btn-qty-manual minus" data-idx="${i}" style="width:26px; height:26px; background:#EEE; border-radius:4px; font-weight:bold;">-</button>
            <span class="qty-manual-display" id="manualQty_${i}">0</span>
            <button type="button" class="btn-qty-manual plus" data-idx="${i}" style="width:26px; height:26px; background:#EEE; border-radius:4px; font-weight:bold;">+</button>
          </div>
        </div>
      `).join('');

      let manualQuantities = AdminState.flavors.map(() => 0);

      function recalcularTotalManual() {
        let tot = 0;
        manualQuantities.forEach((q, idx) => {
          tot += q * AdminState.flavors[idx].rawPrice;
        });
        totalDisplay.textContent = `R$ ${tot.toFixed(2).replace('.', ',')}`;
        return tot;
      }

      itemsArea.querySelectorAll('.btn-qty-manual').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          if (btn.classList.contains('plus')) {
            manualQuantities[idx]++;
          } else if (manualQuantities[idx] > 0) {
            manualQuantities[idx]--;
          }
          document.getElementById(`manualQty_${idx}`).textContent = manualQuantities[idx];
          recalcularTotalManual();
        });
      });

      modal.classList.add('active');
    });

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('manualCustName').value.trim();
      const phone = document.getElementById('manualCustPhone').value.trim();
      const type = document.getElementById('manualOrderType').value;
      const addr = document.getElementById('manualAddress').value.trim();
      const notes = document.getElementById('manualOrderNotes').value.trim();
      const payment = document.getElementById('manualPayment')?.value || 'pix';
      const originRadio = form.querySelector('input[name="manualOrigin"]:checked');
      const origin = originRadio?.value || 'whatsapp';

      const items = [];
      let total = 0;
      AdminState.flavors.forEach((f, idx) => {
        const qtyEl = document.getElementById(`manualQty_${idx}`);
        const q = parseInt(qtyEl?.textContent || '0', 10);
        if (q > 0) {
          items.push({
            sabor: f.name,
            quantidade: q,
            preco: f.price,
            subtotal: q * f.rawPrice
          });
          total += q * f.rawPrice;
        }
      });

      if (items.length === 0) {
        showToast('Selecione pelo menos 1 item para o pedido!', 'error');
        return;
      }

      const codigo = 'BM-' + Math.floor(1000 + Math.random() * 9000);
      const newOrder = {
        codigo_pedido: codigo,
        nome_cliente: name,
        telefone_cliente: phone,
        tipo_entrega: type,
        endereco_entrega: type === 'entrega' ? addr : 'Retirada no Local',
        observacoes: notes ? `[Pagamento: ${payment.toUpperCase()} | Via: ${origin}] ${notes}` : `[Pagamento: ${payment.toUpperCase()} | Via: ${origin}]`,
        valor_total: total,
        itens: items,
        status: 'preparando',
        origem: origin,
        forma_pagamento: payment,
        criado_em: new Date().toISOString()
      };

      const sb = getSupabase();
      if (sb) {
        try {
          const { data, error } = await sb.from('pedidos').insert([newOrder]).select().single();
          if (!error && data) {
            newOrder.id = data.id;
          }
        } catch(e) {
          console.warn('Erro ao salvar pedido manual no Supabase:', e);
        }
      }

      AdminState.orders.unshift(newOrder);
      localStorage.setItem('malu_local_orders', JSON.stringify(AdminState.orders));
      
      modal.classList.remove('active');
      form.reset();
      showToast(`Pedido #${codigo} adicionado com sucesso! 🍫`, 'success');
      atualizarTodaUI();
    });
  }

  // ===================== ABA 3: CLIENTES (CRM) =====================
  function renderizarClientes() {
    const tbody = document.getElementById('clientsTableBody');
    if (!tbody) return;

    // Constrói clientes a partir dos perfis cadastrados e dos pedidos realizados
    const clientsMap = {};

    AdminState.clients.forEach(c => {
      const key = c.telefone || c.nome || c.id;
      clientsMap[key] = {
        nome: c.nome || 'Cliente',
        telefone: c.telefone || '',
        bairro: c.bairro || 'Porto Velho',
        endereco: c.endereco ? `${c.endereco}, ${c.numero || ''}` : 'Não informado',
        totalOrders: 0
      };
    });

    AdminState.orders.forEach(o => {
      const key = o.telefone_cliente || o.nome_cliente;
      if (!clientsMap[key]) {
        clientsMap[key] = {
          nome: o.nome_cliente || 'Cliente',
          telefone: o.telefone_cliente || '',
          bairro: 'Porto Velho',
          endereco: o.endereco_entrega || 'Não informado',
          totalOrders: 0
        };
      }
      clientsMap[key].totalOrders++;
    });

    let clientsList = Object.values(clientsMap);

    // Filtro de busca de clientes
    const q = (document.getElementById('clientSearchInput')?.value || '').toLowerCase();
    if (q) {
      clientsList = clientsList.filter(c => 
        c.nome.toLowerCase().includes(q) || 
        c.telefone.toLowerCase().includes(q) || 
        c.bairro.toLowerCase().includes(q)
      );
    }

    if (clientsList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:30px; color:#888;">
            Nenhum cliente encontrado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = clientsList.map(c => {
      const initials = (c.nome || 'C').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      const cleanPhone = (c.telefone || '').replace(/\D/g, '');

      return `
        <tr>
          <td>
            <div class="client-avatar-cell">
              <div class="client-avatar">${initials}</div>
              <div>
                <strong>${escapeHtml(c.nome)}</strong>
              </div>
            </div>
          </td>
          <td>
            ${c.telefone ? `
              <div style="display:flex; align-items:center; gap:6px;">
                <span>${escapeHtml(c.telefone)}</span>
                <a href="https://wa.me/55${cleanPhone}" target="_blank" rel="noopener" class="btn-wa-direct" style="padding:2px 8px; font-size:0.75rem;">
                  WhatsApp
                </a>
              </div>
            ` : 'Não informado'}
          </td>
          <td>${escapeHtml(c.bairro)}</td>
          <td><small>${escapeHtml(c.endereco)}</small></td>
          <td><strong>${c.totalOrders}</strong> pedido${c.totalOrders === 1 ? '' : 's'}</td>
          <td>
            <button type="button" class="btn-toolbar btn-quick-order-client" data-name="${escapeHtml(c.nome)}" data-phone="${escapeHtml(c.telefone)}" style="padding:4px 8px; font-size:0.78rem;">
              ➕ Pedido
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-quick-order-client').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('btnOpenManualOrderModal').click();
        setTimeout(() => {
          document.getElementById('manualCustName').value = btn.getAttribute('data-name');
          document.getElementById('manualCustPhone').value = btn.getAttribute('data-phone');
        }, 100);
      });
    });
  }

  // ===================== ABA 4: CARDÁPIO & ESTOQUE =====================
  function initCardapioManage() {
    const saved = localStorage.getItem('malu_stock_status');
    if (saved) {
      try {
        AdminState.stockStatus = JSON.parse(saved);
      } catch(e) {}
    }

    const resetBtn = document.getElementById('btnResetMenuStock');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        AdminState.stockStatus = {};
        localStorage.setItem('malu_stock_status', JSON.stringify({}));
        showToast('Todos os sabores foram marcados como DISPONÍVEIS! 🍫', 'success');
        renderizarCardapio();
      });
    }
  }

  function renderizarCardapio() {
    const grid = document.getElementById('menuManageGrid');
    if (!grid) return;

    grid.innerHTML = AdminState.flavors.map(f => {
      const isOutOfStock = AdminState.stockStatus[f.name] === false;

      return `
        <div class="menu-manage-card ${isOutOfStock ? 'out-of-stock' : ''}">
          <div class="menu-card-img-wrap">
            <img src="${f.img}" alt="${f.name}">
            <span class="stock-badge ${isOutOfStock ? 'badge-out-stock' : 'badge-in-stock'}">
              ${isOutOfStock ? '❌ Esgotado hoje' : '✅ Disponível'}
            </span>
          </div>

          <div class="menu-card-body">
            <h4 class="menu-card-title">${escapeHtml(f.name)}</h4>
            <p class="menu-card-desc">${escapeHtml(f.desc)}</p>
            
            <div class="menu-card-foot">
              <span class="menu-card-price">${f.price}</span>
              <button type="button" class="toggle-stock-btn ${isOutOfStock ? 'active' : ''}" data-name="${escapeHtml(f.name)}">
                ${isOutOfStock ? '🟢 Tornar Disponível' : '🔴 Marcar Esgotado'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.toggle-stock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        const current = AdminState.stockStatus[name] !== false; // true por padrão
        AdminState.stockStatus[name] = !current;
        localStorage.setItem('malu_stock_status', JSON.stringify(AdminState.stockStatus));
        
        showToast(
          AdminState.stockStatus[name] 
            ? `Sabor "${name}" marcado como DISPONÍVEL! 🍫` 
            : `Sabor "${name}" marcado como ESGOTADO HOJE ⚠️`,
          'info'
        );
        renderizarCardapio();
      });
    });
  }

  // ===================== ABA 5: DEPOIMENTOS =====================
  function renderizarDepoimentos() {
    const grid = document.getElementById('reviewsManageGrid');
    if (!grid) return;

    if (AdminState.reviews.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⭐</div>
          <h3>Nenhum depoimento para moderar</h3>
          <p>Quando os clientes enviarem avaliações pelo site, elas aparecerão aqui.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = AdminState.reviews.map(r => {
      const isAprovado = r.aprovado !== false;
      const stars = '⭐'.repeat(r.estrelas || 5);
      const dataStr = r.criado_em ? new Date(r.criado_em).toLocaleDateString('pt-BR') : '';

      return `
        <div class="review-manage-card" style="${isAprovado ? '' : 'opacity:0.6; background:#FAFAFA;'}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="review-stars">${stars}</div>
            <span style="font-size:0.75rem; font-weight:bold; padding:2px 8px; border-radius:10px; background:${isAprovado ? '#E8F5E9; color:#2E7D32;' : '#FFEBEE; color:#C62828;'}">
              ${isAprovado ? 'Publicado' : 'Oculto'}
            </span>
          </div>

          <p class="review-comment">"${escapeHtml(r.comentario)}"</p>

          <div class="review-author-row">
            <div>
              <strong>${escapeHtml(r.nome)}</strong> • <small>${escapeHtml(r.cidade || 'Porto Velho')}</small>
              <div style="font-size:0.75rem; color:#888;">${dataStr}</div>
            </div>

            <div class="review-actions">
              <button type="button" class="btn-toolbar btn-toggle-review" data-id="${r.id}" style="padding:4px 8px; font-size:0.75rem;">
                ${isAprovado ? 'Ocultar' : 'Aprovar'}
              </button>
              <button type="button" class="btn-icon-action btn-icon-danger btn-delete-review" data-id="${r.id}" style="width:28px; height:28px; font-size:0.8rem;">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.btn-toggle-review').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const review = AdminState.reviews.find(r => r.id === id);
        if (!review) return;

        const novoEstado = !review.aprovado;
        review.aprovado = novoEstado;

        const sb = getSupabase();
        if (sb) {
          try {
            await sb.from('depoimentos').update({ aprovado: novoEstado }).eq('id', id);
          } catch(e) {}
        }

        showToast(novoEstado ? 'Depoimento aprovado e publicado!' : 'Depoimento ocultado!', 'info');
        renderizarDepoimentos();
      });
    });

    grid.querySelectorAll('.btn-delete-review').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Tem certeza que deseja apagar este depoimento?')) {
          const sb = getSupabase();
          if (sb) {
            try {
              await sb.from('depoimentos').delete().eq('id', id);
            } catch(e) {}
          }
          AdminState.reviews = AdminState.reviews.filter(r => r.id !== id);
          showToast('Depoimento excluído!', 'info');
          renderizarDepoimentos();
        }
      });
    });
  }

  // ===================== CONTROLE DE NAVEGAÇÃO DE ABAS =====================
  function initTabNav() {
    // Função de troca de aba
    function switchTab(tabTarget) {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      document.querySelectorAll('.mobile-nav-btn[data-tab]').forEach(b => b.classList.remove('active'));

      const activeContent = document.getElementById(`tab${tabTarget.charAt(0).toUpperCase() + tabTarget.slice(1)}`);
      if (activeContent) activeContent.classList.add('active');

      // Ativar botão na nav desktop
      document.querySelectorAll(`.admin-tab-btn[data-tab="${tabTarget}"]`).forEach(b => b.classList.add('active'));
      // Ativar botão na bottom nav mobile
      document.querySelectorAll(`.mobile-nav-btn[data-tab="${tabTarget}"]`).forEach(b => b.classList.add('active'));
    }

    // Botões da nav desktop
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.getAttribute('data-tab'));
      });
    });

    // Botões da bottom nav mobile
    const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn[data-tab]');
    mobileNavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.getAttribute('data-tab'));
      });
    });

    // Botão central (+) da bottom nav abre modal de nova venda
    const btnMobileOrder = document.getElementById('btnOpenManualOrderMobile');
    if (btnMobileOrder) {
      btnMobileOrder.addEventListener('click', () => {
        document.getElementById('btnOpenManualOrderModal')?.click();
      });
    }
  }

  // ===================== EVENTOS DE FILTROS & BARRA DE FERRAMENTAS =====================
  function initToolbarEvents() {
    // 1. Pílulas de Status
    const pills = document.querySelectorAll('.status-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        AdminState.currentStatusFilter = pill.getAttribute('data-status');
        renderizarPedidos();
      });
    });

    // 2. Busca de pedidos
    const searchInput = document.getElementById('orderSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        AdminState.searchQuery = e.target.value.trim();
        renderizarPedidos();
      });
    }

    // 3. Filtro de data
    const dateSelect = document.getElementById('dateFilterSelect');
    if (dateSelect) {
      dateSelect.addEventListener('change', (e) => {
        AdminState.currentDateFilter = e.target.value;
        renderizarPedidos();
      });
    }

    // 4. Busca de clientes
    const clientSearch = document.getElementById('clientSearchInput');
    if (clientSearch) {
      clientSearch.addEventListener('input', () => {
        renderizarClientes();
      });
    }

    // 5. Botão de Atualizar
    const refreshBtn = document.getElementById('btnRefreshData');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('rotating');
        await carregarDadosCompletos();
        showToast('Dados atualizados com sucesso!', 'info');
        setTimeout(() => refreshBtn.classList.remove('rotating'), 600);
      });
    }

    // 6. Baixar Backup Completo em JSON
    const exportBtn = document.getElementById('btnExportBackup');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        baixarBackupJSON();
      });
    }

    // 7. Imprimir Resumo do Dia
    const btnPrintToday = document.getElementById('btnPrintTodaySummary');
    if (btnPrintToday) {
      btnPrintToday.addEventListener('click', () => {
        imprimirResumoDoDia();
      });
    }

    // 8. Fechar modal do WhatsApp
    const closeWaBtn = document.getElementById('btnCloseWaModal');
    if (closeWaBtn) closeWaBtn.addEventListener('click', fecharModalWa);
  }

  function baixarBackupJSON() {
    const backupData = {
      gerado_em: new Date().toISOString(),
      loja: 'Brownie da Malu',
      cidade: 'Porto Velho - RO',
      estatisticas: {
        total_pedidos: AdminState.orders.length,
        total_clientes: AdminState.clients.length,
        total_depoimentos: AdminState.reviews.length,
        total_despesas: (AdminState.expenses || []).length
      },
      pedidos: AdminState.orders,
      clientes: AdminState.clients,
      depoimentos: AdminState.reviews,
      custos_produtos: AdminState.productCosts,
      despesas: AdminState.expenses
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateFormatted = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup_brownie_da_malu_${dateFormatted}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('Backup completo baixado com sucesso! 💾', 'success');
  }

  function imprimirResumoDoDia() {
    const area = document.getElementById('printSlipArea');
    if (!area) return;

    const today = new Date().toDateString();
    const todayOrders = AdminState.orders.filter(o => new Date(o.criado_em).toDateString() === today && o.status !== 'cancelado');
    const totalRev = todayOrders.reduce((sum, o) => sum + (parseFloat(o.valor_total) || 0), 0);

    area.innerHTML = `
      <div class="print-slip">
        <div class="print-slip-center">
          <strong style="font-size:16px;">RESUMO DO DIA - BROWNIE DA MALU</strong><br>
          ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}
        </div>
        <div class="print-slip-divider"></div>
        <div>
          <strong>Total de Pedidos:</strong> ${todayOrders.length}<br>
          <strong>Faturamento Total:</strong> R$ ${totalRev.toFixed(2).replace('.', ',')}
        </div>
        <div class="print-slip-divider"></div>
        <div><strong>LISTA DE PEDIDOS DO DIA:</strong></div>
        ${todayOrders.map(o => `
          <div style="margin:6px 0; border-bottom:1px dotted #ccc; padding-bottom:4px;">
            <strong>#${escapeHtml(o.codigo_pedido)}</strong> - ${escapeHtml(o.nome_cliente)}<br>
            ${(o.itens || []).map(i => `${i.quantidade}x ${escapeHtml(i.sabor || i.name)}`).join(', ')}<br>
            <strong>Total:</strong> R$ ${(parseFloat(o.valor_total)||0).toFixed(2).replace('.', ',')} (${obterBadgeStatus(o.status)})
          </div>
        `).join('')}
        <div class="print-slip-divider"></div>
        <div class="print-slip-center" style="font-size:10px;">
          Impresso em ${new Date().toLocaleTimeString('pt-BR')} 🤎
        </div>
      </div>
    `;

    window.print();
  }

  // ===================== GESTÃO FINANCEIRA (CUSTOS & LUCRO LÍQUIDO) =====================
  async function carregarCustosEDespesas() {
    // 1. Custos Unitários dos Produtos
    try {
      const savedCosts = localStorage.getItem('brownie_product_costs');
      if (savedCosts) {
        AdminState.productCosts = Object.assign({}, AdminState.productCosts, JSON.parse(savedCosts));
      }
    } catch (e) {
      console.warn('Erro ao carregar custos locais:', e);
    }

    const sb = getSupabase();
    if (sb) {
      try {
        const { data: dbCosts, error: errCosts } = await sb.from('custos_produtos').select('*');
        if (!errCosts && dbCosts && dbCosts.length > 0) {
          dbCosts.forEach(row => {
            if (row.sabor && row.custo_unitario !== undefined) {
              AdminState.productCosts[row.sabor] = parseFloat(row.custo_unitario);
            }
          });
        }
      } catch (e) {
        // Fallback silencioso se a tabela custos_produtos ainda não foi criada no Supabase
      }
    }

    // 2. Despesas Operacionais
    try {
      const savedExp = localStorage.getItem('brownie_expenses');
      if (savedExp) {
        AdminState.expenses = JSON.parse(savedExp);
      }
    } catch (e) {
      console.warn('Erro ao carregar despesas locais:', e);
    }

    if (sb) {
      try {
        const { data: dbExp, error: errExp } = await sb.from('despesas').select('*').order('data_despesa', { ascending: false });
        if (!errExp && dbExp && dbExp.length > 0) {
          AdminState.expenses = dbExp.map(d => ({
            id: d.id,
            descricao: d.descricao,
            categoria: d.categoria || 'outros',
            valor: parseFloat(d.valor) || 0,
            data: d.data_despesa || (d.criado_em ? d.criado_em.slice(0, 10) : ''),
            observacao: d.observacoes || '',
            criado_em: d.criado_em
          }));
        }
      } catch (e) {
        // Fallback se a tabela despesas não foi criada no Supabase
      }
    }

    // Inicializar lista vazia se não houver despesas reais
    if (!AdminState.expenses) {
      AdminState.expenses = [];
    }
  }

  function getProductUnitCost(flavorName) {
    if (!flavorName) return 5.00;
    if (AdminState.productCosts[flavorName] !== undefined) {
      return parseFloat(AdminState.productCosts[flavorName]) || 0;
    }
    const clean = flavorName.toLowerCase().trim();
    for (const [key, val] of Object.entries(AdminState.productCosts)) {
      if (key.toLowerCase().trim() === clean) return parseFloat(val) || 0;
    }
    for (const [key, val] of Object.entries(AdminState.productCosts)) {
      if (clean.includes(key.toLowerCase()) || key.toLowerCase().includes(clean)) {
        return parseFloat(val) || 0;
      }
    }
    return 5.00;
  }

  function atualizarCustosELucro() {
    let grossRev = 0;
    let cpvTotal = 0;
    let validOrders = 0;

    AdminState.orders.forEach(o => {
      const status = (o.status || 'pendente').toLowerCase();
      if (status !== 'cancelado') {
        const val = parseFloat(o.valor_total) || 0;
        grossRev += val;
        validOrders++;

        const items = Array.isArray(o.itens) ? o.itens : [];
        items.forEach(it => {
          const qty = parseInt(it.quantidade, 10) || 1;
          const name = it.sabor || it.name || '';
          const unitCost = getProductUnitCost(name);
          cpvTotal += (unitCost * qty);
        });
      }
    });

    const expensesTotal = (AdminState.expenses || []).reduce((sum, exp) => sum + (parseFloat(exp.valor) || 0), 0);
    const totalCustos = cpvTotal + expensesTotal;
    const netProfit = grossRev - totalCustos;
    const netMargin = grossRev > 0 ? ((netProfit / grossRev) * 100) : 0;

    const elRev = document.getElementById('kpiCustosRevenue');
    const elRevSub = document.getElementById('kpiCustosRevenueSub');
    const elCustos = document.getElementById('kpiCustosTotal');
    const elCustosSub = document.getElementById('kpiCustosTotalSub');
    const elNet = document.getElementById('kpiNetProfit');
    const elNetSub = document.getElementById('kpiNetProfitSub');
    const elMargin = document.getElementById('kpiNetMargin');

    if (elRev) elRev.textContent = `R$ ${grossRev.toFixed(2).replace('.', ',')}`;
    if (elRevSub) elRevSub.textContent = `${validOrders} pedido${validOrders === 1 ? '' : 's'} faturado${validOrders === 1 ? '' : 's'}`;

    if (elCustos) elCustos.textContent = `R$ ${totalCustos.toFixed(2).replace('.', ',')}`;
    if (elCustosSub) elCustosSub.textContent = `R$ ${cpvTotal.toFixed(2).replace('.', ',')} insumos + R$ ${expensesTotal.toFixed(2).replace('.', ',')} despesas`;

    if (elNet) {
      elNet.textContent = `R$ ${netProfit.toFixed(2).replace('.', ',')}`;
      elNet.style.color = netProfit >= 0 ? '#2E7D32' : '#C62828';
    }
    if (elNetSub) {
      elNetSub.textContent = netProfit >= 0 ? 'Limpo no seu bolso 🤎' : 'Atenção: despesas superam vendas';
    }

    if (elMargin) {
      elMargin.textContent = `${netMargin.toFixed(1).replace('.', ',')}%`;
      elMargin.className = `kpi-value ${netMargin >= 0 ? 'profit-positive' : 'profit-negative'}`;
    }

    renderizarFichaCustosProdutos();
    renderizarDespesas();
  }

  function renderizarFichaCustosProdutos() {
    const tbody = document.getElementById('productCostsTableBody');
    if (!tbody) return;

    tbody.innerHTML = AdminState.flavors.map(flavor => {
      const salePrice = flavor.rawPrice || parseFloat(String(flavor.price).replace(/[^\d.,]/g, '').replace(',', '.')) || 12;
      const cost = getProductUnitCost(flavor.name);
      const unitProfit = salePrice - cost;
      const margin = salePrice > 0 ? (unitProfit / salePrice * 100).toFixed(0) : 0;
      const profitClass = unitProfit >= 0 ? 'profit-positive' : 'profit-negative';

      return `
        <tr>
          <td>
            <strong>${escapeHtml(flavor.name)}</strong>
          </td>
          <td>
            <span style="font-weight:700;">R$ ${salePrice.toFixed(2).replace('.', ',')}</span>
          </td>
          <td>
            <div class="cost-input-wrap">
              <span style="color:var(--chocolate-light); font-size:0.8rem;">R$</span>
              <input type="number" 
                     step="0.10" 
                     min="0" 
                     class="cost-input-field" 
                     data-flavor="${escapeHtml(flavor.name)}" 
                     data-price="${salePrice}"
                     value="${cost.toFixed(2)}">
            </div>
          </td>
          <td>
            <span class="${profitClass}" id="unitProfit_${escapeHtml(flavor.name).replace(/\W/g, '_')}">
              R$ ${unitProfit.toFixed(2).replace('.', ',')}
            </span>
          </td>
          <td>
            <span class="badge ${margin >= 40 ? 'badge-green' : 'badge-yellow'}" id="unitMargin_${escapeHtml(flavor.name).replace(/\W/g, '_')}">
              ${margin}%
            </span>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.cost-input-field').forEach(input => {
      input.addEventListener('input', (e) => {
        const flavorName = e.target.getAttribute('data-flavor');
        const price = parseFloat(e.target.getAttribute('data-price')) || 0;
        const newCost = parseFloat(e.target.value) || 0;
        const profit = price - newCost;
        const margin = price > 0 ? ((profit / price) * 100).toFixed(0) : 0;

        const safeId = flavorName.replace(/\W/g, '_');
        const profitEl = document.getElementById(`unitProfit_${safeId}`);
        const marginEl = document.getElementById(`unitMargin_${safeId}`);

        if (profitEl) {
          profitEl.textContent = `R$ ${profit.toFixed(2).replace('.', ',')}`;
          profitEl.className = profit >= 0 ? 'profit-positive' : 'profit-negative';
        }
        if (marginEl) {
          marginEl.textContent = `${margin}%`;
          marginEl.className = `badge ${margin >= 40 ? 'badge-green' : 'badge-yellow'}`;
        }
      });
    });
  }

  async function salvarCustosProdutos() {
    const tbody = document.getElementById('productCostsTableBody');
    if (!tbody) return;

    const inputs = tbody.querySelectorAll('.cost-input-field');
    const updates = [];

    inputs.forEach(inp => {
      const flavorName = inp.getAttribute('data-flavor');
      const costVal = parseFloat(inp.value) || 0;
      AdminState.productCosts[flavorName] = costVal;
      updates.push({ sabor: flavorName, custo_unitario: costVal, atualizado_em: new Date().toISOString() });
    });

    try {
      localStorage.setItem('brownie_product_costs', JSON.stringify(AdminState.productCosts));
    } catch (e) {
      console.warn('Erro ao salvar custos no localStorage:', e);
    }

    const sb = getSupabase();
    if (sb) {
      try {
        await sb.from('custos_produtos').upsert(updates);
      } catch (e) {}
    }

    atualizarCustosELucro();
    showToast('Custos dos produtos atualizados com sucesso! 🧁', 'success');
  }

  function renderizarDespesas() {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;

    let list = AdminState.expenses || [];
    if (AdminState.expenseCategoryFilter && AdminState.expenseCategoryFilter !== 'todas') {
      list = list.filter(e => (e.categoria || 'outros').toLowerCase() === AdminState.expenseCategoryFilter.toLowerCase());
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:24px; color:var(--chocolate-light);">
            Nenhum gasto encontrado nesta categoria. Clique em <strong>"➕ Lançar Gasto"</strong> acima!
          </td>
        </tr>
      `;
      return;
    }

    const sorted = [...list].sort((a, b) => new Date(b.data || b.criado_em || 0) - new Date(a.data || a.criado_em || 0));

    tbody.innerHTML = sorted.map(exp => {
      const cat = (exp.categoria || 'outros').toLowerCase();
      let badgeClass = 'badge-outros';
      let catLabel = 'Outros';

      if (cat === 'insumos') { badgeClass = 'badge-insumos'; catLabel = '🍫 Insumos'; }
      else if (cat === 'embalagens') { badgeClass = 'badge-embalagens'; catLabel = '📦 Embalagens'; }
      else if (cat === 'operacional') { badgeClass = 'badge-operacional'; catLabel = '💡 Operacional'; }
      else if (cat === 'entrega') { badgeClass = 'badge-entrega'; catLabel = '🛵 Entrega'; }

      let dateFormatted = exp.data;
      if (dateFormatted && dateFormatted.includes('-')) {
        const parts = dateFormatted.split('-');
        if (parts.length === 3) dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else if (exp.criado_em) {
        dateFormatted = new Date(exp.criado_em).toLocaleDateString('pt-BR');
      }

      const valFormatted = (parseFloat(exp.valor) || 0).toFixed(2).replace('.', ',');

      return `
        <tr>
          <td style="white-space:nowrap; font-size:0.8rem; color:var(--chocolate-light);">
            ${dateFormatted || '-'}
          </td>
          <td>
            <strong>${escapeHtml(exp.descricao)}</strong>
            ${exp.observacao ? `<br><small style="color:var(--chocolate-light);">${escapeHtml(exp.observacao)}</small>` : ''}
          </td>
          <td>
            <span class="badge-expense-category ${badgeClass}">${catLabel}</span>
          </td>
          <td style="font-weight:800; color:var(--red); white-space:nowrap;">
            R$ ${valFormatted}
          </td>
          <td>
            <button class="btn-action-icon" onclick="window.excluirDespesa('${exp.id}')" title="Excluir despesa" style="color:var(--red);">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function initExpensesAndCosts() {
    const btnSaveCosts = document.getElementById('btnSaveProductCosts');
    if (btnSaveCosts) {
      btnSaveCosts.addEventListener('click', salvarCustosProdutos);
    }

    const pillContainer = document.getElementById('expenseCategoryPills');
    if (pillContainer) {
      pillContainer.querySelectorAll('[data-exp-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          pillContainer.querySelectorAll('[data-exp-cat]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          AdminState.expenseCategoryFilter = btn.getAttribute('data-exp-cat');
          renderizarDespesas();
        });
      });
    }

    const modal = document.getElementById('expenseModal');
    const btnOpen = document.getElementById('btnOpenExpenseModal');
    const btnClose = document.getElementById('btnCloseExpenseModal');
    const form = document.getElementById('expenseForm');
    const dateInput = document.getElementById('expenseDate');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        if (dateInput && !dateInput.value) {
          dateInput.value = new Date().toISOString().slice(0, 10);
        }
        modal.classList.add('active');
      });
    }

    if (btnClose && modal) {
      btnClose.addEventListener('click', () => modal.classList.remove('active'));
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const desc = document.getElementById('expenseDesc').value.trim();
        const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
        const dateVal = document.getElementById('expenseDate').value || new Date().toISOString().slice(0, 10);
        const cat = document.getElementById('expenseCategory').value;
        const notes = document.getElementById('expenseNotes').value.trim();

        if (!desc || amount <= 0) {
          showToast('Preencha a descrição e um valor válido!', 'error');
          return;
        }

        const newExp = {
          id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          descricao: desc,
          valor: amount,
          data: dateVal,
          categoria: cat,
          observacao: notes,
          criado_em: new Date().toISOString()
        };

        AdminState.expenses.unshift(newExp);

        try {
          localStorage.setItem('brownie_expenses', JSON.stringify(AdminState.expenses));
        } catch (err) {
          console.warn('Erro ao salvar no localStorage:', err);
        }

        const sb = getSupabase();
        if (sb) {
          try {
            await sb.from('despesas').insert([{
              descricao: desc,
              valor: amount,
              data_despesa: dateVal,
              categoria: cat,
              observacoes: notes
            }]);
          } catch (err) {}
        }

        form.reset();
        if (modal) modal.classList.remove('active');
        atualizarCustosELucro();
        showToast('Despesa cadastrada com sucesso! 🧾', 'success');
      });
    }

    window.excluirDespesa = async function(id) {
      if (!confirm('Deseja realmente excluir este lançamento de despesa?')) return;

      AdminState.expenses = AdminState.expenses.filter(e => String(e.id) !== String(id));

      try {
        localStorage.setItem('brownie_expenses', JSON.stringify(AdminState.expenses));
      } catch (err) {}

      const sb = getSupabase();
      if (sb) {
        try {
          if (!isNaN(Number(id))) {
            await sb.from('despesas').delete().eq('id', Number(id));
          }
        } catch (err) {}
      }

      atualizarCustosELucro();
      showToast('Despesa removida.', 'info');
    };
  }

  // ===================== INICIALIZAÇÃO =====================
  document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initSoundToggle();
    initTabNav();
    initToolbarEvents();
    initManualOrder();
    initCardapioManage();
    initExpensesAndCosts();

    if (AdminState.authenticated) {
      carregarDadosCompletos();
      setupRealtimeListener();
    }
  });

})();
