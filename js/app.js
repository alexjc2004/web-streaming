// ==================== CONSTANTES GLOBALES ====================
let moreResultsState = null;
let currentMovieData = null;
let trailerTimeout = null;
let currentTrailerId = null;
let infoFadeTimer = null;
let isInfoVisible = true;
const API_KEY = "73de3bc08df97d70e1cb81ad38422c03";

// ==================== ANIME API ====================
const ANIME_API_BASE = 'https://api-anime-render.onrender.com/api/v1/anime';
const ANIME_API_KEY = 'miClaveSuperSecreta123456';

// Elementos del DOM (reproductor)
const logoDiv = document.querySelector(".logo");
const playerFullscreen = document.getElementById("player-fullscreen");
const playerContainer = document.getElementById("player-iframe-container");
const backButton = document.getElementById("back-button");

// Elementos de la ventana de información
const infoWindow = document.getElementById('info-window');
const infoTitle = document.getElementById('info-title');
const infoDuration = document.getElementById('info-duration');
const infoYear = document.getElementById('info-year');
const infoSynopsis = document.getElementById('info-synopsis');
const infoWatchBtn = document.getElementById('info-watch-btn');

// ==================== FILTRO DE SEGURIDAD ====================
function isSafeForAllAges(anime) {
    const title = String(anime.title || '').toLowerCase();
    const description = String(anime.description || '').toLowerCase();
    const type = String(anime.type || '').toLowerCase();

    const blockedWords = [
        'hentai', 'ecchi', '18+', 'adulto', 'xxx', 'sexo', 'desnudo', 'porno',
        'yuri', 'yaoi', 'tentáculo', 'violación', 'incesto', 'bdsm', 'loli', 'shota'
    ];

    for (let word of blockedWords) {
        if (title.includes(word) || description.includes(word) || type.includes(word)) {
            return false;
        }
    }

    if (anime.rating) {
        const rating = String(anime.rating).toLowerCase();
        if (rating.includes('r-18') || rating.includes('18+') || rating.includes('adult')) {
            return false;
        }
    }

    return true;
}


async function getTmdbIdByTitle(title) {
    try {
        const url = `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(title)}&language=es-ES`;
        const response = await fetch(url);
        const data = await response.json();
        if (!data.results || data.results.length === 0) return null;
        // Buscar un resultado que sea anime (género 16) y en japonés
        for (const result of data.results) {
            // Obtener detalles para verificar géneros
            const detailUrl = `https://api.themoviedb.org/3/tv/${result.id}?api_key=${API_KEY}&language=es-ES`;
            const detailResp = await fetch(detailUrl);
            const detailData = await detailResp.json();
            const isAnime = detailData.genres?.some(g => g.id === 16) && detailData.original_language === 'ja';
            if (isAnime) {
                return result.id;
            }
        }
        // Si no encuentra anime, devolver el primer resultado
        return data.results[0]?.id || null;
    } catch (error) {
        console.warn('Error obteniendo tmdbId por título:', error);
        return null;
    }
}


// ==================== GESTIÓN DE PESTAÑAS ====================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
let loadedTabs = {};
let scrollPositions = {};
let focusStates = {};

function switchTab(tabId) {
    const currentActive = document.querySelector('.tab-content.active');
    if (currentActive) {
        const currentId = currentActive.id;
        scrollPositions[currentId] = window.scrollY;
        if (typeof currentCategoryIndex !== 'undefined' && typeof currentCardIndex !== 'undefined') {
            focusStates[currentId] = { categoryIndex: currentCategoryIndex, cardIndex: currentCardIndex };
        }
    }

    tabContents.forEach(content => content.classList.remove('active'));
    const newContent = document.getElementById(`contenido-${tabId}`);
    if (newContent) newContent.classList.add('active');

    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) btn.classList.add('active');
    });

    const prevScroll = scrollPositions[`contenido-${tabId}`];
    if (prevScroll) {
        setTimeout(() => window.scrollTo(0, prevScroll), 100);
    } else {
        window.scrollTo(0, 0);
    }

    if (!loadedTabs[tabId]) {
        loadTabContent(tabId);
        loadedTabs[tabId] = true;
    } else {
        const savedFocus = focusStates[`contenido-${tabId}`];
        if (savedFocus && typeof window.setFocusFromState === 'function') {
            window.setFocusFromState(savedFocus.categoryIndex, savedFocus.cardIndex);
        }
    }
}

