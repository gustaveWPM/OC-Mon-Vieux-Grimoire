import bodyParser from 'body-parser';
import express, { Express, NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import ApiConfig from '../config/ApiConfig';
import AtlasConfig from '../config/AtlasConfig';
import ServerConfig from '../config/ServerConfig';
import booksController from './controllers/Book';
import usersController from './controllers/User';
import getSlashEnvelope from './lib/getSlashEnvelope';

async function tryToConnectToMongoDB() {
  const { USERNAME, PASSWORD, CLUSTER_URI, DB_NAME } = AtlasConfig;
  const URI = `mongodb+srv://${USERNAME}:${PASSWORD}@${CLUSTER_URI}/${DB_NAME}?retryWrites=true&w=majority`;

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
  app.use(BOOKS_API_ROUTE, booksController);
}

function appBinder(app: Express) {
  function setCorsHeader() {
    app.use((_: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      next();
    });
  }

  const { IMAGES_FOLDER, IMAGES_FOLDER_RELATIVE_PATH_FROM_APP_CTX, DEFAULT_PAYLOAD_SIZE_LIMIT, SIGNUP_PAYLOAD_SIZE_LIMIT } = ServerConfig;

  let limit = DEFAULT_PAYLOAD_SIZE_LIMIT;
  const useBodyParserJSON = () => app.use(bodyParser.json({ limit }));
  const useBodyParserURLEncoded = () => app.use(bodyParser.urlencoded({ extended: true, limit }));
  const setStaticRoutes = () =>
    app.use(getSlashEnvelope(IMAGES_FOLDER), express.static(path.join(__dirname, IMAGES_FOLDER_RELATIVE_PATH_FROM_APP_CTX)));

  const { AUTH_API_ROUTE } = ApiConfig;
  limit = SIGNUP_PAYLOAD_SIZE_LIMIT;
  app.use(AUTH_API_ROUTE, bodyParser.json({ limit }));
  app.use(AUTH_API_ROUTE, bodyParser.urlencoded({ extended: true, limit }));

  setCorsHeader();
  useBodyParserJSON();
  useBodyParserURLEncoded();
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
