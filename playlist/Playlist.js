

export class Playlist {
    constructor(salonId) {
        this.salonId = salonId;
        this.videos = [];
        this.currentVideoIndex = 0;
        this.socket = null;
        
        console.log(`[Playlist] Componente creado para salón: ${salonId}`);
    }

    init(socketConnection) {
        this.socket = socketConnection;
        console.log(`[Playlist] Socket.IO conectado para ${this.salonId}`);
        return this;
    }

    render(container = null) {
        const currentVideo = this.getCurrentVideo();
        
        const html = `
            <div class="playlist-component" data-salon="${this.salonId}">
                <div class="playlist-header">
                    <h3 class="playlist-title">
                        <span class="playlist-icon">🎵</span>
                        Playlist Collaborative
                    </h3>
                    <div class="playlist-stats">
                        <span class="videos-count">${this.videos.length} vidéos</span>
                        <span class="total-duration">${this.calculateTotalDuration()}</span>
                    </div>
                </div>
                
                <div class="playlist-controls">
                    <button class="control-btn add-video-btn" id="addBtn-${this.salonId}">
                        <span class="btn-icon">➕</span>
                        <span class="btn-text">Ajouter une vidéo</span>
                    </button>
                    
                    <div class="navigation-controls">
                        <button class="control-btn prev-btn" id="prevBtn-${this.salonId}" 
                                ${this.videos.length <= 1 ? 'disabled' : ''}>
                            <span class="btn-icon">⏮️</span>
                            Précédent
                        </button>
                        
                        <button class="control-btn next-btn" id="nextBtn-${this.salonId}"
                                ${this.videos.length <= 1 ? 'disabled' : ''}>
                            <span class="btn-icon">⏭️</span>
                            Suivant
                        </button>
                    </div>
                </div>
                
                <div class="current-video-section" ${!currentVideo ? 'style="display: none;"' : ''}>
                    <div class="current-video-header">
                        <h4>🎬 En cours de lecture</h4>
                        <span class="current-badge">MAINTENANT</span>
                    </div>
                    
                    <div class="current-video-card">
                        <div class="current-thumbnail">
                            ${currentVideo ? 
                                `<img src="${currentVideo.thumbnail}" alt="${currentVideo.title}">` 
                                : '<div class="thumbnail-placeholder">🎬</div>'
                            }
                        </div>
                        <div class="current-video-info">
                            <div class="current-title">${currentVideo ? currentVideo.title : 'Aucune vidéo'}</div>
                            <div class="current-meta">
                                <span>Durée: ${currentVideo ? currentVideo.duration : '--:--'}</span>
                                <span>Ajoutée par: ${currentVideo ? currentVideo.addedBy : '--'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="playlist-items-container" id="items-${this.salonId}">
                    ${this.videos.length === 0 ? `
                        <div class="empty-playlist-state">
                            <div class="empty-icon">📭</div>
                            <p class="empty-title">Playlist vide</p>
                            <p class="empty-subtitle">Ajoutez des vidéos YouTube pour commencer</p>
                            <button class="empty-action-btn" id="firstAddBtn-${this.salonId}">
                                Ajouter votre première vidéo
                            </button>
                        </div>
                    ` : this.videos.map((video, index) => `
                        <div class="playlist-item ${index === this.currentVideoIndex ? 'current-item' : ''}" 
                             data-video-id="${video.id}" data-index="${index}">
                            <div class="item-drag-handle">
                                ⋮⋮
                            </div>
                            
                            <div class="item-thumbnail">
                                <img src="${video.thumbnail}" alt="${video.title}" 
                                     onerror="this.src='https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg'">
                                ${index === this.currentVideoIndex ? 
                                    '<div class="playing-indicator">▶️</div>' : ''}
                            </div>
                            
                            <div class="item-info">
                                <div class="item-title" title="${video.title}">
                                    ${video.title}
                                </div>
                                <div class="item-meta">
                                    <span class="item-duration">${video.duration}</span>
                                    <span class="item-added-by">par ${video.addedBy}</span>
                                    <span class="item-time">${video.addedAt}</span>
                                </div>
                            </div>
                            
                            <div class="item-actions">
                                <button class="item-action-btn play-btn" title="Lire cette vidéo">
                                    ▶️
                                </button>
                                <button class="item-action-btn remove-btn" title="Supprimer de la playlist">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="playlist-footer">
                    <div class="add-video-form" id="addForm-${this.salonId}" style="display: none;">
                        <input type="text" class="video-url-input" id="urlInput-${this.salonId}" 
                               placeholder="Collez l'URL YouTube ici..." autocomplete="off">
                        <div class="form-buttons">
                            <button class="form-btn cancel-btn" id="cancelBtn-${this.salonId}">
                                Annuler
                            </button>
                            <button class="form-btn submit-btn" id="submitBtn-${this.salonId}">
                                Ajouter
                            </button>
                        </div>
                    </div>
                    
                    <div class="footer-info">
                        <span>Playlist collaborative • Tous les utilisateurs peuvent modifier</span>
                    </div>
                </div>
            </div>
        `;
        
        if (container) {
            container.innerHTML = html;
            setTimeout(() => this.setupEventListeners(), 50);
            return container;
        }
        
        return html;
    }

    async addVideo(videoUrl, addedBy = 'Utilisateur') {
        console.log(`[Playlist] Extraction des données YouTube: ${videoUrl}`);
        
        try {
            const videoId = this.extractYouTubeId(videoUrl);
            
            if (!videoId) {
                throw new Error('URL YouTube invalide');
            }
            
            const videoData = await this.fetchYouTubeData(videoId);
            
            const video = {
                id: videoId,
                title: videoData.title,
                thumbnail: videoData.thumbnail,
                duration: videoData.duration,
                url: `https://youtube.com/watch?v=${videoId}`,
                addedBy: addedBy,
                addedAt: new Date().toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                channel: videoData.channel
            };
            
