class IPTVPlayer {
    constructor() {
        this.video = document.getElementById('video');
        this.channelsList = document.getElementById('channels-list');
        this.searchInput = document.getElementById('search');
        
        // Custom select elements
        this.playlistButton = document.getElementById('playlist-button');
        this.playlistSelected = document.getElementById('playlist-selected');
        this.playlistOptions = document.getElementById('playlist-options');
        this.categoryButton = document.getElementById('category-button');
        this.categorySelected = document.getElementById('category-selected');
        this.categoryOptions = document.getElementById('category-options');
        
        // Mobile elements
        this.mobileChannelsList = document.getElementById('mobile-channels-list');
        this.mobileSearchInput = document.getElementById('mobile-search');
        this.mobilePlaylistButton = document.getElementById('mobile-playlist-button');
        this.mobilePlaylistSelected = document.getElementById('mobile-playlist-selected');
        this.mobilePlaylistOptions = document.getElementById('mobile-playlist-options');
        this.mobileCategoryButton = document.getElementById('mobile-category-button');
        this.mobileCategorySelected = document.getElementById('mobile-category-selected');
        this.mobileCategoryOptions = document.getElementById('mobile-category-options');
        this.mobileSidebar = document.getElementById('mobile-sidebar');
        this.mobileMenu = document.getElementById('mobile-menu');
        this.closeSidebar = document.getElementById('close-sidebar');
        
        // Color extraction elements
        this.canvas = document.getElementById('color-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.body = document.getElementById('dynamic-body');
        this.colorOverlay1 = document.getElementById('color-overlay-1');
        this.colorOverlay2 = document.getElementById('color-overlay-2');
        this.activeOverlay = 1;
        
        this.hls = null;
        this.channels = [];
        this.filteredChannels = [];
        this.currentChannel = null;
        this.currentFile = '';
        this.playlists = [];
        this.colorUpdateInterval = null;
        this.selectedPlaylist = '';
        this.selectedCategory = '';
        
        this.init();
    }

    async init() {
        await this.loadPlaylists();
        this.setupEventListeners();
        this.setupMobileEventListeners();
        if (this.playlists.length > 0) {
            this.currentFile = `public/${this.playlists[0].filename}`;
            await this.loadChannels();
            this.setupFilters();
            this.filteredChannels = [...this.channels];
            this.renderChannels();
        }
    }

    async loadPlaylists() {
        try {
            const response = await fetch('/api/playlists');
            this.playlists = await response.json();
            
            this.populatePlaylistOptions();
            
            if (this.playlists.length > 0) {
                this.selectedPlaylist = this.playlists[0].filename;
                this.playlistSelected.textContent = this.playlists[0].name;
                this.mobilePlaylistSelected.textContent = this.playlists[0].name;
            }
        } catch (error) {
            console.error('Error loading playlists:', error);
            this.playlistSelected.textContent = 'No playlists found';
            this.mobilePlaylistSelected.textContent = 'No playlists found';
        }
    }

    populatePlaylistOptions() {
        const optionsHtml = this.playlists.map(playlist => 
            `<div class="p-3 hover:bg-white/20 cursor-pointer text-white transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl" data-value="${playlist.filename}">${playlist.name}</div>`
        ).join('');
        
        this.playlistOptions.innerHTML = optionsHtml;
        this.mobilePlaylistOptions.innerHTML = optionsHtml;
        
        // Add click listeners to options
        this.playlistOptions.addEventListener('click', (e) => {
            if (e.target.dataset.value) {
                this.selectPlaylist(e.target.dataset.value, e.target.textContent);
            }
        });
        
        this.mobilePlaylistOptions.addEventListener('click', (e) => {
            if (e.target.dataset.value) {
                this.selectPlaylist(e.target.dataset.value, e.target.textContent);
            }
        });
    }

    selectPlaylist(value, text) {
        this.selectedPlaylist = value;
        this.playlistSelected.textContent = text;
        this.mobilePlaylistSelected.textContent = text;
        this.playlistOptions.classList.add('hidden');
        this.mobilePlaylistOptions.classList.add('hidden');
        this.changeFile();
    }

    selectCategory(value, text) {
        this.selectedCategory = value;
        this.categorySelected.textContent = text;
        this.mobileCategorySelected.textContent = text;
        this.categoryOptions.classList.add('hidden');
        this.mobileCategoryOptions.classList.add('hidden');
        this.applyFilters();
    }

    setupMobileEventListeners() {
        this.mobileMenu.addEventListener('click', () => {
            this.mobileSidebar.classList.remove('hidden');
        });
        
        this.closeSidebar.addEventListener('click', () => {
            this.mobileSidebar.classList.add('hidden');
        });
        
        this.mobileFileSelector.addEventListener('change', () => {
            this.fileSelector.value = this.mobileFileSelector.value;
            this.changeFile();
        });
        
        this.mobileSearchInput.addEventListener('input', () => {
            this.searchInput.value = this.mobileSearchInput.value;
            this.applyFilters();
        });
        
        this.mobileFilterSelect.addEventListener('change', () => {
            this.filterSelect.value = this.mobileFilterSelect.value;
            this.applyFilters();
        });

        this.mobileChannelsList.addEventListener('click', (e) => {
            const channelItem = e.target.closest('.channel-item');
            if (channelItem) {
                const index = parseInt(channelItem.dataset.index);
                this.playChannel(index);
                this.mobileSidebar.classList.add('hidden');
            }
        });
    }

    async loadChannels() {
        try {
            const response = await fetch(this.currentFile);
            const m3uContent = await response.text();
            this.channels = this.parseM3U(m3uContent);
        } catch (error) {
            console.error('Error loading channels:', error);
        }
    }

    parseM3U(content) {
        const lines = content.split('\n');
        const channels = [];
        let currentChannel = {};

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                const nameMatch = line.match(/,(.+)$/);
                const groupMatch = line.match(/group-title="([^"]+)"/);
                const logoMatch = line.match(/tvg-logo="([^"]+)"/);
                
