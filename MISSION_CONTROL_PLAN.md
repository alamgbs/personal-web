# Mission Control — Plan Maestro & Estado Actual

> **Fecha:** 2025-06-12  
> **Repositorio:** `github.com/alamgbs/personal-web`  
> **Deploy:** `https://alam-b.com` (Vercel auto-deploy desde `main`)  
> **Stack:** Next.js 16.2.9 (App Router) + TypeScript + Tailwind v4 + Supabase + D3 + GSAP

---

## 📋 Visión General

Construir un **Mission Control personal** integrado en el portfolio existente (`alam-b.com`), con:

1. **Portfolio público** — migración fiel del vanilla HTML/CSS/JS a Next.js con calidad cinematográfica
2. **Mission Control privado** (`/mission-control/*`) — dashboard operativo con auth (Supabase) para gestionar:
   - Agentes (organigrama, souls, skills, modelos)
   - Proyectos de código (repos GitHub + backlog Kanban)
   - Ideas de negocio (wizard 9 pasos con aprobación secuencial)
   - Daily briefs + inbox rápido de ideas

---

## ✅ Estado Actual (Verificado en Producción)

### Infraestructura Core
| Componente | Estado | Detalle |
|------------|--------|---------|
| GitHub repo | ✅ | `alamgbs/personal-web` — pushes disparan Vercel build |
| Vercel project | ✅ | `prj_9TKNMYqEUU5clMe7lMXjrz128oV0` — dominios `alam-b.com` / `www.alam-b.com` verificados |
| GitHub MCP | ✅ | `npx @modelcontextprotocol/server-github` con `GITHUB_TOKEN` (classic) |
| Supabase project | ✅ | `jmpkhkpdlnltrnhvhkdx` (sa-east-1) — schema migrado, RLS, seeds |
| Supabase Auth | ✅ | Usuario `hola@alambenitez.com` creado, login funcional |
| Build local | ✅ | `npm run build` → 0 errores, 10 rutas generadas |

### Rutas en Producción
```
GET  /                          → Portfolio (hero + D3 graph + timeline + contacto)
GET  /login                     → Login page (premium dark theme, acid button)
GET  /mission-control           → Dashboard Home (stats, daily brief, quick ideas kanban)
GET  /mission-control/agentes   → Organigrama + tabla + form agregar agente
GET  /mission-control/proyectos → Grid 4 proyectos + backlog accordion + form
GET  /mission-control/ideas     → Wizard 9 pasos + lista ideas (lado izq) + panel (der)
GET  /api/auth/callback         → OAuth callback (Supabase SSR)
```

### Autenticación
- **Middleware:** `src/proxy.ts` protege `/mission-control/*` → redirige a `/login` si no hay sesión
- **Server Actions:** `src/app/actions/auth.ts` → `signIn(formData)`, `signOut()`
- **Client:** `createBrowserClient` + `createServerClient` (cookies async)

---

## 🎨 Design System (Preservado del Portfolio Original)

```css
/* Colores */
--color-bg:          #0c0c0a;
--color-bg-1:        #111110;
--color-acid:        #d6ff3f;    /* Primary signal — usado moderadamente */
--color-acid-dim:    rgba(214,255,63,0.16);
--color-coral:       #ff6a3d;    /* Hotspot / live indicator */
--color-text:        #ece9e1;    /* Warm bone */
--color-text-dim:    #9b988e;
--color-text-faint:  #615f58;
--color-surface-1:   #141412;
--color-surface-2:   #1c1c19;
--color-surface-3:   #242420;
--color-border:      rgba(232,230,223,0.12);

/* Tipografía */
--font-heading:  'Space Grotesk', sans-serif;   /* Display, weight 500, tight tracking */
--font-mono:     'Space Mono', monospace;       /* Labels, data, uppercase */
--font-body:     'Hanken Grotesk', sans-serif;  /* Body copy */

/* Layout */
--spacing-grid:   28px;
--spacing-sidebar: 240px;
```

**Reglas estéticas no negociables:**
- Zero white backgrounds — todo sobre `#0c0c0a`
- Acid `#d6ff3f` solo para kickers, labels, CTAs, accent lines (poco, preciso)
- Coral `#ff6a3f` solo para live-dot pulse y estados críticos
- GSAP/Three.js solo donde aporte valor cinemático
- Nada de "AI slop" — cada pantalla diseñada a mano, tipografía tight, editorial

---

## 🗄️ Supabase Schema (Migración Aplicada)

```sql
-- agents (SOUL, skills[], model, parent_id → organigrama)
-- projects (github_repo, tech_stack[], url, status)
-- backlog_items (project_id, status, priority, type, assignee_slug)
-- business_ideas (step 0-8, step_data jsonb, step_approvals jsonb)
-- daily_briefs (date unique, content markdown, highlights[])
-- quick_ideas (type: dev|business, status: inbox|todo|doing|done)
```
Todas con `updated_at` trigger + RLS `auth_only` (solo autenticados).

---

## 📁 Estructura del Proyecto (src/)

