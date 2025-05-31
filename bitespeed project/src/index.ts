import express from 'express';
import identifyRouter from './routes/identify';

const app = express();

app.use(express.json());

app.use('/identify', identifyRouter);

app.get('/', (req, res) => {
  res.send('API is running');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});