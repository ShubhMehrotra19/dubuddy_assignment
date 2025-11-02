import express = require('express');
import cors = require('cors');
import dotenv = require('dotenv');
import authRoutes from './routes/authRoutes';
import modelRoutes from './routes/modelRoutes';
import { listModelDefinitions } from './services/modelService';
import { initializeRouteRegistry, registerModelRoutes } from './utils/routeRegistry';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
initializeRouteRegistry(app);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});


app.use('/api/auth', authRoutes);
app.use('/api/models', modelRoutes);
async function registerCRUDRoutes() {
    const models = await listModelDefinitions();
    for (const model of models) {
        registerModelRoutes(model.name);
    }
}

registerCRUDRoutes().catch(console.error);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

