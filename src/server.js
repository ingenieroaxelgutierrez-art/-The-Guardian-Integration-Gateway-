'use strict';

const app = require('./app');

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`[Guardian Integration Gateway] Listening on port ${PORT}`);
  console.log(`[Guardian Integration Gateway] ENV: ${process.env.NODE_ENV || 'development'}`);
});
