import { EmbedBuilder } from "discord.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rwClient } from "./twitter.js";

const stateFilePath = path.join(path.dirname(fileURLToPath(import.meta.url)), './state.json');

export let latestCaves = { cracked: { id: 0 } };
let alreadyRevealed = [];
export let channels = {};

export function setChannels(c) {
    channels = c;
}

let token;

function saveState() {
    const state = {
        latestCaves,
        alreadyRevealed
    };
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
}

function loadState() {
    if (fs.existsSync(stateFilePath)) {
        const state = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
        latestCaves = state.latestCaves || latestCaves;
        alreadyRevealed = state.alreadyRevealed || alreadyRevealed;
    }
}

export function createEmbedCave(caveData) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Cave #${caveData.id} Details`)
        .addFields(
            { name: 'Size', value: `${caveData.size}`, inline: true },
            { name: 'Sheep Population', value: `${caveData.sheepPopulation}`, inline: true },
            { name: 'Wolf Population', value: `${caveData.wolfPopulation}`, inline: true },
            { name: 'Starts At', value: `${new Date(caveData.startsAt).toLocaleString()}`, inline: true },
            { name: 'Ends At', value: `${new Date(caveData.endsAt).toLocaleString()}`, inline: true },
            { name: 'Cave Closed', value: caveData.caveClosed ? 'Yes' : 'No', inline: true },
            { name: 'Map File Visible', value: caveData.mapFileVisible ? 'Yes' : 'No', inline: true },
            { name: 'Items', value: `${caveData.items}`, inline: true },
            { name: 'Found Wool', value: `${caveData.foundWool}`, inline: true },
            { name: 'Cave Points', value: `${caveData.cavePoints}`, inline: true },
            { name: 'Rope Available', value: caveData.ropeAvailable ? 'Yes' : 'No', inline: true },
            { name: 'Created At', value: `${new Date(caveData.createdAt).toLocaleString()}`, inline: false },
            { name: 'Updated At', value: `${new Date(caveData.updatedAt).toLocaleString()}`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Cave data updated' });

    // Combining all found items into a single field to avoid exceeding embed field limits
    const foundItemsDescriptions = Object.entries(caveData.found).map(([key, value]) => `${key.replace('_', ' ').replace('TRASH', 'Trash ')}: ${value}`).join('\n');
    if (foundItemsDescriptions) {
        embed.addFields({ name: 'Found Items', value: foundItemsDescriptions, inline: false });
    }

    return embed;
}

export function getLatestCaveEmbed() {
    return [
        createEmbedCave(latestCaves.cracked)
    ];
}

function readToken() {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const tokenPath = path.join(__dirname, '../wgWeb3Token/token.txt');
        return fs.readFileSync(tokenPath, 'utf8').trim();
    } catch (err) {
        console.error('Error reading token from file:', err);
        return null;
    }
}

export async function getLatestCave() {
    try {
        const request = await fetch("https://cave-api.wolf.game/game/caves", {
            "headers": {
                "accept": "application/json",
                "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
                "if-none-match": "W/\"2-l9Fw4VUO7kr8CvBlt4zaMCqXZ0w\"",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Google Chrome\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "web3-token": token
            },
            "referrer": "https://cave.wolf.game/",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "omit"
        });
        const response = await request.json();

        if (response.error === 'Unauthorized') {
            console.log('Unauthorized, refreshing token..');
            channels.debug.send('Alert Bot Unauthorized');
            token = readToken();
            if (!token) {
                console.error('Token is not available.');
                return;
            }
            await getLatestCave();
            return;
        }
        if (response.error) {
            console.log(response.error);
            return;
        }

        const cracked = response[0];

        if (cracked && cracked.id && cracked.id > latestCaves.cracked?.id) {
            console.log('New CRACKED cave: ', JSON.stringify(cracked));
            try {
                channels.opening.send(`@everyone : CRACKED Cave #${cracked.id} just opened!`);
            } catch (error) {
                console.error('Error while trynna send the discord message: ', error);
                channels.debug.send(JSON.stringify(error));
            }

            // Envoi du tweet
            try {
                await rwClient.v2.tweet(`CRACKED Cave #${cracked.id} just opened.\n\nEnjoy the exploration!`);
            } catch (error) {
                console.error('Error while trynna send the tweet: ', error);
                channels.debug.send(JSON.stringify(error));
            }
        }

        if (latestCaves.cracked.id <= cracked.id) {
            latestCaves = { cracked };
            saveState();
        }
    } catch (error) {
        console.error('Error while trynna refresh latest cave: ', error);
        channels.debug.send(JSON.stringify(error));
    }
}

