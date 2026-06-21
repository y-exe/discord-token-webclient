require('dotenv').config();
const http = require('http');
const express = require('express');
const axios = require('axios');
const { Server } = require("socket.io");
const cors = require('cors');

const { Client: SelfClient } = require('discord.js-selfbot-v13');
let BotClient, GatewayIntentBits, Partials;
try {
    const Discord = require('discord.js');
    BotClient = Discord.Client;
    GatewayIntentBits = Discord.GatewayIntentBits;
    Partials = Discord.Partials;
} catch (e) { }

const app = express();
app.use(cors({ origin: "*" }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 1e8 });

const sessions = new Map();
const loginQueue = new Set();

app.get('/api/image-proxy', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send('URL is required');
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        res.setHeader('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (error) { res.status(500).send('Failed'); }
});

const snowflakeToTimestamp = (id) => Number(BigInt(id) >> 22n) + 1420070400000;

const getUserDisplayName = (user, member = null) => {
    if (member?.nickname) return member.nickname;
    if (member?.displayName && member.displayName !== user?.username) return member.displayName;
    return user?.globalName || user?.global_name || user?.displayName || user?.username || "Unknown User";
};

const getDirectDisplayName = (user) => user?.globalName || user?.global_name || user?.displayName || user?.username || "Unknown User";

const getUserAvatar = (user, options = { format: 'png' }) => {
    if (!user) return null;
    if (typeof user.displayAvatarURL === 'function') return user.displayAvatarURL(options);
    if (typeof user.avatarURL === 'function') return user.avatarURL(options);
    if (user.avatar && user.id) {
        const ext = String(user.avatar).startsWith('a_') && options.dynamic ? 'gif' : 'png';
        const size = options.size || 128;
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
    }
    return null;
};

const getStickerFormat = (sticker) => {
    const format = sticker?.format || sticker?.formatType || sticker?.format_type;
    if (format === 1 || format === 'PNG') return 'PNG';
    if (format === 2 || format === 'APNG') return 'APNG';
    if (format === 3 || format === 'LOTTIE') return 'LOTTIE';
    if (format === 4 || format === 'GIF') return 'GIF';
    return format || 'PNG';
};

const getStickerUrl = (sticker) => {
    if (!sticker?.id) return sticker?.url || null;
    const format = getStickerFormat(sticker);
    if (format === 'GIF') return `https://media.discordapp.net/stickers/${sticker.id}.gif`;
    if (format === 'LOTTIE') return `https://media.discordapp.net/stickers/${sticker.id}.json`;
    return sticker.url || `https://media.discordapp.net/stickers/${sticker.id}.png`;
};

const formatSticker = (sticker) => {
    if (!sticker) return null;
    const format = getStickerFormat(sticker);
    return {
        id: sticker.id,
        name: sticker.name || 'Sticker',
        description: sticker.description || '',
        format,
        url: getStickerUrl(sticker),
        guildId: sticker.guildId || sticker.guild_id || sticker.guild?.id || null,
        packId: sticker.packId || sticker.pack_id || null,
        tags: Array.isArray(sticker.tags) ? sticker.tags : String(sticker.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean)
    };
};

const getDMChannels = async (client) => {
    const dms = client.channels.cache.filter(c => c.type === 'DM' || c.type === 'GROUP_DM' || c.type === 1 || c.type === 3);
    return Array.from(dms.values()).map(c => {
        const recipient = c.type === 'DM' || c.type === 1 ? c.recipient : null;
        return {
            id: c.id,
            name: c.type === 'GROUP_DM' || c.type === 3 ? (c.name || "グループDM") : getDirectDisplayName(recipient),
            avatar: getUserAvatar(recipient, { format: 'png' }),
            type: c.type,
            lastMessageId: c.lastMessageId,
            lastMessageTimestamp: c.lastMessageId ? snowflakeToTimestamp(c.lastMessageId) : 0
        };
    }).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
};

const getRelationshipEntries = (client) => {
    const cache = client.relationships?.cache;
    if (cache && typeof cache.entries === 'function') {
        return Array.from(cache.entries()).map(([id, type]) => ({
            id,
            type,
            nickname: client.relationships?.friendNicknames?.get?.(id) || null
        }));
    }
    return [];
};

