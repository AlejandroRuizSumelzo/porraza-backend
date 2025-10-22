# 🗄️ Database Backup & Restore Guide

Guía completa para hacer backups y restaurar la base de datos de Porraza.

---

## 📦 Crear Backup (Dump)

### Desde tu Mac (desarrollo local):

```bash
cd ~/Documents/alex_proyects/porraza-backend

# Crear dump de la base de datos local
PGPASSWORD=root pg_dump -U root -h localhost -p 5432 porraza_db > porraza_db_dump.sql

# Verificar tamaño del dump
ls -lh porraza_db_dump.sql
```

### Desde el Servidor (producción):

```bash
cd ~/porraza-backend

# Crear dump desde el contenedor Docker
docker exec porraza_postgres pg_dump -U porraza_user porraza_db > porraza_db_backup_$(date +%Y%m%d_%H%M%S).sql

# Verificar
ls -lh *.sql
```

---

## 📤 Subir Dump al Servidor

### Opción 1: Usar SCP (recomendado)

Desde tu **Mac**:

```bash
# Copiar dump al servidor
scp porraza_db_dump.sql porraza@TU_IP_SERVIDOR:/home/porraza/porraza-backend/

# Verificar que llegó
ssh porraza@TU_IP_SERVIDOR "ls -lh ~/porraza-backend/*.sql"
```

### Opción 2: Usar Git (temporal, para este caso)

Solo para esta primera vez, puedes forzar el dump al repo (normalmente están en `.gitignore`):

```bash
# Desde tu Mac
cd ~/Documents/alex_proyects/porraza-backend

# Forzar añadir el dump (solo esta vez)
git add -f porraza_db_dump.sql

# Commit
git commit -m "Add initial database dump for server setup"

# Push
git push origin main

# En el servidor, hacer pull
ssh porraza@TU_IP_SERVIDOR "cd ~/porraza-backend && git pull"

# Después, remover del repo (en tu Mac)
git rm --cached porraza_db_dump.sql
git commit -m "Remove database dump from repo"
git push origin main
```

**⚠️ IMPORTANTE:** Los dumps están en `.gitignore` por seguridad. Solo usa Git para este setup inicial.

---

## 📥 Restaurar Dump en el Servidor

En el servidor como usuario **porraza**:

```bash
cd ~/porraza-backend

# Asegúrate de que los contenedores están corriendo
docker compose ps

# Si no están corriendo, inícielos
docker compose up -d

# Esperar a que PostgreSQL esté listo
sleep 10

# Restaurar el dump
bash restore-database.sh porraza_db_dump.sql
```

El script te preguntará confirmación antes de reemplazar los datos:

```
⚠️  WARNING: This will replace ALL data in the database!
   Database: porraza_db
   User: porraza_user

Are you sure you want to continue? (yes/NO):
```

Escribe `yes` y presiona Enter.

---

## 🔄 Proceso Completo: Local → Servidor

### Paso a Paso:

1. **En tu Mac - Crear dump:**
   ```bash
   cd ~/Documents/alex_proyects/porraza-backend
   PGPASSWORD=root pg_dump -U root -h localhost -p 5432 porraza_db > porraza_db_dump.sql
   ```

2. **En tu Mac - Copiar al servidor:**
   ```bash
   scp porraza_db_dump.sql porraza@TU_IP_SERVIDOR:/home/porraza/porraza-backend/
   ```

3. **En el servidor - Restaurar:**
   ```bash
   cd ~/porraza-backend
   bash restore-database.sh porraza_db_dump.sql
   ```

4. **En el servidor - Reiniciar backend:**
   ```bash
   docker compose restart backend
   ```

5. **Verificar que funciona:**
   ```bash
   curl http://localhost:3001
   # O visita http://TU_IP_SERVIDOR:3001/api
   ```

---

## 🔍 Verificar Datos Restaurados

### Ver tablas en la base de datos:

```bash
docker exec -it porraza_postgres psql -U porraza_user -d porraza_db -c "\dt"
```

### Contar registros en una tabla (ejemplo: teams):

```bash
docker exec porraza_postgres psql -U porraza_user -d porraza_db -c "SELECT COUNT(*) FROM teams;"
```

### Conectarse a la base de datos interactivamente:

