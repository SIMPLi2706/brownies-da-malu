/**
 * Brownie da Malu - Integração com Supabase
 * Gerencia Autenticação, Perfis, Pedidos e Depoimentos Reais
 */

// Substitua com as credenciais do seu projeto Supabase:
const SUPABASE_URL = window.__SUPABASE_URL__ || 'https://sftvnwymtbhypfjgnxwe.supabase.co';
const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmdHZud3ltdGJoeXBmamdueHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NDYzMTUsImV4cCI6MjEwODAyMjMxNX0.fRm71HOTFEEoSJHtBqZeKn1OT0VBLdwZtgv2ZASPj78';

// Inicializa o cliente Supabase se a biblioteca estiver carregada
let supabaseClient = null;
if (window.supabase && window.supabase.createClient) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.warn('Aguardando configuração das chaves do Supabase:', err);
  }
}

// Objeto global para controle no frontend
window.BrownieApp = {
  supabase: supabaseClient,
  currentUser: null,
  currentProfile: null,

  // Inicializa escuta de autenticação e carrega dados
  async init() {
    if (!supabaseClient) return;

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        this.currentUser = session.user;
        await this.carregarPerfil();
      }
      this.atualizarUIAposAuth();

      // Monitora mudanças de estado de autenticação
      supabaseClient.auth.onAuthStateChange(async (event, session) => {
        this.currentUser = session?.user || null;
        if (this.currentUser) {
          await this.carregarPerfil();
        } else {
          this.currentProfile = null;
        }
        this.atualizarUIAposAuth();
      });
    } catch (e) {
      console.error('Erro ao verificar sessão Supabase:', e);
    }

    // Carrega depoimentos reais
    await this.carregarDepoimentos();
  },

  // Carrega perfil estendido do usuário logado
  async carregarPerfil() {
    if (!this.currentUser || !supabaseClient) return;
    try {
      const { data, error } = await supabaseClient
        .from('perfis')
        .select('*')
        .eq('id', this.currentUser.id)
        .single();

      if (!error && data) {
        this.currentProfile = data;
      }
    } catch (e) {
      console.warn('Perfil ainda não preenchido ou erro:', e);
    }
  },

  // Atualiza botões de login/perfil na interface
  atualizarUIAposAuth() {
    const authBtn = document.getElementById('navAuthBtn');
    const authBtnMobile = document.getElementById('navAuthBtnMobile');
    const nomeExibicao = this.currentProfile?.nome || this.currentUser?.user_metadata?.nome || this.currentUser?.email?.split('@')[0] || '';

    const label = this.currentUser ? `Olá, ${nomeExibicao.split(' ')[0]} 🤎` : 'Entrar / Cadastrar';

    if (authBtn) {
      authBtn.textContent = label;
      authBtn.classList.toggle('logged-in', !!this.currentUser);
    }
    if (authBtnMobile) {
      authBtnMobile.textContent = label;
      authBtnMobile.classList.toggle('logged-in', !!this.currentUser);
    }
  },

  // Cadastro de usuário com perfil completo
  async cadastrarUsuario({ email, password, nome, telefone, endereco, numero, bairro, ponto_referencia }) {
    if (!supabaseClient) throw new Error('Configure o Supabase primeiro.');

    // 1. Cria usuário no Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { nome, telefone }
      }
    });

    if (authError) throw authError;

    const user = authData.user;
    if (user) {
      // 2. Salva perfil completo na tabela 'perfis'
      const { error: profileError } = await supabaseClient
        .from('perfis')
        .upsert({
          id: user.id,
          nome,
          telefone,
          endereco,
          numero,
          bairro,
          cidade: 'Porto Velho - RO',
          ponto_referencia: ponto_referencia || ''
        });

      if (profileError) console.error('Erro ao salvar perfil:', profileError);
    }

    return authData;
  },

  // Login com e-mail e senha
  async fazerLogin(email, password) {
    if (!supabaseClient) throw new Error('Configure o Supabase primeiro.');
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  // Logout
  async sair() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    this.currentUser = null;
    this.currentProfile = null;
    this.atualizarUIAposAuth();
  },

  // Criar Pedido (Memória de Pedidos)
  async criarPedido({ sabor, preco, quantidade, tipoEntrega, enderecoEntrega, observacoes }) {
    if (!supabaseClient) throw new Error('Configure o Supabase primeiro.');

    const codigo = 'BM-' + Math.floor(1000 + Math.random() * 9000);
    const precoUnit = parseFloat(String(preco).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    const total = precoUnit * (parseInt(quantidade, 10) || 1);

    const nomeCliente = this.currentProfile?.nome || this.currentUser?.user_metadata?.nome || 'Cliente do Site';
    const telefoneCliente = this.currentProfile?.telefone || this.currentUser?.user_metadata?.telefone || '';

    const payload = {
      codigo_pedido: codigo,
      user_id: this.currentUser ? this.currentUser.id : null,
      nome_cliente: nomeCliente,
      telefone_cliente: telefoneCliente,
      itens: [{ sabor, preco, quantidade, subtotal: total }],
      valor_total: total,
      tipo_entrega: tipoEntrega || 'entrega',
      endereco_entrega: enderecoEntrega || (this.currentProfile ? `${this.currentProfile.endereco}, ${this.currentProfile.numero} - ${this.currentProfile.bairro}` : 'A combinar'),
      observacoes: observacoes || '',
      status: 'pendente'
    };

    const { data, error } = await supabaseClient
      .from('pedidos')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Listar pedidos do usuário logado
  async listarMeusPedidos() {
    if (!supabaseClient || !this.currentUser) return [];

    const { data, error } = await supabaseClient
      .from('pedidos')
      .select('*')
      .eq('user_id', this.currentUser.id)
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('Erro ao buscar pedidos:', error);
      return [];
    }
    return data || [];
  },

  // Carregar Depoimentos Reais do Supabase
  async carregarDepoimentos() {
    const testGrid = document.getElementById('testGrid');
    if (!testGrid) return;

    if (!supabaseClient) {
      // Mantém fallback caso o supabase ainda não esteja com chaves
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('depoimentos')
        .select('*')
        .eq('aprovado', true)
        .order('criado_em', { ascending: false })
        .limit(6);

      if (error || !data || data.length === 0) {
        // Se ainda não houver nenhum depoimento no banco, exibe mensagem amigável ou mantém padrão
        return;
      }

      const star = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L10 14.8 4.8 17.5l1-5.8L1.5 7.6l5.9-.8L10 1.5Z"/></svg>`;

      testGrid.innerHTML = '';
      data.forEach(t => {
        const initials = (t.nome || 'C')
          .split(' ')
          .map(n => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

        const card = document.createElement('div');
        card.className = 'test-card in';
        card.innerHTML = `
          <span class="quote-mark">&ldquo;</span>
          <p class="quote">${escapeHtml(t.comentario)}</p>
          <div class="test-person">
            <div class="test-avatar">${initials}</div>
            <div>
              <div class="test-name">${escapeHtml(t.nome)}</div>
              <div class="test-city" style="font-size:0.75rem; color:var(--chocolate-light);">${escapeHtml(t.cidade || 'Porto Velho - RO')}</div>
              <div class="test-stars">${star.repeat(Math.max(1, Math.min(5, t.estrelas || 5)))}</div>
            </div>
          </div>
        `;
        testGrid.appendChild(card);
      });

      // Remove a nota de "depoimentos de exemplo" caso existam depoimentos reais
      const note = document.querySelector('#depoimentos .price-note');
      if (note) note.textContent = 'Depoimentos reais de quem já se apaixonou pelos brownies da Malu 🤎';
    } catch (e) {
      console.warn('Erro ao carregar depoimentos reais:', e);
    }
  },

  // Enviar novo Depoimento Real
  async enviarDepoimento({ nome, estrelas, comentario, cidade }) {
    if (!supabaseClient) throw new Error('Configure o Supabase primeiro.');

    const payload = {
      user_id: this.currentUser ? this.currentUser.id : null,
      nome: nome || this.currentProfile?.nome || 'Cliente anônimo',
      cidade: cidade || 'Porto Velho - RO',
      estrelas: parseInt(estrelas, 10) || 5,
      comentario,
      aprovado: true // Definido como true para aparecer de imediato
    };

    const { data, error } = await supabaseClient
      .from('depoimentos')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    await this.carregarDepoimentos();
    return data;
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
  window.BrownieApp.init();
});
