// ========== تكوين المصادر ==========
// المصدر 1: GogoAnime (Consumet API)
// المصدر 2: HiAnime (Shirayuki API)

const SOURCES = {
    gogoanime: {
        name: 'GogoAnime',
        apiBase: 'https://api.consumet.org/anime/gogoanime',
        search: (query) => `/search?keyw=${encodeURIComponent(query)}`,
        info: (id) => `/info/${id}`,
        watch: (id) => `/watch/${id}`
    },
    hianime: {
        name: 'HiAnime',
        apiBase: 'https://shirayuki-anime-scraper-api.onrender.com', // مصدر بديل
        search: (query) => `/search?keyword=${encodeURIComponent(query)}`,
        info: (slug) => `/anime/${slug}`,
        watch: (id, ep) => `/episode-stream?id=${id}&ep=${ep}`
    }
};

let currentSource = 'gogoanime';
let currentAnime = null;
let currentEpisodes = [];
let currentEpisodeIndex = 0;
let currentPlayer = null;

// ========== وظائف API ==========
async function fetchFromAPI(endpoint, source = currentSource) {
    try {
        const config = SOURCES[source];
        const response = await fetch(`${config.apiBase}${endpoint}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`خطأ في ${source}:`, error);
        return null;
    }
}

// البحث عن الأنمي
async function searchAnime(query) {
    const config = SOURCES[currentSource];
    const endpoint = config.search(query);
    const data = await fetchFromAPI(endpoint);
    
    if (currentSource === 'gogoanime') {
        return data?.results || [];
    } else if (currentSource === 'hianime') {
        return data?.data || [];
    }
    return [];
}

// جلب تفاصيل الأنمي والحلقات
async function getAnimeDetails(id) {
    const config = SOURCES[currentSource];
    const endpoint = config.info(id);
    const data = await fetchFromAPI(endpoint);
    
    if (currentSource === 'gogoanime') {
        return {
            title: data?.title,
            episodes: data?.episodes || [],
            image: data?.image,
            description: data?.description,
            status: data?.status,
            type: data?.type
        };
    } else if (currentSource === 'hianime') {
        return {
            title: data?.data?.title,
            episodes: data?.data?.episodes || [],
            image: data?.data?.image,
            description: data?.data?.description,
            status: data?.data?.status,
            type: data?.data?.type
        };
    }
    return null;
}

// جلب رابط المشاهدة
async function getWatchLink(episodeId, episodeNum = 1) {
    const config = SOURCES[currentSource];
    
    if (currentSource === 'gogoanime') {
        const endpoint = config.watch(episodeId);
        const data = await fetchFromAPI(endpoint);
        // استخراج رابط الفيديو من البيانات
        if (data?.sources && data.sources.length > 0) {
            return data.sources[0].url;
        }
        return null;
    } else if (currentSource === 'hianime') {
        const endpoint = config.watch(episodeId, episodeNum);
        const data = await fetchFromAPI(endpoint);
        if (data?.success && data?.data?.streaming_link) {
            return data.data.streaming_link;
        }
        return null;
    }
    return null;
}

// جلب أفضل 10 أنمي
async function fetchTopRanking(type = 'daily') {
    // مصدر مؤقت لتصنيفات HiAnime
    try {
        const response = await fetch(`https://shirayuki-anime-scraper-api.onrender.com/${type}10`);
        const data = await response.json();
        return data?.data || [];
    } catch (error) {
        console.error('خطأ في جلب الترتيب:', error);
        // بيانات احتياطية
        return [
            { title: "One Piece", episodes: "1122", rating: "9.0" },
            { title: "Attack on Titan", episodes: "87", rating: "8.9" },
            { title: "Demon Slayer", episodes: "44", rating: "8.8" },
            { title: "Jujutsu Kaisen", episodes: "47", rating: "8.7" },
            { title: "Naruto Shippuden", episodes: "500", rating: "8.6" },
            { title: "Death Note", episodes: "37", rating: "8.6" },
            { title: "Fullmetal Alchemist", episodes: "64", rating: "8.5" },
            { title: "Tokyo Ghoul", episodes: "24", rating: "8.2" },
            { title: "My Hero Academia", episodes: "138", rating: "8.1" },
            { title: "Spy x Family", episodes: "37", rating: "8.4" }
        ];
    }
}

// ========== عرض الواجهة ==========
async function displayAnimeList(query = '') {
    const grid = document.getElementById('animeGrid');
    grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>جاري البحث...</p></div>';
    
    let animeList = [];
    if (query) {
        animeList = await searchAnime(query);
    } else {
        // عرض أنميات افتراضية عند التحميل الأول
        animeList = await searchAnime('popular');
    }
    
    if (!animeList || animeList.length === 0) {
        grid.innerHTML = '<div class="loading-spinner"><p>❌ لا توجد نتائج</p></div>';
        return;
    }
    
    grid.innerHTML = '';
    animeList.slice(0, 24).forEach(anime => {
        const card = document.createElement('div');
        card.className = 'anime-card';
        
        const animeId = currentSource === 'gogoanime' ? anime.id : anime.anime_id || anime.slug;
        const title = currentSource === 'gogoanime' ? anime.title : anime.title;
        const releaseDate = anime.releaseDate || anime.released || '2024';
        const episodeCount = anime.episodes || '?';
        
        card.innerHTML = `
            <div class="card-image">🎬</div>
            <div class="card-content">
                <h3>${title}</h3>
                <div class="info">
                    <span class="type">${anime.type || 'TV'}</span>
                    <span>📅 ${releaseDate}</span>
                    <span>📺 ${episodeCount} حلقة</span>
                </div>
                <div class="rating">⭐ ${anime.rating || 'غير معروف'}</div>
            </div>
        `;
        card.onclick = () => openAnimeDetails(animeId, title);
        grid.appendChild(card);
    });
}

// فتح تفاصيل الأنمي والحلقات
async function openAnimeDetails(animeId, title) {
    const modal = document.getElementById('detailsModal');
    const detailsDiv = document.getElementById('animeDetails');
    const episodesDiv = document.getElementById('episodesList');
    
    modal.style.display = 'flex';
    detailsDiv.innerHTML = '<div class="loading-spinner">جاري التحميل...</div>';
    episodesDiv.innerHTML = '';
    
    const details = await getAnimeDetails(animeId);
    currentAnime = { id: animeId, title, details };
    currentEpisodes = details?.episodes || [];
    
    detailsDiv.innerHTML = `
        <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
                <h2>${details.title || title}</h2>
                <p><strong>الحالة:</strong> ${details.status || 'غير معروف'}</p>
                <p><strong>النوع:</strong> ${details.type || 'TV'}</p>
                <p><strong>عدد الحلقات:</strong> ${currentEpisodes.length}</p>
                <p>${details.description || 'لا يوجد وصف'}</p>
            </div>
        </div>
    `;
    
    // عرض الحلقات
    episodesDiv.innerHTML = '';
    currentEpisodes.forEach((ep, idx) => {
        const epNum = ep.number || ep.episode_number || (idx + 1);
        const epBtn = document.createElement('button');
        epBtn.className = 'episode-btn';
        epBtn.textContent = `حلقة ${epNum}`;
        epBtn.onclick = () => playEpisode(ep, idx);
        episodesDiv.appendChild(epBtn);
    });
    
    if (currentEpisodes.length === 0) {
        episodesDiv.innerHTML = '<p style="text-align:center;">لا توجد حلقات متاحة</p>';
    }
}

// تشغيل الحلقة
async function playEpisode(episode, index) {
    currentEpisodeIndex = index;
    const playerModal = document.getElementById('playerModal');
    const episodeTitle = document.getElementById('episodeTitle');
    const episodeCounter = document.getElementById('episodeCounter');
    
    const epNum = episode.number || episode.episode_number || (index + 1);
    episodeTitle.textContent = `${currentAnime.title} - الحلقة ${epNum}`;
    episodeCounter.textContent = `الحلقة ${epNum}`;
    
    playerModal.style.display = 'flex';
    
    // إغلاق المشغل القديم
    if (currentPlayer) {
        currentPlayer.dispose();
    }
    
    // جلب رابط المشاهدة
    let episodeId = episode.id || episode.episode_id || episode.episodeId;
    if (!episodeId && currentSource === 'gogoanime') {
        episodeId = episodeId || `${currentAnime.id}-episode-${epNum}`;
    }
    
    const videoUrl = await getWatchLink(episodeId, epNum);
    
    const videoElement = document.getElementById('animePlayer');
    videoElement.innerHTML = '';
    
    if (videoUrl) {
        currentPlayer = videojs('animePlayer', {
            controls: true,
            autoplay: true,
            preload: 'auto',
            fluid: true,
            sources: [{ src: videoUrl, type: 'video/mp4' }]
        });
    } else {
        alert('فشل تحميل الفيديو. جرب سيرفر آخر أو تأكد من اتصالك بالإنترنت.');
        videoElement.innerHTML = '<source src="" type="video/mp4">';
    }
}

// عرض أفضل 10
async function displayTopRanking(type = 'daily') {
    const rankingDiv = document.getElementById('rankingList');
    rankingDiv.innerHTML = '<div class="loading-spinner">جاري التحميل...</div>';
    
    const rankings = await fetchTopRanking(type);
    
    rankingDiv.innerHTML = '';
    rankings.slice(0, 10).forEach((item, idx) => {
        const rankItem = document.createElement('div');
        rankItem.className = 'rank-item';
        rankItem.innerHTML = `
            <div class="rank-number">#${idx + 1}</div>
            <div class="rank-info">
                <h4>${item.title}</h4>
                <p>${item.episodes ? item.episodes + ' حلقة' : ''} ${item.rating ? '⭐ ' + item.rating : ''}</p>
            </div>
        `;
        rankingDiv.appendChild(rankItem);
    });
}

// ========== أحداث المستخدم ==========
// تبديل المصدر
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSource = btn.dataset.source;
        displayAnimeList('');
    });
});

