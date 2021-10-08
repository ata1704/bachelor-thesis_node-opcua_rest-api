import express from 'express';
import apiRouter from './routes/api.js'
import graphQlRouter from './routes/graphql.js'

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/api', apiRouter);
app.use('/graphql', graphQlRouter);

export default app;
