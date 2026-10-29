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
      } else if (this.currentUser?.user_metadata) {
        const meta = this.currentUser.user_metadata;
        this.currentProfile = {
          id: this.currentUser.id,
          nome: meta.nome || '',
          telefone: meta.telefone || '',
          endereco: meta.endereco || '',
          numero: meta.numero || '',
          bairro: meta.bairro || '',
          cidade: meta.cidade || 'Porto Velho - RO',
          ponto_referencia: meta.ponto_referencia || ''
        };
      }
    } catch (e) {
      if (this.currentUser?.user_metadata) {
        const meta = this.currentUser.user_metadata;
        this.currentProfile = {
          id: this.currentUser.id,
          nome: meta.nome || '',
          telefone: meta.telefone || '',
          endereco: meta.endereco || '',
          numero: meta.numero || '',
          bairro: meta.bairro || '',
          cidade: meta.cidade || 'Porto Velho - RO',
          ponto_referencia: meta.ponto_referencia || ''
        };
      }
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

    // 1. Cria usuário no Auth passando TODOS os dados nos metadados
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          telefone,
          endereco,
          numero,
          bairro,
          cidade: 'Porto Velho - RO',
          ponto_referencia: ponto_referencia || ''
        }
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new Error('Este e-mail já está cadastrado! Tente entrar com sua senha.');
      }
      if (authError.message.includes('at least 6 characters')) {
        throw new Error('A senha deve ter no mínimo 6 caracteres.');
      }
      throw authError;
    }

    const user = authData?.user;
    const session = authData?.session;

    if (session) {
      this.currentUser = user;
    }

    // 2. Tenta salvar na tabela 'perfis'
    if (user) {
      try {
        await supabaseClient
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
      } catch (profileError) {
        console.warn('Perfil será sincronizado via metadata:', profileError);
      }
    }

    // Se o Supabase estiver com confirmação de e-mail ativa e não retornou sessão:
    if (!session) {
      try {
        const loginAttempt = await supabaseClient.auth.signInWithPassword({ email, password });
        if (loginAttempt?.data?.session) {
          this.currentUser = loginAttempt.data.user;
          await this.carregarPerfil();
          this.atualizarUIAposAuth();
          return { user: loginAttempt.data.user, session: loginAttempt.data.session, autoLogged: true };
        }
      } catch (loginErr) {
        return {
          user,
          requiresEmailConfirmation: true
        };
      }
    }

    await this.carregarPerfil();
    this.atualizarUIAposAuth();
    return authData;
  },

  // Login com e-mail e senha
  async fazerLogin(email, password) {
    if (!supabaseClient) throw new Error('Configure o Supabase primeiro.');
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        throw new Error('E-mail ainda não confirmado. Verifique sua caixa de entrada ou desmarque a opção "Confirm email" no painel do Supabase para acesso imediato.');
      }
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('E-mail ou senha incorretos.');
      }
      throw error;
    }
    this.currentUser = data.user;
    await this.carregarPerfil();
    this.atualizarUIAposAuth();
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
  async criarPedido({ itens, valorTotal, sabor, preco, quantidade, tipoEntrega, enderecoEntrega, observacoes, nomeCliente, telefoneCliente }) {
    if (!supabaseClient) throw new Error('Configure o Supabase primeiro.');

    const codigo = 'BM-' + Math.floor(1000 + Math.random() * 9000);

    let finalItens = itens;
    let total = valorTotal;

    if (!finalItens || finalItens.length === 0) {
      const precoUnit = parseFloat(String(preco).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
      total = precoUnit * (parseInt(quantidade, 10) || 1);
      finalItens = [{ sabor, preco, quantidade: parseInt(quantidade, 10) || 1, subtotal: total }];
    }

    const nome = nomeCliente || this.currentProfile?.nome || this.currentUser?.user_metadata?.nome || 'Cliente do Site';
    const telefone = telefoneCliente || this.currentProfile?.telefone || this.currentUser?.user_metadata?.telefone || '';

    const payload = {
      codigo_pedido: codigo,
      user_id: this.currentUser ? this.currentUser.id : null,
      nome_cliente: nome,
      telefone_cliente: telefone,
      itens: finalItens,
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

  // Helpers para Itens Elogiados no Depoimento
  extrairItensDepoimento(t) {
    if (!t) return [];
    if (Array.isArray(t.itens_comprados) && t.itens_comprados.length > 0) {
      return t.itens_comprados.map(s => String(s).trim()).filter(Boolean);
    }
    if (typeof t.itens_comprados === 'string') {
      try {
        const parsed = JSON.parse(t.itens_comprados);
        if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean);
      } catch (e) {
        if (t.itens_comprados.includes(',')) {
          return t.itens_comprados.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }
    // Fallback: verificar se foi embutido no texto do comentário [Provou: item1 • item2]
    if (t.comentario && typeof t.comentario === 'string') {
      const match = t.comentario.match(/\[Provou:\s*([^\]]+)\]/i);
      if (match && match[1]) {
        return match[1].split(/•|,/).map(s => s.trim()).filter(Boolean);
      }
    }
    return [];
  },

  limparComentarioParaExibir(comentario) {
    if (!comentario) return '';
    return String(comentario).replace(/\s*\[Provou:\s*[^\]]+\]/gi, '').trim();
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
        .limit(9);

      if (error || !data || data.length === 0) {
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

        const itens = this.extrairItensDepoimento(t);
        const cleanComment = this.limparComentarioParaExibir(t.comentario);

        const itensHtml = itens.length > 0 ? `
          <div class="test-praised-items">
            <span class="test-praised-label">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Provou e aprovou:
            </span>
            <div class="test-praised-tags">
              ${itens.map(item => `<span class="praised-badge">${escapeHtml(item)}</span>`).join('')}
            </div>
          </div>
        ` : '';

        const card = document.createElement('div');
        card.className = 'test-card in';
        card.innerHTML = `
          <span class="quote-mark">&ldquo;</span>
          <p class="quote">${escapeHtml(cleanComment)}</p>
          ${itensHtml}
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

      // Atualiza nota de rodapé
      const note = document.querySelector('#depoimentos .price-note');
      if (note) note.textContent = 'Depoimentos reais de quem já se apaixonou pelos brownies da Malu.';
    } catch (e) {
      console.warn('Erro ao carregar depoimentos reais:', e);
    }
  },

  // Enviar novo Depoimento Real
  async enviarDepoimento({ nome, estrelas, comentario, cidade, itens_comprados }) {
    if (!supabaseClient) throw new Error('Configure o Supabase primeiro.');

    const itensArray = Array.isArray(itens_comprados)
      ? itens_comprados.map(s => String(s).trim()).filter(Boolean)
      : [];

    const basePayload = {
      user_id: this.currentUser ? this.currentUser.id : null,
      nome: nome || this.currentProfile?.nome || 'Cliente anônimo',
      cidade: cidade || 'Porto Velho - RO',
      estrelas: parseInt(estrelas, 10) || 5,
      aprovado: true // Visível de imediato
    };

    let savedData = null;

    // Tentativa 1: Inserir com a coluna nativa itens_comprados
    try {
      const { data, error } = await supabaseClient
        .from('depoimentos')
        .insert([{
          ...basePayload,
          comentario: (comentario || '').trim(),
          itens_comprados: itensArray
        }])
        .select()
        .single();

      if (error) throw error;
      savedData = data;
    } catch (err) {
      // Se a coluna ainda não existir no Postgres do banco do cliente:
      const isMissingCol = err?.code === '42703' || (err?.message && err.message.toLowerCase().includes('itens_comprados'));
      if (isMissingCol) {
        const commentWithMeta = itensArray.length > 0
          ? `${(comentario || '').trim()}\n\n[Provou: ${itensArray.join(' • ')}]`
          : (comentario || '').trim();

        const { data, error: err2 } = await supabaseClient
          .from('depoimentos')
          .insert([{
            ...basePayload,
            comentario: commentWithMeta
          }])
          .select()
          .single();

        if (err2) throw err2;
        savedData = data;
      } else {
        throw err;
      }
    }

    await this.carregarDepoimentos();
    return savedData;
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
