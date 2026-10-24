#!/usr/bin/env python3
"""
Brownie da Malu - Script Automatizado de Backup de Dados
Salva todos os pedidos, clientes (perfis) e depoimentos do Supabase em arquivos locais versionados.
"""

import os
import json
import urllib.request
from datetime import datetime

SUPABASE_URL = "https://sftvnwymtbhypfjgnxwe.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmdHZud3ltdGJoeXBmamdueHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NDYzMTUsImV4cCI6MjEwODAyMjMxNX0.fRm71HOTFEEoSJHtBqZeKn1OT0VBLdwZtgv2ZASPj78"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP_DIR = os.path.join(BASE_DIR, "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def fetch_table(table_name):
    url = f"{SUPABASE_URL}/rest/v1/{table_name}?select=*"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    print(f"[{timestamp}] Iniciando backup do Brownie da Malu...")

    tables = ["pedidos", "perfis", "depoimentos"]
    summary = {}

    for t in tables:
        try:
            data = fetch_table(t)
            # Salva o arquivo principal mais recente
            latest_file = os.path.join(BACKUP_DIR, f"{t}_backup.json")
            with open(latest_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            # Salva também um snapshot com carimbo de data
            history_dir = os.path.join(BACKUP_DIR, "historico")
            os.makedirs(history_dir, exist_ok=True)
            hist_file = os.path.join(history_dir, f"{t}_{timestamp}.json")
            with open(hist_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            summary[t] = len(data)
            print(f"  ✓ {t}: {len(data)} registros salvos.")
        except Exception as e:
            print(f"  ✗ Erro ao fazer backup de {t}: {e}")

    print(f"Backup concluído com sucesso em: {BACKUP_DIR}")

if __name__ == "__main__":
    main()
