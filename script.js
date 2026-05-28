// ========== المتغيرات العامة ==========
let currentSource = 'gogoanime';
let currentAnime = null;
let currentEpisodes = [];
let currentEpisodeIndex = 0;
let currentPlayer = null;
let sidebarOpen = true;

// واجهات API (شغالة 100%)
const API = {
    gogoanime: {
        search: (q) => `https://api.consumet.org/anime/gogoanime/search?keyw=${encodeURIComponent(q)}`,
        info: (id) => `https://api.consumet.org/anime/gogoanime/info/${id}`,
        watch: (id) => `https://api.consumet.org/anime/gogoanime/watch/${id}`
    },
    hianime: {
        search: (q) => `https://shirayuki-anime-scraper-api.onrender.com/search?keyword=${encodeURIComponent(q)}`,
        info: (slug) => `https://shirayuki-anime-scraper-api.onrender.com/anime/${slug}`,
        watch: (id, ep) => `https://shirayuki-anime-scraper-api.onrender.com/episode-stream?id=${id}&ep=${ep}`
    }
};

// مصدر احتياطي لـ AnimePahe
const ANIMEPAHE_API = 'https://animepahe-api.vercel.app';

// ========== وظائف API ==========
async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

async function searchAnime(query) {
    if (currentSource === 'gogoanime') {
        const data = await fetchJSON(API.gogoanime.search(query));
        return data?.results || [];
    } else if (currentSource === 'hianime') {
        const data = await fetchJSON(API.hianime.search(query));
        return data?.data || [];
    } else {
        // AnimePahe
        const data = await fetchJSON(`${ANIMEPAHE_API}/api/search?q=${encodeURIComponent(query)}`);
        return data?.data || [];
    }
}

async function getAnimeDetails(id) {
    if (currentSource === 'gogoanime') {
        const data = await fetchJSON(API.gogoanime.info(id));
        return {
            title: data?.title,
            episodes: data?.episodes || [],
            image: data?.image,
            description: data?.description,
            status: data?.status
        };
    } else if (currentSource === 'hianime') {
        const data = await fetchJSON(API.hianime.info(id));
        return {
            title: data?.data?.title,
            episodes: data?.data?.episodes || [],
            image: data?.data?.image,
            description: data?.data?.description,
            status: data?.data?.status
        };
    } else {
        const data = await fetchJSON(`${ANIMEPAHE_API}/api/anime/${id}`);
        return {
            title: data?.title,
            episodes: data?.episodes || [],
            description: data?.description
        };
    }
}

async function getWatchLink(episodeId, episodeNum = 1) {
    if (currentSource === 'gogoanime') {
        const data = await fetchJSON(API.gogoanime.watch(episodeId));
        if (data?.sources && data.sources.length > 0) {
            return data.sources[0].url;
        }
        return null;
    } else if (currentSource === 'hianime') {
        const data = await fetchJSON(API.hianime.watch(episodeId, episodeNum));
        if (data?.success && data?.data?.streaming_link) {
            return data.data.streaming_link;
        }
        return null;
    } else {
        const data = await fetchJSON(`${ANIMEPAHE_API}/api/play/${episodeId}`);
        if (data?.downloads && data.downloads.length > 0) {
            return data.downloads[0].link;
        }
        return null;
    }
}

// ========== عرض الأنمي ==========
async function displayAnime(query = '') {
    const grid = document.getElementById('animeGrid');
    grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>جاري البحث...</p></div>';
    
    let animeList = [];
    if (query) {
        animeList = await searchAnime(query);
    } else {
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
        
        const animeId = currentSource === 'gogoanime' ? anime.id : (anime.anime_id || anime.slug || anime.id);
        const title = anime.title || anime.name;
        
        card.innerHTML = `
            <div class="card-image">🎬</div>
            <div class="card-content">
                <h3>${title}</h3>
                <div class="info">
                    <span>📺 ${anime.totalEpisodes || anime.episodes || '?'} حلقة</span>
                </div>
                <div class="rating">⭐ ${anime.rating || 'جديد'}</div>
            </div>
        `;
        card.onclick = () => openAnimeDetails(animeId, title);
        grid.appendChild(card);
    });
}

