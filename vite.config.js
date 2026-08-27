import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from "path"
import fs from "fs"
import { createClient } from '@supabase/supabase-js'

/**
 * Plugin customizado do Vite para intermediar requisições de credenciais
 * usando a Service Role Key do Supabase, contornando bloqueios de RLS no ambiente local.
 */
function credentialsApiPlugin() {
  let supabaseClient = null;

  function getSupabase() {
    if (supabaseClient) return supabaseClient;

    let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
            if ((key === 'VITE_SUPABASE_URL' || key === 'SUPABASE_URL') && !supabaseUrl) {
              supabaseUrl = val;
            }
            if ((key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'VITE_SUPABASE_SERVICE_ROLE_KEY') && !serviceKey) {
              serviceKey = val;
            }
          }
        }
      });
    }

    if (!supabaseUrl) {
      supabaseUrl = 'https://zjqhorznxxcfggppnjph.supabase.co';
    }

    if (!serviceKey) {
      console.error('[credentialsApiPlugin] SUPABASE_SERVICE_ROLE_KEY não encontrada no .env');
      return null;
    }

    supabaseClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    return supabaseClient;
  }

  return {
    name: 'credentials-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        if (!pathname.startsWith('/api/credentials')) {
          return next();
        }

        // Headers CORS & JSON
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const sendJson = (status, payload) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(payload));
        };

        const parseBody = () => new Promise((resolve) => {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              resolve(body ? JSON.parse(body) : {});
            } catch (err) {
              resolve({});
            }
          });
          req.on('error', () => resolve({}));
        });

        const supabase = getSupabase();
        if (!supabase) {
          return sendJson(500, { error: 'Supabase Service Role Client não inicializado. Verifique SUPABASE_SERVICE_ROLE_KEY.' });
        }

        try {
          // GET /api/credentials
          if (req.method === 'GET' && (pathname === '/api/credentials' || pathname === '/api/credentials/')) {
            const { data, error } = await supabase
              .from('credentials')
              .select('*')
              .order('created_at', { ascending: false });

            if (error) {
              return sendJson(500, { error: error.message });
            }

            return sendJson(200, { credentials: data || [] });
          }

          // POST /api/credentials/toggle
          if (req.method === 'POST' && pathname === '/api/credentials/toggle') {
            const body = await parseBody();
            const { id, is_active } = body;

            if (!id) {
              return sendJson(400, { error: 'ID da credencial é obrigatório' });
            }

            let nextActive = is_active;
            if (nextActive === undefined) {
              const { data: current } = await supabase
                .from('credentials')
                .select('is_active')
                .eq('id', id)
                .single();
              nextActive = current ? !current.is_active : true;
            }

            const { data, error } = await supabase
              .from('credentials')
              .update({
                is_active: nextActive,
                updated_at: new Date().toISOString()
              })
              .eq('id', id)
              .select()
              .single();

            if (error) {
              return sendJson(500, { error: error.message });
            }

            return sendJson(200, { success: true, credential: data });
          }

          // POST /api/credentials/save
          if (req.method === 'POST' && pathname === '/api/credentials/save') {
            const body = await parseBody();
            const { id, service_name, api_key, user_id, credit_balance, credit_renews_at } = body;

            if (!service_name && !id) {
              return sendJson(400, { error: 'service_name ou id é obrigatório' });
            }

            if (api_key === undefined || api_key === null) {
              return sendJson(400, { error: 'api_key é obrigatória' });
            }

            const defaultUserId = user_id || '225a896c-9fbe-484b-b7aa-5e6ad8ff5e47';

            if (id) {
              const updatePayload = {
                api_key,
                updated_at: new Date().toISOString()
              };
              if (credit_balance !== undefined) updatePayload.credit_balance = credit_balance;
              if (credit_renews_at !== undefined) updatePayload.credit_renews_at = credit_renews_at;

              const { data, error } = await supabase
                .from('credentials')
                .update(updatePayload)
                .eq('id', id)
                .select()
                .single();

              if (error) {
                return sendJson(500, { error: error.message });
              }

              return sendJson(200, { success: true, credential: data });
            }

            // Verificar se já existe credencial cadastrada para este service_name
            const { data: existing } = await supabase
              .from('credentials')
              .select('*')
              .eq('service_name', service_name)
              .maybeSingle();

            if (existing) {
              const updatePayload = {
                api_key,
                is_active: true,
                updated_at: new Date().toISOString()
              };
              if (user_id) updatePayload.user_id = user_id;
              if (credit_balance !== undefined) updatePayload.credit_balance = credit_balance;
              if (credit_renews_at !== undefined) updatePayload.credit_renews_at = credit_renews_at;

              const { data, error } = await supabase
                .from('credentials')
                .update(updatePayload)
                .eq('id', existing.id)
                .select()
                .single();

              if (error) {
                return sendJson(500, { error: error.message });
              }

              return sendJson(200, { success: true, credential: data });
            }

            // Inserção de novo registro
            const insertPayload = {
              service_name,
              api_key,
              user_id: defaultUserId,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            if (credit_balance !== undefined) insertPayload.credit_balance = credit_balance;
            if (credit_renews_at !== undefined) insertPayload.credit_renews_at = credit_renews_at;

            const { data, error } = await supabase
              .from('credentials')
              .insert(insertPayload)
              .select()
              .single();

            if (error) {
              return sendJson(500, { error: error.message });
            }

            return sendJson(200, { success: true, credential: data });
          }

          // POST /api/credentials/delete ou DELETE /api/credentials
          if ((req.method === 'POST' && pathname === '/api/credentials/delete') || req.method === 'DELETE') {
            const body = await parseBody();
            const id = body.id || url.searchParams.get('id');

            if (!id) {
              return sendJson(400, { error: 'ID da credencial é obrigatório' });
            }

            const { error } = await supabase
              .from('credentials')
              .delete()
              .eq('id', id);

            if (error) {
              return sendJson(500, { error: error.message });
            }

            return sendJson(200, { success: true });
          }

          return sendJson(404, { error: 'Endpoint de credenciais não encontrado' });
        } catch (err) {
          console.error('[credentialsApiPlugin] Erro interno:', err);
          return sendJson(500, { error: err.message });
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    credentialsApiPlugin()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api/reacher': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/reacher/, '')
      },
      '/api/evolution': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/evolution/, ''),
        headers: { 'apikey': 'criativa-local-dev-key' }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  }
})