```bash
docker exec -it porraza_postgres psql -U porraza_user -d porraza_db
```

Comandos útiles en psql:
- `\dt` - Listar tablas
- `\d nombre_tabla` - Describir estructura de tabla
- `SELECT * FROM teams LIMIT 5;` - Ver datos
- `\q` - Salir

---

## 📅 Backups Automáticos (Opcional)

### Crear script de backup programado:

```bash
# Crear directorio de backups
mkdir -p ~/backups

# Editar crontab
crontab -e
```

Añadir esta línea (backup diario a las 2 AM):

```
0 2 * * * docker exec porraza_postgres pg_dump -U porraza_user porraza_db > ~/backups/porraza_backup_$(date +\%Y\%m\%d).sql
```

### Limpiar backups antiguos (mantener últimos 7 días):

```
0 3 * * * find ~/backups -name "porraza_backup_*.sql" -mtime +7 -delete
```

---

## 🚨 Troubleshooting

### Error: "database already exists"

```bash
# Eliminar base de datos primero
docker exec porraza_postgres psql -U porraza_user -d postgres -c "DROP DATABASE porraza_db;"

# Crear de nuevo
docker exec porraza_postgres psql -U porraza_user -d postgres -c "CREATE DATABASE porraza_db;"

# Restaurar dump
cat porraza_db_dump.sql | docker exec -i porraza_postgres psql -U porraza_user -d porraza_db
```

### Error: "role does not exist"

El dump puede contener referencias al usuario `root` de tu local. Hay dos opciones:

**Opción A - Editar el dump:**
```bash
# Reemplazar referencias de usuario en el dump
sed -i 's/OWNER TO root/OWNER TO porraza_user/g' porraza_db_dump.sql
```

**Opción B - Crear el usuario temporalmente:**
```bash
docker exec porraza_postgres psql -U porraza_user -d postgres -c "CREATE ROLE root WITH LOGIN SUPERUSER;"
```

### Error: "container not running"

```bash
# Iniciar contenedores
docker compose up -d

# Esperar a que PostgreSQL esté listo
sleep 10

# Verificar
docker compose ps
```

---

## 📊 Comparar Datos Local vs Servidor

### En tu Mac (local):

```bash
psql -U root -h localhost -d porraza_db -c "SELECT COUNT(*) FROM teams;"
```

### En el servidor:

```bash
docker exec porraza_postgres psql -U porraza_user -d porraza_db -c "SELECT COUNT(*) FROM teams;"
```

Los números deberían ser iguales después del restore.

---

## 🔐 Seguridad

**⚠️ NUNCA subas dumps SQL a Git en producción**

Los dumps pueden contener:
- Datos sensibles de usuarios
- Contraseñas (aunque deberían estar hasheadas)
- Información confidencial

**Buenas prácticas:**
- ✅ Usa `.gitignore` para excluir `*.sql`
- ✅ Transfiere dumps vía SCP/SFTP
- ✅ Encripta dumps si contienen datos sensibles
- ✅ Limpia dumps después de restaurar
- ✅ Mantén backups en ubicación segura

---

## 🧹 Limpiar Dumps

### En tu Mac:

```bash
rm porraza_db_dump.sql
```

### En el servidor:

```bash
rm ~/porraza-backend/*.sql
```

### Limpiar del historial de Git (si lo subiste):

```bash
# Remover del índice
git rm --cached porraza_db_dump.sql

# Commit
git commit -m "Remove database dump"

# Push
git push origin main
```

---

## 📚 Comandos de Referencia Rápida

| Acción | Comando |
|--------|---------|
| Crear dump local | `PGPASSWORD=root pg_dump -U root -h localhost porraza_db > dump.sql` |
| Crear dump servidor | `docker exec porraza_postgres pg_dump -U porraza_user porraza_db > dump.sql` |
| Copiar a servidor | `scp dump.sql porraza@SERVER:/path/` |
| Restaurar dump | `bash restore-database.sh dump.sql` |
| Ver tablas | `docker exec -it porraza_postgres psql -U porraza_user -d porraza_db -c "\dt"` |
| Contar registros | `docker exec porraza_postgres psql -U porraza_user -d porraza_db -c "SELECT COUNT(*) FROM tabla;"` |
| Limpiar dump | `rm *.sql` |

---

**Última actualización:** Octubre 2025
