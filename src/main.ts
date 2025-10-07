import 'dotenv/config';

import { createTelegrafBot } from './presentation/bot/create-bot.js';
import { bootstrapApplication } from './application/services/bootstrap.js';

async function main(): Promise<void> {
  console.log('Starting application bootstrap...');
  const application = await bootstrapApplication();
  const token = process.env.BOT_TOKEN;

  if (!token) {
    console.warn('BOT_TOKEN environment variable is not set. Skipping bot launch.');
    return;
  }

  const bot = await createTelegrafBot({ token, application });
  try {
    await bot.launch();
    console.log('Telegraf bot launched successfully.');
  } catch (error) {
    console.error('Failed to launch Telegraf bot. Check network connectivity and BOT_TOKEN.', error);
  }
}

void main().catch((error) => {
  console.error('Application failed to start', error);
  process.exitCode = 1;
});