// تبديل الترتيب
document.querySelectorAll('.rank-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        displayTopRanking(btn.dataset.rank);
    });
});

// البحث
document.getElementById('searchBtn').addEventListener('click', () => {
    const query = document.getElementById('searchInput').value.trim();
    if (query) displayAnimeList(query);
});

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query) displayAnimeList(query);
    }
});

// إغلاق النوافذ
document.querySelectorAll('.close-modal').forEach(close => {
    close.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
        if (currentPlayer) {
            currentPlayer.pause();
        }
    });
});

window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        if (currentPlayer) currentPlayer.pause();
    }
};

// أزرار التنقل بين الحلقات
document.getElementById('prevEpisode')?.addEventListener('click', () => {
    if (currentEpisodeIndex > 0) {
        playEpisode(currentEpisodes[currentEpisodeIndex - 1], currentEpisodeIndex - 1);
    }
});

document.getElementById('nextEpisode')?.addEventListener('click', () => {
    if (currentEpisodeIndex < currentEpisodes.length - 1) {
        playEpisode(currentEpisodes[currentEpisodeIndex + 1], currentEpisodeIndex + 1);
    }
});

// تبديل السيرفر
document.getElementById('serverSelect')?.addEventListener('change', async (e) => {
    if (currentEpisodes.length > 0 && currentEpisodeIndex >= 0) {
        alert('جاري تغيير السيرفر... أعاد تشغيل الحلقة');
        await playEpisode(currentEpisodes[currentEpisodeIndex], currentEpisodeIndex);
    }
});

// ========== التحميل الأولي ==========
window.onload = () => {
    displayAnimeList('');
    displayTopRanking('daily');
};