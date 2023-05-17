import 'dotenv/config';
import tryGetApp from './app/app';
import ServerConfig from './config/ServerConfig';

const { PORT } = ServerConfig;

async function serverLauncher() {
  try {
    const app = await tryGetApp();

    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(error);
  }
}

serverLauncher();