// ==================== FUNCIONES API ====================
async function fetchAnimeApi(endpoint) {
    const url = `${ANIME_API_BASE}${endpoint}&apiKey=${ANIME_API_KEY}`;
    const response = await fetch(url, {
        headers: { 'X-API-Key': ANIME_API_KEY }
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Error en la API');
    return data.data || data.results || data;
}

async function searchAnimeByTitle(title) {
    try {
        const data = await fetchAnimeApi(`/search?q=${encodeURIComponent(title)}`);
        const results = data.results || [];
        if (results.length === 0) return null;
        // Buscar primer resultado de AnimeAV1
        const animeAV1Result = results.find(item => item.provider?.toLowerCase() === 'animeav1');
        return animeAV1Result ? animeAV1Result.url : null;
    } catch (error) {
        console.error('Error buscando anime por título:', error);
        return null;
    }
}




// ==================== CARGAR FILAS DE ANIME ====================
async function loadAnimeRowIfAvailable(endpoint, rowId, categoryTitle, parentContainerId) {
    const container = document.getElementById(parentContainerId);
    if (!container) {
        console.warn(`Contenedor ${parentContainerId} no encontrado`);
        return false;
    }

    // Crear la categoría si no existe
    let categoryDiv = document.getElementById(rowId)?.closest('.category');
    if (!categoryDiv) {
        const newCategory = document.createElement('div');
        newCategory.classList.add('category');
        newCategory.setAttribute('data-category-id', rowId);
        newCategory.innerHTML = `<h2>${categoryTitle}</h2><div class="row" id="${rowId}"></div>`;
        container.appendChild(newCategory);
        categoryDiv = newCategory;
    }

    const rowElement = document.getElementById(rowId);
    if (!rowElement) return false;

    // ✅ Mostrar mensaje de carga (como en las otras secciones)
    rowElement.innerHTML = `<div style="color: white; padding: 20px;">Cargando ${categoryTitle}...</div>`;

    try {
        const data = await fetchAnimeApi(endpoint);
        const results = data.results || data;
        if (!results || results.length === 0) {
            rowElement.innerHTML = `<div style="color: #aaa; padding: 20px;">No hay contenido disponible para ${categoryTitle}</div>`;
            return false;
        }

        // Filtrar solo AnimeAV1
        const animeAV1Results = results.filter(item => item.provider?.toLowerCase() === 'animeav1');
        if (animeAV1Results.length === 0) {
            rowElement.innerHTML = `<div style="color: #aaa; padding: 20px;">No hay contenido disponible en AnimeAV1 para ${categoryTitle}</div>`;
            return false;
        }

        // ✅ Limpiar mensaje de carga y mostrar tarjetas
        rowElement.innerHTML = '';
        const filtered = animeAV1Results.filter(isSafeForAllAges);
        filtered.slice(0, 20).forEach(item => {
            const card = document.createElement('div');
            card.classList.add('movie');
            const title = item.title || 'Sin título';
            const poster = item.image || 'images/no-poster.jpg';
            const url = item.url;

            card.dataset.url = url;
            card.dataset.title = title;
            card.tabIndex = 0;
            card.innerHTML = `<img src="${poster}" alt="${title}"><div class="movie-title">${title}</div>`;
            card.addEventListener('click', () => {
                showAnimeInfo(url, title);
            });
            rowElement.appendChild(card);
        });
        console.log(`✅ ${categoryTitle} cargado con ${filtered.length} animes`);
        return true;
    } catch (error) {
        console.error(`❌ Error cargando ${categoryTitle}:`, error);
        rowElement.innerHTML = `<div style="color: red; padding: 20px;">Error al cargar ${categoryTitle}</div>`;
        return false;
    }
}

function extractKeywords(title) {
    // Eliminar partículas comunes y números de temporada
    const clean = title
        .replace(/\b(2nd|3rd|4th|season|part|movie|ova|special)\b/gi, '')
        .replace(/[:;!¡¿?()\-]/g, '')
        .trim();
    // Tomar las primeras 2-3 palabras
    const words = clean.split(/\s+/).filter(w => w.length > 2);
    return words.slice(0, 3).join(' ');
}

async function loadRelatedAnimes(currentTitle, currentUrl, container) {
    if (!container) return;

    // Extraer palabras clave
    const keyword = extractKeywords(currentTitle);
    if (!keyword) {
        container.innerHTML = '<div style="color:#666;">No se encontraron resultados relacionados.</div>';
        return;
    }

    try {
        const data = await fetchAnimeApi(`/search?q=${encodeURIComponent(keyword)}`);
        const results = data.results || [];
        // Filtrar solo AnimeAV1 y excluir el actual
        const filtered = results.filter(item =>
            item.provider?.toLowerCase() === 'animeav1' &&
            item.url !== currentUrl &&
            item.title !== currentTitle
        );

        if (filtered.length === 0) {
            container.innerHTML = '<div style="color:#666;">No hay otras temporadas disponibles.</div>';
            return;
        }

        container.innerHTML = '';
        filtered.slice(0, 5).forEach(item => {
            const btn = document.createElement('button');
            btn.textContent = item.title;
            btn.classList.add('related-btn');
            btn.dataset.url = item.url;
            btn.addEventListener('click', () => {
                // Abrir el anime relacionado
                showAnimeInfo(item.url, item.title, null);
            });
            container.appendChild(btn);
        });
    } catch (error) {
        console.warn('Error cargando animes relacionados:', error);
        container.innerHTML = '<div style="color:#666;">Error al cargar relacionados.</div>';
    }
}

// ==================== MOSTRAR INFO DE ANIME ====================
async function showAnimeInfo(animeUrl, title, tmdbId = null) {
    try {
        const data = await fetchAnimeApi(`/info?url=${encodeURIComponent(animeUrl)}`);
        console.log('📦 Datos de AnimeAV1:', data);

        const animeTitle = data.title || title;
        const synopsis = data.description || 'Sin sinopsis disponible';

        // Obtener tmdbId solo si no se proporcionó
        if (!tmdbId) {
            tmdbId = await getTmdbIdByTitle(title);
            if (tmdbId) {
                console.log(`✅ tmdbId obtenido para "${title}": ${tmdbId}`);
            } else {
                console.warn(`⚠️ No se encontró tmdbId para "${title}"`);
            }
        }

        // === AÑO (desde startDate o year) ===
        let yearDisplay = '📅 Año desconocido';
        if (data.startDate) {
            const year = data.startDate.split('-')[0];
            if (year) yearDisplay = `📅 ${year}`;
        } else if (data.year) {
            yearDisplay = `📅 ${data.year}`;
        }
        infoYear.innerText = yearDisplay;

        // === DURACIÓN (usar totalEpisodes o tipo) ===
        let durationText = '';
        const isMovieByType = data.type?.toLowerCase().includes('película') || data.type?.toLowerCase().includes('movie');
        if (isMovieByType) {
            durationText = 'Película';
        } else if (data.totalEpisodes) {
            durationText = `${data.totalEpisodes} episodios`;
        } else {
            durationText = 'Duración no disponible';
        }
        infoDuration.innerText = durationText;

        infoTitle.innerText = animeTitle;
        infoSynopsis.innerText = synopsis;

        // === Póster ===
        let posterUrl = data.image || '';
        if (!posterUrl && tmdbId) {
            try {
                const tmdbResp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${API_KEY}&language=es-ES`);
                const tmdbData = await tmdbResp.json();
                if (tmdbData.poster_path) {
                    posterUrl = `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`;
                }
            } catch (err) {
                console.warn('Error obteniendo póster de TMDB:', err);
            }
        }
        if (!posterUrl) posterUrl = 'images/no-poster.jpg';

        // === Backdrop ===
        let backdropUrl = null;
        if (tmdbId) {
            try {
                const tmdbResp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${API_KEY}&language=es-ES`);
                const tmdbData = await tmdbResp.json();
                if (tmdbData.backdrop_path) {
                    backdropUrl = `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}`;
                }
            } catch (err) {
                console.warn('Error obteniendo backdrop de TMDB:', err);
            }
        }

        const backdropDiv = document.getElementById('info-backdrop');
        if (backdropDiv) {
            if (backdropUrl) {
                backdropDiv.style.backgroundImage = `url(${backdropUrl})`;
                backdropDiv.style.filter = 'blur(0px)';
            } else if (data.image) {
                backdropDiv.style.backgroundImage = `url(${data.image})`;
                backdropDiv.style.filter = 'blur(5px)';
            } else {
                backdropDiv.style.backgroundImage = 'none';
                backdropDiv.style.backgroundColor = '#0f0f0f';
            }
            backdropDiv.style.display = 'block';
        }

        // === Episodios / Película ===
        const episodes = data.episodes || [];
        const isMovie = episodes.length === 1;

        const seriesPanel = document.getElementById('series-panel');
        const episodesContainer = document.getElementById('episodes-container');
        const seasonsContainer = document.getElementById('seasons-container');
        const seasonsSection = document.querySelector('.seasons-section');

        // Guardar datos comunes
        currentMovieData = {
            ...currentMovieData,
            animeUrl: animeUrl,
            animeTitle: animeTitle,
            title: animeTitle,
            mediaType: 'anime',
            tmdbId: tmdbId,
            posterPath: posterUrl,
            animeEpisodeUrl: null
        };

        if (isMovie) {
            // === PELÍCULA ===
            seriesPanel.style.display = 'none';
            if (episodes.length === 1) {
                currentMovieData.animeEpisodeUrl = episodes[0].url;
                currentMovieData.episodeNumber = 1;
            }
            infoWatchBtn.textContent = 'VER AHORA';
        } else {
            // === SERIE ===
            seriesPanel.style.display = 'flex';

            // === Resultados relacionados (en el panel de temporadas) ===
            if (seasonsSection) {
                const seasonsTitle = seasonsSection.querySelector('h3');
                if (seasonsTitle) {
                    seasonsTitle.textContent = 'Temporadas';
                }
            }

            if (seasonsContainer) {
                // Usar la función loadRelatedAnimes para llenar el contenedor
                await loadRelatedAnimes(animeTitle, animeUrl, seasonsContainer);
            }

            // === Episodios ===
            episodesContainer.innerHTML = '';
            if (episodes.length === 0) {
                episodesContainer.innerHTML = '<div style="color:#aaa;">No hay episodios disponibles</div>';
            } else {
                episodes.forEach(ep => {
                    const btn = document.createElement('button');
                    btn.textContent = `Capítulo ${ep.number}`;
                    btn.classList.add('episode-btn');
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.episode-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        currentMovieData.animeEpisodeUrl = ep.url;
                        currentMovieData.episodeNumber = ep.number;
                        infoWatchBtn.textContent = `VER CAPÍTULO ${ep.number}`;
                    });
                    episodesContainer.appendChild(btn);
                });
                if (episodes.length > 0) {
                    const firstBtn = episodesContainer.querySelector('.episode-btn');
                    if (firstBtn) firstBtn.click();
                }
            }
        }

        // === Favoritos ===
        if (tmdbId) {
            const isFav = isFavorite(tmdbId, 'anime', animeTitle);
            updateFavButton(isFav);
        } else {
            const isFav = isFavorite(null, 'anime', animeTitle);
            updateFavButton(isFav);
        }

        infoWindow.style.display = 'flex';
        disableMainScroll();

    } catch (error) {
        console.error('Error cargando información del anime:', error);
        alert('No se pudo cargar la información del anime.');
    }
}
// ==================== REPRODUCIR EPISODIO DE ANIME ====================
async function playAnimeEpisode(episodeUrl) {
    if (!episodeUrl) {
        alert('Selecciona un capítulo primero');
        return;
    }

    let embedUrl = null;
    try {
        const data = await fetchAnimeApi(`/episode?url=${encodeURIComponent(episodeUrl)}`);
        let sources = data.streamLinks?.SUB || data.servers?.sub || [];
        if (sources.length === 0) {
            sources = data.streamLinks?.DUB || data.servers?.dub || [];
        }
        if (sources.length === 0) {
            alert('No se encontraron enlaces de video para este episodio.');
            return;
        }
        const hlsSource = sources.find(s => s.server === 'HLS');
        embedUrl = hlsSource ? hlsSource.url : sources[0].url;
    } catch (error) {
        console.error('Error obteniendo enlace de video:', error);
        alert('Error al obtener el enlace del video.');
        return;
    }

    if (currentMovieData) {
        addToRecent(
            currentMovieData.tmdbId || currentMovieData.animeTitle,
            'anime',
            currentMovieData.animeTitle || currentMovieData.title,
            currentMovieData.posterPath || '',
            currentMovieData.originalLang || 'ja'
        );
    }

    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    if (logoDiv) logoDiv.style.display = 'none';
    playerFullscreen.style.display = 'flex';
    playerContainer.innerHTML = `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" referrerpolicy="no-referrer" allowfullscreen style="border:none;"></iframe>`;
}

