const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);
  app.use(express.static(path.join(__dirname, '..', 'site')));
  app.use('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'site', 'index.html')));
  return app;
}

module.exports = { createApp };
