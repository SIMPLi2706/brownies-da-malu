-- ========================================================
-- BROWNIE DA MALU - ATUALIZAÇÃO PARA O PAINEL DA MALU
-- Execute no SQL Editor do Supabase para liberar o painel
-- ========================================================

-- 1. Permitir que o painel administrativo leia todos os pedidos
drop policy if exists "Painel pode ver todos os pedidos" on public.pedidos;
create policy "Painel pode ver todos os pedidos"
  on public.pedidos for select
  using (true);

-- 2. Permitir que o painel administrativo atualize o status dos pedidos
drop policy if exists "Painel pode atualizar pedidos" on public.pedidos;
create policy "Painel pode atualizar pedidos"
  on public.pedidos for update
  using (true);

-- 3. Permitir que o painel administrativo exclua pedidos de teste
drop policy if exists "Painel pode deletar pedidos" on public.pedidos;
create policy "Painel pode deletar pedidos"
  on public.pedidos for delete
  using (true);

-- 4. Permitir que o painel administrativo veja todos os clientes cadastrados
drop policy if exists "Painel pode ver todos os perfis" on public.perfis;
create policy "Painel pode ver todos os perfis"
  on public.perfis for select
  using (true);

-- 5. Permitir que o painel modere e gerencie depoimentos (aprovar/excluir)
drop policy if exists "Painel pode gerenciar depoimentos" on public.depoimentos;
create policy "Painel pode gerenciar depoimentos"
  on public.depoimentos for all
  using (true);

-- 6. Habilitar Realtime para pedidos no Supabase (para alerta sonoro de novo pedido)
alter publication supabase_realtime add table public.pedidos;
