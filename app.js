const express = require('express')
const apiRouter = require('./routes/api')

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/api', apiRouter);


module.exports = app;
