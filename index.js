const { App } = require("@slack/bolt");
require("dotenv").config();

// Variables
const messageCount = 3;


const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SOCKET_TOKEN
});


// Initializes your app with your bot token and signing secret
(async () => {
    await app.start();
    console.log(`⚡️ Slack Bolt app is running!`);
})();


app.command("/thumb-count", async ({ command, ack, say }) => {
    try {
        const authorizedReactions = [
            '+1', // '+1' is a thumb up reaction
            '+1::skin-tone-1', // Maybe not used by Slack, but just to be sure
            '+1::skin-tone-2',
            '+1::skin-tone-3',
            '+1::skin-tone-4',
            '+1::skin-tone-5',
            '+1::skin-tone-6',
        ];

        // Get history of the channel (only last 100 messages)
        const history = await app.client.conversations.history({token: `${process.env.SLACK_BOT_TOKEN}`, channel: command.channel_id});

        // Filter messages: 1- Only today; 2- Is sent by a real user; 3- Has reactions; 4- Has at least 1 ThumbUp reaction
        const todayMessages = history.messages.filter(msg => {
            const msgTs = new Date(msg.ts.split('.')[0] * 1000).setHours(0, 0, 0, 0);
            const todayTs = new Date().setHours(0, 0, 0, 0);

            if (!msg.bot_id) {
                console.log(msg.text, msgTs, todayTs, msgTs === todayTs ? 'true' : 'false');
            }

            return msgTs === todayTs
                && msg.client_msg_id
                && msg.reactions?.length > 0
                && msg.reactions.filter(reaction => authorizedReactions.includes(reaction.name))?.length > 0;
        });

        // Sort messages by their up votes count and take only 'messageCount' first
        const todayMessagesSorted = todayMessages.sort(function (a, b) {
            return b.reactions.filter(reaction => authorizedReactions.includes(reaction.name)).length -
                a.reactions.filter(reaction => authorizedReactions.includes(reaction.name)).length;
        }).slice(0, messageCount);

        // Map messages with only wanted fields and gather user info and permanent link
        const todayMessagesMapped = await Promise.all(todayMessagesSorted.map(async (msg) => {
            const user = await app.client.users.info({
                token: process.env.SLACK_BOT_TOKEN,
                user: msg.user
            });
            const url = await app.client.chat.getPermalink({
                token: process.env.SLACK_BOT_TOKEN,
                channel: command.channel_id,
                message_ts: msg.ts
            });

            return {
                msg_id: msg.client_msg_id,
                content: msg.text,
                thumbCount: msg.reactions.filter(reaction => authorizedReactions.includes(reaction.name)).length,
                ts: msg.ts,
                author: user.user,
                permanentLink: url.permalink
            }
        }));

        // Yeay, add an eggplant on a random message
        try {
            const messageToAddEggplant = todayMessagesMapped[Math.floor(Math.random()*todayMessagesMapped.length)];
            await app.client.reactions.add({
                token: process.env.SLACK_BOT_TOKEN,
                channel: command.channel_id,
                name: 'eggplant',
                timestamp: messageToAddEggplant.ts
            });
        } catch (e) {
            // If cannot add eggplant, well, is not a such big problem
        }

        await ack();

        // Post messages to the channel
        await app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: command.channel_id,
            text: '\n\n◤――――――――――――――――――――◥' +
                '\n\n➤ Hello ThumbCount :P' +
                '\n\n',
            unfurl_links: false
        });
        for (const msg of todayMessagesMapped) {
            await app.client.chat.postMessage({
                token: process.env.SLACK_BOT_TOKEN,
                channel: command.channel_id,
                text: '\n\n――――――――――――――――――――――' +
                    '\n● Author: ' + msg.author.real_name +
                    '\n' + msg.content + '' +
                    '\n\n:+1: x' + msg.thumbCount + '' +
                    '\n\n➜ Click to view message:' +
                    '\n' + (msg.permanentLink || '✘ Unknown url sorry')  +
                    '\n\n',
                unfurl_links: false
            });
        }
        await app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: command.channel_id,
            text: '\n\n――――――――――――――――――――――' +
                '\n\nEnd of messages for today^^' +
                '\n\n◣――――――――――――――――――――◢',
            unfurl_links: false
        });

    } catch (e) {
        console.log(e); // Wtf happened ??
    }
});
