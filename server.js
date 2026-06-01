const { createApp } = require('./src/app');

const app = createApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`servidor rodando em http://localhost:${port}`);
});