const getFriends = async (client) => {
    let relationships = [];
    try {
        const apiRelationships = await client.api.users['@me'].relationships.get();
        if (Array.isArray(apiRelationships)) {
            relationships = apiRelationships;
            client.relationships?._setup?.(apiRelationships);
        }
    } catch (e) { }

    if (!relationships.length) relationships = getRelationshipEntries(client);

    const friendEntries = relationships.filter((entry) => {
        const type = entry.type ?? entry.relationshipType;
        return [1, 3, 4].includes(type) || ['FRIEND', 'friend', 'PENDING_INCOMING', 'PENDING_OUTGOING'].includes(type);
    });

    const users = [];
    for (const entry of friendEntries) {
        const userId = entry.user?.id || entry.userId || entry.userID || entry.id;
        const type = entry.type ?? entry.relationshipType;
        let user = entry.user || (userId ? client.users.cache.get(userId) : null);
        if (!user && userId) {
            try {
                user = await client.users.fetch(userId);
            } catch (e) { }
        }
        if (userId && !users.some((candidate) => candidate.user.id === userId)) {
            users.push({
                user: user || { id: userId, username: entry.nickname || "Unknown User" },
                relationshipType: [3, 4].includes(type) || String(type).includes('PENDING') ? 'pending' : 'friend'
            });
        }
    }

    return users.map(({ user, relationshipType }) => {
        const presence = user.presence || client.presence?.cache?.get?.(user.id) || client.presences?.cache?.get?.(user.id);
        const activity = presence?.activities?.find?.((item) => item.state || item.name);
        return {
            id: user.id,
            username: user.username,
            displayName: getDirectDisplayName(user),
            globalName: user.globalName || user.global_name || user.displayName,
            avatar: getUserAvatar(user, { dynamic: true, format: 'png' }),
            status: presence?.status || user.presence?.status || 'offline',
            activity: activity?.state || activity?.name || '',
            activityType: activity?.type || '',
            relationshipType
        };
    }).sort((a, b) => {
        const aOffline = ['offline', 'invisible'].includes(a.status) ? 1 : 0;
        const bOffline = ['offline', 'invisible'].includes(b.status) ? 1 : 0;
        if (aOffline !== bOffline) return aOffline - bOffline;
        return a.displayName.localeCompare(b.displayName, 'ja');
    });
};

const getChannelsWithMembers = (guild) => {
    if (!guild) return [];
    const cache = guild.channels.cache;
    const allCategories = cache.filter(c => c.type === 'GUILD_CATEGORY' || c.type === 4).sort((a, b) => a.rawPosition - b.rawPosition);
    const allThreads = cache.filter(c => c.isThread?.() || [10, 11, 12].includes(c.type));

    const mainChannels = cache.filter(c => !c.isThread?.() && c.type !== 'GUILD_CATEGORY' && c.type !== 4 && c.viewable)
        .sort((a, b) => {
            const isVoiceA = (a.type === 'GUILD_VOICE' || a.type === 'GUILD_STAGE_VOICE' || a.type === 2 || a.type === 13);
            const isVoiceB = (b.type === 'GUILD_VOICE' || b.type === 'GUILD_STAGE_VOICE' || b.type === 2 || b.type === 13);
            if (isVoiceA !== isVoiceB) return isVoiceA ? 1 : -1;
            return a.rawPosition - b.rawPosition;
        });

    const mapChannel = (c) => ({
        id: c.id, name: c.name, type: c.type,
        members: (c.type === 'GUILD_VOICE' || c.type === 'GUILD_STAGE_VOICE' || c.type === 2 || c.type === 13) ? c.members.map(m => ({
            id: m.id, username: m.displayName, avatar: m.user.displayAvatarURL({ format: 'png' })
        })) : [],
        threads: allThreads.filter(t => t.parentId === c.id).map(t => ({
            id: t.id, name: t.name, type: t.type,
            lastMessageTimestamp: t.lastMessageId ? snowflakeToTimestamp(t.lastMessageId) : t.createdTimestamp,
            messageCount: t.messageCount || 0
        })).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)
    });

    const result = [];
    const uncategorized = { id: "uncategorized", name: null, channels: mainChannels.filter(c => !c.parentId).map(mapChannel) };
    if (uncategorized.channels.length > 0) result.push(uncategorized);
    allCategories.forEach(cat => {
        const catChannels = mainChannels.filter(c => c.parentId === cat.id).map(mapChannel);
        result.push({ id: cat.id, name: cat.name, channels: catChannels });
    });
    return result;
};