// ==================== CARGAR CONTENIDO DE PESTAÑAS ====================
async function loadTabContent(tabId) {
    if (tabId === 'inicio') {
        loadHeroCarousel();
        const container = document.getElementById('categories-container-inicio');
        if (container) {
            loadRecentRow();
            await loadDynamicRow("/movie/now_playing", "row-estrenos-inicio", "Estrenos recientes", container.id);
            await loadDynamicRow("/discover/tv?sort_by=first_air_date.desc&first_air_date.lte=2026-12-31&vote_average.gte=5&vote_count.gte=10", "row-series-recientes", "Series recientes", container.id, 'es-ES', 'tv');
            await loadDynamicRow("/movie/popular", "row-populares-inicio", "Películas populares", container.id);
            await loadDynamicRow("/discover/movie?with_genres=16,10751&sort_by=popularity.desc", "row-animados-inicio", "Animados para niños", container.id);
        }
    } else if (tabId === 'peliculas') {
        const container = document.getElementById('categories-container-peliculas');
        if (container) {
            await loadDynamicRow("/movie/now_playing", "row-estrenos-pelis", "Estrenos recientes", container.id);
            await loadDynamicRow("/discover/movie?with_companies=174&sort_by=popularity.desc", "row-warner-bros", "Warner Bros. Pictures", container.id, 'es-ES', 'movie');
            await loadDynamicRow("/discover/movie?with_companies=2&sort_by=popularity.desc", "row-disney-peliculas", "Disney (Walt Disney Pictures)", container.id, 'es-ES', 'movie');
            await loadDynamicRow("/discover/movie?with_companies=19551&sort_by=popularity.desc", "row-apple-peliculas", "Apple Studios", container.id, 'es-ES', 'movie');
            await loadDynamicRow("/discover/movie?with_genres=28&sort_by=popularity.desc", "row-accion-pelis", "Acción", container.id);
            await loadDynamicRow("/discover/movie?with_genres=28,14,878&sort_by=popularity.desc", "row-superheroes-pelis", "Superhéroes", container.id);
            await loadDynamicRow("/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc", "row-anime-pelis", "Anime (Japón)", container.id);
            await loadDynamicRow("/discover/movie?with_genres=16,10751&sort_by=popularity.desc", "row-animados-pelis", "Animados para niños", container.id);
            await loadDynamicRow("/discover/movie?with_genres=27&sort_by=popularity.desc", "row-terror-pelis", "Terror", container.id);
        }
    } else if (tabId === 'series') {
        const container = document.getElementById('categories-container-series');
        if (container) {
            await loadDynamicRow("/discover/tv?with_networks=213&sort_by=first_air_date.desc&first_air_date.lte=2026-06-15", "row-series-nuevas-netflix", "Series nuevas en Netflix", container.id, 'es-ES', 'tv');
            await loadDynamicRow("/tv/popular", "row-series-populares", "Series populares", container.id, 'es-ES', 'tv');
            await loadDynamicRow("/discover/tv?with_networks=2739&sort_by=popularity.desc", "row-disney-plus", "Series de Disney+", container.id, 'es-ES', 'tv');
            await loadDynamicRow("/discover/tv?with_networks=2552&sort_by=popularity.desc", "row-apple-tv", "Series de Apple TV+", container.id, 'es-ES', 'tv');
            await loadDynamicRow("/discover/tv?with_genres=16,10751&certification_country=US&certification=TV-Y&sort_by=popularity.desc", "row-series-preescolar", "Series para niños pequeños", container.id, 'es-ES', 'tv');
        }
    } else if (tabId === 'buscar') {
        // No cargamos nada automático
    } else if (tabId === 'favoritos') {
        loadFavorites();
    } else if (tabId === 'anime') {
        const container = document.getElementById('categories-container-anime');
        if (!container) {
            console.error('No se encuentra #categories-container-anime');
            return;
        }
        container.innerHTML = '';

        const generos = [
            { query: 'accion', titulo: 'Acción' },
            { query: 'aventura', titulo: 'Aventura' },
            { query: 'comedia', titulo: 'Comedia' },
            { query: 'drama', titulo: 'Drama' },
            { query: 'fantasia', titulo: 'Fantasía' },
            { query: 'romance', titulo: 'Romance' },
            { query: 'ciencia-ficcion', titulo: 'Ciencia Ficción' },
            { query: 'shonen', titulo: 'Shonen' },
            { query: 'deportes', titulo: 'Deportes' },
            { query: 'terror', titulo: 'Terror' },
            { query: 'mecha', titulo: 'Mecha' },
            { query: 'magia', titulo: 'Magia' },
            { query: 'isekai', titulo: 'Isekai' },
            { query: 'sobrenatural', titulo: 'Sobrenatural' },
            { query: 'misterio', titulo: 'Misterio' },
            { query: 'psicologico', titulo: 'Psicológico' }
        ];

        for (const gen of generos) {
            const rowId = `row-anime-${gen.query}`;
            await loadAnimeRowIfAvailable(
                `/catalog?genre=${encodeURIComponent(gen.query)}&provider=animeav1`,
                rowId,
                gen.titulo,
                container.id
            );
        }
    }
}

// ==================== FUNCIONES PARA TRÁILER ====================
async function getTrailer(tmdbId) {
    try {
        const url = `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${API_KEY}&language=es-ES`;
        const response = await fetch(url);
        const data = await response.json();
        if (!data.results || data.results.length === 0) return null;
        const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.iso_639_1 === 'es') ||
                        data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') ||
                        data.results.find(v => v.type === 'Teaser' && v.site === 'YouTube' && v.iso_639_1 === 'es') ||
                        data.results.find(v => v.site === 'YouTube');
        if (!trailer) return null;
        return trailer.key;
    } catch (error) {
        console.error('Error obteniendo tráiler:', error);
        return null;
    }
}

