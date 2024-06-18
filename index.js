const { Client, GatewayIntentBits, Partials, REST, Routes, EmbedBuilder } = require('discord.js');
const tintify = require('console-tintify');
require('dotenv').config();
const config = require('./config');
const CFXTOIP = require('cfx-to-ip');
const axios = require('axios');

const client = new Client({
    intents: Object.keys(GatewayIntentBits).map(key => GatewayIntentBits[key]),
    partials: Object.keys(Partials).map(key => Partials[key])
});

const commands = [
    {
        name: 'cfx-to-ip',
        description: 'Get the connections address of the specific cfx code',
        options: [
            {
                name: 'code',
                description: 'The code',
                type: 3,
                required: true
            }
        ]
    }
];
const rest = new REST({
    version: '10'
})
.setToken(process.env.TOKEN)

client.on('ready', async () => {
    console.log(tintify.blue.bold.italic(`
        ╭━━━┳━━━┳━╮╭━╮╭━━━━┳━━━╮╭━━┳━━━╮
        ┃╭━╮┃╭━━┻╮╰╯╭╯┃╭╮╭╮┃╭━╮┃╰┫┣┫╭━╮┃
        ┃┃╱╰┫╰━━╮╰╮╭╯╱╰╯┃┃╰┫┃╱┃┃╱┃┃┃╰━╯┃
        ┃┃╱╭┫╭━━╯╭╯╰╮╱╱╱┃┃╱┃┃╱┃┃╱┃┃┃╭━━╯
        ┃╰━╯┃┃╱╱╭╯╭╮╰╮╱╱┃┃╱┃╰━╯┃╭┫┣┫┃
        ╰━━━┻╯╱╱╰━╯╰━╯╱╱╰╯╱╰━━━╯╰━━┻╯`));
    console.log(tintify.green.bold.italic(`Logged in as ${client.user.tag}`));
    await rest.put(Routes.applicationGuildCommands(client.user.id, config.GuildId), {
        body: commands
    });
    console.log(tintify.yellow.bold.italic(`Application (/) Commands Loaded`));
});

async function getip(code) {
    const cfx = new CFXTOIP();

    return cfx.resolve(code)
    .then(({ ip, port }) => {
        return Promise.all([
            axios.get(`http://${ip}:${port}/players.json`),
            axios.get(`http://ip-api.com/json/${ip}`),
            axios.get(`http://${ip}:${port}/info.json`),
        ])
        .then(([playerRes, IpRes, infoRes]) => {
            const players = playerRes.data.length;
            const maxplayers = infoRes.data.vars.sv_maxClients
            const { country, city, isp, org, zip, timezone, countryCode, region, regionName, as } = IpRes.data;
            return {
                ip,
                country,
                city,
                isp,
                org,
                zip,
                timezone,
                players,
                countryCode,
                region,
                regionName,
                as,
                maxplayers
            };
        });
    })
    .catch((err) => {
        throw new Error(err.message);
    })
}

client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand() && interaction.commandName === 'cfx-to-ip') {
        const code = interaction.options.getString('code');
        await interaction.deferReply({
        })

        if (config.BlockedRoles.some(r => interaction.member.roles.cache.has(r))) {
            return interaction.editReply({
                content: 'You are blocked from using this command',
                embeds: []
            });
        };
        if (config.BlockedServers.some(c => c === code)) {
            return interaction.editReply({
                content: 'This server is blocked',
                embeds: []
            });
        };

        await getip(code)
        .then((data) => {
            const embed = new EmbedBuilder()
            .setColor(config.Embed.Color)
            .setTitle(`Cfx to ip (https://cfx.re/join/${code})`)
            .setDescription(`**__IP:__ \`${data.ip}\`\n__Country:__ \`${data.country}\`\n__City:__ \`${data.city}\`\n__ISP:__ \`${data.isp}\`\n__Org:__ \`${data.org}\`\n__Zip Code:__ \`${data.zip}\`\n__Timezone:__ \`${data.timezone}\`\n__Country Code:__ \`${data.countryCode}\`\n__Region:__ \`${data.region}\`\n__RegionName:__ \`${data.regionName}\`\n__As:__ \`${data.as}\`\n__FiveM Players:__ \`${data.players}/${data.maxplayers}\`**`)
            .setFooter({
                text: `${config.Embed.Footer}`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

            return interaction.editReply({
                embeds: [embed]
            });
        })
        .catch((err) => {
            console.log(err)
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                .setColor(config.Embed.Color)
                .setTitle('Error')
                .setDescription(`There was an error while getting the server data.`)
                .setFooter({
                    text: `${config.Embed.Footer}`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp()]
            });
        })
    }
});

client.login(process.env.TOKEN);