const formatMessage = (m, referencedMessage = null, rawMessage = null) => {
    if (!m || !m.author) return null;
    const referenced = referencedMessage ? formatMessage(referencedMessage) : null;
    const displayName = m.guild ? getUserDisplayName(m.author, m.member) : getDirectDisplayName(m.author);

    const formatComponent = (comp) => {
        if (!comp) return null;
        const base = { type: comp.type, custom_id: comp.custom_id || comp.customId, disabled: comp.disabled || false };
        switch (comp.type) {
            case 1:
                return { ...base, components: (comp.components || []).map(formatComponent).filter(Boolean) };
            case 2:
                return { ...base, style: comp.style, label: comp.label, emoji: comp.emoji, url: comp.url };
            case 3:
                return { ...base, placeholder: comp.placeholder, min_values: comp.min_values || comp.minValues, max_values: comp.max_values || comp.maxValues, options: (comp.options || []).map(o => ({ label: o.label, value: o.value, description: o.description, emoji: o.emoji, default: o.default })) };
            case 5:
            case 6:
            case 7:
            case 8:
                return { ...base, placeholder: comp.placeholder, min_values: comp.min_values || comp.minValues, max_values: comp.max_values || comp.maxValues };
            default:
                return null;
        }
    };

    const formatComponents = (components) => {
        if (!components || !components.length) return [];
        return components.map(formatComponent).filter(Boolean);
    };

    let components = [];
    // Try to get components from raw API data first, then from the message object
    const rawComponents = rawMessage?.components || m.components;
    if (rawComponents && rawComponents.length > 0) {
        components = formatComponents(rawComponents);
    }

    return {
        id: m.id, content: m.content, timestamp: m.createdTimestamp,
        author: {
            id: m.author.id, username: m.author.username,
            displayName,
            globalName: m.author.globalName || m.author.displayName,
            avatar: getUserAvatar(m.author, { format: 'png' }),
            color: m.member ? m.member.displayHexColor : null,
        },
        attachments: m.attachments.map(a => ({ url: a.url })),
        stickers: m.stickers ? m.stickers.map(formatSticker).filter(Boolean) : [],
        embeds: m.embeds,
        components,
        reactions: m.reactions.cache.filter(r => r.count > 0).map(r => ({
            emoji: { name: r.emoji.name, id: r.emoji.id, url: r.emoji.id ? `https://cdn.discordapp.com/emojis/${r.emoji.id}.png` : null },
            count: r.count, me: r.me
        })),
        channelId: m.channel.id,
        replyTo: m.reference?.messageId ? { id: m.reference.messageId, message: referenced } : null
    };
};

const formatMessageWithReference = async (m, rawMessage = null) => {
    if (!m) return null;
    let referencedMessage = null;
    if (m.reference?.messageId && typeof m.fetchReference === 'function') {
        try {
            referencedMessage = await m.fetchReference();
        } catch (e) { }
    }
    return formatMessage(m, referencedMessage, rawMessage);
};

const destroySession = (id) => {
    const client = sessions.get(id);
    if (client) {
        console.log(`[System] Clearing session: ${id}`);
        try { client.destroy(); } catch (e) { }
        sessions.delete(id);
    }
    loginQueue.delete(id);
};