function playTrailer(videoId) {
    console.log('playTrailer ejecutado con ID:', videoId);

    const backdrop = document.getElementById('info-backdrop');
    if (backdrop) {
        backdrop.style.transition = 'opacity 1.5s ease';
        backdrop.style.opacity = '0';
    }

    let trailerContainer = document.getElementById('trailer-container');
    if (!trailerContainer) {
        trailerContainer = document.createElement('div');
        trailerContainer.id = 'trailer-container';
        trailerContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            pointer-events: none;
            opacity: 0;
            transition: opacity 1.5s ease;
        `;
        const backdropEl = document.getElementById('info-backdrop');
        if (backdropEl) {
            backdropEl.parentNode.insertBefore(trailerContainer, backdropEl);
        } else {
            document.querySelector('.info-window').prepend(trailerContainer);
        }
    }

    trailerContainer.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.id = 'trailer-iframe';
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&showinfo=0`;
    iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        position: absolute;
        top: 0;
        left: 0;
        object-fit: cover;
    `;
    iframe.allow = 'autoplay; encrypted-media';
    iframe.allowFullscreen = false;
    trailerContainer.appendChild(iframe);

    setTimeout(() => {
        trailerContainer.style.opacity = '1';
    }, 300);

    setTimeout(() => {
        console.log('🔊 Activando sonido automático (1.5s)');
        activarSonido();
        resetInfoFadeTimer();
    }, 1500);
}

function activarSonido() {
    const iframe = document.querySelector('#trailer-container iframe');
    if (iframe) {
        let newSrc = iframe.src.replace('mute=1', 'mute=0');
        if (!newSrc.includes('autoplay=1')) {
            newSrc = newSrc.replace('?', '?autoplay=1&');
        }
        iframe.src = newSrc;
        console.log('🔊 Sonido activado desde onclick');
    } else {
        console.log('❌ No se encontró iframe');
    }
}

// ==================== BUSCADOR GENERAL ====================
async function performSearch(query) {
    moreResultsState = null;
    const resultsGrid = document.getElementById('search-results-grid');
    const resultsTitle = document.getElementById('search-results-title');
    const searchInput = document.getElementById('search-input');

    if (searchInput) {
        searchInput.placeholder = 'Buscar películas, series...';
    }

    if (resultsTitle) {
        resultsTitle.textContent = 'Resultados';
    }

    if (!query.trim()) {
        resultsGrid.innerHTML = `<div class="no-results">Escribe algo para buscar...</div>`;
        return;
    }

    resultsGrid.innerHTML = `<div class="no-results">Buscando...</div>`;
    resultsTitle.textContent = `Resultados para "${query}"`;

    try {
        const url = `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`;
        const response = await fetch(url);
        const data = await response.json();
        const results = data.results || [];

        if (results.length === 0) {
            resultsGrid.innerHTML = `<div class="no-results">No se encontraron resultados.</div>`;
            return;
        }

        const filtered = results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');

        if (filtered.length === 0) {
            resultsGrid.innerHTML = `<div class="no-results">No se encontraron películas o series.</div>`;
            return;
        }

        // Dentro de performSearch, después de obtener los resultados
        resultsGrid.innerHTML = '';
        const itemsToShow = filtered.slice(0, 30);

        for (const item of itemsToShow) {
        // Detectar anime (si es serie con género 16 y idioma japonés)
        let isAnime = false;
        if (item.media_type === 'tv') {
            try {
                const detailUrl = `https://api.themoviedb.org/3/tv/${item.id}?api_key=${API_KEY}&language=es-ES`;
                const detailResp = await fetch(detailUrl);
                const detailData = await detailResp.json();
                isAnime = detailData.genres?.some(g => g.id === 16) && detailData.original_language === 'ja';
            } catch (e) { /* ignorar */ }
        }

        const title = item.title || item.name || 'Título desconocido';
        const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
        const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'images/no-poster.jpg';

        // Crear tarjeta
        const card = document.createElement('div');
        card.classList.add('search-result-item');
        card.tabIndex = 0;
        card.innerHTML = `
            <img src="${poster}" alt="${title}">
            <div class="search-result-title">${title}</div>
        `;

        // Almacenar datos en la tarjeta (para usarlos en el evento)
        card.dataset.id = item.id;
        card.dataset.mediaType = mediaType;
        card.dataset.title = title;
        card.dataset.originalLang = item.original_language || '';
        card.dataset.isAnime = isAnime ? 'true' : 'false';

        // Evento click
        card.addEventListener('click', async function() {
            const id = parseInt(this.dataset.id);
            const mediaType = this.dataset.mediaType;
            const title = this.dataset.title;
            const originalLang = this.dataset.originalLang;
            const posterUrl = this.querySelector('img').src;
            const isAnime = this.dataset.isAnime === 'true';

            if (isAnime) {
                // Buscar en API de anime
                const animeUrl = await searchAnimeByTitle(title);
                if (animeUrl) {
                    showAnimeInfo(animeUrl, title, id); // pasamos el tmdbId
                } else {
                    // Fallback a TMDB (como serie)
                    showMovieInfo(id, 'tv', title, originalLang, posterUrl);
                }
            } else {
                showMovieInfo(id, mediaType, title, originalLang, posterUrl);
            }
        });

        // Evento teclado (para accesibilidad)
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') card.click();
        });

        resultsGrid.appendChild(card);
    }
    } catch (error) {
        console.error('Error en la búsqueda:', error);
        resultsGrid.innerHTML = `<div class="no-results">Error al buscar. Intenta de nuevo.</div>`;
    }
}

// ==================== TECLADO ====================
function createKeyboard() {
    const container = document.getElementById('keyboard-container');
    if (!container) return;

    const rows = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫', '🔍'],
        ['Espacio']
    ];

    container.innerHTML = '';

    rows.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.style.display = 'flex';
        rowDiv.style.gap = '8px';
        rowDiv.style.marginBottom = '8px';
        rowDiv.style.width = '100%';
        rowDiv.style.justifyContent = 'center';

        row.forEach(key => {
            const btn = document.createElement('button');
            btn.textContent = key;
            btn.classList.add('key-btn');

            if (key === 'Espacio') {
                btn.classList.add('key-space');
                btn.style.flex = '2';
                btn.style.minWidth = '150px';
                btn.addEventListener('click', () => {
                    const input = document.getElementById('search-input');
                    if (input) {
                        input.value += ' ';
                        input.focus();
                    }
                });
            } else if (key === '⌫') {
                btn.classList.add('key-delete');
                btn.style.minWidth = '60px';
                btn.addEventListener('click', () => {
                    const input = document.getElementById('search-input');
                    if (input) {
                        input.value = input.value.slice(0, -1);
                        input.focus();
                    }
                });
            } else if (key === '🔍') {
                btn.style.background = '#e50914';
                btn.style.minWidth = '60px';
                btn.addEventListener('click', () => {
                    const input = document.getElementById('search-input');
                    if (input) performSearch(input.value);
                });
            } else {
                btn.addEventListener('click', () => {
                    const input = document.getElementById('search-input');
                    if (input) {
                        input.value += key;
                        input.focus();
                    }
                });
            }

            btn.setAttribute('tabindex', '0');
            rowDiv.appendChild(btn);
        });

        container.appendChild(rowDiv);
    });
}

// ==================== CATEGORÍAS DEL BUSCADOR ====================
function createCategoryButtons() {
    const container = document.querySelector('.categories-grid');
    if (!container) return;

    const categories = [
        { endpoint: "/movie/now_playing", title: "Estrenos recientes", type: "movie" },
        { endpoint: "/movie/popular", title: "Películas populares", type: "movie" },
        { endpoint: "/discover/movie?with_genres=28&sort_by=popularity.desc", title: "Acción", type: "movie" },
        { endpoint: "/discover/movie?with_genres=28,14,878&sort_by=popularity.desc", title: "Superhéroes", type: "movie" },
        { endpoint: "/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc", title: "Anime (Japón)", type: "movie" },
        { endpoint: "/discover/movie?with_genres=16,10751&sort_by=popularity.desc", title: "Animados para niños", type: "movie" },
        { endpoint: "/discover/movie?with_genres=27&sort_by=popularity.desc", title: "Terror", type: "movie" },
        { endpoint: "/discover/tv?with_networks=213&sort_by=first_air_date.desc", title: "Series nuevas en Netflix", type: "tv" },
        { endpoint: "/tv/popular", title: "Series populares", type: "tv" },
        { endpoint: "/discover/tv?with_networks=2739&sort_by=popularity.desc", title: "Series de Disney+", type: "tv" },
        { endpoint: "/discover/tv?with_networks=2552&sort_by=popularity.desc", title: "Series de Apple TV+", type: "tv" },
        { endpoint: "/discover/tv?with_genres=16&with_original_language=ja&certification_country=US&certification.lte=TV-14&sort_by=popularity.desc", title: "Anime (series)", type: "tv" },
    ];

    container.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.textContent = cat.title;
        btn.classList.add('cat-btn');
        btn.addEventListener('click', () => {
            showMoreResults(cat.title, cat.endpoint, `cat-${cat.title}`, cat.type);
        });
        container.appendChild(btn);
    });
}

