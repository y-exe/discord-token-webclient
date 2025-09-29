// =================================================================================
// share.js (for share.html) - Final Corrected Version
// =================================================================================

const API_SERVER_URL = "https://api.yexe.xyz";
const socket = io(API_SERVER_URL);

// ----- DOM要素の取得 (share.htmlに存在する要素のみ) -----
const clientPage = document.getElementById('client-page');
const loadingPage = document.getElementById('loading-page');
const errorPage = document.getElementById('error-page');

const clientContainer = document.getElementById('full-client-container');
const guildList = document.getElementById('guild-list');
const guildNameText = document.getElementById('guild-name-text');
const channelList = document.getElementById('channel-list');
const messageList = document.getElementById('message-list');
const channelNameText = document.getElementById('channel-name-text');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const backToChannelsButton = document.getElementById('back-to-channels');
const replyIndicator = document.getElementById('reply-indicator');
const replyToUser = document.getElementById('reply-to-user');
const cancelReplyButton = document.getElementById('cancel-reply-button');
const mentionToggleButton = document.getElementById('mention-toggle-button');

// ----- グローバル変数 -----
let shareId, initialGuildId, initialChannelId;
let currentGuildId = null;
let currentChannelId = null;
let permissions = {};
let lastMessageAuthorId = null;
let replyingToMessage = null;
let isMentionEnabled = false;

// ----- 関数群 -----
function applyTheme(theme) {
    document.body.dataset.theme = theme;
    localStorage.setItem('discord-theme', theme);
    document.querySelectorAll('.theme-btn.active').forEach(b => b.classList.remove('active'));
    const currentThemeBtn = document.querySelector(`.theme-btn[data-theme="${theme}"]`);
    if (currentThemeBtn) currentThemeBtn.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('discord-theme') || 'dark';
    applyTheme(savedTheme);

    const redirectPath = sessionStorage.getItem('redirectPath');
    sessionStorage.removeItem('redirectPath');
    const path = redirectPath || (window.location.hash ? window.location.hash.substring(1) : window.location.pathname);

    if (redirectPath && redirectPath !== window.location.pathname) {
        window.history.replaceState(null, '', redirectPath);
    } else if (window.location.hash && ('/' + path) !== window.location.pathname) {
        window.history.replaceState(null, '', '/' + path);
    }

    const pathParts = path.split('/').filter(p => p);

    if (pathParts[0] === 'share' && pathParts.length > 1) {
        shareId = pathParts[1];
        initialGuildId = pathParts[2];
        initialChannelId = pathParts[3];
    }
    
    if (socket.connected) {
        initializeShareSession();
    } else {
        socket.on('connect', initializeShareSession, { once: true });
    }
});

function initializeShareSession() {
    if (!shareId) {
        loadingPage.style.display = 'none';
        errorPage.style.display = 'flex';
        return;
    }
    socket.emit('joinShare', shareId, (response) => {
        if (response.success) {
            permissions = response.permissions;
            loadingPage.style.display = 'none';
            clientPage.style.display = 'block';
            renderGuilds(response.guilds, initialGuildId, initialChannelId);
            if (!permissions.canSendMessage) { 
                messageInput.placeholder = "メッセージの送信は許可されていません"; 
            }
        } else {
            loadingPage.style.display = 'none';
            const errorMessageEl = errorPage.querySelector('.error-message');
            if (errorMessageEl) {
                 errorMessageEl.textContent = response.message || '不明なエラーが発生しました。';
            }
            errorPage.style.display = 'flex';
        }
    });

    backToChannelsButton.addEventListener('click', () => clientContainer.classList.remove('show-messages'));
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const content = messageInput.value.trim();
        if (content && currentChannelId && permissions.canSendMessage) {
            socket.emit('sendSharedMessage', { channelId: currentChannelId, content, reply: replyingToMessage ? { messageId: replyingToMessage.id, mention: isMentionEnabled } : null });
            messageInput.value = '';
            cancelReply();
        }
    });
    cancelReplyButton.addEventListener('click', cancelReply);
    mentionToggleButton.addEventListener('click', () => { isMentionEnabled = !isMentionEnabled; mentionToggleButton.classList.toggle('active', isMentionEnabled); });
}

function renderGuilds(guilds, initialGuildId, initialChannelId) {
    if (!guildList) return;
    guildList.innerHTML = '';
    guilds.forEach(guild => guildList.appendChild(createGuildIcon(guild)));
    
    const targetGuildId = initialGuildId || guilds[0]?.id;
    if (targetGuildId) {
        const guildData = guilds.find(g => g.id === targetGuildId);
        if (guildData) {
            selectGuild(targetGuildId, guildData.name, initialChannelId);
        }
    }
}

