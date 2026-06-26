import express from 'express';
import db from './db.js';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const app = express();
const port = Number(process.env.PORT || 4173);

app.use(express.json({ limit: '10mb' }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  realtime: {
    transport: WebSocket
  }
});

// Obter IDs dos usuários reais do banco para retrocompatibilidade
let defaultUserId = null;
let driverUserId = null;
let businessUserId = null;
let adminUserId = null;

async function setupMockUserIds() {
  try {
    const resMorador = await db.query("SELECT id FROM users WHERE email = 'morador@jardimabc.local'");
    if (resMorador.rows.length > 0) defaultUserId = resMorador.rows[0].id;

    const resDriver = await db.query("SELECT id FROM users WHERE email = 'motorista@jardimabc.local'");
    if (resDriver.rows.length > 0) driverUserId = resDriver.rows[0].id;

    const resBusiness = await db.query("SELECT id FROM users WHERE email = 'empresa@jardimabc.local'");
    if (resBusiness.rows.length > 0) businessUserId = resBusiness.rows[0].id;

    const resAdmin = await db.query("SELECT id FROM users WHERE email = 'admin@jardimabc.local'");
    if (resAdmin.rows.length > 0) adminUserId = resAdmin.rows[0].id;
  } catch (err) {
    console.warn("Aviso: Não foi possível carregar os IDs dos perfis do banco.");
  }
}

// Sincroniza o usuário autenticado via Supabase com o banco público
async function syncUserToDatabase(supabaseUser) {
  const { id, email, phone, user_metadata } = supabaseUser;
  try {
    // 1. Inserir/Atualizar na tabela users
    const userCheck = await db.query("SELECT id FROM users WHERE id = $1", [id]);
    if (userCheck.rows.length === 0) {
      await db.query(
        `INSERT INTO users (id, email, phone, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'active', now(), now())`,
        [id, email || null, phone || null]
      );
    }

    // 2. Inserir/Atualizar na tabela profiles
    const profileCheck = await db.query("SELECT id FROM profiles WHERE user_id = $1", [id]);
    if (profileCheck.rows.length === 0) {
      const fullName = user_metadata?.full_name || user_metadata?.name || email?.split('@')[0] || 'Morador Jardim ABC';
      const displayName = user_metadata?.custom_display_name || user_metadata?.display_name || fullName.split(' ')[0];
      const avatarUrl = user_metadata?.avatar_url || null;
      const whatsapp = user_metadata?.whatsapp || phone || null;

      await db.query(
        `INSERT INTO profiles (user_id, full_name, display_name, avatar_url, neighborhood, whatsapp, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Jardim ABC', $5, now(), now())`,
        [id, fullName, displayName, avatarUrl, whatsapp]
      );
    }

    // 3. Garantir a role 'resident' por padrão
    const roleCheck = await db.query("SELECT id FROM user_roles WHERE user_id = $1 AND role = 'resident'", [id]);
    if (roleCheck.rows.length === 0) {
      await db.query(
        `INSERT INTO user_roles (user_id, role, status, created_at, updated_at)
         VALUES ($1, 'resident', 'active', now(), now())`,
        [id]
      );
    }
  } catch (err) {
    console.error("Erro ao sincronizar usuário do Supabase com o banco público:", err);
  }
}

// Middleware de Autenticação Segura
app.use(async (req, res, next) => {
  if (!defaultUserId || !adminUserId) {
    await setupMockUserIds();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        req.userId = user.id;
        req.user = user;
        await syncUserToDatabase(user);
      }
    } catch (err) {
      console.error("Erro na verificação do token Supabase:", err);
    }
  }

  // Fallback opcional para query params (desenvolvimento / debug / testes locais)
  if (!req.userId) {
    const userQuery = req.query.user;
    if (userQuery === 'driver') {
      req.userId = driverUserId;
    } else if (userQuery === 'business') {
      req.userId = businessUserId;
    } else if (userQuery === 'admin') {
      req.userId = adminUserId;
    } else if (userQuery === 'resident') {
      req.userId = defaultUserId;
    }
  }

  next();
});

// Sanitização simples para evitar HTML Injection e XSS
function sanitize(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/<[^>]*>/g, '').trim();
}

// GET /api/config (Inicialização segura no frontend)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});

