import * as DiscordClient from "./client.js";
import { routine } from "./utils.js";

let channels;

async function connect() {
    if (!DiscordClient.isReady()) {
        console.log('Initiating client...');
        await DiscordClient.readyPromise();
        if (DiscordClient.isReady()) {
            console.log('Discord client is ready.');
            channels = DiscordClient.getChannel();
        } else {
            console.log('Error initiating client client.');
        }
    }
    routine();
}

connect();