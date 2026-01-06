export class Playlist {
  constructor(salonId) {
    this.salonId = salonId;
    this.videos = [];
    this.currentVideoIndex = 0;

    this.socket = null;
    this.codeAcces = null;
    this.userId = null;

    this._socketBound = false;

    console.log(`[Playlist] Componente creado para salón: ${salonId}`);
  }

  init(socketConnection, options = {}) {
    this.socket = socketConnection;
    this.codeAcces = options.codeAcces || null;
    this.userId = options.userId || null;

    console.log(`[Playlist] Socket.IO conectado para ${this.salonId}`);
    if (this.codeAcces) console.log(`[Playlist] codeAcces détecté: ${this.codeAcces}`);
    if (this.userId) console.log(`[Playlist] userId détecté: ${this.userId}`);

    this.bindSocketEvents();

    return this;
  }

  setUserId(userId) {
    this.userId = Number(userId) || null;
  }

  bindSocketEvents() {
    if (!this.socket || this._socketBound) return;
    this._socketBound = true;

    this.socket.on("playlistSnapshot", async ({ codeAcces, items }) => {
      if (!this.codeAcces || codeAcces !== this.codeAcces) return;

      try {
        const mapped = await Promise.all(
          (items || []).map(async (it) => {
            const vid = this.extractYouTubeId(it.url_video) || it.url_video;
            const data = await this.fetchYouTubeData(vid);

            return {
              id: vid,
              title: it.titre || data.title,
              thumbnail: data.thumbnail,
              duration: data.duration,
              url: it.url_video,
              addedBy: it.pseudo || it.utilisateur?.pseudo || `user#${it.ajoute_par}`,
              addedAt: "",
              channel: data.channel,
              _dbId: it.id, //remove DB 
            };
          })
        );

        this.videos = mapped;
        this.currentVideoIndex = 0;
        this.updatePlaylistUI();
      } catch (e) {
        console.error("[Playlist] Erreur playlistSnapshot:", e);
      }
    });

    this.socket.on("playlistItemAdded", async (item) => {
      try {
        if (!item?.url_video) return;

        const vid = this.extractYouTubeId(item.url_video) || item.url_video;

        if (this.videos.some(v => v.id === vid)) return;

        const data = await this.fetchYouTubeData(vid);

        const video = {
          id: vid,
          title: item.titre || data.title,
          thumbnail: data.thumbnail,
          duration: data.duration,
          url: item.url_video,
          addedBy: item.pseudo || `user#${item.ajoute_par}`, //  FIX
          addedAt: "",
          channel: data.channel,
          _dbId: item.id, 
        };

        this.videos.push(video);

        if (this.videos.length === 1) {
          this.currentVideoIndex = 0;
          this.emitChangeVideo(vid);
        }

        this.updatePlaylistUI();
      } catch (e) {
        console.error("[Playlist] Erreur playlistItemAdded:", e);
      }
    });

    this.socket.on("playlistItemRemoved", ({ id }) => {
      const before = this.videos.length;
      this.videos = this.videos.filter(v => v._dbId !== Number(id));

      if (this.currentVideoIndex >= this.videos.length) {
        this.currentVideoIndex = Math.max(0, this.videos.length - 1);
      }

      if (this.videos.length !== before) this.updatePlaylistUI();
    });


    this.socket.on("changeVideo", (videoId) => {
      const idx = this.videos.findIndex(v => v.id === videoId);
      if (idx !== -1) {
        this.currentVideoIndex = idx;
        this.updatePlaylistUI();
      }
    });

    this.socket.on("playlistDuplicate", () => {
      alert("Cette vidéo est déjà dans la playlist.");
    });
 
  }

  emitChangeVideo(videoId) {
    if (!this.socket) {
      console.warn("[Playlist] socket non initialisé -> impossible d'emit changeVideo");
      return;
    }
    if (!this.codeAcces) {
      console.warn("[Playlist] codeAcces manquant -> impossible d'emit changeVideo");
      return;
    }
    if (!videoId) return;

    console.log(`[Playlist] emit changeVideo -> ${videoId} (salon=${this.codeAcces})`);
    this.socket.emit("changeVideo", { codeAcces: this.codeAcces, videoId });
  }

  render(container = null) {
    const currentVideo = this.getCurrentVideo();

    const html = `
      <div class="playlist-component" data-salon="${this.salonId}">
        <div class="playlist-header">
          <h3 class="playlist-title">
            <span class="playlist-icon"></span>
            Playlist Collaborative
          </h3>
          <div class="playlist-stats">
            <span class="videos-count">${this.videos.length} vidéos</span>
            <span class="total-duration">${this.calculateTotalDuration()}</span>
          </div>
        </div>

        <div class="playlist-controls">
          <button class="control-btn add-video-btn" id="addBtn-${this.salonId}">
            <span class="btn-icon"></span>
            <span class="btn-text">Ajouter une vidéo</span>
          </button>

          <div class="navigation-controls">
            <button class="control-btn prev-btn" id="prevBtn-${this.salonId}"
                    ${this.videos.length <= 1 ? 'disabled' : ''}>
              <span class="btn-icon"></span>
              Précédent
            </button>

            <button class="control-btn next-btn" id="nextBtn-${this.salonId}"
                    ${this.videos.length <= 1 ? 'disabled' : ''}>
              <span class="btn-icon"></span>
              Suivant
            </button>
          </div>
        </div>

        <div class="current-video-section" ${!currentVideo ? 'style="display: none;"' : ''}>
          <div class="current-video-header">
            <h4> En cours de lecture</h4>
            <span class="current-badge">MAINTENANT</span>
          </div>

          <div class="current-video-card">
            <div class="current-thumbnail">
              ${currentVideo ?
                `<img src="${currentVideo.thumbnail}" alt="${currentVideo.title}">`
                : '<div class="thumbnail-placeholder"></div>'
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
              <div class="empty-icon"></div>
              <p class="empty-title">Playlist vide</p>
              <p class="empty-subtitle">Ajoutez des vidéos YouTube pour commencer</p>
              <button class="empty-action-btn" id="firstAddBtn-${this.salonId}">
                Ajouter votre première vidéo
              </button>
            </div>
          ` : this.videos.map((video, index) => `
            <div class="playlist-item ${index === this.currentVideoIndex ? 'current-item' : ''}"
                 data-video-id="${video.id}" data-index="${index}" data-db-id="${video._dbId || ''}">
              <div class="item-drag-handle">⋮⋮</div>

              <div class="item-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}"
                     onerror="this.src='https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg'">
                ${index === this.currentVideoIndex ?
                  '<div class="playing-indicator"></div>' : ''}
              </div>

              <div class="item-info">
                <div class="item-title" title="${video.title}">
                  ${video.title}
                </div>
                <div class="item-meta">
                  <span class="item-duration">${video.duration}</span>
                  <span class="item-added-by">par ${video.addedBy}</span>
                  <span class="item-time">${video.addedAt || ''}</span>
                </div>
              </div>

              <div class="item-actions">
                <button class="item-action-btn play-btn" title="Lire cette vidéo"></button>
                <button class="item-action-btn remove-btn" title="Supprimer de la playlist"></button>
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
      if (!videoId) throw new Error('URL YouTube invalide');

      const videoData = await this.fetchYouTubeData(videoId);

      const video = {
        id: videoId,
        title: videoData.title,
        thumbnail: videoData.thumbnail,
        duration: videoData.duration,
        url: `https://youtube.com/watch?v=${videoId}`,
        addedBy: addedBy,
        addedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        channel: videoData.channel
      };

      if (this.socket && this.codeAcces && this.userId) {
        this.socket.emit("playlistAdd", {
          codeAcces: this.codeAcces,
          userId: this.userId,
          url_video: video.url,
          titre: video.title,
        });
        return video;
      }

      this.videos.push(video);

      if (this.videos.length === 1) {
        this.currentVideoIndex = 0;
        this.updatePlaylistUI();
        this.emitChangeVideo(video.id);
        return video;
      }

      this.updatePlaylistUI();
      return video;

    } catch (error) {
      console.error('[Playlist] Erreur ajout vidéo:', error);
      alert(error?.message || "Erreur ajout vidéo");
      throw error;
    }
  }

  extractYouTubeId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
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

    await new Promise(resolve => setTimeout(resolve, 150));

    if (knownVideos[videoId]) {
      const [title, duration, channel] = knownVideos[videoId];
      return { title, thumbnail: thumbnailUrl, duration, channel };
    }

    return {
      title: `Vidéo YouTube (${videoId.substring(0, 4)}...)`,
      thumbnail: thumbnailUrl,
      duration: '--:--',
      channel: 'YouTube'
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
    const v = this.getCurrentVideo();
    if (v) this.emitChangeVideo(v.id);
    return v;
  }

  previousVideo() {
    if (this.videos.length === 0) return null;

    this.currentVideoIndex = this.currentVideoIndex > 0
      ? this.currentVideoIndex - 1
      : this.videos.length - 1;

    const v = this.getCurrentVideo();
    if (v) this.emitChangeVideo(v.id);
    return v;
  }

  calculateTotalDuration() {
    if (this.videos.some(v => !v.duration || v.duration === '--:--')) return '--';
    return '--';
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
        if (e.key === 'Enter') submitBtn.click();
      });
    }

    if (prevBtn) prevBtn.addEventListener('click', () => this.previousVideo());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextVideo());

    const itemsContainer = document.getElementById(`items-${this.salonId}`);
    if (itemsContainer) {
      itemsContainer.addEventListener('click', (e) => {
        const playBtn = e.target.closest('.play-btn');
        const removeBtn = e.target.closest('.remove-btn');
        const playlistItem = e.target.closest('.playlist-item');

        if (!playlistItem) return;

        if (playBtn) {
          const index = parseInt(playlistItem.dataset.index);
          this.currentVideoIndex = index;
          this.updatePlaylistUI();

          const v = this.getCurrentVideo();
          if (v) this.emitChangeVideo(v.id);
          return;
        }

        if (removeBtn) {
          const dbId = Number(playlistItem.dataset.dbId);
          if (!dbId) return alert("Impossible de supprimer : id DB manquant.");

          if (confirm("Supprimer cette vidéo de la playlist ?")) {
            this.socket.emit("playlistRemove", { codeAcces: this.codeAcces, itemId: dbId });
          }
        }
      });
    }

    console.log('[Playlist] Event listeners configurés');
  }
}