                currentChannel = {
                    name: nameMatch ? nameMatch[1] : 'Unknown',
                    group: groupMatch ? groupMatch[1] : 'Undefined',
                    logo: logoMatch ? logoMatch[1] : ''
                };
            } else if (line && !line.startsWith('#') && currentChannel.name) {
                currentChannel.url = line;
                channels.push(currentChannel);
                currentChannel = {};
            }
        }

        return channels;
    }

    setupEventListeners() {
        this.searchInput.addEventListener('input', () => this.applyFilters());
        
        // Custom playlist select
        this.playlistButton.addEventListener('click', () => this.toggleDropdown('playlist'));
        this.categoryButton.addEventListener('click', () => this.toggleDropdown('category'));
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.playlistButton.contains(e.target) && !this.playlistOptions.contains(e.target)) {
                this.playlistOptions.classList.add('hidden');
            }
            if (!this.categoryButton.contains(e.target) && !this.categoryOptions.contains(e.target)) {
                this.categoryOptions.classList.add('hidden');
            }
        });
        
        this.channelsList.addEventListener('click', (e) => {
            const channelItem = e.target.closest('.channel-item');
            if (channelItem) {
                const index = parseInt(channelItem.dataset.index);
                this.playChannel(index);
            }
        });
    }

    setupMobileEventListeners() {
        this.mobileMenu.addEventListener('click', () => {
            this.mobileSidebar.classList.remove('hidden');
        });
        
        this.closeSidebar.addEventListener('click', () => {
            this.mobileSidebar.classList.add('hidden');
        });
        
        this.mobileSearchInput.addEventListener('input', () => {
            this.searchInput.value = this.mobileSearchInput.value;
            this.applyFilters();
        });

        // Mobile custom selects
        this.mobilePlaylistButton.addEventListener('click', () => this.toggleDropdown('mobile-playlist'));
        this.mobileCategoryButton.addEventListener('click', () => this.toggleDropdown('mobile-category'));

        this.mobileChannelsList.addEventListener('click', (e) => {
            const channelItem = e.target.closest('.channel-item');
            if (channelItem) {
                const index = parseInt(channelItem.dataset.index);
                this.playChannel(index);
                this.mobileSidebar.classList.add('hidden');
            }
        });
    }

    toggleDropdown(type) {
        const dropdowns = {
            'playlist': this.playlistOptions,
            'category': this.categoryOptions,
            'mobile-playlist': this.mobilePlaylistOptions,
            'mobile-category': this.mobileCategoryOptions
        };
        
        const dropdown = dropdowns[type];
        dropdown.classList.toggle('hidden');
    }

    setupFilters() {
        const groups = [...new Set(this.channels.map(ch => ch.group))].sort();
        const optionsHtml = '<div class="p-3 hover:bg-white/20 cursor-pointer text-white transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl" data-value="">All Categories</div>' + 
            groups.map(group => `<div class="p-3 hover:bg-white/20 cursor-pointer text-white transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl" data-value="${group}">${group}</div>`).join('');
        
        this.categoryOptions.innerHTML = optionsHtml;
        this.mobileCategoryOptions.innerHTML = optionsHtml;
        
        // Add click listeners to category options
        this.categoryOptions.addEventListener('click', (e) => {
            if (e.target.dataset.value !== undefined) {
                this.selectCategory(e.target.dataset.value, e.target.textContent);
            }
        });
        
        this.mobileCategoryOptions.addEventListener('click', (e) => {
            if (e.target.dataset.value !== undefined) {
                this.selectCategory(e.target.dataset.value, e.target.textContent);
            }
        });
    }

    async changeFile() {
        this.currentFile = `public/${this.selectedPlaylist}`;
        this.searchInput.value = '';
        this.mobileSearchInput.value = '';
        this.selectedCategory = '';
        this.categorySelected.textContent = 'All Categories';
        this.mobileCategorySelected.textContent = 'All Categories';
        
        await this.loadChannels();
        this.setupFilters();
        this.filteredChannels = [...this.channels];
        this.renderChannels();
    }

    applyFilters() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const selectedGroup = this.selectedCategory;

        this.filteredChannels = this.channels.filter(channel => {
            const matchesSearch = channel.name.toLowerCase().includes(searchTerm);
            const matchesGroup = !selectedGroup || channel.group === selectedGroup;
            return matchesSearch && matchesGroup;
        });

        this.renderChannels();
    }

    renderChannels() {
        if (this.filteredChannels.length === 0) {
            const noChannelsHtml = '<div class="text-center text-white/60 py-8 font-medium">No channels found</div>';
            this.channelsList.innerHTML = noChannelsHtml;
            if (this.mobileChannelsList) this.mobileChannelsList.innerHTML = noChannelsHtml;
            return;
        }

        const channelsHtml = this.filteredChannels.map((channel) => `
            <div class="channel-item bg-black/20 backdrop-blur-xl hover:bg-black/30 hover:shadow-xl p-4 rounded-2xl cursor-pointer transition-all duration-300 group border border-white/10 hover:border-white/20" 
                 data-index="${this.channels.indexOf(channel)}">
                <div class="flex items-center gap-4">
                    <div class="flex-shrink-0">
                        ${channel.logo ? 
                            `<img src="${channel.logo}" alt="${channel.name}" class="w-12 h-12 rounded-xl object-contain bg-white/5 shadow-lg group-hover:shadow-xl transition-all border border-white/20" onerror="this.style.display='none'">` : 
                            `<div class="w-12 h-12 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center text-white font-semibold text-lg shadow-lg group-hover:shadow-xl transition-all border border-white/20">${channel.name.charAt(0).toUpperCase()}</div>`
                        }
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="channel-name font-semibold text-white truncate group-hover:text-white/90 transition-colors">${channel.name}</div>
                        <div class="channel-group text-sm text-white/60 truncate mt-1 group-hover:text-white/70 transition-colors">${channel.group}</div>
                    </div>
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div class="w-2 h-2 bg-white/60 rounded-full"></div>
                    </div>
                </div>
            </div>
        `).join('');

        this.channelsList.innerHTML = channelsHtml;
        if (this.mobileChannelsList) {
            this.mobileChannelsList.innerHTML = channelsHtml;
        }
    }

    playChannel(index) {
        const channel = this.channels[index];
        if (!channel) return;

        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('bg-white/30', 'border-white/40', 'shadow-2xl');
            item.classList.add('bg-black/20', 'border-white/10');
        });
        
        const activeItem = document.querySelector(`[data-index="${index}"]`);
        if (activeItem) {
            activeItem.classList.remove('bg-black/20', 'border-white/10');
            activeItem.classList.add('bg-white/30', 'border-white/40', 'shadow-2xl');
        }

        // Update current channel display
        const currentChannelDiv = document.getElementById('current-channel');
        const currentLogo = document.getElementById('current-logo');
        const currentName = document.getElementById('current-name');
        
        currentName.textContent = channel.name;
        if (channel.logo) {
            currentLogo.src = channel.logo;
            currentLogo.style.display = 'block';
        } else {
            currentLogo.style.display = 'none';
        }
        currentChannelDiv.classList.remove('hidden');

        this.currentChannel = channel;
        this.loadStream(channel.url);
        this.startColorExtraction();
    }

    startColorExtraction() {
        if (this.colorUpdateInterval) {
            clearInterval(this.colorUpdateInterval);
        }

        // Set initial gradient immediately
        this.setRandomGradient();

        // Wait for video to start playing
        const startExtraction = () => {
            this.colorUpdateInterval = setInterval(() => {
                this.extractColors();
            }, 4000); // Update every 4 seconds
        };

        if (this.video.readyState >= 2) {
            setTimeout(startExtraction, 1000); // Start after 1 second
        } else {
            this.video.addEventListener('canplay', () => {
                setTimeout(startExtraction, 1000);
            }, { once: true });
        }
    }

    extractColors() {
        if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
            this.setRandomGradient();
            return;
        }

        try {
            // Set canvas size (smaller for performance)
            this.canvas.width = 120;
            this.canvas.height = 68;

            // Draw current video frame to canvas
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

            // Get image data
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = imageData.data;

            // Simple color extraction - sample pixels
            const colors = this.sampleColors(data);
            this.updateBackgroundSmooth(colors[0], colors[1]);
        } catch (error) {
            console.log('Color extraction failed, using random gradient');
            this.setRandomGradient();
        }
    }

    sampleColors(data) {
        const colorMap = new Map();
        const sampleSize = 1000;
        
        // Sample more pixels for better accuracy
        for (let i = 0; i < sampleSize; i++) {
            const index = Math.floor(Math.random() * (data.length / 4)) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            
            // Skip very dark, very bright, or gray pixels
            const brightness = (r + g + b) / 3;
            const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1);
            
            if (brightness > 50 && brightness < 200 && saturation > 0.3) {
                // Quantize colors to reduce noise
                const qR = Math.floor(r / 15) * 15;
                const qG = Math.floor(g / 15) * 15;
                const qB = Math.floor(b / 15) * 15;
                const key = `${qR},${qG},${qB}`;
                
                colorMap.set(key, (colorMap.get(key) || 0) + 1);
            }
        }

        // Get top colors by frequency
        const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([color]) => color.split(',').map(Number));

        if (sortedColors.length >= 2) {
            // Find two most contrasting colors
            let maxDistance = 0;
            let bestPair = [sortedColors[0], sortedColors[1]];
            
            for (let i = 0; i < sortedColors.length; i++) {
                for (let j = i + 1; j < sortedColors.length; j++) {
                    const distance = this.colorDistance(sortedColors[i], sortedColors[j]);
                    if (distance > maxDistance) {
                        maxDistance = distance;
                        bestPair = [sortedColors[i], sortedColors[j]];
                    }
                }
            }
            
            return bestPair;
        }
        
        // If no good colors found, use video-based fallback
        return this.getVideoBasedColors(data);
    }

    colorDistance(color1, color2) {
        const [r1, g1, b1] = color1;
        const [r2, g2, b2] = color2;
        return Math.sqrt((r2-r1)**2 + (g2-g1)**2 + (b2-b1)**2);
    }

    getVideoBasedColors(data) {
        // Analyze overall video tone
        let totalR = 0, totalG = 0, totalB = 0, count = 0;
        
        for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            if ((r + g + b) / 3 > 30) { // Skip very dark pixels
                totalR += r;
                totalG += g;
                totalB += b;
                count++;
            }
        }
        
        if (count > 0) {
            const avgR = Math.floor(totalR / count);
            const avgG = Math.floor(totalG / count);
            const avgB = Math.floor(totalB / count);
            
            // Create complementary color
            const compR = Math.min(255, Math.max(0, 255 - avgR + 50));
            const compG = Math.min(255, Math.max(0, 255 - avgG + 50));
            const compB = Math.min(255, Math.max(0, 255 - avgB + 50));
            
            return [[avgR, avgG, avgB], [compR, compG, compB]];
        }
        
        // Final fallback - use current time-based colors
        return this.getRandomColorPair();
    }

    getRandomColorPair() {
        const colorPairs = [
            [[88, 86, 214], [219, 39, 119]], // Purple to Pink
            [[59, 130, 246], [147, 51, 234]], // Blue to Purple
            [[34, 197, 94], [59, 130, 246]], // Green to Blue
            [[249, 115, 22], [239, 68, 68]], // Orange to Red
            [[168, 85, 247], [236, 72, 153]], // Purple to Pink
            [[14, 165, 233], [34, 197, 94]], // Sky to Green
            [[251, 146, 60], [220, 38, 127]], // Orange to Pink
            [[99, 102, 241], [139, 92, 246]], // Indigo to Violet
        ];
        
        return colorPairs[Math.floor(Math.random() * colorPairs.length)];
    }

    setRandomGradient() {
        const [primary, secondary] = this.getRandomColorPair();
        this.updateBackgroundSmooth(primary, secondary);
    }

    updateBackgroundSmooth(primary, secondary) {
        const [r1, g1, b1] = primary;
        const [r2, g2, b2] = secondary;
        
        // Keep colors vibrant but not overwhelming
        const vibrantR1 = Math.min(255, Math.floor(r1 * 0.9 + 20));
        const vibrantG1 = Math.min(255, Math.floor(g1 * 0.9 + 20));
        const vibrantB1 = Math.min(255, Math.floor(b1 * 0.9 + 20));
        
        const vibrantR2 = Math.min(255, Math.floor(r2 * 0.9 + 20));
        const vibrantG2 = Math.min(255, Math.floor(g2 * 0.9 + 20));
        const vibrantB2 = Math.min(255, Math.floor(b2 * 0.9 + 20));
        
        // Create gradient for overlay
        const gradient = `linear-gradient(135deg, 
            rgba(${vibrantR1}, ${vibrantG1}, ${vibrantB1}, 0.7) 0%, 
            rgba(${vibrantR2}, ${vibrantG2}, ${vibrantB2}, 0.5) 50%, 
            rgba(${Math.floor((vibrantR1 + vibrantR2) / 2)}, ${Math.floor((vibrantG1 + vibrantG2) / 2)}, ${Math.floor((vibrantB1 + vibrantB2) / 2)}, 0.3) 100%)`;
        
        // Use alternating overlays for smooth transitions
        const currentOverlay = this.activeOverlay === 1 ? this.colorOverlay1 : this.colorOverlay2;
        const nextOverlay = this.activeOverlay === 1 ? this.colorOverlay2 : this.colorOverlay1;
        
        // Set new gradient on next overlay
        nextOverlay.style.background = gradient;
        
        // Fade in next overlay
        setTimeout(() => {
            nextOverlay.classList.add('active');
        }, 50);
        
        // Fade out current overlay after transition starts
        setTimeout(() => {
            currentOverlay.classList.remove('active');
        }, 1000);
        
        // Switch active overlay
        this.activeOverlay = this.activeOverlay === 1 ? 2 : 1;
    }

    loadStream(url) {
        if (this.hls) {
            this.hls.destroy();
        }

        if (Hls.isSupported()) {
            this.hls = new Hls({
                enableWorker: false,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            
            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.video.play().catch(e => console.log('Autoplay prevented'));
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS Error:', data);
                if (data.fatal) {
                    this.handleError();
                }
            });
        } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            this.video.src = url;
            this.video.play().catch(e => console.log('Autoplay prevented'));
        } else {
            console.error('HLS not supported');
        }
    }

    handleError() {
        console.log('Stream error, attempting to reload...');
        setTimeout(() => {
            if (this.currentChannel) {
                this.loadStream(this.currentChannel.url);
            }
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new IPTVPlayer();
});
