// Charger les variables d'environnement depuis le fichier .env.test.local
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test.local' });

import mongoose from 'mongoose';

// Avant de lancer les tests, configurer un timeout plus long pour les opérations MongoDB
jest.setTimeout(10000); // 10 secondes

// Configuration pour éviter les avertissements de Mongoose
mongoose.set('strictQuery', false);