// --- API ENDPOINTS ---

// 1. GET /api/feed (Mural, Notícias e Classificados da Home)
app.get('/api/feed', async (req, res) => {
  try {
    // Últimas Notícias normais (sem ser Mural ou Alerta urgente)
    const newsRes = await db.query(
      `SELECT n.id, n.title, n.summary, n.category, to_char(n.published_at, 'DD/MM/YYYY HH24:MI') as date, n.cover_url,
              p.display_name as author_name
       FROM news n
       LEFT JOIN profiles p ON p.user_id = n.author_user_id
       WHERE n.status = 'approved' AND n.is_urgent = false AND n.category <> 'Mural'
       ORDER BY n.published_at DESC LIMIT 5`
    );

    // Produtos adicionados hoje
    const productsRes = await db.query(
      `SELECT m.id, m.title, m.price_cents, m.category, m.image_urls, p.neighborhood, p.whatsapp
       FROM marketplace_ads m
       JOIN profiles p ON p.user_id = m.seller_user_id
       WHERE m.status = 'approved'
       ORDER BY m.created_at DESC LIMIT 4`
    );

    // Avisos importantes (Notícias urgentes OR categoria Mural)
    const alertsRes = await db.query(
      `SELECT id, title, summary as text, category as type, is_urgent, to_char(published_at, 'HH24:MI') as time
       FROM news
       WHERE status = 'approved' AND (is_urgent = true OR category = 'Mural')
       ORDER BY published_at DESC LIMIT 5`
    );

    res.json({
      news: newsRes.rows,
      products: productsRes.rows,
      alerts: alertsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/ads (OLX Local - Classificados)
app.get('/api/ads', async (req, res) => {
  const { category, search } = req.query;
  try {
    let query = `
      SELECT m.id, m.title, m.description, m.category, m.price_cents, m.image_urls, m.is_featured,
             p.whatsapp, p.neighborhood, p.full_name as seller_name
      FROM marketplace_ads m
      JOIN profiles p ON p.user_id = m.seller_user_id
      WHERE m.status = 'approved'
    `;
    const params = [];

    if (category && category !== 'Todos') {
      params.push(category);
      query += ` AND m.category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (m.title ILIKE $${params.length} OR m.description ILIKE $${params.length})`;
    }

    query += ` ORDER BY m.is_featured DESC, m.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/ads/:id (Detalhe do Anúncio)
app.get('/api/ads/:id', async (req, res) => {
  try {
    const query = `
      SELECT m.id, m.title, m.description, m.category, m.price_cents, m.image_urls, m.is_featured,
             p.whatsapp, p.neighborhood, p.full_name as seller_name, to_char(m.created_at, 'DD/MM/YYYY') as date
      FROM marketplace_ads m
      JOIN profiles p ON p.user_id = m.seller_user_id
      WHERE m.id = $1
    `;
    const result = await db.query(query, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Anúncio não encontrado." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /api/publish (Publicar anúncio ou Mural)
app.post('/api/publish', async (req, res) => {
  const { type, title, description, price, category, images } = req.body;
  if (!req.userId) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  const cleanTitle = sanitize(title);
  const cleanDescription = sanitize(description);
  const cleanCategory = sanitize(category);

  try {
    if (type === "Comprar e Vender") {
      const priceCents = price ? Math.round(parseFloat(price) * 100) : null;
      const imageArray = (images && Array.isArray(images)) ? images : [];
      
      const query = `
        INSERT INTO marketplace_ads (seller_user_id, title, description, category, price_cents, image_urls, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'approved')
        RETURNING id
      `;
      await db.query(query, [req.userId, cleanTitle, cleanDescription, cleanCategory, priceCents, imageArray]);
      return res.json({ success: true });
    } else if (type === "Mural") {
      const slug = `mural-${Date.now()}`;
      const coverUrl = (images && images.length > 0) ? images[0] : null;
      const summary = cleanDescription.length > 100 ? cleanDescription.substring(0, 97) + '...' : cleanDescription;

      const query = `
        INSERT INTO news (author_user_id, title, slug, summary, body, category, is_urgent, cover_url, status, published_at)
        VALUES ($1, $2, $3, $4, $5, 'Mural', false, $6, 'approved', now())
      `;
      await db.query(query, [req.userId, cleanTitle, slug, summary, cleanDescription, coverUrl]);
      return res.json({ success: true });
    } else {
      return res.status(400).json({ error: "Tipo de publicação inválido." });
    }
  } catch (err) {
    console.error("Erro ao publicar:", err);
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /api/news (Módulo de Notícias)
app.get('/api/news', async (req, res) => {
  const { category } = req.query;
  try {
    let query = `
      SELECT n.id, n.title, n.summary, n.body, n.category, n.cover_url, 
             to_char(n.published_at, 'DD/MM/YYYY HH24:MI') as date, n.is_urgent,
             p.display_name as author_name
      FROM news n
      LEFT JOIN profiles p ON p.user_id = n.author_user_id
      WHERE n.status = 'approved'
    `;
    const params = [];

    if (category && category !== 'Todos') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    } else {
      query += ` AND category <> 'Mural'`;
    }

    query += ` ORDER BY is_urgent DESC, published_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5.1 GET /api/news/:id (Detalhes da Notícia/Comunicado)
app.get('/api/news/:id', async (req, res) => {
  try {
    const query = `
      SELECT n.id, n.title, n.summary, n.body, n.category, n.cover_url, 
             to_char(n.published_at, 'DD/MM/YYYY HH24:MI') as date, n.is_urgent,
             p.display_name as author_name
      FROM news n
      LEFT JOIN profiles p ON p.user_id = n.author_user_id
      WHERE n.id = $1
    `;
    const result = await db.query(query, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notícia não encontrada." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET /api/bus (Módulo de Ônibus)
app.get('/api/bus', async (req, res) => {
  try {
    // Obter linhas/rotas
    const routesRes = await db.query("SELECT id, name, description FROM bus_routes WHERE is_active = true");
    const routes = routesRes.rows;

    if (routes.length === 0) {
      return res.json({ routes: [], schedules: [] });
    }

    const selectedRouteId = req.query.routeId || routes[0].id;

    // Obter horários da linha selecionada
    const schedulesRes = await db.query(
      `SELECT id, to_char(departure_time, 'HH24:MI') as time, notes 
       FROM bus_schedules 
       WHERE route_id = $1 
       ORDER BY departure_time ASC`,
      [selectedRouteId]
    );

    res.json({
      routes,
      schedules: schedulesRes.rows,
      selectedRouteId,
      fare: "R$ 5,50" // Tarifa mockada padrão
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET /api/profile (Perfil do Usuário Logado)
app.get('/api/profile', async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Não autenticado." });

  try {
    const profileRes = await db.query(
      `SELECT p.full_name, p.display_name, p.whatsapp, p.neighborhood, u.email, u.phone, p.avatar_url
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1`,
      [req.userId]
    );

    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: "Perfil não encontrado." });
    }

    // Buscar capacidades de admin
    const capRes = await db.query(
      "SELECT can_admin FROM v_user_capabilities WHERE user_id = $1",
      [req.userId]
    );
    const isAdmin = capRes.rows.length > 0 ? capRes.rows[0].can_admin : false;

    // Estatísticas dinâmicas
    const adsCount = await db.query("SELECT count(*) FROM marketplace_ads WHERE seller_user_id = $1", [req.userId]);
    const favsCount = await db.query("SELECT count(*) FROM favorites WHERE user_id = $1", [req.userId]);

    res.json({
      profile: profileRes.rows[0],
      isAdmin,
      stats: {
        ads: parseInt(adsCount.rows[0].count, 10),
        favorites: parseInt(favsCount.rows[0].count, 10)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. GET /api/favorites (Favoritos)
app.get('/api/favorites', async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Não autenticado." });
  try {
    const query = `
      SELECT f.id as fav_id, m.id, m.title, m.price_cents, m.image_urls, p.neighborhood, p.whatsapp
      FROM favorites f
      JOIN marketplace_ads m ON m.id = f.target_id
      JOIN profiles p ON p.user_id = m.seller_user_id
      WHERE f.user_id = $1 AND f.target_type = 'ad'
    `;
    const result = await db.query(query, [req.userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. POST /api/favorites/toggle (Favoritar/Desfavoritar)
app.post('/api/favorites/toggle', async (req, res) => {
  const { targetId } = req.body;
  if (!req.userId) return res.status(401).json({ error: "Não autenticado." });

  try {
    const check = await db.query(
      "SELECT id FROM favorites WHERE user_id = $1 AND target_id = $2 AND target_type = 'ad'",
      [req.userId, targetId]
    );

    if (check.rows.length > 0) {
      await db.query("DELETE FROM favorites WHERE id = $1", [check.rows[0].id]);
      res.json({ success: true, favorited: false });
    } else {
      await db.query(
        "INSERT INTO favorites (user_id, target_type, target_id) VALUES ($1, 'ad', $2)",
        [req.userId, targetId]
      );
      res.json({ success: true, favorited: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN DASHBOARD ENDPOINTS ---

async function checkAdmin(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: "Acesso restrito. Não autenticado." });
  }
  try {
    const capRes = await db.query(
      "SELECT can_admin FROM v_user_capabilities WHERE user_id = $1",
      [req.userId]
    );
    const isAdmin = capRes.rows.length > 0 ? capRes.rows[0].can_admin : false;
    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso restrito ao Painel Administrativo." });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 1. Administrar Notícias
app.get('/api/admin/news', checkAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT id, title, category, status, is_urgent, to_char(published_at, 'DD/MM HH24:MI') as date FROM news ORDER BY published_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/news', checkAdmin, async (req, res) => {
  const { title, summary, body, category, is_urgent, image } = req.body;
  const cleanTitle = sanitize(title);
  const cleanSummary = sanitize(summary);
  const cleanBody = sanitize(body);
  const cleanCategory = sanitize(category);

  try {
    const slug = `news-${Date.now()}`;
    await db.query(
      `INSERT INTO news (author_user_id, title, slug, summary, body, category, is_urgent, cover_url, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', now())`,
      [req.userId, cleanTitle, slug, cleanSummary, cleanBody, cleanCategory, is_urgent || false, image || null]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/news/:id', checkAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM news WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Administrar Ônibus
app.get('/api/admin/bus', checkAdmin, async (req, res) => {
  try {
    const routes = await db.query("SELECT id, name FROM bus_routes");
    const schedules = await db.query(
      `SELECT s.id, r.name as route, to_char(s.departure_time, 'HH24:MI') as time, s.notes
       FROM bus_schedules s
       JOIN bus_routes r ON r.id = s.route_id
       ORDER BY r.name, s.departure_time ASC`
    );
    res.json({ routes: routes.rows, schedules: schedules.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/bus', checkAdmin, async (req, res) => {
  const { routeId, departureTime, notes } = req.body;
  try {
    await db.query(
      "INSERT INTO bus_schedules (route_id, departure_time, notes) VALUES ($1, $2, $3)",
      [routeId, departureTime, notes || '']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/bus/:id', checkAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM bus_schedules WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Administrar Anúncios (Classificados)
app.get('/api/admin/ads', checkAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.id, m.title, m.category, m.price_cents, p.full_name as seller, m.status
       FROM marketplace_ads m
       JOIN profiles p ON p.user_id = m.seller_user_id
       ORDER BY m.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/ads/:id', checkAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM marketplace_ads WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Administrar Usuários
app.get('/api/admin/users', checkAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, p.full_name as name, u.email, u.phone, u.status
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', checkAdmin, async (req, res) => {
  try {
    // Para simplificar, colocamos o usuário como 'blocked'
    await db.query("UPDATE users SET status = 'blocked' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bloqueio de acesso a arquivos sensíveis do servidor (.env, package.json, etc.)
app.use((req, res, next) => {
  const sensitiveFiles = [
    /^\/\.env/i,
    /^\/package\.json/i,
    /^\/package-lock\.json/i,
    /^\/node_modules/i,
    /^\/database/i,
    /^\/\.git/i
  ];
  const isSensitive = sensitiveFiles.some(regex => regex.test(req.path));
  if (isSensitive) {
    return res.status(403).json({ error: "Acesso proibido. Arquivo restrito." });
  }
  next();
});

// Servir frontend estático
app.use(express.static('.'));

app.listen(port, () => {
  console.log(`[Jardim ABC] Servidor rodando em http://localhost:${port}`);
});
