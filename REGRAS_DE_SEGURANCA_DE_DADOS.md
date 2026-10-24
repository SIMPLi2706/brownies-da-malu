# 🛡️ Diretriz Permanente: Proteção e Imutabilidade de Dados

Esta diretriz é uma regra obrigatória e inviolável para este projeto:

1. **Nunca excluir, alterar ou sobrescrever dados existentes:**
   * Pedidos de clientes (`pedidos`), cadastros (`perfis`) e avaliações (`depoimentos`) no Supabase ou LocalStorage NUNCA devem ser apagados, truncados ou modificados sem ordem explícita do usuário para aquele item específico.
   * Qualquer nova funcionalidade ou alteração de código deve ser estritamente cumulativa e compatível com as versões anteriores.

2. **Rotina de Backup Obrigatória:**
   * A pasta [`backups/`](file:///home/isaac/Downloads/brownie-da-malu/backups/) armazena cópias de segurança de:
     * `pedidos_backup.json`
     * `clientes_backup.json`
     * `depoimentos_backup.json`
     * Histórico versionado com data/hora em `backups/historico/`.
   * O script automatizado [`scripts/fazer_backup.py`](file:///home/isaac/Downloads/brownie-da-malu/scripts/fazer_backup.py) extrai uma cópia completa de todos os dados do Supabase.
   * O painel administrativo ([`admin.html`](file:///home/isaac/Downloads/brownie-da-malu/admin.html)) possui o botão **"💾 Baixar Backup"**, permitindo que a Malu exporte um arquivo JSON completo diretamente para seu dispositivo a qualquer momento.
