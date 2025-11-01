import express = require('express');
import dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Welcome');
})

app.listen(PORT, () => {
    console.log(`server running on port: ${PORT}`);
})