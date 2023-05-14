import express, { Express, NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import ApiConfig from '../config/ApiConfig';
import AtlasConfig from '../config/AtlasConfig';
import usersController from './controllers/User';

async function tryToConnectToMongoDB() {
  const { USERNAME, PASSWORD, CLUSTER_URI } = AtlasConfig;
  const URI = `mongodb+srv://${USERNAME}:${PASSWORD}@${CLUSTER_URI}/test?retryWrites=true&w=majority`;

  return mongoose
    .connect(URI)
    .catch((error) => {
      console.error('Failed to connect to MongoDB, here is the AtlasConfig dump:', AtlasConfig, '\n');
      throw error;
    })
    .then(() => console.log('Connected to MongoDB!'));
}

function pluginControllers(app: Express) {
  const { AUTH_API_ROUTE, BOOKS_API_ROUTE } = ApiConfig;
  app.use(AUTH_API_ROUTE, usersController);
  // app.use(BOOKS_API_ROUTE, booksController);
}

function appBinder(app: Express) {
  const setCorsHeader = () => {
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      next();
    });
  };
  const useBodyParser = () => app.use(express.json());
  const setStaticRoutes = () => app.use('/images', express.static(path.join(__dirname, 'images')));

  setCorsHeader();
  useBodyParser();
  setStaticRoutes();
  pluginControllers(app);
}

export async function getApp(): Promise<Express> {
  try {
    await tryToConnectToMongoDB();
    const app = express();
    appBinder(app);
    return app;
  } catch (error) {
    throw error;
  }
}

export default getApp;
