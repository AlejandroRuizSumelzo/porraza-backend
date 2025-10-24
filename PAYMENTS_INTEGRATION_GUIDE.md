# Guía de Integración de Pagos - Porraza Backend

Esta guía documenta la integración de Stripe para el sistema de pagos de Porraza.

---

## 🎯 RESUMEN

- **Proveedor**: Stripe
- **Tipo de pago**: One-time payment (€1.99)
- **Método**: Embedded Checkout
- **Webhook**: `POST /payments/webhook`

---

## 🔧 CONFIGURACIÓN

### Variables de Entorno (`.env`)

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxx           # Obtener de Stripe Dashboard
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx      # Obtener de Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_xxxxx         # Obtener de Stripe CLI o Dashboard
STRIPE_PRICE_ID=price_xxxxx               # Crear producto en Stripe Dashboard

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

⚠️ **IMPORTANTE**: Nunca commits las claves reales al repositorio. Usa solo placeholders.

---

## 📋 PASOS DE CONFIGURACIÓN

### 1. Crear Producto en Stripe Dashboard

1. Ir a: https://dashboard.stripe.com/test/products
2. Click "Add product"
3. Configurar:
   - Name: "Porraza Access Pass"
   - Description: "Acceso completo al torneo Porraza"
   - Pricing: One-time payment, €1.99, EUR
4. Copiar el `price_id` y agregarlo al `.env`

### 2. Obtener API Keys

1. Ir a: https://dashboard.stripe.com/test/apikeys
2. Copiar:
   - **Secret key** → Backend `.env` como `STRIPE_SECRET_KEY`
   - **Publishable key** → Frontend `.env` como `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 3. Configurar Webhooks

**Para Local (Stripe CLI):**

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS

# Autenticar
stripe login

#Forward webhooks (IMPORTANTE: Puerto 3001)
stripe listen --forward-to http://localhost:3001/payments/webhook
```

Copiar el `whsec_` del output y agregarlo a `.env` como `STRIPE_WEBHOOK_SECRET`

**Para Producción (Dashboard):**

1. Ir a: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://tu-dominio.com/payments/webhook`
4. Events: `checkout.session.completed`
5. Copiar signing secret y agregarlo a `.env` de producción

---

## 🧪 TESTING

### Tarjetas de Prueba

```
Success:     4242 4242 4242 4242
Declined:    4000 0000 0000 0002
3D Secure:   4000 0025 0000 3155

Expiry: Cualquier fecha futura
CVC: Cualquier 3 dígitos
ZIP: Cualquier código
```

### Workflow de Testing

```bash
# 1. Iniciar backend
pnpm run start:dev

# 2. Iniciar Stripe webhook listener
stripe listen --forward-to http://localhost:3001/payments/webhook

# 3. Login y obtener token
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# 4. Crear checkout session
curl -X POST http://localhost:3001/payments/create-checkout-session \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 5. Completar pago en frontend con tarjeta 4242 4242 4242 4242

# 6. Verificar estado de pago
curl http://localhost:3001/payments/verify-status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📚 DOCUMENTACIÓN

- Stripe Docs: https://docs.stripe.com
- Stripe CLI: https://stripe.com/docs/stripe-cli
- Testing Cards: https://stripe.com/docs/testing

---

## ⚠️ SEGURIDAD

- **NUNCA** expongas `STRIPE_SECRET_KEY` o `STRIPE_WEBHOOK_SECRET`
- **NUNCA** commits claves reales al repositorio
- Usa variables de entorno para todas las configuraciones sensibles
- En producción, usa claves `sk_live_` y `pk_live_` (no `sk_test_`)

---

## 🐛 TROUBLESHOOTING

### Webhook signature verification fails

- Verifica que `STRIPE_WEBHOOK_SECRET` sea correcto
- Asegúrate de que `rawBody: true` esté en `main.ts`
- Verifica que Stripe CLI apunte al puerto correcto (3001)

### "STRIPE_PRICE_ID is not configured"

- Crea el producto en Stripe Dashboard
- Copia el `price_id` y agrégalo a `.env`
- Reinicia el backend

### Webhook no recibido

- Verifica que Stripe CLI esté corriendo
- Verifica logs del backend
- Verifica firewall en puerto 3001

---

**Última actualización**: 2025-01-24