// ==================== FUNCIONES DE VENTANA DE INFORMACIÓN ====================
function cerrarInfoWindow() {
    const infoWindow = document.getElementById('info-window');
    if (infoWindow) infoWindow.style.display = 'none';
    clearInfoFadeTimer();
    clearTrailer();
    enableMainScroll();
    console.log('Ventana cerrada y tráiler detenido');
}

function reproducirDesdeInfo() {
    if (currentMovieData) {
        if (currentMovieData.mediaType === 'anime') {
            if (currentMovieData.animeEpisodeUrl) {
                infoWindow.style.display = 'none';
                enableMainScroll(); // ← AÑADE ESTA LÍNEA
                playAnimeEpisode(currentMovieData.animeEpisodeUrl);
            } else {
                alert('Selecciona un capítulo primero');
            }
            return;
        }

        const { tmdbId, mediaType, title, originalLang, season, episode, posterPath } = currentMovieData;
        addToRecent(tmdbId, mediaType, title, posterPath, originalLang);
        infoWindow.style.display = 'none';
        clearInfoFadeTimer();
        clearTrailer();
        enableMainScroll(); // ← AÑADE ESTA LÍNEA
        playMedia(tmdbId, mediaType, title, originalLang, season, episode);
    }
}

// ==================== LOAD DYNAMIC ROW (TMDB) ====================
async function loadDynamicRow(endpoint, rowId, categoryTitle, parentContainerId = 'categories-container', language = 'es-ES', contentType = 'movie') {
    const container = document.getElementById(parentContainerId);
    if (!container) {
        console.error(`No se encuentra contenedor ${parentContainerId}`);
        return;
    }

    let categoryDiv = document.getElementById(rowId)?.closest('.category');
    if (!categoryDiv) {
        const newCategory = document.createElement("div");
        newCategory.classList.add("category");
        newCategory.setAttribute("data-category-id", rowId);
        newCategory.innerHTML = `<h2>${categoryTitle}</h2><div class="row" id="${rowId}"></div>`;
        container.appendChild(newCategory);
        categoryDiv = newCategory;
    }

    const rowElement = document.getElementById(rowId);
    if (!rowElement) {
        console.error(`No se encuentra la fila con id ${rowId}`);
        return;
    }

    rowElement.innerHTML = `<div style="color: white; padding: 20px;">Cargando ${categoryTitle}...</div>`;

    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `https://api.themoviedb.org/3${endpoint}${separator}api_key=${API_KEY}&language=${language}`;
        console.log("Cargando URL:", url);

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${data.status_message || 'Error desconocido'}`);
        }

        if (!data.results || data.results.length === 0) {
            rowElement.innerHTML = `<div style="color: #aaa; padding: 20px;">No hay contenido disponible para ${categoryTitle}</div>`;
            return;
        }

        rowElement.innerHTML = "";
        for (const item of data.results) {
            const card = document.createElement("div");
            card.classList.add("movie");
            const tmdbId = item.id;
            const mediaType = contentType;
            const title = item.title || item.name;
            const originalLang = item.original_language;
            const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "images/no-poster.jpg";

            card.dataset.tmdbId = tmdbId;
            card.dataset.mediaType = mediaType;
            card.dataset.title = title;
            card.dataset.originalLang = originalLang;
            card.tabIndex = 0;
            card.innerHTML = `<img src="${poster}" alt="${title}"><div class="movie-title">${title}</div>`;
            card.addEventListener("click", () => {
                const posterUrl = card.querySelector("img").src;
                showMovieInfo(tmdbId, mediaType, title, originalLang, posterUrl);
            });
            rowElement.appendChild(card);
        }

        const verMasCard = document.createElement('div');
        verMasCard.classList.add('ver-mas-card', 'movie');
        verMasCard.innerHTML = `
            <div class="ver-mas-content">
                <span>Ver más</span>
                <span class="ver-mas-icon">→</span>
            </div>
        `;
        verMasCard.addEventListener('click', () => {
            showMoreResults(categoryTitle, endpoint, rowId);
        });
        rowElement.appendChild(verMasCard);

    } catch (error) {
        console.error(`Error cargando ${categoryTitle}:`, error);
        rowElement.innerHTML = `<div style="color: red; padding: 20px;">Error al cargar ${categoryTitle}. Ver consola.</div>`;
    }
}

function showMoreResults(categoryTitle, endpoint, rowId, contentType = 'movie') {
    moreResultsState = {
        endpoint: endpoint,
        page: 1,
        categoryTitle: categoryTitle,
        totalPages: null,
        isLoading: false,
        contentType: contentType
    };

    const tabBtn = document.querySelector('.tab-btn[data-tab="buscar"]');
    if (tabBtn) tabBtn.click();

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = `Mostrando: ${categoryTitle}`;
    }

    const resultsTitle = document.getElementById('search-results-title');
    if (resultsTitle) {
        resultsTitle.textContent = `${categoryTitle} - Ver más`;
    }

    loadMoreResults();
}

async function loadMoreResults() {
    if (!moreResultsState) return;
    if (moreResultsState.isLoading) return;
    if (moreResultsState.totalPages !== null && moreResultsState.page > moreResultsState.totalPages) return;

    moreResultsState.isLoading = true;
    const { endpoint, page, categoryTitle } = moreResultsState;

    const resultsGrid = document.getElementById('search-results-grid');
    if (!resultsGrid) return;

    if (page === 1) {
        resultsGrid.innerHTML = '<div class="no-results">Cargando...</div>';
    } else {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'more-loading';
        loadingIndicator.textContent = 'Cargando más...';
        loadingIndicator.style.cssText = 'grid-column:1/-1; text-align:center; color:#aaa; padding:20px;';
        resultsGrid.appendChild(loadingIndicator);
    }

    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `https://api.themoviedb.org/3${endpoint}${separator}api_key=${API_KEY}&language=es-ES&page=${page}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        moreResultsState.totalPages = data.total_pages || 1;
        const loadingEl = document.getElementById('more-loading');
        if (loadingEl) loadingEl.remove();

        if (page === 1) {
            resultsGrid.innerHTML = '';
        }

        const results = data.results || [];
        if (results.length === 0) {
            if (page === 1) {
                resultsGrid.innerHTML = '<div class="no-results">No hay más resultados.</div>';
            }
            moreResultsState.isLoading = false;
            return;
        }

        let contentType = 'movie';
        if (endpoint.includes('/tv') || endpoint.includes('discover/tv')) {
            contentType = 'tv';
        }

        results.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('search-result-item');
            card.tabIndex = 0;

            const title = item.title || item.name || 'Título desconocido';
            const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'images/no-poster.jpg';

            card.innerHTML = `
                <img src="${poster}" alt="${title}">
                <div class="search-result-title">${title}</div>
            `;

            const mediaType = contentType;
            card.addEventListener('click', () => {
                const posterUrl = card.querySelector('img').src;
                showMovieInfo(item.id, mediaType, title, item.original_language || '', posterUrl);
            });

            resultsGrid.appendChild(card);
        });

        moreResultsState.page++;

    } catch (error) {
        console.error('Error cargando más resultados:', error);
        const loadingEl = document.getElementById('more-loading');
        if (loadingEl) loadingEl.remove();
        if (page === 1) {
            resultsGrid.innerHTML = `<div class="no-results">Error al cargar. Intenta de nuevo.</div>`;
        }
    } finally {
        moreResultsState.isLoading = false;
    }
}

