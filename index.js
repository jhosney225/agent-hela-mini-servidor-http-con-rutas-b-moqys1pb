import Anthropic from '@anthropic-ai/sdk';
import http from 'http';
import url from 'url';

const client = new Anthropic();

// Rutas disponibles del servidor
const routes = {
  '/': 'Bienvenido al servidor mini HTTP',
  '/about': 'Acerca de este servidor',
  '/api/suma': 'Servicio de suma (use: /api/suma?a=5&b=3)',
  '/api/weather': 'Información del clima (use: /api/weather?city=Madrid)',
};

// Función para procesar rutas dinámicas con IA
async function processAIRequest(pathname, query) {
  let prompt = '';

  if (pathname === '/api/suma') {
    const a = parseFloat(query.a) || 0;
    const b = parseFloat(query.b) || 0;
    prompt = `Resuelve esta suma matemática: ${a} + ${b}. Responde solo con el resultado numérico y una breve explicación.`;
  } else if (pathname === '/api/weather') {
    const city = query.city || 'Madrid';
    prompt = `Dame información breve sobre el clima típico de ${city}. Responde en máximo 2 líneas.`;
  } else if (pathname === '/api/help') {
    prompt = `Lista las rutas disponibles en un servidor HTTP mini con estos endpoints: ${Object.keys(routes).join(', ')}. Formato corto y claro.`;
  } else {
    return null;
  }

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return message.content[0].type === 'text' ? message.content[0].text : 'Error processing request';
}

// Crear el servidor HTTP
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Rutas estáticas
  if (pathname === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({ message: routes['/'], timestamp: new Date().toISOString() }));
    return;
  }

  if (pathname === '/about') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        message: routes['/about'],
        version: '1.0.0',
        description: 'Mini servidor HTTP con integración de IA usando Anthropic',
      }),
    );
    return;
  }

  if (pathname === '/routes') {
    res.writeHead(200);
    res.end(JSON.stringify({ availableRoutes: routes }));
    return;
  }

  // Rutas dinámicas con IA
  if (pathname === '/api/suma' || pathname === '/api/weather' || pathname === '/api/help') {
    try {
      const aiResponse = await processAIRequest(pathname, query);
      if (aiResponse) {
        res.writeHead(200);
        res.end(JSON.stringify({ result: aiResponse, endpoint: pathname, timestamp: new Date().toISOString() }));
        return;
      }
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Error processing AI request', details: error.message }));
      return;
    }
  }

  // 404 - Ruta no encontrada
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Ruta no encontrada', availableRoutes: Object.keys(routes) }));
});

// Iniciar el servidor
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Mini servidor HTTP corriendo en http://localhost:${PORT}`);
  console.log('\nRutas disponibles:');
  console.log('  GET / - Inicio');
  console.log('  GET /about - Acerca de');
  console.log('  GET /routes - Listar todas las rutas');
  console.log('  GET /api/suma?a=5&b=3 - Suma con IA');
  console.log('  GET /api/weather?city=Madrid - Clima con IA');
  console.log('  GET /api/help - Ayuda con IA');
  console.log('\nEjemplos de uso:');
  console.log(`  curl http://localhost:${PORT}/`);
  console.log(`  curl http://localhost:${PORT}/api/suma?a=10&b=20`);
  console.log(`  curl http://localhost:${PORT}/api/weather?city=Barcelona`);
});

// Manejo de señales para cerrar gracefully
process.on('SIGTERM', () => {
  console.log('\nServidor cerrando...');
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});