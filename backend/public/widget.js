/**
 * Chat Widget - Standalone JavaScript Embed
 * 
 * Usage:
 * <script 
 *   src="https://chat.saastour360.com/widget.js"
 *   data-tenant="TENANT_ID"
 *   data-key="PUBLIC_WIDGET_KEY">
 * </script>
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    wsUrl: window.location.protocol === 'https:' 
      ? 'wss://api.saastour360.com' 
      : 'ws://localhost:4001',
    apiUrl: window.location.protocol === 'https:'
      ? 'https://api.saastour360.com'
      : 'http://localhost:4001',
    widgetId: 'chat-widget-container',
    widgetButtonId: 'chat-widget-button',
  };

  // State
  let socket = null;
  let currentRoomId = null;
  let tenantId = null;
  let publicKey = null;
  let visitorId = null;
  let isConnected = false;
  let isWidgetOpen = false;

  // Initialize widget
  function init() {
    const script = document.currentScript || document.querySelector('script[data-tenant]');
    if (!script) {
      console.error('Chat Widget: Script tag not found or missing data-tenant attribute');
      return;
    }

    tenantId = script.getAttribute('data-tenant');
    publicKey = script.getAttribute('data-key');

    if (!tenantId || !publicKey) {
      console.error('Chat Widget: Missing required attributes (data-tenant, data-key)');
      return;
    }

    // Generate or get visitor ID from localStorage
    visitorId = getOrCreateVisitorId();

    // Inject widget HTML
    injectWidgetHTML();

    // Setup event listeners
    setupEventListeners();

    // Connect to WebSocket
    connectWebSocket();
  }

  function getOrCreateVisitorId() {
    const storageKey = `chat_visitor_${tenantId}`;
    let visitorId = localStorage.getItem(storageKey);
    
    if (!visitorId) {
      visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(storageKey, visitorId);
    }
    
    return visitorId;
  }

  function injectWidgetHTML() {
    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
      #${CONFIG.widgetButtonId} {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      }
      #${CONFIG.widgetButtonId}:hover {
        transform: scale(1.1);
      }
      #${CONFIG.widgetId} {
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 380px;
        height: 600px;
        max-height: calc(100vh - 110px);
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 9999;
        display: none;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #${CONFIG.widgetId}.open {
        display: flex;
      }
      .chat-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .chat-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
      .chat-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
      }
      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .chat-message {
        display: flex;
        flex-direction: column;
        max-width: 80%;
      }
      .chat-message.visitor {
        align-self: flex-end;
      }
      .chat-message.admin {
        align-self: flex-start;
      }
      .chat-message-bubble {
        padding: 10px 14px;
        border-radius: 18px;
        word-wrap: break-word;
      }
      .chat-message.visitor .chat-message-bubble {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .chat-message.admin .chat-message-bubble {
        background: #f1f3f5;
        color: #212529;
      }
      .chat-message-time {
        font-size: 11px;
        color: #6c757d;
        margin-top: 4px;
        padding: 0 4px;
      }
      .chat-input-container {
        padding: 16px;
        border-top: 1px solid #e9ecef;
        display: flex;
        gap: 8px;
      }
      .chat-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #dee2e6;
        border-radius: 20px;
        font-size: 14px;
        outline: none;
      }
      .chat-send {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chat-typing {
        padding: 8px 16px;
        font-size: 12px;
        color: #6c757d;
        font-style: italic;
      }
      @media (max-width: 480px) {
        #${CONFIG.widgetId} {
          width: calc(100vw - 40px);
          right: 20px;
          left: 20px;
        }
      }
    `;
    document.head.appendChild(style);

    // Inject widget container
    const widget = document.createElement('div');
    widget.id = CONFIG.widgetId;
    widget.innerHTML = `
      <div class="chat-header">
        <h3>Canlı Destek</h3>
        <button class="chat-close" onclick="window.chatWidgetClose()">&times;</button>
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-typing" id="chat-typing" style="display: none;">Yazıyor...</div>
      <div class="chat-input-container">
        <input type="text" class="chat-input" id="chat-input" placeholder="Mesajınızı yazın..." />
        <button class="chat-send" onclick="window.chatWidgetSend()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;

    // Inject button
    const button = document.createElement('button');
    button.id = CONFIG.widgetButtonId;
    button.innerHTML = '💬';
    button.setAttribute('aria-label', 'Chat aç');
    button.onclick = window.chatWidgetToggle;

    document.body.appendChild(widget);
    document.body.appendChild(button);

    // Global functions
    window.chatWidgetToggle = toggleWidget;
    window.chatWidgetClose = closeWidget;
    window.chatWidgetSend = sendMessage;

    // Enter key handler
    const input = document.getElementById('chat-input');
    if (input) {
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
    }
  }

  function setupEventListeners() {
    // Close on outside click (optional)
    document.addEventListener('click', function(e) {
      const widget = document.getElementById(CONFIG.widgetId);
      const button = document.getElementById(CONFIG.widgetButtonId);
      if (widget && button && isWidgetOpen) {
        if (!widget.contains(e.target) && !button.contains(e.target)) {
          // Don't close on outside click - keep it simple
        }
      }
    });
  }

  function connectWebSocket() {
    const wsProtocol = CONFIG.wsUrl.startsWith('wss:') ? 'wss' : 'ws';
    const wsHost = CONFIG.wsUrl.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
    const socketUrl = `${wsProtocol}://${wsHost}`;

    socket = io(socketUrl, {
      auth: {
        tenantId: tenantId,
        publicKey: publicKey,
        visitorId: visitorId,
      },
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      upgrade: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    socket.on('connect', function() {
      isConnected = true;
      console.log('Chat Widget: Connected');
      
      // Auto-create or get room via API first
      initVisitorRoom();
    });
    
    async function initVisitorRoom() {
      try {
        const response = await fetch(`${CONFIG.apiUrl}/api/chat/widget/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: tenantId,
            publicKey: publicKey,
            visitorId: visitorId,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            currentRoomId = data.data.roomId;
            socket.emit('join_room', { roomId: currentRoomId });
          }
        }
      } catch (error) {
        console.error('Failed to init visitor room:', error);
      }
    }

    socket.on('disconnect', function() {
      isConnected = false;
      console.log('Chat Widget: Disconnected');
      addSystemMessage('Bağlantı kesildi. Yeniden bağlanılıyor...');
    });

    socket.on('joined_room', function(data) {
      currentRoomId = data.roomId;
      addSystemMessage('Destek ekibimizle bağlantı kuruldu. Nasıl yardımcı olabiliriz?');
    });

    socket.on('room_messages', function(data) {
      if (data.roomId === currentRoomId && data.messages) {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
          data.messages.forEach(function(msg) {
            addMessage(msg.content, msg.senderType === 'admin' ? 'admin' : 'visitor');
          });
        }
      }
    });

    socket.on('new_message', function(data) {
      if (data.roomId === currentRoomId) {
        addMessage(data.message.content, data.message.senderType === 'admin' ? 'admin' : 'visitor');
      }
    });

    socket.on('user_typing', function(data) {
      if (data.roomId === currentRoomId && data.type === 'admin') {
        showTyping(data.isTyping);
      }
    });

    socket.on('error', function(error) {
      console.error('Chat Widget Error:', error);
      addSystemMessage('Bir hata oluştu. Lütfen sayfayı yenileyin.');
    });
  }

  function toggleWidget() {
    const widget = document.getElementById(CONFIG.widgetId);
    if (widget) {
      isWidgetOpen = !isWidgetOpen;
      widget.classList.toggle('open', isWidgetOpen);
      
      if (isWidgetOpen && currentRoomId) {
        loadMessageHistory();
      }
    }
  }

  function closeWidget() {
    const widget = document.getElementById(CONFIG.widgetId);
    if (widget) {
      isWidgetOpen = false;
      widget.classList.remove('open');
    }
  }

  function sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input || !socket || !currentRoomId) return;

    const message = input.value.trim();
    if (!message) return;

    socket.emit('send_message', {
      roomId: currentRoomId,
      content: message,
      messageType: 'text',
    });

    input.value = '';
  }

  function addMessage(content, senderType) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${senderType}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'chat-message-bubble';
    bubble.textContent = content;
    
    const time = document.createElement('div');
    time.className = 'chat-message-time';
    time.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    messageDiv.appendChild(bubble);
    messageDiv.appendChild(time);
    messagesContainer.appendChild(messageDiv);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function addSystemMessage(content) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.style.textAlign = 'center';
    messageDiv.style.padding = '8px';
    messageDiv.style.fontSize = '12px';
    messageDiv.style.color = '#6c757d';
    messageDiv.textContent = content;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showTyping(show) {
    const typingEl = document.getElementById('chat-typing');
    if (typingEl) {
      typingEl.style.display = show ? 'block' : 'none';
    }
  }

  function loadMessageHistory() {
    // Messages are loaded via socket 'room_messages' event
    // This function is kept for compatibility but messages come from WebSocket
  }

  // Load Socket.io if not already loaded
  if (typeof io === 'undefined') {
    const socketScript = document.createElement('script');
    socketScript.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
    socketScript.onload = init;
    document.head.appendChild(socketScript);
  } else {
    init();
  }
})();