            this.videos.push(video);
            console.log(`[Playlist] Vidéo ajoutée par ${addedBy}: "${video.title}"`);
            
            if (this.videos.length === 1) {
                this.currentVideoIndex = 0;
            }
            
            this.updatePlaylistUI();
            
            return video;
            
        } catch (error) {
            console.error('[Playlist] Erreur ajout vidéo:', error);
            
            const videoId = this.extractYouTubeId(videoUrl);
            const fallbackVideo = {
                id: videoId || `fallback-${Date.now()}`,
                title: `Vidéo YouTube (${videoId || 'ID inconnu'})`,
                thumbnail: `https://img.youtube.com/vi/${videoId || 'dQw4w9WgXcQ'}/default.jpg`,
                duration: '?:??',
                url: videoUrl,
                addedBy: addedBy,
                addedAt: new Date().toLocaleTimeString('fr-FR'),
                channel: 'YouTube'
            };
            
            this.videos.push(fallbackVideo);
            this.updatePlaylistUI();
            
            return fallbackVideo;
        }
    }
    
    extractYouTubeId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }
    
    async fetchYouTubeData(videoId) {
        console.log(`[Playlist] Extraction données YouTube pour: ${videoId}`);
        
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        
        const knownVideos = {
            'dQw4w9WgXcQ': ['Rick Astley - Never Gonna Give You Up', '3:33', 'Rick Astley'],
            'jNQXAC9IVRw': ['Me at the zoo (première vidéo YouTube)', '0:19', 'jawed'],
            '9bZkp7q19f0': ['PSY - GANGNAM STYLE', '4:13', 'officialpsy'],
            'kJQP7kiw5Fk': ['Luis Fonsi - Despacito ft. Daddy Yankee', '4:41', 'LuisFonsiVEVO'],
            'OPf0YbXqDm0': ['Mark Ronson - Uptown Funk ft. Bruno Mars', '4:30', 'MarkRonsonVEVO'],
            'JGwWNGJdvx8': ['Ed Sheeran - Shape of You', '3:54', 'EdSheeran'],
            'CevxZvSJLk8': ['Kendrick Lamar - HUMBLE.', '2:57', 'KendrickLamarVEVO'],
            'abc123': ['Vidéo Test 1 - Tutoriel AMS IL', '5:20', 'Sara'],
            'def456': ['Vidéo Test 2 - Socket.IO Guide', '8:45', 'Nabil'],
            'ghi789': ['Vidéo Test 3 - Design System', '6:15', 'Maroua']
        };
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (knownVideos[videoId]) {
            const [title, duration, channel] = knownVideos[videoId];
            return {
                title: title,
                thumbnail: thumbnailUrl,
                duration: duration,
                channel: channel
            };
        }
        
        const titles = [
            'Tutoriel Développement Web',
            'Concert Live en Streaming',
            'Documentaire Technologie',
            'Cours de Programmation',
            'Revue de Matériel Informatique',
            'Interview Développeur Full-Stack',
            'Podcast Design UI/UX',
            'Conférence Intelligence Artificielle',
            'Vlog Création de Startup',
            'Démo Application Collaborative'
        ];
        
        const channels = [
            'TechChannel FR',
            'DevTutorials',
            'WebMaster Pro',
            'Code Academy',
            'Digital Creators',
            'Innovation Hub',
            'Future Tech',
            'App Developers',
            'Software Engineers',
            'UX Design Lab'
        ];
        
        const index = Array.from(videoId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const titleIndex = index % titles.length;
        const channelIndex = index % channels.length;
        
        const minutes = 2 + (index % 15);
        const seconds = index % 60;
        const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        return {
            title: `${titles[titleIndex]} (${videoId.substring(0, 4)}...)`,
            thumbnail: thumbnailUrl,
            duration: duration,
            channel: channels[channelIndex]
        };
    }
    
    updatePlaylistUI() {
        const container = document.querySelector(`[data-salon="${this.salonId}"]`);
        if (container && container.parentElement) {
            this.render(container.parentElement);
        }
    }
    
    getCurrentVideo() {
        if (this.videos.length === 0) return null;
        return this.videos[this.currentVideoIndex];
    }

    nextVideo() {
        if (this.videos.length === 0) return null;
        
        this.currentVideoIndex = (this.currentVideoIndex + 1) % this.videos.length;
        console.log(`[Playlist] Cambiando al video ${this.currentVideoIndex + 1}/${this.videos.length}`);
        
        return this.getCurrentVideo();
    }

    previousVideo() {
        if (this.videos.length === 0) return null;
        
        this.currentVideoIndex = this.currentVideoIndex > 0 
            ? this.currentVideoIndex - 1 
            : this.videos.length - 1;
        
        console.log(`[Playlist] Cambiando al video ${this.currentVideoIndex + 1}/${this.videos.length}`);
        return this.getCurrentVideo();
    }
    
    getSummary() {
        return {
            totalVideos: this.videos.length,
            totalDuration: this.calculateTotalDuration(),
            currentVideo: this.getCurrentVideo(),
            addedByUsers: [...new Set(this.videos.map(v => v.addedBy))]
        };
    }
    
    calculateTotalDuration() {
        const totalMinutes = this.videos.length * 4;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes}min`;
    }
    
    removeVideo(videoId) {
        const initialLength = this.videos.length;
        this.videos = this.videos.filter(video => video.id !== videoId);
        
        if (this.currentVideoIndex >= this.videos.length && this.videos.length > 0) {
            this.currentVideoIndex = this.videos.length - 1;
        } else if (this.videos.length === 0) {
            this.currentVideoIndex = 0;
        }
        
        const removed = initialLength !== this.videos.length;
        if (removed) {
            console.log(`[Playlist] Vidéo ${videoId} supprimée`);
            this.updatePlaylistUI();
        }
        
        return removed;
    }
    
    moveVideo(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.videos.length ||
            toIndex < 0 || toIndex >= this.videos.length) {
            console.error('[Playlist] Índices inválidos para reordenar');
            return false;
        }
        
        const [movedVideo] = this.videos.splice(fromIndex, 1);
        this.videos.splice(toIndex, 0, movedVideo);
        
        if (this.currentVideoIndex === fromIndex) {
            this.currentVideoIndex = toIndex;
        } else if (this.currentVideoIndex > fromIndex && this.currentVideoIndex <= toIndex) {
            this.currentVideoIndex--;
        } else if (this.currentVideoIndex < fromIndex && this.currentVideoIndex >= toIndex) {
            this.currentVideoIndex++;
        }
        
        console.log(`[Playlist] Vidéo déplacée de ${fromIndex} à ${toIndex}`);
        this.updatePlaylistUI();
        return true;
    }
    
    setupEventListeners() {
        const addBtn = document.getElementById(`addBtn-${this.salonId}`);
        const firstAddBtn = document.getElementById(`firstAddBtn-${this.salonId}`);
        const addForm = document.getElementById(`addForm-${this.salonId}`);
        const urlInput = document.getElementById(`urlInput-${this.salonId}`);
        const submitBtn = document.getElementById(`submitBtn-${this.salonId}`);
        const cancelBtn = document.getElementById(`cancelBtn-${this.salonId}`);
        
        const prevBtn = document.getElementById(`prevBtn-${this.salonId}`);
        const nextBtn = document.getElementById(`nextBtn-${this.salonId}`);
        
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                addForm.style.display = 'block';
                addBtn.style.display = 'none';
                if (urlInput) urlInput.focus();
            });
        }
        
        if (firstAddBtn) {
            firstAddBtn.addEventListener('click', () => {
                if (addForm) addForm.style.display = 'block';
                if (firstAddBtn) firstAddBtn.style.display = 'none';
                if (urlInput) urlInput.focus();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (addForm) addForm.style.display = 'none';
                if (addBtn) addBtn.style.display = 'block';
                if (firstAddBtn) firstAddBtn.style.display = 'block';
                if (urlInput) urlInput.value = '';
            });
        }
        
        if (submitBtn && urlInput) {
            submitBtn.addEventListener('click', async () => {
                const url = urlInput.value.trim();
                if (!url) return;
                
                submitBtn.disabled = true;
                submitBtn.textContent = 'Ajout en cours...';
                
                try {
                    await this.addVideo(url, 'Moi');
                    
                    urlInput.value = '';
                    addForm.style.display = 'none';
                    if (addBtn) addBtn.style.display = 'block';
                    
                } catch (error) {
                    console.error('Erreur ajout vidéo:', error);
                    alert('Erreur lors de l\'ajout de la vidéo');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Ajouter';
                }
            });
            
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    submitBtn.click();
                }
            });
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.previousVideo();
                this.updatePlaylistUI();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextVideo();
                this.updatePlaylistUI();
            });
        }
        
        const itemsContainer = document.getElementById(`items-${this.salonId}`);
        if (itemsContainer) {
            itemsContainer.addEventListener('click', (e) => {
                const playBtn = e.target.closest('.play-btn');
                const removeBtn = e.target.closest('.remove-btn');
                const playlistItem = e.target.closest('.playlist-item');
                
                if (playBtn && playlistItem) {
                    const index = parseInt(playlistItem.dataset.index);
                    this.currentVideoIndex = index;
                    this.updatePlaylistUI();
                }
                
                if (removeBtn && playlistItem) {
                    const videoId = playlistItem.dataset.videoId;
                    if (confirm('Supprimer cette vidéo de la playlist?')) {
                        this.removeVideo(videoId);
                        this.updatePlaylistUI();
                    }
                }
            });
        }
        
        console.log('[Playlist] Event listeners configurés');
    }
    
    isValidYouTubeUrl(url) {
        const patterns = [
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
            /^[a-zA-Z0-9_-]{11}$/
        ];
        
        return patterns.some(pattern => pattern.test(url));
    }
}