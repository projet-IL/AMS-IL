/**
 * Componente Chat para AMS IL
 * Responsable: Sara Harouda El Ouarga
 * Fecha: Noviembre 2024
 */

export class Chat {
    /**
     * Constructor del componente Chat
     * @param {string} salonId - ID único del salón
     */
    constructor(salonId) {
        this.salonId = salonId;
        this.messages = [];
        this.currentUser = 'Usuario';
        this.socket = null;
        
        console.log(`[Chat] Componente creado para salón: ${salonId}`);
    }

    /**
     * Inicializa el componente con conexión Socket.IO
     * @param {object} socketConnection - Conexión Socket.IO
     * @returns {Chat} - Instancia actual
     */
    init(socketConnection) {
        this.socket = socketConnection;
        console.log(`[Chat] Socket.IO conectado para ${this.salonId}`);
        
        // Configurar event listeners después de un breve delay
        setTimeout(() => this.setupEventListeners(), 200);
        
        return this;
    }
    /**
     * Renderiza el HTML del componente y configura eventos
     * @param {HTMLElement} container - Contenedor donde insertar (opcional)
     * @returns {string|HTMLElement} - HTML o elemento renderizado
     */
    render(container = null) {
        const html = `
            <div class="chat-component" data-salon="${this.salonId}">
                <div class="chat-header">
                    <h3 class="chat-title">
                        <span class="chat-icon">💬</span>
                        Chat du Salon
                    </h3>
                    <div class="chat-status">
                        <span class="status-indicator">●</span>
                        <span class="status-text">Connecté</span>
                    </div>
                </div>
                
                <div class="chat-messages" id="messages-${this.salonId}">
                    <div class="empty-state">
                        <p>Aucun message pour le moment</p>
                        <p class="empty-subtitle">Soyez le premier à écrire!</p>
                    </div>
                </div>
                
                <div class="chat-input-area">
                    <input 
                        type="text" 
                        class="chat-input" 
                        id="input-${this.salonId}"
                        placeholder="Écrire un message..."
                        aria-label="Message à envoyer"
                    >
                    <button class="send-button" id="send-${this.salonId}" aria-label="Envoyer le message">
                        <span class="button-icon">📤</span>
                        <span class="button-text">Envoyer</span>
                    </button>
                </div>
                
                <div class="chat-footer">
                    <span class="user-info">
                        Connecté en tant que: <strong>${this.currentUser}</strong>
                    </span>
                    <span class="message-count">Messages: 0</span>
                </div>
            </div>
        `;
        
        // Si se proporciona un contenedor, insertar y configurar eventos
        if (container) {
            container.innerHTML = html;
            
            // Configurar eventos después de que el DOM se actualice
            setTimeout(() => {
                this.setupEventListeners();
                console.log(`[Chat] Renderizado en contenedor con eventos configurados`);
            }, 50);
            
            return container;
        }
        
        // Si no hay contenedor, solo devolver HTML
        return html;
    }

    /**
     * Obtiene el nombre de usuario actual
     * @returns {string} - Nombre de usuario
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Establece el nombre de usuario
     * @param {string} username - Nuevo nombre de usuario
     */
    setUsername(username) {
        this.currentUser = username;
        
        // Actualizar en la interfaz si ya está renderizada
        const userElement = document.querySelector(`[data-salon="${this.salonId}"] .user-info strong`);
        if (userElement) {
            userElement.textContent = username;
        }
        
        console.log(`[Chat] Usuario cambiado a: ${username}`);
    }
    /**
     * Añade un mensaje al chat
     * @param {string} text - Texto del mensaje
     * @param {string} user - Usuario que envía (opcional)
     */
    addMessage(text, user = this.currentUser) {
        const message = {
            id: Date.now(),
            text: text,
            user: user,
            timestamp: new Date().toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            isCurrentUser: user === this.currentUser
        };
        
        this.messages.push(message);
        this.updateMessagesUI();
        console.log(`[Chat] Mensaje añadido: ${user}: ${text.substring(0, 30)}...`);
    }

    /**
     * Actualiza la interfaz con los mensajes
     */
    updateMessagesUI() {
        const messagesContainer = document.getElementById(`messages-${this.salonId}`);
        if (!messagesContainer) return;
        
        // Si no hay mensajes, mostrar estado vacío
        if (this.messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="empty-state">
                    <p>Aucun message pour le moment</p>
                    <p class="empty-subtitle">Soyez le premier à écrire!</p>
                </div>
            `;
            return;
        }
        
        // Mostrar todos los mensajes
        messagesContainer.innerHTML = this.messages.map(msg => `
            <div class="message ${msg.isCurrentUser ? 'message-own' : 'message-other'}">
                <div class="message-header">
                    <span class="message-user">${msg.user}</span>
                    <span class="message-time">${msg.timestamp}</span>
                </div>
                <div class="message-text">${this.escapeHTML(msg.text)}</div>
            </div>
        `).join('');
        
        // Scroll al final
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Actualizar contador
        this.updateMessageCount();
    }

    /**
     * Actualiza el contador de mensajes
     */
    updateMessageCount() {
        const countElement = document.querySelector(`[data-salon="${this.salonId}"] .message-count`);
        if (countElement) {
            countElement.textContent = `Messages: ${this.messages.length}`;
        }
    }

    /**
     * Escapa HTML para seguridad
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    /**
     * Configura los event listeners para el input y botón
     */
    setupEventListeners() {
        const input = document.getElementById(`input-${this.salonId}`);
        const button = document.getElementById(`send-${this.salonId}`);
        
        if (!input || !button) {
            console.warn('[Chat] Elementos de input no encontrados');
            return;
        }
        
        // Enviar al hacer clic en el botón
        button.addEventListener('click', () => this.sendMessageFromInput());
        
        // Enviar al presionar Enter
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessageFromInput();
            }
        });
        
        // Focus automático en el input
        setTimeout(() => input.focus(), 100);
        
        console.log('[Chat] Event listeners configurados');
    }
    
    /**
     * Obtiene el mensaje del input y lo envía
     */
    sendMessageFromInput() {
        const input = document.getElementById(`input-${this.salonId}`);
        const message = input.value.trim();
        
        if (!message) {
            input.focus();
            return;
        }
        
        // Añadir mensaje
        this.addMessage(message);
        
        // Limpiar input
        input.value = '';
        input.focus();
        
        // Scroll al final
        const messagesContainer = document.getElementById(`messages-${this.salonId}`);
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
}