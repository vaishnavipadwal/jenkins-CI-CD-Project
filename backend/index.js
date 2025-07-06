const express = require('express');
const mysql = require('mysql');
const app = express();
const port = 5000;

const db = mysql.createConnection({
  host: 'mysql', // service name in K8s
  user: 'root',
  password: 'password',
  database: 'testdb'
});

db.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL');
});

app.get('/', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