async function getCaveDetails(caveId) {
    const req = await fetch(`https://cave-api.wolf.game/leaderboard/${caveId}`, {
        "headers": {
            "accept": "application/json",
            "accept-language": "en,fr;q=0.9",
            "if-none-match": "W/\"85e-A3ou3WIHCretB/V6MCsfYG/4A+w\"",
            "priority": "u=1, i",
            "sec-ch-ua": "\"Google Chrome\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "web3-token": token
        },
        "referrer": "https://cave.wolf.game/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "omit"
    });
    return await req.json();
}

export async function getLootedPercents() {
    const request = await fetch("https://cave-api.wolf.game/leaderboard/caves", {
        "headers": {
            "accept": "application/json",
            "accept-language": "en,fr;q=0.9",
            "if-none-match": "W/\"5913-8LZ66Q4S8KbBEfub5UzQfNkux2k\"",
            "priority": "u=1, i",
            "sec-ch-ua": "\"Google Chrome\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "web3-token": token
        },
        "referrer": "https://cave.wolf.game/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "omit"
    });
    const response = await request.json();

    if (response.error === 'Unauthorized') {
        console.log('Unauthorized, refreshing token..');
        channels.debug.send('Alert Bot Unauthorized');
        token = readToken();
        if (!token) {
            console.error('Token is not available.');
            return;
        }
        await getLootedPercents();
        return;
    }
    if (response.error) {
        console.log(response.error);
        return;
    }

    const openedCaves = response.filter(cave => cave.isOpen);
    const openedCavesIds = openedCaves.map(cave => cave.id);
    const openedCavesDetails = await Promise.all(
        openedCavesIds.map(caveId => {
            if (!alreadyRevealed.includes(caveId)) {
                return getCaveDetails(caveId);
            }
            return null;
        })
    );

    for (const cave of openedCavesDetails.filter(caveDetails => !!caveDetails)) {
        const lootedPercent = (cave.found * 100) / cave.items;

        if (lootedPercent >= 65) {
            // Already revealed
            alreadyRevealed.push(cave.cave.id);
            saveState();
            console.log(`Cave #${cave.cave.id} have been revealed`, JSON.stringify(cave));
            try {
                channels.reveal.send(`@everyone : Cave #${cave.cave.id} map has been revealed! (${lootedPercent.toFixed(2)}%)`);
            } catch (error) {
                console.error('Error while trynna send the discord message: ', error);
                channels.debug.send(JSON.stringify(error));
            }

            // Envoi du tweet
            try {
                await rwClient.v2.tweet(`Cave #${cave.cave.id} map has been revealed (${lootedPercent.toFixed(2)}%).\n\nEnjoy the loot!`);
            } catch (error) {
                console.error('Error while trynna send the tweet: ', error);
                channels.debug.send(JSON.stringify(error));
            }
            continue;
        }
        if (lootedPercent >= 64) {
            alreadyRevealed.push(cave.cave.id);
            saveState();
            console.log(`Cave #${cave.cave.id} about to be revealed`, JSON.stringify(cave));
            try {
                channels.reveal.send(`@everyone : Cave #${cave.cave.id} map about to be revealed! (${lootedPercent.toFixed(2)}%)`);
            } catch (error) {
                console.error('Error while trynna send the discord message: ', error);
                channels.debug.send(JSON.stringify(error));
            }

            // Envoi du tweet
            try {
                await rwClient.v2.tweet(`Cave #${cave.cave.id} map about to be revealed (${lootedPercent.toFixed(2)}%).\n\nEnjoy the loot!`);
            } catch (error) {
                console.error('Error while trynna send the tweet: ', error);
                channels.debug.send(JSON.stringify(error));
            }
        }
    }
}

export async function routine() {
    loadState();

    async function getLatestCaveWrapper() {
        await getLatestCave();
        setTimeout(getLatestCaveWrapper, 3 * 1000);
    }

    async function getLootedPercentsWrapper() {
        await getLootedPercents();
        setTimeout(getLootedPercentsWrapper, 30 * 1000);
    }

    getLatestCaveWrapper();
    getLootedPercentsWrapper();
}