io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('login', async ({ token, isBot }) => {
        if (sessions.has(socket.id) || loginQueue.has(socket.id)) return;

        loginQueue.add(socket.id);
        console.log(`[Auth] Login attempt: ${isBot ? 'Bot' : 'User'}`);

        let client;
        if (isBot && BotClient) {
            client = new BotClient({
                intents: [1, 2, 8, 512, 32768, 16384],
                partials: [Partials.Message, Partials.Channel, Partials.Reaction]
            });
        } else {
            client = new SelfClient({ checkUpdate: false });
        }

        const handleReady = () => {
            loginQueue.delete(socket.id);
            if (sessions.has(socket.id)) return;

            console.log(`[Auth] Ready: ${client.user.tag}`);
            sessions.set(socket.id, client);
            socket.emit('login-success', {
                user: {
                    id: client.user.id,
                    username: client.user.username,
                    displayName: getDirectDisplayName(client.user),
                    globalName: client.user.globalName || client.user.displayName,
                    avatar: getUserAvatar(client.user, { format: 'png' })
                }
            });

            client.on('messageCreate', async (m) => {
                if (m.channelId === socket.currentChannelId) {
                    let raw = null;
                    try {
                        const token = client.token;
                        const isBot = !!client.user?.bot;
                        const authHeader = isBot ? `Bot ${token}` : token;
                        const response = await fetch(`https://discord.com/api/v10/channels/${m.channelId}/messages?limit=100`, {
                            headers: { 'Authorization': authHeader }
                        });
                        if (response.ok) {
                            const msgs = await response.json();
                            if (Array.isArray(msgs)) {
                                raw = msgs.find(rm => rm.id === m.id) || null;
                                // If not found in batch, try again after a short delay
                                if (!raw) {
                                    await new Promise(r => setTimeout(r, 500));
                                    const retry = await fetch(`https://discord.com/api/v10/channels/${m.channelId}/messages?limit=100`, {
                                        headers: { 'Authorization': authHeader }
                                    });
                                    if (retry.ok) {
                                        const retryMsgs = await retry.json();
                                        if (Array.isArray(retryMsgs)) {
                                            raw = retryMsgs.find(rm => rm.id === m.id) || null;
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) { }
                    const formatted = await formatMessageWithReference(m, raw);
                    socket.emit('newMessage', formatted);
                }
            });
            client.on('messageUpdate', async (old, m) => {
                if (m.channelId === socket.currentChannelId) {
                    let raw = null;
                    try {
                        const token = client.token;
                        const isBot = !!client.user?.bot;
                        const authHeader = isBot ? `Bot ${token}` : token;
                        const response = await fetch(`https://discord.com/api/v10/channels/${m.channelId}/messages?limit=100`, {
                            headers: { 'Authorization': authHeader }
                        });
                        if (response.ok) {
                            const msgs = await response.json();
                            if (Array.isArray(msgs)) {
                                raw = msgs.find(rm => rm.id === m.id) || null;
                            }
                        }
                    } catch (e) { }
                    const formatted = await formatMessageWithReference(m, raw);
                    socket.emit('messageUpdate', formatted);
                }
            });
            client.on('messageDelete', (m) => { if (m.channelId === socket.currentChannelId) socket.emit('messageDelete', { id: m.id }); });

            const handleReactionChange = async (reaction) => {
                if (reaction.message.channelId === socket.currentChannelId) {
                    try { const updatedMsg = await reaction.message.fetch(true); socket.emit('messageUpdate', await formatMessageWithReference(updatedMsg)); } catch (e) { }
                }
            };
            client.on('messageReactionAdd', handleReactionChange);
            client.on('messageReactionRemove', handleReactionChange);

            if (client.on) {
                client.on('interactionCreate', async (interaction) => {
                    try {
                        if (interaction.type === 5) {
                            socket.emit('modalSubmit', {
                                customId: interaction.customId,
                                components: interaction.fields?.components || [],
                                values: {}
                            });
                        }
                        if (interaction.type === 9) {
                            socket.emit('modalResponse', {
                                title: interaction.data?.title,
                                custom_id: interaction.data?.custom_id,
                                components: interaction.data?.components || []
                            });
                        }
                    } catch (e) { }
                });
            }
        };

        client.on('ready', handleReady);
        client.on('clientReady', handleReady);

        try {
            await client.login(token);
        } catch (e) {
            loginQueue.delete(socket.id);
            socket.emit('login-error', e.message);
        }
    });

    socket.on('getGuilds', (cb) => {
        const client = sessions.get(socket.id);
        if (!client) return cb([]);
        cb(client.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL({ format: 'png' }),
            banner: g.bannerURL ? g.bannerURL({ dynamic: true, format: 'png', size: 1024 }) : null,
            acronym: g.name.replace(/\w+/g, n => n[0]).slice(0, 3).toUpperCase()
        })));
    });

    socket.on('getChannels', async (guildId, cb) => {
        const client = sessions.get(socket.id);
        if (!client) return cb([]);
        socket.currentGuildId = guildId;
        if (guildId === '@me') {
            const dms = await getDMChannels(client);
            return cb([{ id: "dms", name: "ダイレクトメッセージ", channels: dms }]);
        }
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return cb([]);
        cb(getChannelsWithMembers(guild));
    });

    socket.on('getFriends', async (cb) => {
        const client = sessions.get(socket.id);
        if (!client) return cb([]);
        try {
            cb(await getFriends(client));
        } catch (e) {
            console.error('GetFriends Error:', e);
            cb([]);
        }
    });

    socket.on('getGuildEmojis', (guildId, cb) => {
        const client = sessions.get(socket.id);
        if (!client || guildId === '@me') return cb([]);
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return cb([]);
        cb(guild.emojis.cache.map((emoji) => ({
            id: emoji.id,
            name: emoji.name,
            animated: emoji.animated,
            url: emoji.url || `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=48`
        })));
    });

    socket.on('getGuildStickers', async (guildId, cb) => {
        const client = sessions.get(socket.id);
        if (!client || guildId === '@me') return cb([]);
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return cb([]);
        try {
            if (guild.stickers?.fetch) await guild.stickers.fetch();
        } catch (e) { }
        cb(guild.stickers?.cache?.map(formatSticker).filter(Boolean) || []);
    });

    socket.on('getGuildRoles', async (guildId, cb) => {
        const client = sessions.get(socket.id);
        if (!client || guildId === '@me') return cb([]);
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return cb([]);
        try {
            if (guild.roles?.fetch) await guild.roles.fetch();
        } catch (e) { }
        cb(guild.roles?.cache?.map(r => ({
            id: r.id,
            name: r.name,
            color: r.hexColor,
            position: r.position
        })).filter(r => r.id !== guild.id) || []);
    });

    socket.on('getMessages', async (data, cb) => {
        const client = sessions.get(socket.id);
        if (!client) return cb([]);
        const channelId = typeof data === 'string' ? data : data.channelId;
        const before = typeof data === 'object' ? data.before : null;
        socket.currentChannelId = channelId;
        try {
            const ch = await client.channels.fetch(channelId);
            const fetchOptions = { limit: 50 };
            if (before) fetchOptions.before = before;
            const msgs = await ch.messages.fetch(fetchOptions);

            let rawMessages = {};
            try {
                const token = client.token;
                let apiUrl = `https://discord.com/api/v10/channels/${channelId}/messages?limit=50`;
                if (before) apiUrl += `&before=${before}`;
                const isBot = !!client.user?.bot;
                const authHeader = isBot ? `Bot ${token}` : token;
                const response = await fetch(apiUrl, {
                    headers: { 'Authorization': authHeader }
                });
                if (response.ok) {
                    const rawMsgs = await response.json();
                    if (Array.isArray(rawMsgs)) {
                        rawMsgs.forEach(rm => { rawMessages[rm.id] = rm; });
                    }
                }
            } catch (e) {
                console.error('Raw messages fetch error:', e.message);
            }

            const formatted = await Promise.all(Array.from(msgs.values()).reverse().map(m => {
                const raw = rawMessages[m.id] || null;
                return formatMessageWithReference(m, raw);
            }));
            cb(formatted.filter(m => m));
        } catch (e) { cb([]); }
    });

    socket.on('sendMessage', async (d, cb = () => { }) => {
        const client = sessions.get(socket.id);
        if (!client) return cb({ ok: false, error: 'Not logged in' });
        try {
            const ch = await client.channels.fetch(d.channelId);
            if (!ch) return cb({ ok: false, error: 'Channel not found' });

            const files = Array.isArray(d.files) ? d.files.map((file) => {
                const data = String(file.data || '');
                const base64 = data.includes(',') ? data.split(',').pop() : data;
                const attachment = Buffer.from(base64, 'base64');
                return {
                    attachment,
                    name: file.name || 'attachment',
                    description: file.name || 'attachment'
                };
            }).filter(file => file.attachment.length > 0) : [];

            const replyOptions = d.reply?.messageId ? {
                reply: {
                    messageReference: d.reply.messageId,
                    failIfNotExists: false
                },
                allowedMentions: {
                    repliedUser: d.reply.mention !== false
                }
            } : {};
            const content = String(d.content || '').trim();
            const stickers = Array.isArray(d.stickers) ? d.stickers.filter(Boolean) : [];
            const payload = { ...replyOptions };
            if (files.length > 0) payload.files = files;
            if (stickers.length > 0) payload.stickers = stickers;
            if (content) payload.content = content;
            if (!payload.content && !payload.files && !payload.stickers) return cb({ ok: false, error: 'Message is empty' });

            await ch.send(payload);
            return cb({ ok: true, files: files.length, stickers: stickers.length });
        } catch (e) {
            console.error('SendMessage Error:', e);
            cb({ ok: false, error: e.message || String(e) });
        }
    });

    socket.on('getUserInfo', async (userId, cb) => {
        const client = sessions.get(socket.id);
        if (!client) return cb({ error: 'Not logged in' });

        try {
            const user = await client.users.fetch(userId, { force: true });

            let profileData = {};
            let rawApiProfile = null;
            if (typeof user.fetchProfile === 'function') {
                try {
                    rawApiProfile = await client.api.users(userId).profile.get({ query: { with_mutual_guilds: true } });
                    const profile = await user.fetchProfile();
                    profileData = {
                        bio: profile.bio,
                        pronouns: profile.pronouns,
                        connectedAccounts: profile.connectedAccounts,
                        premiumSince: profile.premiumSinceTimestamp,
                        premiumType: profile.premiumType,
                        mutualGuilds: profile.mutualGuilds?.map(g => ({ id: g.id, nick: g.nick })),
                        themeColors: profile.themeColors
                    };
                } catch (e) { }
            }


            let serverProfiles = [];
            for (const guild of client.guilds.cache.values()) {
                try {
                    const member = await guild.members.fetch({ user: userId, force: true });
                    if (member) {
                        serverProfiles.push({
                            guildId: guild.id,
                            guildName: guild.name,
                            nickname: member.nickname,
                            displayName: member.displayName,
                            roles: member.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
                            joinedAt: member.joinedTimestamp,
                            premiumSince: member.premiumSinceTimestamp,
                            guildAvatarURL: member.avatarURL ? member.avatarURL({ dynamic: true, size: 1024 }) : null,
                            communicationDisabledUntil: member.communicationDisabledUntilTimestamp,
                            permissions: member.permissions.toArray()
                        });
                    }
                } catch (e) {
                }
            }

            const data = {
                id: user.id,
                username: user.username,
                globalName: user.globalName,
                discriminator: user.discriminator,
                tag: user.tag,
                avatarURL: user.displayAvatarURL({ dynamic: true, format: 'png', size: 1024 }),
                bannerURL: user.bannerURL ? user.bannerURL({ dynamic: true, format: 'png', size: 1024 }) : null,
                accentColor: user.hexAccentColor,
                bot: user.bot,
                system: user.system,
                flags: user.flags ? user.flags.toArray() : [],
                createdAt: user.createdTimestamp,
                ...profileData,
                rawApiProfile,
                serverProfiles
            };
            cb(data);
        } catch (e) {
            cb({ error: e.message });
        }
    });

    socket.on('addReaction', async (data, cb = () => {}) => {
        const client = sessions.get(socket.id);
        if (!client) return cb({ ok: false, error: 'Not logged in' });
        try {
            const token = client.token;
            const isBot = !!client.user?.bot;
            const authHeader = isBot ? `Bot ${token}` : token;
            const emojiParam = encodeURIComponent(data.emoji);
            const response = await fetch(
                `https://discord.com/api/v10/channels/${data.channelId}/messages/${data.messageId}/reactions/${emojiParam}/@me`,
                { method: 'PUT', headers: { 'Authorization': authHeader } }
            );
            cb({ ok: response.ok || response.status === 204 });
        } catch (e) {
            console.error('AddReaction Error:', e);
            cb({ ok: false, error: e.message });
        }
    });

    socket.on('removeReaction', async (data, cb = () => {}) => {
        const client = sessions.get(socket.id);
        if (!client) return cb({ ok: false, error: 'Not logged in' });
        try {
            const token = client.token;
            const isBot = !!client.user?.bot;
            const authHeader = isBot ? `Bot ${token}` : token;
            const emojiParam = encodeURIComponent(data.emoji);
            const response = await fetch(
                `https://discord.com/api/v10/channels/${data.channelId}/messages/${data.messageId}/reactions/${emojiParam}/@me`,
                { method: 'DELETE', headers: { 'Authorization': authHeader } }
            );
            cb({ ok: response.ok || response.status === 204 });
        } catch (e) {
            console.error('RemoveReaction Error:', e);
            cb({ ok: false, error: e.message });
        }
    });

    socket.on('disconnect', () => {
        destroySession(socket.id);
    });

    socket.on('getSlashCommands', async (guildId, cb) => {
        const client = sessions.get(socket.id);
        if (!client) return cb([]);
        try {
            const token = client.token;
            const isBot = !!client.user?.bot;
            const authHeader = isBot ? `Bot ${token}` : token;

            let commands = [];
            try {
                let apiUrl;
                if (guildId && guildId !== '@me') {
                    apiUrl = `https://discord.com/api/v10/guilds/${guildId}/application-command-index`;
                } else {
                    apiUrl = `https://discord.com/api/v10/users/@me/applications`;
                }
                const response = await fetch(apiUrl, { headers: { 'Authorization': authHeader } });
                if (response.ok) {
                    const data = await response.json();
                    if (data.applications) {
                        for (const app of data.applications) {
                            if (app.id) {
                                try {
                                    const cmdsResponse = await fetch(`https://discord.com/api/v10/applications/${app.id}/guilds/${guildId}/commands`, { headers: { 'Authorization': authHeader } });
                                    if (cmdsResponse.ok) {
                                        const cmds = await cmdsResponse.json();
                                        if (Array.isArray(cmds)) {
                                            commands.push(...cmds.map(cmd => ({
                                                id: cmd.id,
                                                name: cmd.name,
                                                description: cmd.description || '',
                                                type: cmd.type,
                                                application_name: app.name || app.bot?.username || '',
                                                options: (cmd.options || []).map(opt => ({
                                                    name: opt.name,
                                                    description: opt.description || '',
                                                    type: opt.type,
                                                    required: opt.required || false,
                                                    choices: opt.choices || []
                                                }))
                                            })));
                                        }
                                    }
                                } catch (e) { }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('GetSlashCommands REST error:', e.message);
            }

            if (commands.length === 0) {
                try {
                    let jsCommands;
                    if (guildId && guildId !== '@me') {
                        jsCommands = await client.application?.commands?.fetch({ guildId });
                    } else {
                        jsCommands = await client.application?.commands?.fetch();
                    }
                    if (jsCommands) {
                        const list = (jsCommands instanceof Map ? Array.from(jsCommands.values()) : Array.isArray(jsCommands) ? jsCommands : []);
                        commands = list.map(cmd => ({
                            id: cmd.id,
                            name: cmd.name,
                            description: cmd.description || '',
                            type: cmd.type,
                            options: (cmd.options || []).map(opt => ({
                                name: opt.name,
                                description: opt.description || '',
                                type: opt.type,
                                required: opt.required || false,
                                choices: opt.choices || []
                            }))
                        }));
                    }
                } catch (e) { }
            }

            cb(commands);
        } catch (e) {
            console.error('GetSlashCommands Error:', e.message);
            cb([]);
        }
    });

    socket.on('sendSlashCommand', async (data, cb = () => {}) => {
        const client = sessions.get(socket.id);
        if (!client) return cb({ ok: false, error: 'Not logged in' });
        try {
            const ch = await client.channels.fetch(data.channelId);
            if (!ch) return cb({ ok: false, error: 'Channel not found' });

            const options = (data.options || []).map(opt => {
                if (opt.type === 1 || opt.type === 'SUB_COMMAND') {
                    return { name: opt.name, type: 1, options: (opt.options || []).map(o => ({ name: o.name, value: o.value, type: o.type || 3 })) };
                }
                return { name: opt.name, value: opt.value, type: opt.type || 3 };
            });

            if (client.user.bot) {
                const interaction = await ch.client.application.commands.fetch(data.commandId, { guildId: data.guildId });
                await ch.send({ content: `</${data.commandName}:${data.commandId}>` });
                return cb({ ok: true });
            } else {
                await ch.send(`</${data.commandName}:${data.commandId}>`);
                return cb({ ok: true });
            }
        } catch (e) {
            console.error('SendSlashCommand Error:', e);
            cb({ ok: false, error: e.message });
        }
    });

    socket.on('interaction', async (data, cb = () => {}) => {
        const client = sessions.get(socket.id);
        if (!client) return cb({ ok: false, error: 'Not logged in' });
        try {
            const token = client.token;
            const isBot = !!client.user?.bot;
            const authHeader = isBot ? `Bot ${token}` : token;

            if (data.type === 'modal') {
                const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                const body = {
                    type: 6,
                    application_id: data.applicationId || '0',
                    channel_id: data.channelId,
                    guild_id: data.guildId,
                    session_id: sessionId,
                    data: {
                        custom_id: data.customId,
                        components: Object.entries(data.values || {}).map(([id, value]) => ({
                            type: 1,
                            components: [{ type: 4, custom_id: id, value }]
                        }))
                    }
                };

                const response = await fetch(`https://discord.com/api/v10/interactions`, {
                    method: 'POST',
                    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                return cb({ ok: response.ok || response.status === 204 });
            }

            let applicationId = null;
            try {
                const msgResponse = await fetch(`https://discord.com/api/v10/channels/${data.channelId}/messages?limit=50`, {
                    headers: { 'Authorization': authHeader }
                });
                if (msgResponse.ok) {
                    const msgs = await msgResponse.json();
                    if (Array.isArray(msgs)) {
                        const msg = msgs.find(m => m.id === data.messageId);
                        if (msg) {
                            applicationId = msg.application_id || msg.author?.id;
                        }
                    }
                }
            } catch (e) { }

            if (!applicationId) {
                return cb({ ok: false, error: 'Could not find application ID' });
            }

            const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const body = {
                type: 3,
                application_id: applicationId,
                channel_id: data.channelId,
                message_id: data.messageId,
                guild_id: data.guildId,
                session_id: sessionId,
                data: {
                    custom_id: data.customId,
                    component_type: data.type === 'button' ? 2 : 3,
                    values: data.values || []
                }
            };

            const interactionResponse = await fetch(`https://discord.com/api/v10/interactions`, {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (interactionResponse.ok) {
                try {
                    const responseData = await interactionResponse.json();
                    if (responseData.type === 9 && responseData.data) {
                        return cb({ ok: true, modal: responseData.data });
                    }
                } catch (e) {
                }
                return cb({ ok: true });
            }

            if (interactionResponse.status === 204) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return cb({ ok: true, deferred: true });
            }

            const errorData = await interactionResponse.json().catch(() => ({}));
            console.error('Interaction Error Response:', errorData);
            return cb({ ok: false, error: errorData.message || 'Interaction failed' });
        } catch (e) {
            console.error('Interaction Error:', e);
            cb({ ok: false, error: e.message });
        }
    });
});

server.listen(8000, () => console.log('Backend Online: 8000'));
