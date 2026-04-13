const jsonServer = require('json-server');
const path = require('path');
const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();
server.use(middlewares);
server.use(jsonServer.bodyParser);
// CORS для всех запросов
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
// Логирование запросов 
server.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
server.use(router);
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('JSON Server running on port ${PORT}');
  console.log('Database: db.json');
});

