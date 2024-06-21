import dotenv from 'dotenv';
dotenv.config();

import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import * as Utils from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

async function loadCommands() {
    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            try {
                const commandModule = await import(`file://${filePath}`);
                const command = commandModule.default || commandModule;

                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            } catch (error) {
                console.error(`Error loading the command at ${filePath}: ${error}`);
            }
        }
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

let clientReady = false;
let channel = {};

export const initializeClient = async () => {
    channel.opening = await getChannelById(process.env.OPENING_CHANNEL);
    channel.reveal = await getChannelById(process.env.REVEAL_CHANNEL);
    channel.debug = await getChannelById(process.env.DEBUG_CHANNEL_ID);
    Utils.setChannels(channel);
    console.log('Client successfully initialized.');
}

export const isReady = () => clientReady;

export const readyPromise = () => new Promise((resolve) => {
    client.on('ready', async () => {
        console.log('Discord client logged.');
        await initializeClient();
        await loadCommands();
        clientReady = true;
        resolve();
    });
});

const getChannelById = async (id) => {
    return await client.channels.fetch(id);
}

client.login(process.env.DISCORD_TOKEN);

export const getChannel = () => channel;