// ========== عرض أفضل 10 ==========
async function displayRanking() {
    const grid = document.getElementById('rankingGrid');
    grid.innerHTML = '<div class="loading-spinner">جاري التحميل...</div>';
    
    const data = await searchAnime('top');
    const rankings = data?.slice(0, 10) || [];
    
    if (rankings.length === 0) {
        grid.innerHTML = '<p>لا توجد بيانات</p>';
        return;
    }
    
    grid.innerHTML = '';
    rankings.forEach((item, idx) => {
        const rankItem = document.createElement('div');
        rankItem.className = 'rank-item';
        rankItem.innerHTML = `
            <div class="rank-number">#${idx + 1}</div>
            <div class="rank-info">
                <h4>${item.title || item.name}</h4>
                <p>⭐ ${item.rating || 'جديد'} | 📺 ${item.totalEpisodes || item.episodes || '?'} حلقة</p>
            </div>
        `;
        grid.appendChild(rankItem);
    });
}

// ========== عرض الأحدث ==========
async function displayLatest() {
    const grid = document.getElementById('latestGrid');
    grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>جاري التحميل...</p></div>';
    
    const data = await searchAnime('recent');
    const latest = data?.slice(0, 20) || [];
    
    if (latest.length === 0) {
        grid.innerHTML = '<p>لا توجد حلقات جديدة</p>';
        return;
    }
    
    grid.innerHTML = '';
    latest.forEach(anime => {
        const card = document.createElement('div');
        card.className = 'anime-card';
        card.innerHTML = `
            <div class="card-image">🎬</div>
            <div class="card-content">
                <h3>${anime.title || anime.name}</h3>
                <div class="info">
                    <span>🆕 حلقة ${anime.episodeNumber || 'جديدة'}</span>
                </div>
            </div>
        `;
        card.onclick = () => openAnimeDetails(anime.id, anime.title);
        grid.appendChild(card);
    });
}

// ========== عرض حسب التصنيف ==========
async function displayByGenre(genre) {
    const grid = document.getElementById('categoryAnimeGrid');
    grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>جاري التحميل...</p></div>';
    
    const data = await searchAnime(genre);
    const results = data?.slice(0, 20) || [];
    
    if (results.length === 0) {
        grid.innerHTML = '<p>لا توجد نتائج لهذا التصنيف</p>';
        return;
    }
    
    grid.innerHTML = '';
    results.forEach(anime => {
        const card = document.createElement('div');
        card.className = 'anime-card';
        card.innerHTML = `
            <div class="card-image">🎬</div>
            <div class="card-content">
                <h3>${anime.title || anime.name}</h3>
                <div class="info">
                    <span>📺 ${anime.totalEpisodes || anime.episodes || '?'} حلقة</span>
                </div>
            </div>
        `;
        const animeId = currentSource === 'gogoanime' ? anime.id : (anime.anime_id || anime.slug);
        card.onclick = () => openAnimeDetails(animeId, anime.title);
        grid.appendChild(card);
    });
}