```
src/
├── app/
│   ├── (portfolio)/              ← Route group público
│   ├── (mission-control)/        ← Route group protegido
│   │   ├── layout.tsx            ← Sidebar fija + main offset
│   │   ├── mission-control/
│   │   │   ├── page.tsx          ← Home dashboard
│   │   │   ├── agentes/page.tsx  ← Organigrama + tabla
│   │   │   ├── proyectos/page.tsx← Grid + backlog
│   │   │   └── ideas/page.tsx    ← Wizard + lista
│   │   └── login/page.tsx        ← Login (cliente)
│   ├── api/auth/callback/route.ts← OAuth callback
│   ├── globals.css               ← @theme + tokens import
│   ├── layout.tsx                ← Root + fonts next/font
│   └── page.tsx                  ← Portfolio (hero + D3 + Timeline)
├── components/
│   ├── portfolio/
│   │   ├── ProjectsGraph.tsx     ← D3 force-directed (452 líneas)
│   │   └── TimelineSection.tsx   ← Horizontal scroll (sticky)
│   └── mission-control/
│       ├── Sidebar.tsx           ← Nav fija + active states
│       ├── SignOutButton.tsx
│       ├── AgentOrgChart.tsx
│       ├── AddAgentForm.tsx
│       ├── ProjectGrid.tsx
│       ├── ProjectBacklog.tsx
│       ├── AddProjectForm.tsx
│       ├── IdeasPanel.tsx
│       ├── IdeaList.tsx
│       ├── IdeaWizard.tsx        ← 9 pasos con validación
│       └── QuickIdeasInbox.tsx   ← Kanban 3 columnas
├── lib/
│   ├── utils.ts                  ← cn() (clsx + tailwind-merge)
│   └── supabase/
│       ├── client.ts             ← createBrowserClient
│       └── server.ts             ← createServerClient (cookies async)
├── actions/
│   ├── auth.ts                   ← signIn, signOut
│   ├── agents.ts                 ← create/update/delete agent
│   ├── projects.ts               ← create project, backlog items
│   └── ideas.ts                  ← ideas + quick_ideas actions
├── styles/
│   └── tokens.css                ← Design tokens completo (CSS vars + animaciones)
└── proxy.ts                      ← Auth middleware (protege /mission-control/*)
```

---

## 🔀 Flujo de Trabajo (Workflow Operativo)

### Desde tu PC Local
```bash
cd ~/projects/alam/personal-web
git pull origin main
# Edit code → npm run build → git push origin main
# → Vercel auto-deploy → alam-b.com actualizado
```

### Agregar Nueva Idea de Negocio
1. Click `+ NUEVA` en `/mission-control/ideas`
2. Wizard te guía paso a paso (9 steps):
   - 0: Customer Profile → 1: Journey → 2: Problema → 3: Dolores
   - 4: BMC (9 blocks) → 5: P&L → 6: Cash Flow → 7: TAM/SAM/SOM → 8: Go/No-Go
3. Cada paso requiere **tu aprobación explícita** antes de avanzar
4. Paso 8 → "Mover a Backlog" crea `backlog_item` en proyecto destino

### Gestionar Agentes
- `/mission-control/agentes` → Click `+ ADD AGENT` en cualquier columna de equipo
- Formulario: name, slug, role, team, soul (textarea), skills (comma-sep), model, parent_id, avatar_emoji
- Org chart se actualiza en tiempo real

### Backlog de Proyectos
- Cada proyecto tiene accordion "BACKLOG (N)"
- Tabs: All / Backlog / In Progress / Done
- Priority dots: Critical=coral, High=acid, Medium=dim, Low=faint

---

## ⚠️ Pendiente Inmediato (Bloqueador Actual)

### TimelineSection → page.tsx (Incompleto)
El componente **`src/components/portfolio/TimelineSection.tsx`** está escrito y correcto (horizontal scroll sticky, 5 hitos, CTA final), **PERO** no se integró en `src/app/page.tsx`.

**Acción requerida (siguiente paso):**

```bash
cd /root/projects/alam/personal-web

# En page.tsx, REEMPLAZAR líneas ~752-982 (sección TIMELINE estática + CONTACT estática)
# POR:
# <TimelineSection />

# Luego:
npm run build
git add -A
git commit -m "feat: animated horizontal timeline replaces static section"
git push origin main
```

El patch exacto está preparado; solo falta aplicarlo y pushear.

---

## 📦 Próximas Fases (Post-Launch)

| Fase | Descripción | Prioridad |
|------|-------------|-----------|
| **Fase A** | Portfolio upgrade: Hero canvas (particles/three.js), scroll progress rail refinements | Media |
| **Fase B** | GitHub API integration en Proyectos: fetch real repos/issues/PRs | Alta |
| **Fase C** | Webhooks Supabase → Vercel preview deployments por proyecto | Media |
| **Fase D** | Agent execution logs + cost tracking (token usage per agent/model) | Baja |
| **Fase E** | Mobile PWA + offline-first para daily briefs | Baja |

---

## 🔑 Credenciales y Accesos (Resumen)

| Servicio | Identificador | Nota |
|----------|---------------|------|
| GitHub | `alamgbs` | PAT classic en `~/.hermes/.env` + MCP config |
| Vercel | `prj_9TKNMYqEUU5clMe7lMXjrz128oV0` | Token en `~/.hermes/.env` |
| Supabase | `jmpkhkpdlnltrnhvhkdx` (sa-east-1) | URL: `https://jmpkhkpdlnltrnhvhkdx.supabase.co` |
| Supabase Auth | `hola@alambenitez.com` | Pass: `MissionControl2026!` |
| Dominio | `alam-b.com` | Ya apuntando al proyecto Vercel |

---

## 📍 Path del Documento

```
/root/projects/alam/personal-web/MISSION_CONTROL_PLAN.md
```

---

> **Última actualización:** 2025-06-12 — Build `8ee0652` deployado, login funcional, dashboard completo. Solo falta patch final del TimelineSection en page.tsx.