// ==================== FUNCIÓN PARA SERIES (CORREGIDA) ====================
async function showMovieInfo(tmdbId, mediaType, title, originalLang, posterUrl) {
    try {
        let url = mediaType === "movie"
            ? `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${API_KEY}&language=es-ES`
            : `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${API_KEY}&language=es-ES`;
        const response = await fetch(url);
        const data = await response.json();

        infoTitle.innerText = title;
        const releaseDate = mediaType === "movie" ? data.release_date : data.first_air_date;
        const year = releaseDate ? releaseDate.split('-')[0] : "Año desconocido";
        infoYear.innerText = `📅 ${year}`;
        infoSynopsis.innerText = data.overview || "Sin sinopsis disponible";

        const seriesPanel = document.getElementById('series-panel');
        if (mediaType === 'tv') {
            if (seriesPanel) seriesPanel.style.display = 'flex';
            infoDuration.innerText = `${data.number_of_episodes || '?'} episodios`;
            const seasons = (data.seasons || []).filter(s => s.season_number > 0);
            const seasonsContainer = document.getElementById('seasons-container');
            if (seasonsContainer) {
                seasonsContainer.innerHTML = '';
                seasons.forEach(season => {
                    const btn = document.createElement('button');
                    btn.innerText = `Temporada ${season.season_number}`;
                    btn.classList.add('season-btn');
                    btn.addEventListener('click', () => {
                        loadEpisodesForSeason(tmdbId, season.season_number);
                        document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                    });
                    seasonsContainer.appendChild(btn);
                });
                if (seasons.length > 0) {
                    loadEpisodesForSeason(tmdbId, seasons[0].season_number);
                    const firstBtn = seasonsContainer.querySelector('.season-btn');
                    if (firstBtn) firstBtn.classList.add('selected');
                }
            }
        } else {
            if (seriesPanel) seriesPanel.style.display = 'none';
            infoDuration.innerText = data.runtime ? `${data.runtime} min` : 'Duración no disponible';
        }

        currentMovieData = { tmdbId, mediaType, title, originalLang, season: null, episode: null, posterPath: data.poster_path || '' };

        const isAnime = data.genres?.some(g => g.id === 16) && data.original_language === 'ja';
        if (isAnime) {
            const animeUrl = await searchAnimeByTitle(title);
            if (animeUrl) {
                await showAnimeInfo(animeUrl, title, tmdbId); // ← Pasa tmdbId
                return;
               
            } else {
                console.warn(`No se encontró AnimeAV1 para "${title}", usando TMDB como fallback.`);
            }
        }

        const backdropDiv = document.getElementById('info-backdrop');
        if (backdropDiv) {
            const backdropUrl = data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '';
            if (backdropUrl) {
                backdropDiv.style.backgroundImage = `url('${backdropUrl}')`;
            } else {
                backdropDiv.style.backgroundImage = 'none';
                backdropDiv.style.backgroundColor = '#0f0f0f';
            }
            backdropDiv.style.display = 'block';
        }

        if (mediaType === 'movie') {
            updateWatchButton('movie');
        } else if (mediaType === 'tv') {
            // Si hay progreso, usarlo
            const progress = getProgress(tmdbId, 'tv');
            if (progress) {
                currentMovieData.season = progress.season;
                currentMovieData.episode = progress.episode;
                updateWatchButton('tv', null, progress.season, progress.episode);
            } else {
                updateWatchButton('tv');
            }
        }

        infoWindow.style.display = "flex";
        disableMainScroll(); // ← AÑADE ESTA LÍNEA

        if (mediaType === 'movie') {
            updateWatchButton(mediaType);
        } else if (mediaType === 'tv') {
            const progress = getProgress(tmdbId, 'tv');
            if (progress) {
                currentMovieData.season = progress.season;
                currentMovieData.episode = progress.episode;
                updateWatchButton(mediaType, null, progress.season, progress.episode);
            } else {
                updateWatchButton(mediaType);
            }
        }
        const isFav = isFavorite(tmdbId, mediaType);
        updateFavButton(isFav);
    } catch (error) {
        console.error("Error cargando info:", error);
        playMedia(tmdbId, mediaType, title, originalLang);
    }
}

// ==================== FUNCIÓN PARA CARGAR EPISODIOS (TMDB) ====================
async function loadEpisodesForSeason(tvId, seasonNumber) {
    try {
        const url = `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}&language=es-ES`;
        const response = await fetch(url);
        const data = await response.json();
        const episodes = data.episodes || [];
        const episodesContainer = document.getElementById('episodes-container');
        if (!episodesContainer) {
            console.error("No se encuentra #episodes-container");
            return;
        }
        episodesContainer.innerHTML = '';
        episodes.forEach(ep => {
            const btn = document.createElement('button');
            btn.innerText = `Capítulo ${ep.episode_number}`;
            btn.classList.add('episode-btn');
            btn.addEventListener('click', () => {
                document.querySelectorAll('.episode-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                if (currentMovieData) {
                    currentMovieData.season = seasonNumber;
                    currentMovieData.episode = ep.episode_number;
                    updateWatchButton('tv', null, seasonNumber, ep.episode_number);
                }
                btn.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                const watchBtn = document.getElementById('info-watch-btn');
                if (watchBtn) watchBtn.innerText = `VER CAPÍTULO ${ep.episode_number}`;
            });
            episodesContainer.appendChild(btn);
        });
        if (episodes.length > 0) {
            const firstBtn = episodesContainer.querySelector('.episode-btn');
            if (firstBtn) firstBtn.click();
        }
    } catch (error) {
        console.error("Error cargando episodios:", error);
        const episodesContainer = document.getElementById('episodes-container');
        if (episodesContainer) episodesContainer.innerHTML = '<div>Error al cargar episodios</div>';
    }
}

// ==================== REPRODUCTOR (TMDB / VidSrc) ====================
function playMedia(tmdbId, mediaType, title, originalLang, season = null, episode = null) {
    if (mediaType === 'anime' || currentMovieData?.mediaType === 'anime') {
        if (currentMovieData?.animeEpisodeUrl) {
            playAnimeEpisode(currentMovieData.animeEpisodeUrl);
            return;
        } else {
            alert('No se encontró URL del episodio.');
            return;
        }
    }

    if (currentMovieData && currentMovieData.posterPath) {
        addToRecent(tmdbId, mediaType, title, currentMovieData.posterPath, originalLang);
    }

    if (mediaType === 'movie') {
        saveProgress(tmdbId, 'movie');
    } else if (mediaType === 'tv' && season !== null && episode !== null) {
        saveProgress(tmdbId, 'tv', season, episode);
    }

    let langParam = "";
    if (mediaType === 'tv') {
        langParam = "&ds_lang=es";
    } else if (mediaType === 'movie' && (originalLang === "en" || originalLang === "ja")) {
        langParam = "&ds_lang=es";
    }

    let embedUrl;
    if (mediaType === "movie") {
        embedUrl = `https://vidsrc-embed.ru/embed/movie?tmdb=${tmdbId}&autoplay=1${langParam}`;
    } else if (mediaType === "tv" && season && episode) {
        embedUrl = `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&autoplay=1${langParam}`;
    } else {
        alert(`No se puede reproducir "${title}". Falta temporada/episodio.`);
        return;
    }

    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    if (logoDiv) logoDiv.style.display = 'none';
    playerFullscreen.style.display = "flex";
    playerContainer.innerHTML = `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" referrerpolicy="no-referrer" allowfullscreen style="border:none;"></iframe>`;
}

function clearTrailer() {
    console.log('clearTrailer ejecutada');
    const container = document.getElementById('trailer-container');
    if (container) {
        const iframe = container.querySelector('iframe');
        if (iframe) {
            iframe.src = 'about:blank';
            try {
                iframe.contentWindow.stop();
            } catch (e) { /* ignorar */ }
            setTimeout(() => {
                const cont = document.getElementById('trailer-container');
                if (cont) cont.remove();
                console.log('Contenedor del tráiler eliminado');
            }, 150);
        } else {
            container.remove();
        }
    }

    const backdrop = document.getElementById('info-backdrop');
    if (backdrop) {
        backdrop.style.transition = 'opacity 1.5s ease';
        backdrop.style.opacity = '1';
        backdrop.style.display = 'block';
    }

    if (trailerTimeout) {
        clearTimeout(trailerTimeout);
        trailerTimeout = null;
    }

    if (infoFadeTimer) {
        clearTimeout(infoFadeTimer);
        infoFadeTimer = null;
    }
}