function selectGuild(guildId, name, initialChannelId = null) {
    if (currentGuildId === guildId && !initialChannelId) return;
    currentGuildId = guildId; 
    currentChannelId = null;
    document.querySelectorAll('.guild-icon.active').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-guild-id='${guildId}']`).classList.add('active');
    guildNameText.textContent = name;
    channelNameText.textContent = 'チャンネルを選択';
    messageList.innerHTML = ''; 
    messageInput.disabled = true; 
    channelList.innerHTML = '';
    clientContainer.classList.remove('show-messages');
    messageList.style.display = 'block';
    
    updateURL();
    loadChannels(guildId, initialChannelId);
}

function loadChannels(guildId, initialChannelId = null) {
    channelList.innerHTML = '<li>読み込み中...</li>';
    socket.emit('getChannels', guildId, (categories) => {
        channelList.innerHTML = '';
        categories.forEach(cat => {
            if (cat.name) { const categoryEl = document.createElement('div'); categoryEl.className = 'channel-category'; categoryEl.textContent = cat.name; channelList.appendChild(categoryEl); }
            cat.channels.forEach(ch => { const el = document.createElement('li'); el.className = 'channel-item'; el.innerHTML = `<span class="channel-prefix">#</span> ${ch.name}`; el.dataset.channelId = ch.id; el.addEventListener('click', () => selectChannel(ch.id, ch.name)); channelList.appendChild(el); });
        });
        if (initialChannelId) { 
            const channel = categories.flatMap(c => c.channels).find(ch => ch.id === initialChannelId); 
            if (channel) selectChannel(channel.id, channel.name); 
        }
    });
}

function selectChannel(channelId, name) {
    if (currentChannelId === channelId) { clientContainer.classList.add('show-messages'); return; }
    currentChannelId = channelId;
    document.querySelectorAll('.channel-item.active').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-channel-id='${channelId}']`).classList.add('active');
    
    messageList.style.display = 'block';
    const prefix = '# ';
    channelNameText.textContent = `${prefix}${name}`;
    messageList.innerHTML = '<div class="welcome-message">メッセージを読み込み中...</div>';
    
    if (permissions.canSendMessage) { 
        messageInput.disabled = false; 
        messageInput.placeholder = `${prefix}${name} へのメッセージ`; 
    }
    
    clientContainer.classList.add('show-messages');
    updateURL();
    loadMessages();
}

function loadMessages() { 
    socket.emit('getMessages', currentChannelId, (messages) => { 
        messageList.innerHTML = ''; 
        lastMessageAuthorId = null; 
        messages.forEach(renderMessage); 
        messageList.scrollTop = messageList.scrollHeight; 
    }); 
}

function createGuildIcon(guild) {
    const el = document.createElement('div'); 
    el.className = 'guild-item';
    const icon = document.createElement('div'); 
    icon.className = 'guild-icon'; 
    icon.dataset.guildId = guild.id; 
    icon.title = guild.name;
    if (guild.icon) { 
        icon.innerHTML = `<img src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(guild.icon)}" alt="${guild.name}">`; 
    } else { 
        icon.textContent = guild.name.substring(0, 1); 
    }
    icon.addEventListener('click', () => selectGuild(guild.id, guild.name));
    el.appendChild(icon);
    return el;
}

