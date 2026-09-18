# Amigo Secreto World Gen 🎁

Aplicación web de Amigo Secreto (Secret Santa) para el grupo **World Gen**.  
Crea salas, invita por WhatsApp y el sorteo se hace automáticamente después de 24 horas.

## Diseño actualizado

- Tema oscuro festivo con glassmorphism
- Tipografías Outfit + Space Grotesk
- Gradientes y animaciones suaves
- Título: **Amigo Secreto World Gen**

## Requisitos

- Node.js 18+
- Cuenta de [Supabase](https://supabase.com) (ya configurada en `.env`)

## Variables de entorno

Copia `.env.example` o usa el `.env` actual:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon
PORT=3000
CLEANUP_SECRET=cambia-esto
```

## Ejecutar en local

```bash
npm install
npm start
```

Abre http://localhost:3000

## Dónde publicar (recomendado)

### Opción 1 — Render (la más fácil y gratis)

1. Entra a [render.com](https://render.com) y crea una cuenta (con GitHub).
2. Sube este proyecto a un repositorio de GitHub.
3. En Render: **New → Web Service**.
4. Conecta el repo.
5. Configuración:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. En **Environment** agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - (opcional) `CLEANUP_SECRET`
7. Deploy. Te dará una URL tipo:  
   `https://amigo-secreto-world-gen.onrender.com`

### Opción 2 — Railway

1. [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Añade las mismas variables de entorno
4. Deploy automático

### Opción 3 — Fly.io / Cyclic / otros

Cualquier plataforma que soporte Node + Express funciona igual.

## Cómo usarlo con el grupo

1. Publica la app (Render es lo más simple).
2. Entra a la URL pública.
3. Pulsa **Crear nueva sala**.
4. Copia el enlace o compártelo por WhatsApp.
5. Todos se registran con nombre + código secreto (en 24 h).
6. Al cerrar el plazo, el sorteo se hace solo.
7. Cada uno consulta su amigo secreto con su nombre y código.

## Notas

- Las salas caducan / cierran a las 24 horas de creadas.
- El código secreto solo lo conoce cada persona (no se guarda en texto plano).
- Asegúrate de que las migraciones de Supabase ya estén aplicadas (están en `supabase/migrations/`).