// ==================== MODO CINE ====================
function hideInfoOverlay() {
    const overlay = document.querySelector('.info-overlay');
    const mainContent = document.querySelector('.info-main');
    const backBtn = document.querySelector('.info-back-btn');
    const seriesPanel = document.querySelector('.series-panel');

    if (overlay) {
        overlay.style.transition = 'opacity 1s ease';
        overlay.style.opacity = '0';
    }
    if (mainContent) {
        mainContent.style.transition = 'opacity 1s ease, transform 0.8s ease';
        mainContent.style.opacity = '0';
        mainContent.style.transform = 'translateY(20px)';
    }
    if (backBtn) {
        backBtn.style.transition = 'opacity 1s ease, transform 0.8s ease';
        backBtn.style.opacity = '0';
        backBtn.style.transform = 'translateY(-10px)';
    }
    if (seriesPanel) {
        seriesPanel.style.transition = 'opacity 1s ease, transform 0.8s ease';
        seriesPanel.style.opacity = '0';
        seriesPanel.style.transform = 'translateX(20px)';
    }
    isInfoVisible = false;
    console.log('🎬 Modo cine activado');
}

function showInfoOverlay() {
    const overlay = document.querySelector('.info-overlay');
    const mainContent = document.querySelector('.info-main');
    const backBtn = document.querySelector('.info-back-btn');
    const seriesPanel = document.querySelector('.series-panel');

    if (overlay) {
        overlay.style.transition = 'none';
        overlay.style.opacity = '1';
    }
    if (mainContent) {
        mainContent.style.transition = 'none';
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'translateY(0)';
    }
    if (backBtn) {
        backBtn.style.transition = 'none';
        backBtn.style.opacity = '1';
        backBtn.style.transform = 'translateY(0)';
    }
    if (seriesPanel) {
        seriesPanel.style.transition = 'none';
        seriesPanel.style.opacity = '1';
        seriesPanel.style.transform = 'translateX(0)';
    }
    isInfoVisible = true;
    console.log('Información restaurada');
}

function resetInfoFadeTimer() {
    if (infoFadeTimer) {
        clearTimeout(infoFadeTimer);
        infoFadeTimer = null;
    }
    if (isInfoVisible) {
        infoFadeTimer = setTimeout(() => {
            hideInfoOverlay();
        }, 8000);
    }
}

function clearInfoFadeTimer() {
    if (infoFadeTimer) {
        clearTimeout(infoFadeTimer);
        infoFadeTimer = null;
    }
    showInfoOverlay();
}

function handleUserInteraction() {
    if (!isInfoVisible) {
        showInfoOverlay();
    }
    resetInfoFadeTimer();
}

// ==================== EVENTOS ====================
backButton.addEventListener("click", () => {
    playerFullscreen.style.display = "none";
    playerContainer.innerHTML = "";
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = '');
    if (logoDiv) logoDiv.style.display = "block";
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) switchTab(activeTab.dataset.tab);
});

// ==================== CARRUSEL DE BANNERS ====================
let slides = [], currentSlide = 0, carouselInterval, preloadedImages = {};

async function loadHeroCarousel() {
    const heroContainer = document.getElementById("hero-carousel");
    if (!heroContainer) return;
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=es-ES`);
        const data = await response.json();
        if (!data.results || data.results.length === 0) return;

        const shuffled = [...data.results].sort(() => 0.5 - Math.random());
        slides = shuffled.slice(0, 5);
        const slidesContainer = heroContainer.querySelectorAll('.hero-slide');
        for (let i = slidesContainer.length - 1; i > 0; i--) slidesContainer[i].remove();
        const baseSlide = heroContainer.querySelector('.hero-slide');
        await updateSlideContent(baseSlide, slides[0], 0);
        for (let i = 1; i < slides.length; i++) {
            const newSlide = baseSlide.cloneNode(true);
            newSlide.classList.remove('active');
            await updateSlideContent(newSlide, slides[i], i);
            heroContainer.insertBefore(newSlide, heroContainer.querySelector('.carousel-prev'));
        }
        const dotsContainer = heroContainer.querySelector('.carousel-dots');
        dotsContainer.innerHTML = '';
        slides.forEach((_, idx) => {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (idx === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(idx));
            dotsContainer.appendChild(dot);
        });
        slides.forEach((movie, idx) => {
            if (movie.backdrop_path) {
                const url = `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`;
                preloadedImages[idx] = new Image();
                preloadedImages[idx].src = url;
            }
        });
        startCarousel();
        attachCarouselControls();
    } catch (error) { console.error("Error cargando carrusel:", error); }
}

async function updateSlideContent(slide, movie, index) {
    const backdropUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : '';
    const bgDiv = slide.querySelector('.hero-bg');
    if (bgDiv && backdropUrl) bgDiv.style.backgroundImage = `url('${backdropUrl}')`;
    slide.querySelector('.hero-title').innerText = movie.title;
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'Año desconocido';
    slide.querySelector('.hero-year').innerHTML = `📅 ${year}`;
    try {
        const detailsRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${API_KEY}&language=es-ES`);
        const details = await detailsRes.json();
        const runtime = details.runtime ? `${details.runtime} min` : 'Duración no disponible';
        slide.querySelector('.hero-duration').innerHTML = `⏱️ ${runtime}`;
    } catch (error) {
        slide.querySelector('.hero-duration').innerHTML = '⏱️ Duración no disponible';
    }
    const synopsis = movie.overview || 'Sin sinopsis disponible';
    slide.querySelector('.hero-synopsis').innerText = synopsis;
    const btn = slide.querySelector('.hero-watch-btn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => { playMedia(movie.id, 'movie', movie.title, movie.original_language); });
}

function goToSlide(index) {
    if (index === currentSlide) return;
    const slidesList = document.querySelectorAll('.hero-slide');
    slidesList[currentSlide].classList.remove('active');
    slidesList[index].classList.add('active');
    document.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === index));
    currentSlide = index;
    resetCarouselTimer();
}
function nextSlide() { const next = (currentSlide + 1) % slides.length; goToSlide(next); }
function prevSlide() { const prev = (currentSlide - 1 + slides.length) % slides.length; goToSlide(prev); }
function startCarousel() { if (carouselInterval) clearInterval(carouselInterval); carouselInterval = setInterval(() => nextSlide(), 8000); }
function resetCarouselTimer() { if (carouselInterval) clearInterval(carouselInterval); carouselInterval = setInterval(() => nextSlide(), 8000); }
function attachCarouselControls() {
    const prevBtn = document.querySelector('.carousel-prev'), nextBtn = document.querySelector('.carousel-next');
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
}

// ==================== SCROLL ====================
function disableMainScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
}

function enableMainScroll() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
}

// ==================== RECIENTES ====================
function addToRecent(tmdbId, mediaType, title, posterPath, originalLang) {
    console.log('addToRecent llamada con:', tmdbId, mediaType, title, posterPath);
    try {
        let recents = JSON.parse(localStorage.getItem('recentItems')) || [];
        recents = recents.filter(item => item.tmdbId !== tmdbId || item.mediaType !== mediaType);
        recents.unshift({
            tmdbId: tmdbId,
            mediaType: mediaType,
            title: title,
            posterPath: posterPath || '',
            originalLang: originalLang || '',
            timestamp: Date.now()
        });
        if (recents.length > 10) recents.pop();
        localStorage.setItem('recentItems', JSON.stringify(recents));
        loadRecentRow();
    } catch (e) {
        console.error('Error guardando en recientes:', e);
    }
}

