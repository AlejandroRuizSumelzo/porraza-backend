# HTTPS Setup Guide - be.porraza.com

Esta guía te ayudará a configurar HTTPS para `be.porraza.com` usando Nginx y Let's Encrypt.

## 📋 Requisitos Previos

- ✅ DNS configurado: `be.porraza.com` → `91.98.230.4`
- ✅ Servidor Hetzner accesible vía SSH
- ✅ Docker y Docker Compose instalados
- ✅ Puertos 80 y 443 accesibles

## 🚀 Proceso de Despliegue

### Parte 1: Desplegar código actualizado

Los cambios ya están listos en el repositorio local. Debes hacer commit y push:

```bash
# En tu máquina local
cd ~/Documents/alex_proyects/porraza-backend

# Commit de cambios
git add nginx/ docker-compose.yml HTTPS-SETUP.md
git commit -m "Add HTTPS support with Nginx and Let's Encrypt"
git push origin main
```

Esto disparará el deployment automático a través de GitHub Actions.

### Parte 2: Configuración en el Servidor

Una vez desplegado el código, conéctate al servidor y ejecuta los siguientes pasos:

#### 1. Conectarse al servidor

```bash
ssh root@91.98.230.4
```

#### 2. Configurar firewall

```bash
# Permitir tráfico HTTP (puerto 80) para Let's Encrypt
sudo ufw allow 80/tcp

# Permitir tráfico HTTPS (puerto 443)
sudo ufw allow 443/tcp

# Verificar reglas
sudo ufw status

# Si el firewall no está activo, activarlo
sudo ufw enable
```

#### 3. Obtener certificados SSL

```bash
# Cambiar al usuario porraza
sudo su - porraza

# Ir al directorio del proyecto
cd ~/porraza-backend

# Detener Nginx si está corriendo
docker compose stop nginx

# Volver a root para ejecutar certbot
exit

# Ejecutar script de inicialización SSL
sudo bash /home/porraza/porraza-backend/nginx/certbot-init.sh
```

**Importante:** Antes de ejecutar el script, edita el email en el archivo:
```bash
sudo nano /home/porraza/porraza-backend/nginx/certbot-init.sh
# Cambia: EMAIL="admin@porraza.com" por tu email real
```

El script hará:
- ✅ Verificar que el DNS apunta correctamente
- ✅ Instalar Certbot si no existe
- ✅ Obtener certificados SSL de Let's Encrypt
- ✅ Configurar renovación automática

#### 4. Iniciar servicios con Nginx

```bash
# Cambiar al usuario porraza
sudo su - porraza

# Ir al directorio del proyecto
cd ~/porraza-backend

# Iniciar todos los servicios (incluido Nginx)
docker compose up -d

# Verificar que todos los servicios están corriendo
docker compose ps
```

Deberías ver:
```
NAME                IMAGE               STATUS
porraza_backend     porraza-backend     Up (healthy)
porraza_postgres    postgres:18-alpine  Up (healthy)
porraza_nginx       nginx:alpine        Up
```

#### 5. Verificar logs

```bash
# Ver logs de Nginx
docker compose logs -f nginx

# Ver logs del backend
docker compose logs -f backend
```

#### 6. Probar HTTPS

```bash
# Desde el servidor
curl -I https://be.porraza.com

# Debería devolver: HTTP/2 200
```

## 🧪 Verificación desde tu Navegador

Abre en tu navegador:
- **HTTP (redirige a HTTPS):** http://be.porraza.com
- **HTTPS:** https://be.porraza.com
- **API Endpoint:** https://be.porraza.com/api

Deberías ver:
- 🔒 Candado verde en la barra de direcciones
- Certificado válido emitido por Let's Encrypt
- Sin advertencias de seguridad

## 🔄 Renovación Automática de Certificados

Los certificados de Let's Encrypt expiran cada 90 días. El script `certbot-init.sh` ha configurado una tarea cron que renueva automáticamente los certificados:

```bash
# Ver tareas cron configuradas
sudo crontab -l

# Deberías ver:
# 0 3 * * * certbot renew --quiet --post-hook 'docker restart porraza_nginx'
```

Esto ejecuta la renovación diariamente a las 3 AM. Certbot solo renovará si faltan menos de 30 días para la expiración.

## 🛠️ Troubleshooting

### Problema: Nginx no inicia

```bash
# Ver logs detallados
docker compose logs nginx

# Verificar configuración de Nginx
docker exec porraza_nginx nginx -t

# Si hay error de sintaxis, corregir nginx/nginx.conf
```

### Problema: Certificados SSL no se obtienen

```bash
# Verificar DNS
dig +short be.porraza.com

# Verificar que puerto 80 está abierto
sudo ufw status | grep 80

# Ver logs de Certbot
sudo cat /var/log/letsencrypt/letsencrypt.log

# Intentar obtener certificado manualmente
sudo certbot certonly --standalone -d be.porraza.com
```

### Problema: "Connection refused" al acceder a HTTPS

```bash
# Verificar que Nginx está escuchando en puerto 443
sudo netstat -tulpn | grep 443

# Verificar que el contenedor está corriendo
docker ps | grep porraza_nginx

# Reiniciar Nginx
docker compose restart nginx
```

### Problema: "Certificate not found"

```bash
# Verificar que los certificados existen
sudo ls -la /etc/letsencrypt/live/be.porraza.com/

# Deberías ver:
# fullchain.pem
# privkey.pem
# chain.pem
# cert.pem
```

## 📊 Comandos Útiles

```bash
# Ver estado de certificados
sudo certbot certificates

# Renovar manualmente (para testing)
sudo certbot renew --dry-run

# Ver logs de acceso de Nginx
docker exec porraza_nginx cat /var/log/nginx/access.log

# Ver logs de errores de Nginx
docker exec porraza_nginx cat /var/log/nginx/error.log

# Reiniciar solo Nginx
docker compose restart nginx

# Reconstruir y reiniciar todo
docker compose down
docker compose up -d --build
```

## 🎯 Próximos Pasos

Después de configurar HTTPS:

1. **Actualizar frontend** para usar `https://be.porraza.com` en lugar de `http://91.98.230.4:3001`

2. **Actualizar variable de entorno** en el backend:
   ```bash
   # En el servidor, editar .env
   sudo su - porraza
   nano ~/porraza-backend/.env

   # Cambiar:
   # FRONTEND_URL=http://localhost:3000
   # Por:
   # FRONTEND_URL=https://porraza.com
   ```

3. **Cerrar puerto 3001** (opcional, ya que Nginx es el único punto de entrada):
   ```bash
   # Editar docker-compose.yml y comentar:
   # ports:
   #   - "${PORT:-3001}:3001"
   ```

4. **Configurar CORS** en el backend para permitir solo tu dominio frontend

## ✅ Checklist Final

- [ ] DNS configurado y propagado
- [ ] Firewall configurado (puertos 80 y 443 abiertos)
- [ ] Certificados SSL obtenidos con Certbot
- [ ] Nginx corriendo y en estado "healthy"
- [ ] HTTPS funcionando en navegador
- [ ] HTTP redirige a HTTPS correctamente
- [ ] Auto-renovación configurada en cron
- [ ] Frontend actualizado con nueva URL

---

**¡Listo!** Ahora tu API está accesible en `https://be.porraza.com` con certificado SSL válido y renovación automática. 🎉
