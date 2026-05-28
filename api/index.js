// API Endpoints للبوتات - Vercel Serverless Function
// النقاط المتاحة:
// GET /api/search?q=naruto
// GET /api/anime/:id
// GET /api/episodes/:id
// GET /api/random
// GET /api/trending

const SOURCES = {
    gogoanime: 'https://api.consumet.org/anime/gogoanime',
    hianime: 'https://shirayuki-anime-scraper-api.onrender.com'
};

async function fetchAPI(url) {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        return { error: error.message };
    }
}

export default async function handler(req, res) {
    // إعدادات CORS للسماح للبوتات
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { path, query } = req.query;
    const urlParts = req.url.split('/').filter(p => p);
    
    // ========== نقاط API ==========
    
    // GET /api/search?q=naruto
    if (urlParts.includes('search') && query.q) {
        const data = await fetchAPI(`${SOURCES.gogoanime}/search?keyw=${encodeURIComponent(query.q)}`);
        return res.status(200).json({
            success: true,
            source: 'AnimeHub API',
            total: data?.results?.length || 0,
            results: data?.results || []
        });
    }
    
    // GET /api/anime/:id
    if (urlParts.includes('anime') && urlParts.length > 2) {
        const animeId = urlParts[urlParts.indexOf('anime') + 1];
        const data = await fetchAPI(`${SOURCES.gogoanime}/info/${animeId}`);
        return res.status(200).json({
            success: true,
            data: {
                id: animeId,
                title: data?.title,
                image: data?.image,
                description: data?.description,
                status: data?.status,
                type: data?.type,
                totalEpisodes: data?.totalEpisodes,
                episodes: data?.episodes?.map(ep => ({
                    id: ep.id,
                    number: ep.number,
                    title: ep.title
                }))
            }
        });
    }
    
    // GET /api/episodes/:animeId
    if (urlParts.includes('episodes') && urlParts.length > 2) {
        const animeId = urlParts[urlParts.indexOf('episodes') + 1];
        const data = await fetchAPI(`${SOURCES.gogoanime}/info/${animeId}`);
        return res.status(200).json({
            success: true,
            animeId: animeId,
            totalEpisodes: data?.episodes?.length || 0,
            episodes: data?.episodes || []
        });
    }
    
    // GET /api/random
    if (urlParts.includes('random')) {
        const popular = await fetchAPI(`${SOURCES.gogoanime}/top-airing`);
        const randomIndex = Math.floor(Math.random() * (popular?.results?.length || 10));
        const randomAnime = popular?.results?.[randomIndex];
        return res.status(200).json({
            success: true,
            data: randomAnime || { title: 'One Piece', id: 'one-piece' }
        });
    }
    
    // GET /api/trending
    if (urlParts.includes('trending')) {
        const data = await fetchAPI(`${SOURCES.gogoanime}/top-airing`);
        return res.status(200).json({
            success: true,
            trending: data?.results?.slice(0, 10) || []
        });
    }
    
    // GET /api/info - معلومات الـ API
    if (urlParts.length === 1 && urlParts[0] === 'api') {
        return res.status(200).json({
            name: 'AnimeHub API',
            version: '1.0.0',
            description: 'API مخصصة للبوتات - جلب بيانات الأنمي',
            endpoints: {
                search: '/api/search?q={query}',
                anime: '/api/anime/{id}',
                episodes: '/api/episodes/{animeId}',
                random: '/api/random',
                trending: '/api/trending',
                docs: '/api/docs'
            },
            sources: ['GogoAnime', 'HiAnime'],
            rate_limit: '1000 requests/hour'
        });
    }
    
    // GET /api/docs - توثيق الـ API
    if (urlParts.includes('docs')) {
        return res.status(200).json({
            documentation: {
                search: {
                    method: 'GET',
                    url: '/api/search?q=naruto',
                    description: 'البحث عن أنمي حسب الاسم',
                    params: { q: 'اسم الأنمي للبحث' }
                },
                anime: {
                    method: 'GET',
                    url: '/api/anime/one-piece',
                    description: 'جلب تفاصيل أنمي محدد'
                },
                episodes: {
                    method: 'GET',
                    url: '/api/episodes/one-piece',
                    description: 'جلب قائمة حلقات الأنمي'
                },
                random: {
                    method: 'GET',
                    url: '/api/random',
                    description: 'جلب أنمي عشوائي'
                },
                trending: {
                    method: 'GET',
                    url: '/api/trending',
                    description: 'جلب الأنميات الأكثر مشاهدة'
                }
            }
        });
    }
    
    // 404 - نقطة غير موجودة
    return res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        available: ['/api/search?q=', '/api/anime/:id', '/api/episodes/:id', '/api/random', '/api/trending', '/api/docs']
    });
          }
