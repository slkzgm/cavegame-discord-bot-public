import { SlashCommandBuilder } from 'discord.js';
import { getLatestCaveEmbed } from '../../utils.js';

const command = {
    data: new SlashCommandBuilder()
        .setName('latest')
        .setDescription('Send the latest cave details'),
    async execute(interaction) {
        await interaction.reply({ embeds: getLatestCaveEmbed() });
    }
};

export default command;