import dotenv from 'dotenv';
dotenv.config();

import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.DISCORD_TOKEN;
const clientId = "1246419292669608017";
const guildId = "1244613184153845851";

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

let channels;

async function loadCommands() {
    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            try {
                const { default: command } = await import(`file://${filePath}`);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            } catch (error) {
                console.error(`Error importing command from ${filePath}:`, error);
            }
        }
    }
}

const rest = new REST({ version: '9' }).setToken(token);

async function deployCommands() {
    try {
        if (!DiscordClient.isReady()) {
            console.log('Initiating client client...');
            await DiscordClient.readyPromise();
            if (DiscordClient.isReady()) {
                console.log('Discord client is ready.');
                channels = DiscordClient.getChannel();
            } else {
                console.log('Error initiating client client.');
            }
        }
        await loadCommands();
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('Failed to deploy commands:', error);
    }
}

deployCommands();