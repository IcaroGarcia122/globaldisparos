#!/bin/bash
# scripts/restore.sh

echo "========================================="
echo "📥 RESTAURAR BANCO DE DADOS"
echo "========================================="

# Verificar se foi passado arquivo de backup
if [ -z "$1" ]; then
    echo "❌ Erro: Informe o arquivo de backup"
    echo "Uso: ./restore.sh backups/evolution_20240101_120000.sql.gz"
    echo ""
    echo "Backups disponíveis:"
    ls -lh backups/evolution_*.sql.gz 2>/dev/null || echo "Nenhum backup encontrado"
    exit 1
fi

BACKUP_FILE=$1
CONTAINER="postgres_local"
DB_NAME="evolution"
DB_USER="postgres"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Arquivo não encontrado: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  ATENÇÃO: Isso irá SOBRESCREVER o banco atual!"
echo "Arquivo: $BACKUP_FILE"
echo ""
read -p "Deseja continuar? (s/N): " confirm

if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo "❌ Operação cancelada"
    exit 0
fi

echo ""
echo "⏳ Restaurando backup..."

# Restaurar
gunzip < $BACKUP_FILE | docker exec -i $CONTAINER psql -U $DB_USER -d $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Backup restaurado com sucesso!"
else
    echo "❌ Erro ao restaurar backup!"
    exit 1
fi

echo "========================================="
echo "✅ Restauração concluída!"
echo "========================================="
