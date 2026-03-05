#!/bin/bash
# scripts/backup.sh

echo "========================================="
echo "📦 BACKUP DO BANCO DE DADOS"
echo "========================================="

# Configurações
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="postgres_local"
DB_NAME="evolution"
DB_USER="postgres"

# Criar diretório
mkdir -p $BACKUP_DIR

# Fazer backup
echo "⏳ Fazendo backup..."
docker exec -t $CONTAINER pg_dump -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/evolution_${DATE}.sql.gz

if [ $? -eq 0 ]; then
    echo "✅ Backup salvo: $BACKUP_DIR/evolution_${DATE}.sql.gz"
    
    # Listar backups
    echo ""
    echo "📋 Backups disponíveis:"
    ls -lh $BACKUP_DIR/evolution_*.sql.gz
    
    # Manter apenas últimos 5 backups
    echo ""
    echo "🧹 Limpando backups antigos..."
    ls -t $BACKUP_DIR/evolution_*.sql.gz | tail -n +6 | xargs -r rm
    echo "✅ Backups antigos removidos (mantidos últimos 5)"
else
    echo "❌ Erro ao fazer backup!"
    exit 1
fi

echo "========================================="
echo "✅ Backup concluído!"
echo "========================================="