function loadRecentRow() {
    const container = document.getElementById('categories-container-inicio');
    if (!container) return;

    let rowElement = document.getElementById('row-recientes');
    if (!rowElement) {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('category');
        categoryDiv.setAttribute('data-category-id', 'recientes');
        categoryDiv.innerHTML = `<h2>Recientes</h2><div class="row" id="row-recientes"></div>`;
        container.prepend(categoryDiv);
        rowElement = document.getElementById('row-recientes');
    }

    let recents = [];
    try {
        recents = JSON.parse(localStorage.getItem('recentItems')) || [];
    } catch (e) {
        console.error('Error cargando recientes:', e);
    }

    if (recents.length === 0) {
        rowElement.innerHTML = `<div style="color: #aaa; padding: 20px;">No hay contenido reciente</div>`;
        return;
    }

    rowElement.innerHTML = '';
    recents.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('movie');
        
        // ✅ Construir poster correctamente
        let poster;
        if (item.posterPath && item.posterPath.startsWith('http')) {
            poster = item.posterPath; // URL completa (AnimeAV1)
        } else if (item.posterPath) {
            poster = `https://image.tmdb.org/t/p/w500${item.posterPath}`; // TMDB
        } else {
            poster = "images/no-poster.jpg";
        }

        card.dataset.tmdbId = item.tmdbId;
        card.dataset.mediaType = item.mediaType;
        card.dataset.title = item.title;
        card.dataset.originalLang = item.originalLang;
        card.tabIndex = 0;
        card.innerHTML = `<img src="${poster}" alt="${item.title}"><div class="movie-title">${item.title}</div>`;

        card.addEventListener('click', async () => {
            const posterUrl = card.querySelector('img').src;
            if (item.mediaType === 'anime') {
                const animeUrl = await searchAnimeByTitle(item.title);
                if (animeUrl) {
                    showAnimeInfo(animeUrl, item.title, item.tmdbId);
                } else {
                    showMovieInfo(item.tmdbId, 'tv', item.title, item.originalLang, posterUrl);
                }
            } else {
                showMovieInfo(item.tmdbId, item.mediaType, item.title, item.originalLang, posterUrl);
            }
        });

        rowElement.appendChild(card);
    });
}

// ==================== FAVORITOS ====================
function isFavorite(tmdbId, mediaType, title) {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    return favorites.some(item => {
        // Si tenemos tmdbId, buscar por tmdbId
        if (tmdbId && item.tmdbId === tmdbId && item.mediaType === mediaType) return true;
        // Si no hay tmdbId, buscar por título (para animes sin ID)
        if (!tmdbId && item.title === title && item.mediaType === mediaType) return true;
        return false;
    });
}
function toggleFavorite(tmdbId, mediaType, title, posterPath, originalLang) {
    // Usar el título como identificador si no hay tmdbId
    const identifier = tmdbId || title;
    if (!identifier) {
        alert('No se puede agregar a favoritos: falta título o ID.');
        return false;
    }

    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const index = favorites.findIndex(item => {
        if (tmdbId && item.tmdbId === tmdbId && item.mediaType === mediaType) return true;
        if (!tmdbId && item.title === title && item.mediaType === mediaType) return true;
        return false;
    });

    if (index !== -1) {
        favorites.splice(index, 1);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavButton(false);
        loadFavorites();
        return false;
    } else {
        favorites.push({
            tmdbId: tmdbId || null,
            mediaType: mediaType,
            title: title,
            posterPath: posterPath || '',
            originalLang: originalLang || '',
            timestamp: Date.now()
        });
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavButton(true);
        loadFavorites();
        return true;
    }
}

function updateFavButton(isFav) {
    const favBtn = document.getElementById('info-fav-btn');
    if (!favBtn) return;

    // Restaurar estilos por defecto (habilitado)
    favBtn.disabled = false;
    favBtn.style.opacity = '1';
    favBtn.style.cursor = 'pointer';

    if (isFav) {
        favBtn.textContent = '♥ Quitar de Favoritos';
        favBtn.classList.add('active');
    } else {
        favBtn.textContent = '♡ Agregar a Favoritos';
        favBtn.classList.remove('active');
    }
}

async function loadFavorites() {
    const grid = document.getElementById('favoritos-grid');
    if (!grid) return;
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    if (favorites.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#aaa; font-size:1.2rem; padding:40px;">No tienes favoritos aún.</div>`;
        return;
    }

    grid.innerHTML = '';
    for (const item of favorites) {
        const card = document.createElement('div');
        card.classList.add('favorito-item');
        card.tabIndex = 0;

        let poster;
        if (item.posterPath && item.posterPath.startsWith('http')) {
            poster = item.posterPath;
        } else if (item.posterPath) {
            poster = `https://image.tmdb.org/t/p/w500${item.posterPath}`;
        } else {
            poster = "images/no-poster.jpg";
        }

        card.innerHTML = `
            <img src="${poster}" alt="${item.title}">
            <div class="favorito-title">${item.title}</div>
        `;

        card.addEventListener('click', async () => {
            const posterUrl = card.querySelector('img').src;
            if (item.mediaType === 'anime') {
                const animeUrl = await searchAnimeByTitle(item.title);
                if (animeUrl) {
                    showAnimeInfo(animeUrl, item.title, item.tmdbId);
                } else {
                    showMovieInfo(item.tmdbId, 'tv', item.title, item.originalLang, posterUrl);
                }
            } else {
                showMovieInfo(item.tmdbId, item.mediaType, item.title, item.originalLang, posterUrl);
            }
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') card.click();
        });

        grid.appendChild(card);
    }
}

// ==================== PROGRESO ====================
function saveProgress(tmdbId, mediaType, season = null, episode = null) {
    let progress = JSON.parse(localStorage.getItem('watchProgress')) || {};
    if (mediaType === 'movie') {
        progress[tmdbId] = { mediaType: 'movie', watched: true, timestamp: Date.now() };
    } else if (mediaType === 'tv' && season !== null && episode !== null) {
        progress[tmdbId] = { mediaType: 'tv', season: season, episode: episode, timestamp: Date.now() };
    }
    localStorage.setItem('watchProgress', JSON.stringify(progress));
}

function getProgress(tmdbId, mediaType) {
    const progress = JSON.parse(localStorage.getItem('watchProgress')) || {};
    return progress[tmdbId] || null;
}

function updateWatchButton(mediaType, title, season = null, episode = null) {
    const watchBtn = document.getElementById('info-watch-btn');
    if (!watchBtn) return;

    if (mediaType === 'movie') {
        const progress = getProgress(currentMovieData?.tmdbId, 'movie');
        if (progress && progress.watched) {
            watchBtn.textContent = 'CONTINUAR VIENDO';
        } else {
            watchBtn.textContent = 'VER AHORA';
        }
    } else if (mediaType === 'tv') {
        if (season !== null && episode !== null) {
            watchBtn.textContent = `VER CAPÍTULO ${episode}`;
        } else {
            const progress = getProgress(currentMovieData?.tmdbId, 'tv');
            if (progress && progress.season !== undefined && progress.episode !== undefined) {
                watchBtn.textContent = `CONTINUAR - CAPÍTULO ${progress.episode}`;
            } else {
                watchBtn.textContent = 'VER AHORA';
            }
        }
    }
}

// ==================== INICIALIZACIÓN ====================
window.addEventListener("DOMContentLoaded", () => {
    createCategoryButtons();

    const searchRight = document.querySelector('.search-right');
    if (searchRight) {
        searchRight.addEventListener('scroll', function() {
            if (this.scrollTop + this.clientHeight >= this.scrollHeight - 20) {
                if (moreResultsState && !moreResultsState.isLoading) {
                    loadMoreResults();
                }
            }
        });
    }

    const favBtn = document.getElementById('info-fav-btn');
    if (favBtn) {
        favBtn.addEventListener('click', () => {
            if (currentMovieData) {
                const { tmdbId, mediaType, title, originalLang, posterPath } = currentMovieData;
                if (tmdbId || title) {
                    toggleFavorite(tmdbId, mediaType, title, posterPath, originalLang);
                } else {
                    alert('No se puede agregar a favoritos: falta título.');
                }
            }
        });
    }

    createKeyboard();
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', () => {
            performSearch(searchInput.value);
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            if (tabId) switchTab(tabId);
        });
    });
    switchTab('inicio');

    document.addEventListener('mousemove', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('click', handleUserInteraction);
});

window.switchTab = switchTab;
