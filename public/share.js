const socket = io();

const clientContainer = document.getElementById('full-client-container');
const clientPage = document.getElementById('client-page');
const loadingPage = document.getElementById('loading-page');
const guildList = document.getElementById('guild-list');
const guildNameText = document.getElementById('guild-name-text');
const channelListContainer = document.getElementById('channel-list-container');
const channelList = document.getElementById('channel-list');
const mainContent = document.getElementById('main-content');
const messageList = document.getElementById('message-list');
const channelNameText = document.getElementById('channel-name-text');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const backToGuildsButton = document.getElementById('back-to-guilds');
const backToChannelsButton = document.getElementById('back-to-channels');
const welcomeScreen = document.getElementById('welcome-screen');
const welcomeUserMessage = document.getElementById('welcome-user-message');
const guildContextMenu = document.getElementById('guild-context-menu');
const messageContextMenu = document.getElementById('message-context-menu');
const replyIndicator = document.getElementById('reply-indicator');
const replyToUser = document.getElementById('reply-to-user');
const cancelReplyButton = document.getElementById('cancel-reply-button');
const mentionToggleButton = document.getElementById('mention-toggle-button');

let shareId, initialGuildId, initialChannelId;
let currentGuildId = null; let currentChannelId = null; let permissions = {}; let lastMessageAuthorId = null; let longPressTimer; let replyingToMessage = null; let isMentionEnabled = false;

function applyTheme(theme) { document.body.dataset.theme = theme; localStorage.setItem('discord-theme', theme); document.querySelectorAll('.theme-btn.active').forEach(b => b.classList.remove('active')); document.querySelector(`.theme-btn[data-theme="${theme}"]`)?.classList.add('active'); }

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('discord-theme') || 'dark';
    applyTheme(savedTheme);
    const pathParts = window.location.pathname.split('/');
    shareId = pathParts[2]; initialGuildId = pathParts[3]; initialChannelId = pathParts[4];
    if (socket.connected) initializeShareSession();
    welcomeScreen.querySelector('.theme-buttons').addEventListener('click', (e) => { if (e.target.classList.contains('theme-btn')) applyTheme(e.target.dataset.theme); });
});

socket.on('connect', () => { console.log("サーバーに接続しました。"); initializeShareSession(); });

function initializeShareSession() {
    if (!shareId) { document.body.innerHTML = "<h1>無効なリンクです</h1>"; return; }
    socket.emit('joinShare', shareId, (response) => {
        if (response.success) {
            permissions = response.permissions;
            loadingPage.style.display = 'none';
            clientPage.style.display = 'block';
            renderGuilds(response.guilds, initialGuildId, initialChannelId);
            if (!permissions.canSendMessage) { messageInput.placeholder = "メッセージの送信は許可されていません"; }
        } else { loadingPage.innerHTML = `<h1>接続失敗</h1><p>${response.message || '不明なエラー'}</p>`; }
    });
    backToChannelsButton.addEventListener('click', () => clientContainer.classList.remove('show-messages'));
    cancelReplyButton.addEventListener('click', cancelReply);
    mentionToggleButton.addEventListener('click', () => { isMentionEnabled = !isMentionEnabled; mentionToggleButton.classList.toggle('active', isMentionEnabled); });
}

function renderGuilds(guilds, initialGuildId, initialChannelId) {
    guildList.innerHTML = '';
    guildList.appendChild(createGuildIcon({ id: '@me', name: 'ダイレクトメッセージ', icon: null }));
    guilds.forEach(guild => guildList.appendChild(createGuildIcon(guild)));
    const targetGuildId = initialGuildId || '@me';
    const guildData = guilds.find(g => g.id === targetGuildId) || { id: targetGuildId, name: 'ダイレクトメッセージ' };
    selectGuild(targetGuildId, guildData.name, initialChannelId);
}

function selectGuild(guildId, name, initialChannelId = null) {
    if (currentGuildId === guildId) return;
    currentGuildId = guildId; currentChannelId = null;
    document.querySelectorAll('.guild-icon.active').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-guild-id='${guildId}']`).classList.add('active');
    guildNameText.textContent = name;
    channelNameText.textContent = 'チャンネルを選択';
    messageList.innerHTML = ''; messageInput.disabled = true; channelList.innerHTML = '';
    clientContainer.classList.remove('show-messages');
    messageList.style.display = 'none';
    welcomeScreen.style.display = 'flex';
    welcomeUserMessage.textContent = 'ようこそ！';
    updateURL();
    if (guildId === '@me') { loadDms(initialChannelId); } else { loadChannels(guildId, initialChannelId); }
}

function loadChannels(guildId, initialChannelId = null) {
    channelList.innerHTML = '<li>読み込み中...</li>';
    socket.emit('getChannels', guildId, (categories) => {
        channelList.innerHTML = '';
        categories.forEach(cat => {
            if (cat.name) { const categoryEl = document.createElement('div'); categoryEl.className = 'channel-category'; categoryEl.textContent = cat.name; channelList.appendChild(categoryEl); }
            cat.channels.forEach(ch => { const el = document.createElement('li'); el.className = 'channel-item'; el.innerHTML = `<span class="channel-prefix">#</span> ${ch.name}`; el.dataset.channelId = ch.id; el.addEventListener('click', () => selectChannel(ch.id, ch.name)); channelList.appendChild(el); });
        });
        if (initialChannelId) { const channel = categories.flatMap(c => c.channels).find(ch => ch.id === initialChannelId); if (channel) selectChannel(channel.id, channel.name); }
    });
}