function renderMessage(msg) {
    const isScrolledToBottom = messageList.scrollHeight - messageList.clientHeight <= messageList.scrollTop + 50;
    const el = document.createElement('div'); el.className = 'message'; el.dataset.messageId = msg.id; el.dataset.authorId = msg.author.id; el.dataset.authorUsername = msg.author.username;
    const contentHtml = parseDiscordContent(msg.content);
    let attachmentsHtml = msg.attachments?.map(att => { const urlWithoutQuery = att.url.split('?')[0]; if (/\.(jpeg|jpg|gif|png|webp)$/i.test(urlWithoutQuery)) { return `<div class="message-attachment"><img src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(att.url)}" alt="添付画像"></div>`; } return ''; }).join('') || '';
    let embedsHtml = msg.embeds?.map(embed => { const borderColor = embed.color ? `style="border-color: ${embed.color}"` : ''; const authorHtml = embed.author ? `<div class="embed-author">${embed.author.iconURL ? `<img class="embed-author-icon" src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(embed.author.iconURL)}">` : ''}${embed.author.url ? `<a href="${embed.author.url}" target="_blank" rel="noopener noreferrer">${embed.author.name}</a>` : `<span>${embed.author.name}</span>`}</div>` : ''; const titleHtml = embed.title ? `<div class="embed-title">${embed.url ? `<a href="${embed.url}" target="_blank" rel="noopener noreferrer">${embed.title}</a>` : embed.title}</div>` : ''; const descHtml = embed.description ? `<div class="embed-description">${parseDiscordContent(embed.description)}</div>` : ''; const fieldsHtml = embed.fields ? `<div class="embed-fields">${embed.fields.map(field => `<div class="embed-field ${field.inline ? 'inline' : ''}"><div class="embed-field-name">${field.name}</div><div>${parseDiscordContent(field.value)}</div></div>`).join('')}</div>` : ''; const imageHtml = embed.image ? `<div class="embed-image"><img src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(embed.image.url)}"></div>` : ''; const thumbnailHtml = embed.thumbnail ? `<div class="embed-thumbnail"><img src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(embed.thumbnail.url)}"></div>` : ''; const footerHtml = embed.footer ? `<div class="embed-footer">${embed.footer.iconURL ? `<img class="embed-footer-icon" src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(embed.footer.iconURL)}">` : ''}<span>${embed.footer.text}</span></div>` : ''; return `<div class="embed-wrapper" ${borderColor}><div class="embed-grid"><div class="embed-main">${authorHtml}${titleHtml}${descHtml}${fieldsHtml}${imageHtml}</div>${thumbnailHtml}</div>${footerHtml}</div>`; }).join('') || '';
    const displayName = msg.author.displayName === msg.author.username || !msg.author.displayName ? msg.author.username : `${msg.author.displayName} (${msg.author.username})`;
    const botTag = msg.author.bot ? '<span class="author-bot-tag">BOT</span>' : '';
    let replyHtml = '';
    if (msg.replyTo) { replyHtml = `<div class="reply-header"><img class="reply-avatar" src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(msg.replyTo.author.avatar)}" alt=""><span class="reply-author">${msg.replyTo.author.displayName}</span><span class="reply-content">${parseDiscordContent(msg.replyTo.content) || '...'}</span></div>`; }
    if (lastMessageAuthorId !== msg.author.id) {
        el.classList.add('new-author');
        const timestamp = formatTimestamp(new Date(msg.timestamp));
        el.innerHTML = `<img class="message-avatar" src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(msg.author.avatar)}" alt=""><div class="message-body">${replyHtml}<div class="author-line"><span class="author">${displayName}${botTag}</span><span class="timestamp">${timestamp}</span></div><div class="content">${contentHtml}${attachmentsHtml}${embedsHtml}</div></div>`;
    } else {
        el.innerHTML = `<div class="message-body same-author">${replyHtml}<div class="content">${contentHtml}${attachmentsHtml}${embedsHtml}</div></div>`;
    }
    messageList.appendChild(el);
    lastMessageAuthorId = msg.author.id;
    if (isScrolledToBottom) messageList.scrollTop = messageList.scrollHeight;
}

function parseDiscordContent(content) { if (!content) return ''; let pText = content; pText = pText.replace(/<a?:(\w+?):(\d+?)>/g, (match, name, id) => `<img class="emoji" src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(`https://cdn.discordapp.com/emojis/${id}.${match.startsWith('<a:') ? 'gif' : 'webp'}?size=48`)}" alt=":${name}:">`); pText = pText.replace(/@\[\[(USER|ROLE):(.+?)\]\]/g, (m, t, n) => `<span class="mention">@${n}</span>`); let html = marked.parse(pText, { breaks: true, gfm: true }).trim().replace(/^<p>|<\/p>$/g, ''); return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }); }
function formatTimestamp(date) { const now = new Date(), yday = new Date(now); yday.setDate(yday.getDate() - 1); const pad = (n) => n.toString().padStart(2, '0'); const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`; if (date.toDateString() === now.toDateString()) return time; if (date.toDateString() === yday.toDateString()) return `昨日 ${time}`; return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${time}`; }

function updateURL() { let url = `/share/${shareId}`; if (currentGuildId) { url += `/${currentGuildId}`; if (currentChannelId) { url += `/${currentChannelId}`; } } window.history.pushState({ guildId: currentGuildId, channelId: currentChannelId }, '', url); }
function cancelReply() { replyingToMessage = null; replyIndicator.style.display = 'none'; isMentionEnabled = false; mentionToggleButton.classList.remove('active'); }

socket.on('newMessage', (msg) => { if (msg.channelId === currentChannelId) { if (!document.querySelector(`.message[data-message-id='${msg.id}']`)) renderMessage(msg); } });
socket.on('disconnect', () => { loadingPage.innerHTML = `<h1>サーバーから切断されました</h1><p>再接続を試みています...</p>`; loadingPage.style.display = 'flex'; clientPage.style.display = 'none'; });