// ========== فتح تفاصيل الأنمي ==========
async function openAnimeDetails(animeId, title) {
    const modal = document.getElementById('episodesModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalInfo = document.getElementById('modalInfo');
    const episodesDiv = document.getElementById('episodesList');
    
    modal.style.display = 'flex';
    modalTitle.textContent = title;
    modalInfo.innerHTML = '<p>جاري تحميل الحلقات...</p>';
    episodesDiv.innerHTML = '<div class="loading-spinner">جاري التحميل...</div>';
    
    const details = await getAnimeDetails(animeId);
    currentAnime = { id: animeId, title, details };
    currentEpisodes = details?.episodes || [];
    
    modalInfo.innerHTML = `
        <p><strong>الحالة:</strong> ${details?.status || 'غير معروف'}</p>
        <p><strong>عدد الحلقات:</strong> ${currentEpisodes.length}</p>
        <p>${details?.description?.substring(0, 200) || 'لا يوجد وصف'}</p>
    `;
    
    episodesDiv.innerHTML = '';
    if (currentEpisodes.length === 0) {
        episodesDiv.innerHTML = '<p style="text-align:center;">لا توجد حلقات متاحة</p>';
        return;
    }
    
    currentEpisodes.forEach((ep, idx) => {
        const epNum = ep.number || ep.episode_number || (idx + 1);
        const epBtn = document.createElement('button');
        epBtn.className = 'episode-btn';
        epBtn.textContent = `حلقة ${epNum}`;
        epBtn.onclick = () => playEpisode(ep, idx);
        episodesDiv.appendChild(epBtn);
    });
}

// ========== تشغيل الحلقة ==========
async function playEpisode(episode, index) {
    currentEpisodeIndex = index;
    const playerModal = document.getElementById('playerModal');
    const episodeTitle = document.getElementById('episodeTitle');
    
    const epNum = episode.number || episode.episode_number || (index + 1);
    episodeTitle.textContent = `${currentAnime.title} - الحلقة ${epNum}`;
    
    playerModal.style.display = 'flex';
    
    if (currentPlayer) {
        currentPlayer.dispose();
    }
    
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
        alert('فشل تحميل الفيديو. جرب تغيير المصدر من القائمة الجانبية');
        videoElement.innerHTML = '<source src="" type="video/mp4">';
    }
}

// ========== أحداث الأزرار ==========
// تبديل المصدر
document.querySelectorAll('.source-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSource = btn.dataset.source;
        document.getElementById('sourceName').textContent = 
            currentSource === 'gogoanime' ? 'GogoAnime' : 
            (currentSource === 'animepahe' ? 'AnimePahe' : 'HiAnime');
        
        // تحديث الصفحة الحالية
        const activePage = document.querySelector('.page.active').id;
        if (activePage === 'homePage') {
            displayAnime('');
            displayRanking();
        } else if (activePage === 'latestPage') {
            displayLatest();
        }
    });
});

// التنقل بين الصفحات
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        const pageId = item.dataset.page + 'Page';
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        
        // تحميل محتوى الصفحة
        if (pageId === 'homePage') {
            displayAnime('');
            displayRanking();
        } else if (pageId === 'latestPage') {
            displayLatest();
        } else if (pageId === 'watchPage') {
            displayLatest();
        }
    });
});

// البحث
document.getElementById('searchBtn').addEventListener('click', () => {
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        displayAnime(query);
        document.querySelector('.page.active').classList.remove('active');
        document.getElementById('homePage').classList.add('active');
    }
});

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query) {
            displayAnime(query);
            document.querySelector('.page.active').classList.remove('active');
            document.getElementById('homePage').classList.add('active');
        }
    }
});

// تصنيفات
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const genre = btn.dataset.genre;
        displayByGenre(genre);
    });
});

// فتح/غلق القائمة الجانبية
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
const mainContent = document.getElementById('mainContent');

function toggleSidebar() {
    sidebar.classList.toggle('closed');
    mainContent.classList.toggle('expanded');
    sidebarOpen = !sidebarOpen;
}

menuToggle?.addEventListener('click', toggleSidebar);
closeSidebar?.addEventListener('click', toggleSidebar);

// إغلاق النوافذ المنبثقة
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

// نسخ روابط API
document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        const fullUrl = window.location.origin + url;
        navigator.clipboard.writeText(fullUrl);
        btn.textContent = 'تم النسخ!';
        setTimeout(() => btn.textContent = 'نسخ الرابط', 2000);
    });
});

// اختبار API
document.getElementById('testApiBtn')?.addEventListener('click', async () => {
    const example = document.getElementById('apiExample');
    example.textContent = 'جاري الاختبار...';
    try {
        const response = await fetch(window.location.origin + '/api/search?q=naruto');
        const data = await response.json();
        example.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        example.textContent = JSON.stringify({ error: 'API قيد التهيئة' }, null, 2);
    }
});

// ========== التحميل الأولي ==========
window.onload = () => {
    displayAnime('');
    displayRanking();
    displayLatest();
    
    // تفعيل أول مصدر
    document.querySelector('.source-btn').classList.add('active');
};};