function loadDms(initialChannelId = null) {
    channelList.innerHTML = '<li>読み込み中...</li>';
    socket.emit('getSharedDms', (dms) => {
        channelList.innerHTML = '';
        const categoryEl = document.createElement('div'); categoryEl.className = 'channel-category'; categoryEl.textContent = 'ダイレクトメッセージ'; channelList.appendChild(categoryEl);
        dms.forEach(dm => { const el = document.createElement('li'); el.className = 'channel-item dm-item'; el.dataset.channelId = dm.id; el.innerHTML = `<img src="/api/image-proxy?url=${encodeURIComponent(dm.avatar)}" class="dm-avatar" alt=""> ${dm.name}`; el.addEventListener('click', () => selectChannel(dm.id, dm.name)); channelList.appendChild(el); });
        if (initialChannelId) { const dm = dms.find(d => d.id === initialChannelId); if (dm) selectChannel(dm.id, dm.name); }
    });
}

function selectChannel(channelId, name) {
    if (currentChannelId === channelId) { clientContainer.classList.add('show-messages'); return; }
    currentChannelId = channelId;
    document.querySelectorAll('.channel-item.active').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-channel-id='${channelId}']`).classList.add('active');
    welcomeScreen.style.display = 'none';
    messageList.style.display = 'block';
    const prefix = currentGuildId === '@me' ? '@' : '# ';
    channelNameText.textContent = `${prefix}${name}`;
    messageList.innerHTML = '<div class="welcome-message">メッセージを読み込み中...</div>';
    if (permissions.canSendMessage) { messageInput.disabled = false; messageInput.placeholder = `${prefix}${name} へのメッセージ`; }
    clientContainer.classList.add('show-messages');
    updateURL();
    loadMessages(channelId);
}

function loadMessages(channelId) { socket.emit('getMessages', channelId, (messages) => { messageList.innerHTML = ''; lastMessageAuthorId = null; messages.forEach(renderMessage); messageList.scrollTop = messageList.scrollHeight; }); }

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = messageInput.value.trim();
    if (content && currentChannelId && permissions.canSendMessage) {
        socket.emit('sendSharedMessage', { channelId: currentChannelId, content, reply: replyingToMessage ? { messageId: replyingToMessage.id, mention: isMentionEnabled } : null });
        messageInput.value = '';
        cancelReply();
    }
});

function createGuildIcon(guild) {
    const el = document.createElement('div'); el.className = 'guild-item';
    const icon = document.createElement('div'); icon.className = 'guild-icon'; icon.dataset.guildId = guild.id; icon.title = guild.name;
    if (guild.id === '@me') { icon.innerHTML = `<i class="fa-brands fa-discord"></i>`; } else if (guild.icon) { icon.innerHTML = `<img src="/api/image-proxy?url=${encodeURIComponent(guild.icon)}" alt="${guild.name}">`; } else { icon.textContent = guild.name.substring(0, 1); }
    icon.addEventListener('click', () => selectGuild(guild.id, guild.name));
    el.appendChild(icon);
    return el;
}

function renderMessage(msg) {
    const isScrolledToBottom = messageList.scrollHeight - messageList.clientHeight <= messageList.scrollTop + 50;
    const el = document.createElement('div'); el.className = 'message'; el.dataset.messageId = msg.id; el.dataset.authorId = msg.author.id; el.dataset.authorUsername = msg.author.username;
    const contentHtml = parseDiscordContent(msg.content);
    let attachmentsHtml = msg.attachments?.map(att => { const urlWithoutQuery = att.url.split('?')[0]; if (/\.(jpeg|jpg|gif|png|webp)$/i.test(urlWithoutQuery)) { return `<div class="message-attachment"><img src="/api/image-proxy?url=${encodeURIComponent(att.url)}" alt="添付画像"></div>`; } return ''; }).join('') || '';
    let embedsHtml = msg.embeds?.map(embed => { const borderColor = embed.color ? `style="border-color: ${embed.color}"` : ''; const authorHtml = embed.author ? `<div class="embed-author">${embed.author.iconURL ? `<img class="embed-author-icon" src="/api/image-proxy?url=${encodeURIComponent(embed.author.iconURL)}">` : ''}${embed.author.url ? `<a href="${embed.author.url}" target="_blank" rel="noopener noreferrer">${embed.author.name}</a>` : `<span>${embed.author.name}</span>`}</div>` : ''; const titleHtml = embed.title ? `<div class="embed-title">${embed.url ? `<a href="${embed.url}" target="_blank" rel="noopener noreferrer">${embed.title}</a>` : embed.title}</div>` : ''; const descHtml = embed.description ? `<div class="embed-description">${parseDiscordContent(embed.description)}</div>` : ''; const fieldsHtml = embed.fields ? `<div class="embed-fields">${embed.fields.map(field => `<div class="embed-field ${field.inline ? 'inline' : ''}"><div class="embed-field-name">${field.name}</div><div>${parseDiscordContent(field.value)}</div></div>`).join('')}</div>` : ''; const imageHtml = embed.image ? `<div class="embed-image"><img src="/api/image-proxy?url=${encodeURIComponent(embed.image.url)}"></div>` : ''; const thumbnailHtml = embed.thumbnail ? `<div class="embed-thumbnail"><img src="/api/image-proxy?url=${encodeURIComponent(embed.thumbnail.url)}"></div>` : ''; const footerHtml = embed.footer ? `<div class="embed-footer">${embed.footer.iconURL ? `<img class="embed-footer-icon" src="/api/image-proxy?url=${encodeURIComponent(embed.footer.iconURL)}">` : ''}<span>${embed.footer.text}</span></div>` : ''; return `<div class="embed-wrapper" ${borderColor}><div class="embed-grid"><div class="embed-main">${authorHtml}${titleHtml}${descHtml}${fieldsHtml}${imageHtml}</div>${thumbnailHtml}</div>${footerHtml}</div>`; }).join('') || '';
    const displayName = msg.author.displayName === msg.author.username || !msg.author.displayName ? msg.author.username : `${msg.author.displayName} (${msg.author.username})`;
    const botTag = msg.author.bot ? '<span class="author-bot-tag">BOT</span>' : '';
    let replyHtml = '';
    if (msg.replyTo) { replyHtml = `<div class="reply-header"><img class="reply-avatar" src="/api/image-proxy?url=${encodeURIComponent(msg.replyTo.author.avatar)}" alt=""><span class="reply-author">${msg.replyTo.author.displayName}</span><span class="reply-content">${parseDiscordContent(msg.replyTo.content) || '...'}</span></div>`; }
    if (lastMessageAuthorId !== msg.author.id) {
        el.classList.add('new-author');
        const timestamp = formatTimestamp(new Date(msg.timestamp));
        el.innerHTML = `<img class="message-avatar" src="/api/image-proxy?url=${encodeURIComponent(msg.author.avatar)}" alt=""><div class="message-body">${replyHtml}<div class="author-line"><span class="author">${displayName}${botTag}</span><span class="timestamp">${timestamp}</span></div><div class="content">${contentHtml}${attachmentsHtml}${embedsHtml}</div></div>`;
    } else {
        el.innerHTML = `<div class="message-body same-author">${replyHtml}<div class="content">${contentHtml}${attachmentsHtml}${embedsHtml}</div></div>`;
    }
    messageList.appendChild(el);
    lastMessageAuthorId = msg.author.id;
    if (isScrolledToBottom) { messageList.scrollTop = messageList.scrollHeight; }
}

function parseDiscordContent(content) { if (!content) return ''; let pText = content; pText = pText.replace(/<a?:(\w+?):(\d+?)>/g, (match, name, id) => `<img class="emoji" src="/api/image-proxy?url=${encodeURIComponent(`https://cdn.discordapp.com/emojis/${id}.${match.startsWith('<a:') ? 'gif' : 'webp'}?size=48`)}" alt=":${name}:">`); pText = pText.replace(/@\[\[(USER|ROLE):(.+?)\]\]/g, (m, t, n) => `<span class="mention">@${n}</span>`); let html = marked.parse(pText, { breaks: true, gfm: true }).trim().replace(/^<p>|<\/p>$/g, ''); return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }); }
function formatTimestamp(date) { const now = new Date(), yday = new Date(now); yday.setDate(yday.getDate() - 1); const pad = (n) => n.toString().padStart(2, '0'); const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`; if (date.toDateString() === now.toDateString()) return time; if (date.toDateString() === yday.toDateString()) return `昨日 ${time}`; return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${time}`; }

function updateURL() { let url = `/share/${shareId}`; if (currentGuildId) { url += `/${currentGuildId}`; if (currentChannelId) { url += `/${currentChannelId}`; } } window.history.pushState({ guildId: currentGuildId, channelId: currentChannelId }, '', url); }
function cancelReply() { replyingToMessage = null; replyIndicator.style.display = 'none'; isMentionEnabled = false; mentionToggleButton.classList.remove('active'); }

socket.on('newMessage', (msg) => { if (msg.channelId === currentChannelId) { if (!document.querySelector(`.message[data-message-id='${msg.id}']`)) renderMessage(msg); } });
socket.on('disconnect', () => { loadingPage.innerHTML = `<h1>サーバーから切断されました</h1><p>再接続を試みています...</p>`; loadingPage.style.display = 'flex'; clientPage.style.display = 'none'; });