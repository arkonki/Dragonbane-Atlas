import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dragonbane-atlas-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && /^\/api\/maps\/?(\?.*)?$/.test(req.url)) {
            const uploadDir = path.resolve(process.cwd(), 'public/uploads');

            if (!fs.existsSync(uploadDir)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify([]));
              return;
            }

            const files = fs.readdirSync(uploadDir);
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

            const maps = files
              .filter((file: string) => imageExtensions.includes(path.extname(file).toLowerCase()))
              .map((file: string) => {
                const stats = fs.statSync(path.join(uploadDir, file));
                return {
                  id: file,
                  name: path.basename(file, path.extname(file)),
                  url: `/uploads/${file}`,
                  createdAt: stats.mtimeMs
                };
              })
              .sort((a: any, b: any) => a.name.localeCompare(b.name));

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(maps));
            return;
          }
          next();
        });
      },
    }
    ,
    {
      name: 'dragonbane-atlas-htaccess',
      apply: 'build',
      closeBundle() {
        const outDir = path.resolve(process.cwd(), 'dist');
        const htaccessPath = path.join(outDir, '.htaccess');
        const htaccess = `RewriteEngine On

# Serve existing files and directories directly
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Map extensionless API route to PHP file
RewriteRule ^api/maps/?$ api/maps.php [L,QSA]

# SPA fallback
RewriteRule ^ index.html [L]
`;

        fs.writeFileSync(htaccessPath, htaccess, 'utf8');
      },
    }
  ],
});
