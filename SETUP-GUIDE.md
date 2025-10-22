# 🚀 Guía Rápida de Setup - Porraza Backend

Guía paso a paso para configurar y desplegar el backend en el servidor Hetzner con usuario `porraza`.

---

## 📋 Requisitos Previos

- ✅ Servidor Hetzner con Ubuntu 22.04
- ✅ Usuario `porraza` creado (sin permisos root)
- ✅ Acceso SSH al servidor
- ✅ Repositorio clonado en `~/porraza-backend`

---

## 🔧 Configuración Inicial (Una sola vez)

### Paso 1: Limpiar el servidor (Ejecutar como ROOT)

Elimina PostgreSQL y Node.js del sistema (no los necesitas con Docker):

```bash
# Conectarse como root
ssh root@TU_IP_SERVIDOR

# Descargar y ejecutar script de limpieza
cd /home/porraza/porraza-backend
sudo bash cleanup-server.sh
```

Este script:
- ✅ Desinstala PostgreSQL del sistema
- ✅ Desinstala Node.js del sistema
- ✅ Verifica que Docker y Git estén instalados
- ✅ Limpia archivos innecesarios

---

### Paso 2: Configurar permisos de Docker para usuario `porraza`

Como **root**, ejecuta:

```bash
# Añadir usuario al grupo docker
sudo usermod -aG docker porraza

# Verificar
groups porraza
# Deberías ver: porraza docker
```

**IMPORTANTE:** El usuario `porraza` debe cerrar sesión y volver a entrar para que los cambios surtan efecto.

```bash
# Cerrar sesión del usuario porraza (si está activo)
exit

# Cerrar sesión de root
exit

# Reconectar como usuario porraza
ssh porraza@TU_IP_SERVIDOR
```

Verificar que Docker funciona sin sudo:

```bash
docker ps
# No debería dar error de permisos
```

---

### Paso 3: Configurar variables de entorno

Como usuario **porraza**:

```bash
cd ~/porraza-backend

# Copiar archivo de ejemplo
cp .env.example .env

# Editar con nano
nano .env
```

**Configuración recomendada para producción:**

```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Database Configuration (PostgreSQL 18)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=porraza_db
DB_USER=porraza_user
DB_PASSWORD=TU_CONTRASEÑA_SEGURA_AQUI  # ⚠️ CAMBIA ESTO
```

**⚠️ IMPORTANTE:**
- Cambia `DB_PASSWORD` por una contraseña segura (no uses "root")
- `DB_HOST` debe ser `postgres` (nombre del contenedor Docker, NO `localhost`)

**Guardar:**
- `Ctrl + O` → `Enter` → `Ctrl + X`

---

### Paso 4: Configurar Firewall

Como **root**:

```bash
# Permitir puerto SSH (¡importante hacerlo primero!)
sudo ufw allow 22/tcp

# Permitir puerto del backend
sudo ufw allow 3001/tcp

# Permitir HTTP/HTTPS (si usarás Nginx en el futuro)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Habilitar firewall
sudo ufw enable

# Verificar
sudo ufw status
```

---

## 🚀 Primer Deployment

Como usuario **porraza**:

```bash
cd ~/porraza-backend

# Ejecutar script de deployment
./deploy-local.sh
```

**Tiempo estimado:** 3-5 minutos (la primera vez tarda más porque descarga imágenes Docker)

El script hará:
1. ✅ Pull del código más reciente de GitHub
2. ✅ Verificar que `.env` existe
3. ✅ Construir imagen Docker del backend
4. ✅ Iniciar PostgreSQL y Backend en contenedores
5. ✅ Verificar que todo está funcionando

---

## ✅ Verificar Deployment

Ejecuta el script de verificación:

```bash
cd ~/porraza-backend
./verify-deployment.sh
```

Esto te mostrará:
- ✅ Estado de los contenedores
- ✅ Health checks
- ✅ Test de endpoints HTTP
- ✅ Conexión a la base de datos
- ✅ Logs recientes
- ✅ Uso de recursos

---

## 🌐 Acceder a tu API

Una vez desplegado:

- **API Base:** `http://TU_IP_SERVIDOR:3001`
- **Swagger Docs:** `http://TU_IP_SERVIDOR:3001/api`

### Probar desde tu Mac:

```bash
# Test básico
curl http://TU_IP_SERVIDOR:3001

# Ver respuesta formateada
curl http://TU_IP_SERVIDOR:3001/api
```

---

## 🔐 Configurar GitHub Actions (CI/CD Automático)

### Paso 1: Generar claves SSH

Como usuario **porraza** en el servidor:

```bash
# Crear directorio .ssh
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Generar clave SSH para GitHub Actions
ssh-keygen -t ed25519 -C "porraza-github-actions" -f ~/.ssh/porraza_github_deploy
# Presiona Enter dos veces (sin passphrase)

# Añadir clave pública a authorized_keys
cat ~/.ssh/porraza_github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Mostrar clave PRIVADA (para copiar a GitHub)
cat ~/.ssh/porraza_github_deploy
```

**📋 COPIA LA CLAVE PRIVADA COMPLETA** (incluye las líneas BEGIN y END)

---

### Paso 2: Configurar GitHub Secrets

1. Ve a: `https://github.com/AlejandroRuizSumelzo/porraza-backend/settings/secrets/actions`

2. Crea estos 3 secrets:

| Secret Name | Valor | Ejemplo |
|-------------|-------|---------|
| `SSH_PRIVATE_KEY` | La clave privada que copiaste arriba | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_HOST` | IP de tu servidor Hetzner | `123.45.67.89` |
| `SERVER_USER` | `porraza` | `porraza` |

**Cómo añadir cada secret:**
- Click en **"New repository secret"**
- Nombre: (del campo "Secret Name" de arriba)
- Secret: (pega el valor correspondiente)
- Click **"Add secret"**

---

### Paso 3: Probar GitHub Actions

**Opción A - Push a main:**

```bash
# Desde tu Mac, en el repositorio local
git add .
git commit -m "Setup deployment configuration"
git push origin main
```

GitHub Actions se ejecutará automáticamente.

**Opción B - Trigger manual:**

1. Ve a tu repositorio en GitHub
2. Click en **"Actions"**
3. Selecciona **"Deploy to Hetzner"**
4. Click **"Run workflow"** → Selecciona `main` → **"Run workflow"**

---

## 📝 Comandos Útiles

### Ver estado:
```bash
docker compose ps
```

### Ver logs en tiempo real:
```bash
docker compose logs -f backend
```

### Reiniciar backend:
```bash
docker compose restart backend
```

### Detener todo:
```bash
docker compose down
```

### Iniciar todo:
```bash
docker compose up -d
```

### Ver uso de recursos:
```bash
docker stats
```

### Conectar a PostgreSQL:
```bash
docker exec -it porraza_postgres psql -U porraza_user -d porraza_db
```

### Volver a desplegar:
```bash
cd ~/porraza-backend
./deploy-local.sh
```

---

## 🔧 Troubleshooting

### El backend no inicia:

```bash
# Ver logs detallados
docker compose logs backend

# Verificar .env
cat .env

# Reintentar
docker compose down
docker compose up -d
```

### Error de permisos de Docker:

```bash
# Verificar que estás en el grupo docker
groups

# Si no aparece 'docker', añadirte (como root):
sudo usermod -aG docker porraza

# Cerrar sesión y volver a entrar
exit
ssh porraza@TU_IP_SERVIDOR
```

### No puedo acceder desde el navegador:

```bash
# Verificar firewall
sudo ufw status

# Permitir puerto 3001
sudo ufw allow 3001/tcp

# Verificar que el backend está escuchando
curl http://localhost:3001
```

### GitHub Actions falla en el deployment:

1. Verifica que los 3 secrets estén configurados correctamente
2. Verifica que la clave SSH funciona:
   ```bash
   # En tu Mac
   ssh -i ~/.ssh/porraza_github_deploy porraza@TU_IP_SERVIDOR
   ```
3. Revisa los logs del workflow en GitHub

---

## 🎯 Flujo de Trabajo Normal

Una vez configurado todo:

1. Haces cambios en tu código (en tu Mac)
2. Commit y push a `main`:
   ```bash
   git add .
   git commit -m "Tu mensaje"
   git push origin main
   ```
3. GitHub Actions automáticamente:
   - ✅ Se conecta al servidor
   - ✅ Hace pull del código
   - ✅ Reconstruye la imagen Docker
   - ✅ Reinicia los contenedores
   - ✅ Verifica que todo funciona

**¡No necesitas hacer nada manual en el servidor!** 🎉

---

## 📚 Archivos de Referencia

- [`DEPLOYMENT.md`](DEPLOYMENT.md) - Guía completa de deployment
- [`deploy-local.sh`](deploy-local.sh) - Script de deployment local
- [`verify-deployment.sh`](verify-deployment.sh) - Script de verificación
- [`cleanup-server.sh`](cleanup-server.sh) - Script de limpieza del servidor
- [`.env.example`](.env.example) - Template de variables de entorno

---

## 🆘 Soporte

Si encuentras problemas:

1. ✅ Ejecuta `./verify-deployment.sh` para diagnóstico
2. ✅ Revisa logs: `docker compose logs -f backend`
3. ✅ Consulta [`DEPLOYMENT.md`](DEPLOYMENT.md) para más detalles
4. ✅ Verifica que todos los pasos de esta guía se completaron

---

**¡Listo! Tu backend está corriendo en producción con CI/CD automático** 🚀
