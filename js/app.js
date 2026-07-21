// ==================== CONSTANTES GLOBALES ====================
let moreResultsState = null;
let currentMovieData = null;
let trailerTimeout = null;
let currentTrailerId = null;
let infoFadeTimer = null;
let isInfoVisible = true;
let isMovieMode = false; // true cuando se está viendo una película, false para series/anime
let lastInfoData = null; // Guarda los datos de la última información mostrada
let currentSearchFilter = 'movie'; // 'movie', 'tv', 'anime'
let backButtonTimer = null;
let isPlayerControlsVisible = true;
let infiniteObserver = null;
let loadedResultIds = new Set();
let recentExpandedElement = null;
let expandedCard = null;
// Al principio de app.js
const animeInfoCache = {};
// Estado de los carruseles (cada uno con su propio índice, intervalo y slides)
const carouselState = {};
let loadedCarousels = {};
const API_KEY = "73de3bc08df97d70e1cb81ad38422c03";
// Variables para controlar los listeners globales del reproductor
let globalPlayerListenersAdded = false;
let genreMapMovie = {};
let genreMapTv = {};

function getRecentLabel(item) {
    if (item.mediaType === 'movie') return 'Película';
    if (item.mediaType === 'tv') return 'Serie';
    if (item.mediaType === 'anime') {
        return item.isMovie ? 'Película' : 'Anime';
    }
    return 'Desconocido';
}

async function loadGenreMaps() {
    try {
        const resMovie = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}&language=es-ES`);
        if (resMovie.ok) {
            const data = await resMovie.json();
            genreMapMovie = data.genres.reduce((acc, g) => { acc[g.id] = g.name; return acc; }, {});
        }
        const resTv = await fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${API_KEY}&language=es-ES`);
        if (resTv.ok) {
            const data = await resTv.json();
            genreMapTv = data.genres.reduce((acc, g) => { acc[g.id] = g.name; return acc; }, {});
        }
    } catch (e) {
        console.warn('Error cargando géneros', e);
    }
}

function getGenreNamesFromIds(ids, mediaType) {
    if (!ids || ids.length === 0) return '';
    const map = mediaType === 'movie' ? genreMapMovie : genreMapTv;
    return ids.map(id => map[id] || '').filter(Boolean).join(', ');
}


// Elementos del DOM (reproductor)
const logoDiv = document.querySelector(".logo");
const playerFullscreen = document.getElementById("player-fullscreen");
const playerContainer = document.getElementById("player-iframe-container");
const backButton = document.getElementById("back-button");

const infoLoading = document.getElementById('info-loading');
const infoContentWrapper = document.querySelector('.info-content-wrapper');
const infoBackdrop = document.getElementById('info-backdrop');

function addGlobalPlayerListeners() {
    if (globalPlayerListenersAdded) return;
    document.addEventListener('mousemove', onPlayerInteraction);
    document.addEventListener('click', onPlayerInteraction);
    document.addEventListener('touchstart', onPlayerInteraction);
    globalPlayerListenersAdded = true;
}

function removeGlobalPlayerListeners() {
    document.removeEventListener('mousemove', onPlayerInteraction);
    document.removeEventListener('click', onPlayerInteraction);
    document.removeEventListener('touchstart', onPlayerInteraction);
    globalPlayerListenersAdded = false;
}

function onPlayerInteraction(e) {
    // Solo actuar si el reproductor está visible y el evento ocurre dentro de él (o simplemente si está visible)
    if (playerFullscreen.style.display === 'flex') {
        showBackButton();
    }
}


// Función para mostrar el botón al interactuar
function showBackButton() {
    const backBtn = document.getElementById('back-button');
    if (backBtn) {
        backBtn.style.opacity = '1';
        backBtn.style.pointerEvents = 'auto';
    }
    isPlayerControlsVisible = true;
    resetBackButtonTimer();
}

function hideBackButton() {
    const backBtn = document.getElementById('back-button');
    if (backBtn) {
        backBtn.style.opacity = '0';
        backBtn.style.pointerEvents = 'none';
    }
    isPlayerControlsVisible = false;
}

function resetBackButtonTimer() {
    if (backButtonTimer) clearTimeout(backButtonTimer);
    backButtonTimer = setTimeout(() => {
        hideBackButton();
    }, 3000); // 3 segundos
}

// ==================== ANIME API ====================
const ANIME_API_BASE = 'https://api-anime-render.onrender.com/api/v1/anime';
const ANIME_API_KEY = 'miClaveSuperSecreta123456';

// Elementos de la ventana de información
const infoWindow = document.getElementById('info-window');
const infoTitle = document.getElementById('info-title');
const infoDuration = document.getElementById('info-duration');
const infoYear = document.getElementById('info-year');
const infoSynopsis = document.getElementById('info-synopsis');
const infoWatchBtn = document.getElementById('info-watch-btn');

// ==================== WAKE-UP DE LA API DE ANIME ====================
async function wakeUpAnimeApi() {
    try {
        console.log('⏳ Despertando API de anime...');
        // Hacemos una petición ligera (catalog con límite 1) para activar el servidor
        const response = await fetch(`${ANIME_API_BASE}/catalog?limit=1&apiKey=${ANIME_API_KEY}`, {
            headers: { 'X-API-Key': ANIME_API_KEY }
        });
        if (response.ok) {
            console.log('✅ API de anime despierta y lista.');
        } else {
            console.warn('⚠️ No se pudo despertar la API de anime (status:', response.status, ')');
        }
    } catch (error) {
        console.warn('⚠️ Error al despertar la API de anime:', error);
    }
}

// ==================== BANNER 728x90 (HighPerformanceFormat) ====================
function insertLeaderboardBanner(container, position) {
    const bannerDiv = document.createElement('div');
    bannerDiv.style.cssText = 'position:relative; border:2px solid #ff0000; border-radius:3px; margin:12px auto; max-width:728px; background:#000000; padding:6px 6px 4px 6px;';
    
    // Etiqueta "Anuncios"
    const label = document.createElement('span');
    label.style.cssText = 'position:absolute; top:-10px; left:10px; background:#ff0000; color:#ffffff; font-size:11px; font-weight:bold; padding:0 8px; border-radius:0; line-height:20px; z-index:5;';
    label.textContent = 'Anuncios';
    bannerDiv.appendChild(label);

    // Código del anuncio (con script de HighPerformanceFormat)
    const script1 = document.createElement('script');
    script1.textContent = `
        atOptions = {
            'key' : '19cbe30c18ac6bad1fb1578de26d5617',
            'format' : 'iframe',
            'height' : 90,
            'width' : 728,
            'params' : {}
        };
    `;
    bannerDiv.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://www.highperformanceformat.com/19cbe30c18ac6bad1fb1578de26d5617/invoke.js';
    bannerDiv.appendChild(script2);

    // Insertar en la posición indicada
    if (position === 'after') {
        container.appendChild(bannerDiv);
    } else if (position === 'before') {
        container.insertBefore(bannerDiv, container.firstChild);
    }
}


// Formatea minutos a "Xh Ymin" o "Xmin"
function formatRuntime(minutes) {
    if (!minutes || minutes <= 0) return 'Duración no disponible';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
}

// Trunca la sinopsis a un párrafo (máximo ~250 palabras) sin cortar a mitad de oración
function truncateSynopsis(text, maxWords = 250) {
    if (!text) return 'Sin sinopsis disponible';
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    // Tomar las primeras maxWords palabras
    let truncated = words.slice(0, maxWords).join(' ');
    // Buscar el último punto, signo de exclamación o interrogación
    const lastPunctuation = truncated.search(/[.!?]\s*$/);
    if (lastPunctuation !== -1) {
        // Si ya termina en puntuación, devolverlo
        return truncated;
    }
    // Buscar el último punto o signo en el texto truncado
    const lastPeriodIndex = truncated.lastIndexOf('.');
    const lastExcl = truncated.lastIndexOf('!');
    const lastQuest = truncated.lastIndexOf('?');
    const lastIndex = Math.max(lastPeriodIndex, lastExcl, lastQuest);
    if (lastIndex !== -1) {
        return truncated.substring(0, lastIndex + 1);
    }
    // Si no hay puntuación, devolver con puntos suspensivos
    return truncated + '...';
}


function showLoadingSpinner() {
    infoLoading.classList.remove('hidden');
    infoContentWrapper.style.display = 'none';
    infoBackdrop.style.display = 'none';
    // Ocultar también el overlay (opcional, pero lo dejamos)
    document.querySelector('.info-overlay').style.opacity = '0';
    infoWindow.style.display = 'flex';
    disableMainScroll();
}

function hideLoadingSpinner() {
    infoLoading.classList.add('hidden');
    infoContentWrapper.style.display = 'flex';
    infoBackdrop.style.display = 'block';
    document.querySelector('.info-overlay').style.opacity = '1';
}

// Actualiza la visibilidad de los botones de desplazamiento de una fila
function updateRowButtons(rowElement) {
    const wrapper = rowElement.closest('.row-wrapper');
    if (!wrapper) return;
    const btnLeft = wrapper.querySelector('.scroll-btn.left');
    const btnRight = wrapper.querySelector('.scroll-btn.right');
    if (!btnLeft || !btnRight) return;
    const maxScroll = rowElement.scrollWidth - rowElement.clientWidth;
    btnLeft.style.display = (rowElement.scrollLeft > 0) ? 'flex' : 'none';
    btnRight.style.display = (rowElement.scrollLeft < maxScroll - 1) ? 'flex' : 'none';
}

function createCategoryStructure(categoryTitle, rowId) {
    const categoryDiv = document.createElement('div');
    categoryDiv.classList.add('category');
    categoryDiv.setAttribute('data-category-id', rowId);
    
    const title = document.createElement('h2');
    title.textContent = categoryTitle;
    categoryDiv.appendChild(title);
    
    const wrapper = document.createElement('div');
    wrapper.classList.add('row-wrapper');
    
    // Botón izquierdo (siempre visible excepto al inicio)
    const btnLeft = document.createElement('button');
    btnLeft.classList.add('scroll-btn', 'left');
    btnLeft.innerHTML = '‹';
    btnLeft.setAttribute('aria-label', 'Desplazar izquierda');
    wrapper.appendChild(btnLeft);
    
    const row = document.createElement('div');
    row.classList.add('row');
    row.id = rowId;
    wrapper.appendChild(row);
    
    const btnRight = document.createElement('button');
    btnRight.classList.add('scroll-btn', 'right');
    btnRight.innerHTML = '›';
    btnRight.setAttribute('aria-label', 'Desplazar derecha');
    wrapper.appendChild(btnRight);
    
    categoryDiv.appendChild(wrapper);
    
    btnLeft.addEventListener('click', () => {
        row.scrollBy({ left: -300, behavior: 'smooth' });
    });
    btnRight.addEventListener('click', () => {
        row.scrollBy({ left: 300, behavior: 'smooth' });
    });
    
    function updateButtonsVisibility() {
        const maxScroll = row.scrollWidth - row.clientWidth;
        // Izquierda visible solo si no está en el inicio
        btnLeft.style.display = (row.scrollLeft > 0) ? 'flex' : 'none';
        // Derecha visible si hay más contenido a la derecha
        btnRight.style.display = (row.scrollLeft < maxScroll - 1) ? 'flex' : 'none';
    }
    
    row.addEventListener('scroll', updateButtonsVisibility);
    window.addEventListener('resize', updateButtonsVisibility);
    // Llamar después de cargar el contenido (con un pequeño retraso)
    setTimeout(updateButtonsVisibility, 150);
    
    return categoryDiv;
}

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

    if (tabId === 'inicio') {
            loadRecentRow();
    }

}

// ==================== FUNCIONES API ====================
async function fetchAnimeApi(endpoint) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${ANIME_API_BASE}${endpoint}${separator}apiKey=${ANIME_API_KEY}`;
    console.log('🌐 Petición a:', url); // <-- Agrega esto
    const response = await fetch(url, {
        headers: { 'X-API-Key': ANIME_API_KEY }
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Respuesta de error:', errorText); // 
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Error en la API');
    return data.data || data.results || data;
}

/**
 * Carga la información detallada de un anime desde AnimeAV1 y actualiza la tarjeta.
 * @param {HTMLElement} card - El elemento .movie de la tarjeta
 * @param {string} animeUrl - La URL del anime en AnimeAV1
 */
async function loadAnimeCardInfo(card, animeUrl) {
    // Si ya tenemos la info en caché, usarla
    if (animeInfoCache[animeUrl]) {
        updateCardOverlay(card, animeInfoCache[animeUrl]);
        return;
    }

    // Evitar múltiples peticiones simultáneas para la misma URL
    if (card.dataset.loading === 'true') return;
    card.dataset.loading = 'true';

    // Mostrar un mensaje de carga en el overlay (opcional)
    const overlay = card.querySelector('.movie-overlay');
    if (overlay) {
        const synopsisEl = overlay.querySelector('.movie-synopsis-hover');
        if (synopsisEl) synopsisEl.textContent = 'Cargando...';
    }

    try {
        const data = await fetchAnimeApi(`/info?url=${encodeURIComponent(animeUrl)}`);
        // Guardar en caché
        animeInfoCache[animeUrl] = data;
        // Actualizar overlay
        updateCardOverlay(card, data);
    } catch (error) {
        console.warn('Error cargando info para', animeUrl, error);
        // Mostrar un mensaje de error en el overlay
        if (overlay) {
            const synopsisEl = overlay.querySelector('.movie-synopsis-hover');
            if (synopsisEl) synopsisEl.textContent = 'Error al cargar información';
        }
    } finally {
        card.dataset.loading = 'false';
    }
}

/**
 * Actualiza el overlay de la tarjeta con los datos del anime.
 * @param {HTMLElement} card - El elemento .movie de la tarjeta
 * @param {Object} data - Datos devueltos por /info de AnimeAV1
 */
function updateCardOverlay(card, data) {
    const title = data.title || card.dataset.title || 'Sin título';
    const year = data.startDate ? data.startDate.split('-')[0] : (data.year || '');
    const overview = data.description || 'Sin sinopsis disponible';

    let genres = '';
    if (data.genres && data.genres.length) {
        if (typeof data.genres[0] === 'string') {
            genres = data.genres.join(', ');
        } else if (data.genres[0]?.name) {
            genres = data.genres.map(g => g.name).join(', ');
        } else if (data.genres[0]?.genre) {
            genres = data.genres.map(g => g.genre).join(', ');
        }
    }
    const totalEpisodes = data.totalEpisodes || '';

    // ✅ Determinar tipo correctamente
    let type = data.type || '';
    const isExplicitMovie = type.toLowerCase().includes('movie') || type.toLowerCase().includes('película');
    const isSingleEpisode = Number(totalEpisodes) === 1;

    if (isExplicitMovie || isSingleEpisode) {
        type = 'Película';
    } else {
        type = 'Serie';
    }

    // Actualizar overlay...
    const overlay = card.querySelector('.movie-overlay');
    if (!overlay) return;

    const titleEl = overlay.querySelector('.movie-title-hover');
    if (titleEl) titleEl.textContent = title;

    const metaEl = overlay.querySelector('.movie-meta-hover');
    if (metaEl) {
        let metaText = type;
        if (year) metaText += ` • ${year}`;
        // Mostrar episodios solo si es Serie y tiene más de 1
        if (type === 'Serie' && totalEpisodes && Number(totalEpisodes) > 1) {
            metaText += ` • ${totalEpisodes} episodios`;
        }
        metaEl.textContent = metaText;
    }

    const synopsisEl = overlay.querySelector('.movie-synopsis-hover');
    if (synopsisEl) {
        synopsisEl.textContent = truncateSynopsis(overview, 20);
    }

    const genresEl = overlay.querySelector('.movie-genres-hover');
    if (genresEl) {
        genresEl.textContent = genres || 'Sin géneros';
    }
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

    let categoryDiv = document.getElementById(rowId)?.closest('.category');
    if (!categoryDiv) {
        categoryDiv = createCategoryStructure(categoryTitle, rowId);
        container.appendChild(categoryDiv);
    }
    const rowElement = document.getElementById(rowId);
    if (!rowElement) return false;

    rowElement.innerHTML = `<div style="color: white; padding: 20px;">Cargando ${categoryTitle}...</div>`;

    try {
        const data = await fetchAnimeApi(endpoint);
        const results = data.results || data;
        if (!results || results.length === 0) {
            rowElement.innerHTML = `<div style="color: #aaa; padding: 20px;">No hay contenido disponible para ${categoryTitle}</div>`;
            return false;
        }

        const animeAV1Results = results.filter(item => item.provider?.toLowerCase() === 'animeav1');
        if (animeAV1Results.length === 0) {
            rowElement.innerHTML = `<div style="color: #aaa; padding: 20px;">No hay contenido disponible en AnimeAV1 para ${categoryTitle}</div>`;
            return false;
        }

        console.log("ANTES", rowElement.children.length);
        rowElement.innerHTML = '';
        let cardIndex = 0;
        const filtered = animeAV1Results.filter(isSafeForAllAges);
        filtered.slice(0, 20).forEach(item => {
            const card = document.createElement('div');
            card.classList.add('movie');

            const title = item.title || 'Sin título';
            const poster = item.image || 'images/no-poster.jpg';
            const url = item.url;

            // Guardamos la URL en dataset (solo necesitamos eso)
            card.dataset.url = url;
            card.dataset.title = title; // opcional

            // Overlay con placeholders
            card.innerHTML = `
                <img src="${poster}" alt="${title}" loading="lazy">
                <div class="movie-overlay">
                    <div class="movie-info">
                        <div class="movie-title-hover">${title}</div>
                        <div class="movie-meta-hover">Cargando...</div>
                        <div class="movie-synopsis-hover">Cargando información...</div>
                        <div class="movie-genres-hover"></div>
                    </div>
                </div>
            `;

            // ✅ Evento DENTRO del bucle
            card.addEventListener('mouseenter', function() {
                // Debounce para evitar llamadas repetidas
                if (this._hoverTimer) clearTimeout(this._hoverTimer);
                this._hoverTimer = setTimeout(() => {
                    loadAnimeCardInfo(this, this.dataset.url);
                }, 200);
            });

            card.addEventListener('click', () => {
                showAnimeInfo(url, title);
            });

            card.style.animationDelay = `${cardIndex * 0.05}s`;
            rowElement.appendChild(card);
            cardIndex++;
        });

        // === TARJETA "VER MÁS" (corregido: ahora se añade antes del return) ===
        const verMasCard = document.createElement('div');
        verMasCard.classList.add('ver-mas-card', 'movie');
        verMasCard.innerHTML = `
            <div class="ver-mas-content">
                <span>Ver más</span>
                <span class="ver-mas-icon">→</span>
            </div>
        `;
        const genreQuery = endpoint.includes('genre=') ? endpoint.split('genre=')[1].split('&')[0] : '';
        verMasCard.style.animationDelay = `${cardIndex * 0.05}s`;
        verMasCard.addEventListener('click', () => {
            showMoreResults(categoryTitle, endpoint, rowId, 'anime', 'animeav1');
        });
        rowElement.appendChild(verMasCard);

        // Actualizar botones después de añadir todo (con un pequeño retraso para asegurar renderizado)
        setTimeout(() => updateRowButtons(rowElement), 150);
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
    if (!animeUrl || !animeUrl.includes('animeav1')) {
    console.warn('URL no válida para AnimeAV1:', animeUrl);
    // Mostrar mensaje de error amigable
    infoLoading.classList.add('hidden');
    infoContentWrapper.style.display = 'flex';
    infoBackdrop.style.display = 'block';
    document.querySelector('.info-overlay').style.opacity = '1';
    infoTitle.innerText = 'Enlace no válido';
    infoSynopsis.innerText = 'Este anime no está disponible en AnimeAV1.';
    infoWatchBtn.style.display = 'none';
    document.getElementById('series-panel').style.display = 'none';
    infoWindow.style.display = 'flex';
    disableMainScroll();
    return;
}
    try {
        showLoadingSpinner();

        isMovieMode = false;
        clearTrailer();
        clearInfoFadeTimer();

        const data = await fetchAnimeApi(`/info?url=${encodeURIComponent(animeUrl)}`);
        console.log('📦 Datos de AnimeAV1:', data);

        const animeTitle = data.title || title;
        let synopsis = data.description || 'Sin sinopsis disponible';

        // Obtener tmdbId solo si no se proporcionó
        if (!tmdbId) {
            tmdbId = await getTmdbIdByTitle(animeTitle);
            if (tmdbId) {
                console.log(`✅ tmdbId obtenido para "${animeTitle}": ${tmdbId}`);
            } else {
                console.warn(`⚠️ No se encontró tmdbId para "${animeTitle}"`);
            }
        }

        // === Obtener datos de TMDB (solo si existe tmdbId) ===
        let tmdbData = null;
        let backdropUrl = null;
        let posterUrl = data.image || 'images/no-poster.jpg';

        if (tmdbId) {
            try {
                const tmdbResp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${API_KEY}&language=es-ES`);
                tmdbData = await tmdbResp.json();
                if (tmdbData.backdrop_path) {
                    backdropUrl = `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}`;
                }
                if (tmdbData.poster_path && (posterUrl === 'images/no-poster.jpg' || !posterUrl)) {
                    posterUrl = `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`;
                }
            } catch (err) {
                console.warn('Error obteniendo datos de TMDB:', err);
            }
        }

        // === AÑO (prioridad: AnimeAV1 -> TMDB) ===
        let year = 'Año desconocido';
        if (data.startDate) {
            const y = data.startDate.split('-')[0];
            if (y) year = y;
        } else if (data.year) {
            year = data.year;
        } else if (tmdbData && tmdbData.first_air_date) {
            const y = tmdbData.first_air_date.split('-')[0];
            if (y) year = y;
        }

        // === DURACIÓN (prioridad: AnimeAV1 -> TMDB) ===
        let durationText = '';
        const isMovieByType = data.type?.toLowerCase().includes('película') || data.type?.toLowerCase().includes('movie');
        if (isMovieByType) {
            if (tmdbData && tmdbData.runtime) {
                durationText = formatRuntime(tmdbData.runtime);
            } else {
                durationText = 'Película';
            }
        } else if (data.totalEpisodes) {
            durationText = `${data.totalEpisodes} episodios`;
        } else {
            durationText = 'Duración no disponible';
        }

        // === GÉNEROS (prioridad: AnimeAV1 -> TMDB) ===
        let genresText = '';
        if (data.genres && data.genres.length > 0) {
            // Si es array de strings, únelos; si es array de objetos, extrae la propiedad 'name' o 'genre'
            if (typeof data.genres[0] === 'string') {
                genresText = data.genres.join(', ');
            } else if (data.genres[0]?.name) {
                genresText = data.genres.map(g => g.name).join(', ');
            } else if (data.genres[0]?.genre) {
                genresText = data.genres.map(g => g.genre).join(', ');
            } else {
                // fallback: convertir cada objeto a string (para depuración)
                genresText = data.genres.map(g => String(g)).join(', ');
            }
        } else if (tmdbData && tmdbData.genres && tmdbData.genres.length > 0) {
            genresText = tmdbData.genres.map(g => g.name).join(', ');
        }
        // Si no hay géneros, genresText queda vacío (no se mostrará "Sin géneros")

        // === Metadatos combinados ===
        let metaText = `${year} ● ${durationText}`;
        if (genresText) {
            metaText += ` ● ${genresText}`;
        }
        document.getElementById('info-meta-text').innerText = metaText;

        
        // === Sinopsis truncada ===
        infoSynopsis.innerText = truncateSynopsis(synopsis);

        // ====== Asegurar contenedor de botones ======
        let actionsContainer = document.getElementById('info-actions-container');
        if (!actionsContainer) {
            actionsContainer = document.createElement('div');
            actionsContainer.id = 'info-actions-container';
            actionsContainer.style.cssText = 'display: flex; gap: 15px; margin-top: 20px; flex-wrap: wrap;';
            // Insertar después de la sinopsis
            const synopsisEl = document.getElementById('info-synopsis');
            if (synopsisEl && synopsisEl.parentNode) {
                synopsisEl.parentNode.insertBefore(actionsContainer, synopsisEl.nextSibling);
            } else {
                document.querySelector('.info-main').appendChild(actionsContainer);
            }
        }
        // Mover los botones al contenedor
        const watchBtn = document.getElementById('info-watch-btn');
        const favBtn = document.getElementById('info-fav-btn');
        if (watchBtn && watchBtn.parentNode !== actionsContainer) {
            actionsContainer.appendChild(watchBtn);
        }
        if (favBtn && favBtn.parentNode !== actionsContainer) {
            actionsContainer.appendChild(favBtn);
        }
        // Asegurar que sean visibles
        if (watchBtn) watchBtn.style.display = 'block';
        if (favBtn) favBtn.style.display = 'block';

        // === Título ===
        infoTitle.innerText = animeTitle;

        // === Backdrop ===
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
            animeEpisodeUrl: null,
            isMovie: isMovie,           // ← añadir
            episodeNumber: null         // ← añadir
        };

            if (isMovie) {
                seriesPanel.style.display = 'none';
                if (episodes.length > 0) {
                    currentMovieData.animeEpisodeUrl = episodes[0].url;
                    currentMovieData.episodeNumber = episodes[0].number;
                }
                episodesContainer.innerHTML = '';
                if (seasonsContainer) seasonsContainer.innerHTML = '';
            } else {
            currentMovieData.isMovie = false;
            seriesPanel.style.display = 'flex';

            if (seasonsSection) {
                const seasonsTitle = seasonsSection.querySelector('h3');
                if (seasonsTitle) seasonsTitle.textContent = 'Temporadas';
            }

            if (seasonsContainer) {
                await loadRelatedAnimes(animeTitle, animeUrl, seasonsContainer);
            }

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
                        // ✅ Cambiar el botón directamente a "VER CAPÍTULO X"
                        const watchBtn = document.getElementById('info-watch-btn');
                        if (watchBtn) {
                            watchBtn.textContent = `VER CAPÍTULO ${ep.number}`;
                        }
                    });
                    episodesContainer.appendChild(btn);
                });

                // Cargar progreso y seleccionar episodio
                const identifier = tmdbId || animeUrl;
                let progress = null;
                if (identifier) {
                    progress = getProgress(identifier, 'anime');
                }
                let targetEpisode = null;
                if (progress && progress.episode !== undefined) {
                    targetEpisode = progress.episode;
                }
                const allBtns = episodesContainer.querySelectorAll('.episode-btn');
                let found = false;
                if (targetEpisode !== null) {
                    allBtns.forEach(btn => {
                        const num = parseInt(btn.textContent.replace('Capítulo ', ''));
                        if (num === targetEpisode) {
                            btn.click();
                            found = true;
                        }
                    });
                }
                if (!found && allBtns.length > 0) {
                    allBtns[0].click();
                }
            }
        }

        hideLoadingSpinner();
        updateWatchButton('anime');

        // Favoritos
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
        infoLoading.classList.add('hidden');
        infoContentWrapper.style.display = 'flex';
        infoBackdrop.style.display = 'block';
        document.querySelector('.info-overlay').style.opacity = '1';
        infoTitle.innerText = 'Error al cargar la información';
        infoSynopsis.innerText = 'No se pudo cargar los datos del anime.';
        infoWatchBtn.style.display = 'none';
        document.getElementById('series-panel').style.display = 'none';
        infoWindow.style.display = 'flex';
        disableMainScroll();
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

    // Guardar progreso y recientes
    if (currentMovieData) {
        const identifier = currentMovieData.tmdbId || currentMovieData.animeUrl;
        if (identifier) {
            const episodeNumber = currentMovieData.episodeNumber || 1;
            saveProgress(identifier, 'anime', null, episodeNumber);
        }
        addToRecent(
            currentMovieData.tmdbId,
            'anime',
            currentMovieData.animeTitle || currentMovieData.title,
            currentMovieData.posterPath || '',
            currentMovieData.originalLang || 'ja',
            currentMovieData.animeUrl,
            currentMovieData.isMovie || false
        );
    }

    // Mostrar reproductor
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    if (logoDiv) logoDiv.style.display = 'none';
    playerFullscreen.style.display = 'flex';
    playerContainer.innerHTML = `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" referrerpolicy="no-referrer" allowfullscreen style="border:none;"></iframe>`;

    // Activar botón de atrás y bloqueo de scroll
    addGlobalPlayerListeners();
    showBackButton();
    disableMainScroll();
}

// ==================== CARGAR CONTENIDO DE PESTAÑAS ====================
async function loadTabContent(tabId) {
    if (tabId === 'inicio') {
        // Cargar carrusel de inicio (películas populares, sin shuffle)
        loadHeroCarousel('hero-carousel', '/movie/popular', { shuffle: false, limit: 5, mediaType: 'movie' });
        const container = document.getElementById('categories-container-inicio');
        if (container) {
            loadRecentRow();
            await loadDynamicRow("/movie/now_playing", "row-estrenos-inicio", "Estrenos recientes", container.id);
            insertLeaderboardBanner(container, 'after'); // Banner después de la primera fila
            await loadDynamicRow("/discover/tv?sort_by=first_air_date.desc&first_air_date.lte=2026-12-31&vote_average.gte=5&vote_count.gte=10", "row-series-recientes", "Series recientes", container.id, 'es-ES', 'tv');
            await loadDynamicRow("/movie/popular", "row-populares-inicio", "Películas populares", container.id);
            await loadDynamicRow("/discover/movie?with_genres=16,10751&sort_by=popularity.desc", "row-animados-inicio", "Animados para niños", container.id);
        }
    } else if (tabId === 'peliculas') {
        // Cargar carrusel de películas (recientes, con shuffle)
        loadHeroCarousel('hero-carousel-peliculas', '/movie/now_playing', { shuffle: true, limit: 5, mediaType: 'movie' });
        const container = document.getElementById('categories-container-peliculas');
        if (container) {
            await loadDynamicRow("/movie/now_playing", "row-estrenos-pelis", "Estrenos recientes", container.id);
            insertLeaderboardBanner(container, 'after'); // Banner después de la primera fila
            await loadDynamicRow("/discover/movie?with_companies=174&sort_by=popularity.desc", "row-warner-bros", "Warner Bros. Pictures", container.id, 'es-ES', 'movie');
            await loadDynamicRow("/discover/movie?with_companies=2&sort_by=popularity.desc", "row-disney-peliculas", "Disney (Walt Disney Pictures)", container.id, 'es-ES', 'movie');
            await loadDynamicRow("/discover/movie?with_companies=19551&sort_by=popularity.desc", "row-apple-peliculas", "Apple Studios", container.id, 'es-ES', 'movie');
              // ← inserta después de la primera fila
            await loadDynamicRow("/discover/movie?with_genres=28&sort_by=popularity.desc", "row-accion-pelis", "Acción", container.id);
            await loadDynamicRow("/discover/movie?with_genres=28,14,878&sort_by=popularity.desc", "row-superheroes-pelis", "Superhéroes", container.id);
              // ← inserta después de la primera fila
            await loadDynamicRow("/discover/movie?with_genres=16,10751&sort_by=popularity.desc", "row-animados-pelis", "Animados para niños", container.id);
            await loadDynamicRow("/discover/movie?with_genres=27&sort_by=popularity.desc", "row-terror-pelis", "Terror", container.id);
              // ← inserta después de la primera fila
        }
    } else if (tabId === 'series') {
        // Cargar carrusel de series (emisión actual, orden aleatorio)
        loadHeroCarousel('hero-carousel-series', '/tv/on_the_air', { shuffle: true, limit: 5, mediaType: 'tv' });
        const container = document.getElementById('categories-container-series');
        if (container) {
            await loadDynamicRow("/discover/tv?with_networks=213&sort_by=first_air_date.desc&first_air_date.lte=2026-06-15", "row-series-nuevas-netflix", "Series nuevas en Netflix", container.id, 'es-ES', 'tv');
            insertLeaderboardBanner(container, 'after'); // Banner después de la primera fila
            await loadDynamicRow("/tv/popular", "row-series-populares", "Series populares", container.id, 'es-ES', 'tv');
              // ← inserta después de la primera fila
            await loadDynamicRow("/discover/tv?with_networks=2739&sort_by=popularity.desc", "row-disney-plus", "Series de Disney+", container.id, 'es-ES', 'tv');
            await loadDynamicRow("/discover/tv?with_networks=2552&sort_by=popularity.desc", "row-apple-tv", "Series de Apple TV+", container.id, 'es-ES', 'tv');
              // ← inserta después de la primera fila
            await loadDynamicRow("/discover/tv?with_genres=16,10751&certification_country=US&certification=TV-Y&sort_by=popularity.desc", "row-series-preescolar", "Series para niños pequeños", container.id, 'es-ES', 'tv');
        }
    } else if (tabId === 'buscar') {
        // No cargamos nada automático
    } else if (tabId === 'favoritos') {
        loadFavorites();
    } else if (tabId === 'anime') {
    // Cargar carrusel de anime
    loadAnimeCarousel('hero-carousel-anime');
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

// ==================== TEXTO DEL BOTÓN (COMÚN) ====================
function getWatchButtonText(mediaType, identifier, isMovie = false) {
    if (!identifier) return 'VER AHORA';
    const progress = getProgress(identifier, mediaType);
    if (mediaType === 'movie') {
        return (progress && progress.watched) ? 'CONTINUAR VIENDO' : 'VER AHORA';
    } else if (mediaType === 'tv') {
        if (progress && progress.season !== undefined && progress.episode !== undefined) {
            return `CONTINUAR CAPÍTULO ${progress.episode}`;
        }
        return 'VER AHORA';
    } else if (mediaType === 'anime') {
        if (isMovie) {
            return (progress && progress.episode !== undefined) ? 'CONTINUAR VIENDO' : 'VER AHORA';
        } else {
            if (progress && progress.episode !== undefined) {
                return `CONTINUAR CAPÍTULO ${progress.episode}`;
            }
            return 'VER AHORA';
        }
    }
    return 'VER AHORA';
}


// ==================== FUNCIONES PARA TRÁILER ====================
async function getTrailer(tmdbId) {
    try {
        const url = `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${API_KEY}&language=es-ES`;
        const response = await fetch(url);
        const data = await response.json();
        if (!data.results || data.results.length === 0) return null;
        // Buscar tráiler en español, luego en inglés, luego teaser
        const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.iso_639_1 === 'es') ||
                        data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') ||
                        data.results.find(v => v.type === 'Teaser' && v.site === 'YouTube' && v.iso_639_1 === 'es') ||
                        data.results.find(v => v.site === 'YouTube');
        console.log('🎥 Trailer encontrado:', trailer ? trailer.key : 'ninguno');                
        return trailer ? trailer.key : null;
    } catch (error) {
        console.error('Error obteniendo tráiler:', error);
        return null;
    }
}


// Reproducir el tráiler (crea el contenedor y el iframe)
function playTrailer(videoId) {
    console.log('🎬 Reproduciendo tráiler:', videoId);

    // 1. Desvanecer el backdrop (fondo de la información)
    const backdrop = document.getElementById('info-backdrop');
    if (backdrop) {
        backdrop.style.transition = 'opacity 1.5s ease';
        backdrop.style.opacity = '0';
    }

    // 2. Crear o obtener el contenedor del tráiler
    let trailerContainer = document.getElementById('trailer-container');
    if (!trailerContainer) {
        trailerContainer = document.createElement('div');
        trailerContainer.id = 'trailer-container';
        // Colocar el contenedor justo encima del backdrop
        const backdropEl = document.getElementById('info-backdrop');
        if (backdropEl) {
            backdropEl.parentNode.insertBefore(trailerContainer, backdropEl);
        } else {
            document.querySelector('.info-window').prepend(trailerContainer);
        }
        // Estilos para que ocupe todo y esté visible
        trailerContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;          /* Por encima del backdrop (z-index: 0) pero debajo del contenido (z-index: 2) */
            pointer-events: none; /* Para que no interfiera con los clics */
            opacity: 0;
            transition: opacity 1.5s ease;
        `;
    }

    // 3. Limpiar contenido anterior y crear el iframe con mute activado
    trailerContainer.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.id = 'trailer-iframe';
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&showinfo=0&hl=es&cc_load_policy=0&iv_load_policy=3`;
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

    // 4. Fade in del tráiler (aparece suavemente)
    setTimeout(() => {
        trailerContainer.style.opacity = '1';
    }, 300);

    // 5. Activar sonido automáticamente después de 1.5 segundos
    setTimeout(() => {
        activarSonido(); // quita el mute
        // Iniciar el temporizador para ocultar la información (modo cine)
        resetInfoFadeTimer();
    }, 1500);
    console.log('⏳ Programando tráiler para dentro de 4 segundos');
}



// Activar sonido (quitar mute del iframe)
function activarSonido() {
    const iframe = document.querySelector('#trailer-container iframe');
    if (iframe) {
        let newSrc = iframe.src.replace('mute=1', 'mute=0');
        if (!newSrc.includes('autoplay=1')) {
            newSrc = newSrc.replace('?', '?autoplay=1&');
        }
        iframe.src = newSrc;
        console.log('🔊 Sonido activado automáticamente');
    } else {
        console.warn('❌ No se encontró iframe del tráiler');
    }
}

// ==================== BUSCADOR GENERAL ====================
async function performSearch(query, filter) {
    if (!query.trim()) return;

    currentSearchQuery = query.trim();
    currentSearchFilter = filter;

    loadedResultIds = new Set();

    moreResultsState = {
        page: 1,
        totalPages: null,
        isLoading: false,
        hasMore: true,
        provider: filter === "anime" ? "animeav1" : "tmdb",
        contentType: filter,
        query: query.trim(),
        isSearch: true
    };

    const resultsGrid = document.getElementById("search-results-grid");
    resultsGrid.innerHTML = "";

    // ✅ Actualizar título y placeholder
    const resultsTitle = document.getElementById('search-results-title');
    if (resultsTitle) {
        resultsTitle.textContent = `Resultados para "${query.trim()}"`;
    }
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.placeholder = `Buscar...`;
    }

    await loadMoreResults();
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
    infoLoading.classList.add('hidden');
    infoContentWrapper.style.display = 'flex';
    infoBackdrop.style.display = 'block';
    document.querySelector('.info-overlay').style.opacity = '1';
    console.log('Ventana cerrada y tráiler detenido');

    // ✅ Actualizar recientes si la pestaña activa es Inicio
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.dataset.tab === 'inicio') {
        // Pequeño retraso para que el DOM se actualice
        loadRecentRow();
    }
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

            lastInfoData = {
            tmdbId: currentMovieData.tmdbId,
            mediaType: currentMovieData.mediaType,
            title: currentMovieData.title,
            originalLang: currentMovieData.originalLang,
            posterPath: currentMovieData.posterPath,
            // Para series, guardar también el estado de temporada/episodio si es necesario
            season: currentMovieData.season,
            episode: currentMovieData.episode,
            // Para anime, guardar la URL y el título
            animeUrl: currentMovieData.animeUrl,
            animeTitle: currentMovieData.animeTitle
        };


        const { tmdbId, mediaType, title, originalLang, season, episode, posterPath } = currentMovieData;
        //addToRecent(tmdbId, mediaType, title, posterPath, originalLang);
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

    // Buscar si ya existe la categoría
    let categoryDiv = document.getElementById(rowId)?.closest('.category');
    if (!categoryDiv) {
        // Crear la categoría con la nueva estructura (con botones)
        categoryDiv = createCategoryStructure(categoryTitle, rowId);
        container.appendChild(categoryDiv);
    }

    // Obtener la fila (row) desde la categoría recién creada o existente
    const rowElement = document.getElementById(rowId);
    if (!rowElement) {
        console.error(`No se encuentra la fila con id ${rowId}`);
        return;
    }

    // Mostrar mensaje de carga
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
        let cardIndex = 0;

        for (const item of data.results) {
            const card = document.createElement("div");
            card.classList.add("movie");

            const tmdbId = item.id;
            const mediaType = contentType;
            const title = item.title || item.name;
            const originalLang = item.original_language;
            const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "images/no-poster.jpg";
            const overview = item.overview || '';
            const year = (item.release_date || item.first_air_date || '').split('-')[0] || '';
            const genreIds = item.genre_ids || [];
            const runtime = '';   // no viene en la lista, se puede obtener bajo demanda
            const episodes = '';  // igual


            card.dataset.tmdbId = tmdbId;
            card.dataset.mediaType = mediaType;
            card.dataset.title = title;
            card.dataset.originalLang = originalLang;
            card.dataset.overview = overview;
            card.dataset.year = year;
            card.dataset.genreIds = genreIds.join(',');

            // Obtener nombres de géneros y sinopsis corta
            const genreNames = getGenreNamesFromIds(genreIds, mediaType);
            const synopsisShort = truncateSynopsis(overview, 20);

            card.innerHTML = `
                <img src="${poster}" alt="${title}" loading="lazy">
                <div class="movie-overlay">
                    <div class="movie-info">
                        <div class="movie-title-hover">${title}</div>
                        <div class="movie-meta-hover">${mediaType === 'movie' ? 'Película' : 'Serie'}${year ? ` • ${year}` : ''}</div>
                        <div class="movie-synopsis-hover">${synopsisShort}</div>
                        <div class="movie-genres-hover">${genreNames}</div>
                    </div>
                </div>
            `;


            card.tabIndex = 0;
            //card.innerHTML = `<img src="${poster}" alt="${title}"><div class="movie-title">${title}</div>`;
            card.addEventListener("click", () => {
                const posterUrl = card.querySelector("img").src;
                showMovieInfo(tmdbId, mediaType, title, originalLang, posterUrl);
            });
            // Asignar retraso progresivo: 50ms entre cada tarjeta
            card.style.animationDelay = `${cardIndex * 0.05}s`;
            rowElement.appendChild(card);
            cardIndex++;
        }

        // Botón "Ver más" (también con retraso)
        const verMasCard = document.createElement('div');
        verMasCard.classList.add('ver-mas-card', 'movie');
        verMasCard.innerHTML = `
            <div class="ver-mas-content">
                <span>Ver más</span>
                <span class="ver-mas-icon">→</span>
            </div>
        `;
        verMasCard.style.animationDelay = `${cardIndex * 0.05}s`;
        verMasCard.addEventListener('click', () => {
            showMoreResults(categoryTitle, endpoint, rowId, contentType, 'tmdb');
        });
        rowElement.appendChild(verMasCard);
        updateRowButtons(rowElement);

    } catch (error) {
        console.error(`Error cargando ${categoryTitle}:`, error);
        rowElement.innerHTML = `<div style="color: red; padding: 20px;">Error al cargar ${categoryTitle}. Ver consola.</div>`;
    }
}

function showMoreResults(categoryTitle, endpoint, rowId, contentType = 'movie', provider = 'tmdb') {
    moreResultsState = {
        endpoint: endpoint,
        page: 1,
        categoryTitle: categoryTitle,
        totalPages: null,
        isLoading: false,
        contentType: contentType,
        provider: provider,
        hasMore: true,
        isSearch: false  // ✅ Importante: no es una búsqueda libre
    };
    loadedResultIds = new Set();

    // Cambiar a la pestaña de búsqueda
    const tabBtn = document.querySelector('.tab-btn[data-tab="buscar"]');
    if (tabBtn) {
        switchTab('buscar');
    }

    const filterMap = {
        'movie': 'movie',
        'tv': 'tv',
        'anime': 'anime'
    };
    const filterValue = filterMap[contentType] || 'movie';
    currentSearchFilter = filterValue;

    // Activar filtro visual
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filterValue);
    });

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = `Mostrando: ${categoryTitle}`;
    }

    const resultsTitle = document.getElementById('search-results-title');
    if (resultsTitle) {
        resultsTitle.textContent = `${categoryTitle} - Ver más`;
    }

    // ✅ Cargar la primera página
    loadMoreResults();

    // ❌ ELIMINAR esta línea: setTimeout(() => setupInfiniteScroll(), 300);
}

async function loadMoreResults() {
    if (!moreResultsState) return;
    if (moreResultsState.isLoading) return;
    if (moreResultsState.totalPages !== null && moreResultsState.page > moreResultsState.totalPages) {
        moreResultsState.hasMore = false;
        return;
    }
    if (moreResultsState.provider === 'animeav1' && moreResultsState.hasMore === false) return;

    moreResultsState.isLoading = true;
    const { endpoint, page, categoryTitle, contentType, provider, query } = moreResultsState;
    const resultsGrid = document.getElementById("search-results-grid");
    if (!resultsGrid) {
        moreResultsState.isLoading = false;
        return;
    }

    // ✅ Solo limpiar en la primera página
    if (page === 1) {
        resultsGrid.innerHTML = '<div class="no-results">Cargando...</div>';
    } else {
        // Eliminar mensaje de "No hay más resultados" si existe
        const noMore = document.getElementById('no-more-results');
        if (noMore) noMore.remove();
        // Mostrar indicador de carga al final
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'more-loading';
        loadingIndicator.textContent = 'Cargando más...';
        loadingIndicator.style.cssText = 'grid-column:1/-1; text-align:center; color:#aaa; padding:20px;';
        resultsGrid.appendChild(loadingIndicator);
    }

    try {
        let data, results = [];
        let isAnime = (provider === 'animeav1');

        if (moreResultsState.isSearch) {
            if (isAnime) {
                data = await fetchAnimeApi(`/search?q=${encodeURIComponent(query)}&page=${page}&limit=20`);
                results = data.results || [];
                moreResultsState.hasMore = true;
            } else {
                const url = `https://api.themoviedb.org/3/search/${contentType}?api_key=${API_KEY}&language=es-ES&query=${encodeURIComponent(query)}&page=${page}`;
                const response = await fetch(url);
                data = await response.json();
                results = data.results || [];
                moreResultsState.totalPages = data.total_pages || 1;
                moreResultsState.hasMore = page < moreResultsState.totalPages;
            }
        } else if (isAnime) {
            // "Ver más" de anime
            data = await fetchAnimeApi(`${endpoint}&page=${page}&limit=20`);
            results = data.results || [];
            moreResultsState.hasMore = true;
        } else {
            // "Ver más" de TMDB
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `https://api.themoviedb.org/3${endpoint}${separator}api_key=${API_KEY}&language=es-ES&page=${page}`;
            const response = await fetch(url);
            data = await response.json();
            results = data.results || [];
            moreResultsState.totalPages = data.total_pages || 1;
            moreResultsState.hasMore = page < moreResultsState.totalPages;
        }

        // Eliminar indicador de carga (si existe)
        const loadingEl = document.getElementById('more-loading');
        if (loadingEl) loadingEl.remove();

        // Si es la primera página, limpiar el grid (ya se borró al inicio)
        if (page === 1) {
            resultsGrid.innerHTML = '';
        }

        // Si no hay resultados, mostrar mensaje y detener
        if (results.length === 0) {
            const noMore = document.createElement('div');
            noMore.id = 'no-more-results';
            noMore.textContent = 'No hay más resultados.';
            noMore.style.cssText = 'grid-column:1/-1; text-align:center; color:#aaa; padding:20px;';
            resultsGrid.appendChild(noMore);
            moreResultsState.hasMore = false;
            if (infiniteObserver) {
                infiniteObserver.disconnect();
                infiniteObserver = null;
            }
            moreResultsState.isLoading = false;
            return;
        }

        let newCardsAdded = 0;

       results.forEach(item => {
       if (isAnime) {
    if (item.provider?.toLowerCase() !== 'animeav1') return;
    if (!item.url) return;
    if (loadedResultIds.has(item.url)) return;
    loadedResultIds.add(item.url);
    newCardsAdded++;

    const title = item.title || 'Sin título';
    const poster = item.image || 'images/no-poster.jpg';
    const url = item.url;

    const card = document.createElement('div');
    card.classList.add('movie');
    card.dataset.url = url;
    card.dataset.title = title;

    // Overlay con placeholders (igual que en las filas)
    card.innerHTML = `
        <img src="${poster}" alt="${title}" loading="lazy">
        <div class="movie-overlay">
            <div class="movie-info">
                <div class="movie-title-hover">${title}</div>
                <div class="movie-meta-hover">Cargando...</div>
                <div class="movie-synopsis-hover">Cargando información...</div>
                <div class="movie-genres-hover"></div>
            </div>
        </div>
    `;

    // Evento mouseenter para cargar info bajo demanda
    card.addEventListener('mouseenter', function() {
        if (this._hoverTimer) clearTimeout(this._hoverTimer);
        this._hoverTimer = setTimeout(() => {
            loadAnimeCardInfo(this, this.dataset.url);
        }, 200);
    });

    card.addEventListener('click', () => showAnimeInfo(url, title));
    card.tabIndex = 0;
    resultsGrid.appendChild(card);
}

        else {
        const tmdbId = item.id;
        const mediaType = contentType;
        const title = item.title || item.name;
        const originalLang = item.original_language;
        const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "images/no-poster.jpg";
        const overview = item.overview || '';
        const year = (item.release_date || item.first_air_date || '').split('-')[0] || '';
        const genreIds = item.genre_ids || [];

        const card = document.createElement('div');
        card.classList.add('movie');
        card.dataset.tmdbId = tmdbId;
        card.dataset.mediaType = mediaType;
        card.dataset.title = title;
        card.dataset.originalLang = originalLang;
        

        const genreNames = getGenreNamesFromIds(genreIds, mediaType);
        const synopsisShort = truncateSynopsis(overview, 20);

        card.innerHTML = `
            <img src="${poster}" alt="${title}" loading="lazy">
            <div class="movie-overlay">
                <div class="movie-info">
                    <div class="movie-title-hover">${title}</div>
                    <div class="movie-meta-hover">${mediaType === 'movie' ? 'Película' : 'Serie'}${year ? ` • ${year}` : ''}</div>
                    <div class="movie-synopsis-hover">${synopsisShort}</div>
                    <div class="movie-genres-hover">${genreNames}</div>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            const posterUrl = card.querySelector('img').src;
            showMovieInfo(tmdbId, mediaType, title, originalLang, posterUrl);
        });
        card.tabIndex = 0;
        resultsGrid.appendChild(card);
    }
});

        // Eliminar indicador de carga si existe


        // Decidir si hay más páginas
        if (isAnime) {
            // Si no se añadió ninguna tarjeta O se añadieron menos de 20 (y no es la primera página) -> fin
            if (newCardsAdded === 0 || (page > 1 && newCardsAdded < 20)) {
                moreResultsState.hasMore = false;
                // Mostrar "No hay más resultados" si no existe
                let noMore = document.getElementById('no-more-results');
                if (!noMore) {
                    noMore = document.createElement('div');
                    noMore.id = 'no-more-results';
                    noMore.textContent = 'No hay más resultados.';
                    noMore.style.cssText = 'grid-column:1/-1; text-align:center; color:#aaa; padding:20px;';
                    resultsGrid.appendChild(noMore);
                }
                if (infiniteObserver) {
                    infiniteObserver.disconnect();
                    infiniteObserver = null;
                }
                // No incrementar página ni configurar observador
                moreResultsState.isLoading = false;
                return; // Salir para no ejecutar el resto
            } else {
                // Hay más resultados, incrementar página y configurar observador
                moreResultsState.page += 1;
                setupInfiniteScroll();
            }
        } else {
            // TMDB: usar su paginación nativa
            moreResultsState.page += 1;
            setupInfiniteScroll();
        }

    } catch (error) {
        console.error('Error en loadMoreResults:', error);
        // Si es la primera página, mostrar error; si no, mostrar mensaje en el grid
        if (page === 1) {
            resultsGrid.innerHTML = '<div class="no-results">Error al cargar resultados.</div>';
        } else {
            const errorMsg = document.createElement('div');
            errorMsg.textContent = 'Error al cargar más resultados.';
            errorMsg.style.cssText = 'grid-column:1/-1; text-align:center; color:#ff6b6b; padding:20px;';
            resultsGrid.appendChild(errorMsg);
        }
    } finally {
        moreResultsState.isLoading = false;
    }

    // Función interna para el observador
    function setupInfiniteScroll() {
        if (infiniteObserver) {
            infiniteObserver.disconnect();
            infiniteObserver = null;
        }
        // El último hijo del grid (puede ser un mensaje de fin o una tarjeta)
        const lastChild = resultsGrid.lastElementChild;
        if (!lastChild) return;
        // Si es un mensaje de "No hay más resultados", no observar
        if (lastChild.id === 'no-more-results' || lastChild.id === 'more-loading') return;

        infiniteObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !moreResultsState.isLoading && moreResultsState.hasMore) {
                    loadMoreResults();
                }
            });
        }, { rootMargin: '0px 0px 100px 0px', threshold: 0.1 });
        infiniteObserver.observe(lastChild);
    }
}

// ==================== FUNCIÓN PARA SERIES (CORREGIDA) ====================
async function showMovieInfo(tmdbId, mediaType, title, originalLang, posterUrl) {
    try {
        // Mostrar spinner inmediatamente
        showLoadingSpinner();

        isMovieMode = (mediaType === 'movie');
        // 🔹 Limpiar cualquier tráiler o temporizador previo
        clearTrailer();
        clearInfoFadeTimer();

        let url = mediaType === "movie"
            ? `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${API_KEY}&language=es-ES`
            : `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${API_KEY}&language=es-ES`;
        const response = await fetch(url);
        const data = await response.json();

        infoTitle.innerText = title;

        // --- Año ---
        const releaseDate = mediaType === "movie" ? data.release_date : data.first_air_date;
        const year = releaseDate ? releaseDate.split('-')[0] : "Año desconocido";

        // --- Duración ---
        let durationText = '';
        if (mediaType === 'movie') {
            durationText = formatRuntime(data.runtime);
        } else { // tv
            const episodes = data.number_of_episodes || '?';
            durationText = `${episodes} episodios`;
        }

        // --- Géneros ---
        let genresText = '';
        if (data.genres && data.genres.length > 0) {
            genresText = data.genres.map(g => g.name).join(', ');
        }

        // --- Metadatos combinados ---
        let metaText = `${year} ● ${durationText}`;
        if (genresText) {
            metaText += ` ● ${genresText}`;
        }
        document.getElementById('info-meta-text').innerText = metaText;

        // --- Sinopsis truncada ---
        infoSynopsis.innerText = truncateSynopsis(data.overview);

        const seriesPanel = document.getElementById('series-panel');
        if (mediaType === 'tv') {
            if (seriesPanel) seriesPanel.style.display = 'flex';
            // || '?'} episodios`;
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
            //infoDuration.innerText = data.runtime ? `${data.runtime} min` : 'Duración no disponible';
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

        console.log('🔍 mediaType:', mediaType);
        console.log('🔍 tmdbId:', tmdbId);

        // ====== ACTIVAR TRÁILER (SOLO PARA PELÍCULAS) ======
        if (mediaType === 'movie') {
            clearTrailer(); // Limpia por si quedaba algo de antes
            const trailerKey = await getTrailer(tmdbId);
            if (trailerKey) {
                currentTrailerId = trailerKey;
                trailerTimeout = setTimeout(() => {
                    playTrailer(trailerKey);
                }, 4000); // Espera 4 segundos antes de mostrar el tráiler
            }
        }

        hideLoadingSpinner();
        //infoWindow.style.display = "flex";
        disableMainScroll(); // ← AÑADE ESTA LÍNEA

        if (mediaType === 'movie') {
            updateWatchButton(mediaType);
        } else if (mediaType === 'tv') {
            const progress = getProgress(tmdbId, 'tv');
            if (progress) {
                currentMovieData.season = progress.season;
                currentMovieData.episode = progress.episode;
            } 
        }
            updateWatchButton(mediaType);
            
        const isFav = isFavorite(tmdbId, mediaType);
        updateFavButton(isFav);
    } catch (error) {
        console.error("Error cargando info:", error);
        // Mostrar mensaje de error en lugar de spinner
        infoLoading.classList.add('hidden');
        infoContentWrapper.style.display = 'flex';
        infoBackdrop.style.display = 'block';
        document.querySelector('.info-overlay').style.opacity = '1';
        infoTitle.innerText = 'Error al cargar la información';
        infoSynopsis.innerText = 'No se pudo cargar los datos. Intenta de nuevo.';
        infoWatchBtn.style.display = 'none';
        infoYear.innerText = '';
        infoDuration.innerText = '';
        // Ocultar panel de series
        document.getElementById('series-panel').style.display = 'none';
        // Asegurar que la ventana sea visible
        infoWindow.style.display = 'flex';
        disableMainScroll();
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
        
        // Guardar referencia a todos los botones
        const buttons = [];
        episodes.forEach(ep => {
            const btn = document.createElement('button');
            btn.innerText = `Capítulo ${ep.episode_number}`;
            btn.classList.add('episode-btn');
            btn.dataset.episode = ep.episode_number;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.episode-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                if (currentMovieData) {
                    currentMovieData.season = seasonNumber;
                    currentMovieData.episode = ep.episode_number;
                    // Cambiar el botón directamente a "VER CAPÍTULO X"
                    const watchBtn = document.getElementById('info-watch-btn');
                    if (watchBtn) {
                        watchBtn.textContent = `VER CAPÍTULO ${ep.episode_number}`;
                    }
                }
                btn.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            });
            episodesContainer.appendChild(btn);
            buttons.push(btn);
        });

        // Determinar qué episodio seleccionar
        let targetEpisode = null;
        if (currentMovieData?.tmdbId) {
            const progress = getProgress(currentMovieData.tmdbId, 'tv');
            if (progress && progress.season === seasonNumber && progress.episode !== undefined) {
                targetEpisode = progress.episode;
            }
        }

        // Si no hay progreso para esta temporada, seleccionar el primero
        if (targetEpisode === null && buttons.length > 0) {
            targetEpisode = 1;
        }

        // Seleccionar el episodio sin disparar el evento click
        if (targetEpisode !== null) {
            const targetBtn = buttons.find(b => parseInt(b.dataset.episode) === targetEpisode);
            if (targetBtn) {
                // Marcar como seleccionado
                buttons.forEach(b => b.classList.remove('selected'));
                targetBtn.classList.add('selected');
                // Actualizar currentMovieData
                if (currentMovieData) {
                    currentMovieData.season = seasonNumber;
                    currentMovieData.episode = targetEpisode;
                }
                // Actualizar el texto del botón de ver
                const watchBtn = document.getElementById('info-watch-btn');
                if (watchBtn) {
                    // Si hay progreso, mostrar "CONTINUAR...", sino "VER CAPÍTULO X"
                    const progress = getProgress(currentMovieData?.tmdbId, 'tv');
                    if (progress && progress.season === seasonNumber && progress.episode === targetEpisode) {
                        watchBtn.textContent = `CONTINUAR CAPÍTULO ${targetEpisode}`;
                    } else {
                        watchBtn.textContent = `VER CAPÍTULO ${targetEpisode}`;
                    }
                }
            }
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

    // Mostrar reproductor
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    if (logoDiv) logoDiv.style.display = 'none';
    playerFullscreen.style.display = "flex";
    playerContainer.innerHTML = `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" referrerpolicy="no-referrer" allowfullscreen style="border:none;"></iframe>`;

    // Activar listeners globales (ya se encargan de mostrar/ocultar el botón)
    addGlobalPlayerListeners();
    // Mostrar el botón y programar su ocultamiento
    showBackButton();
    // Bloquear scroll mientras se reproduce
    disableMainScroll();

    // ❌ ELIMINAR todo el bloque que manipula backButton.style.display y temporizadores manuales
    // ✅ Ya está gestionado por showBackButton() y resetBackButtonTimer()
}

// Detener y eliminar el tráiler
function clearTrailer() {
    console.log('🧹 Limpiando tráiler');
    const container = document.getElementById('trailer-container');
    if (container) {
        // Detener el video
        const iframe = container.querySelector('iframe');
        if (iframe) {
            iframe.src = 'about:blank';
            try { iframe.contentWindow.stop(); } catch (e) {}
        }
        // Eliminar el contenedor
        container.remove();
    }

    // Restaurar backdrop
    const backdrop = document.getElementById('info-backdrop');
    if (backdrop) {
        backdrop.style.transition = 'opacity 1.5s ease';
        backdrop.style.opacity = '1';
        backdrop.style.display = 'block';
    }

    // Limpiar timeouts
    if (trailerTimeout) {
        clearTimeout(trailerTimeout);
        trailerTimeout = null;
    }
    if (infoFadeTimer) {
        clearTimeout(infoFadeTimer);
        infoFadeTimer = null;
    }
    // Restaurar visibilidad de la información
    showInfoOverlay();
    
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
    // Solo iniciar el temporizador si estamos en modo película
    if (!isMovieMode) return;

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

function handleUserInteraction(e) {
    // Si el evento viene de un campo de texto, no hacer nada
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
        return;
    }
    if (!isInfoVisible) {
        showInfoOverlay();
    }
}

function closePlayer() {
    // Limpiar eventos y temporizador
    if (backButtonTimer) clearTimeout(backButtonTimer);
    playerFullscreen.removeEventListener('mousemove', showBackButton);
    playerFullscreen.removeEventListener('click', showBackButton);
    playerFullscreen.removeEventListener('touchstart', showBackButton);

    playerFullscreen.style.display = "none";
    removeGlobalPlayerListeners();
    playerContainer.innerHTML = "";
    // Restaurar contenido...
}

// ==================== EVENTOS ====================
backButton.addEventListener("click", () => {
    // Cerrar reproductor
    playerFullscreen.style.display = "none";
    removeGlobalPlayerListeners();
    playerContainer.innerHTML = "";
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = '');
    resetWatchTimer();
    if (logoDiv) logoDiv.style.display = "block";

    if (currentMovieData) {
        infoWindow.style.display = "flex";
        disableMainScroll();
        if (currentMovieData.mediaType === 'anime') {
            showAnimeInfo(currentMovieData.animeUrl, currentMovieData.title, currentMovieData.tmdbId);
        } else {
            showMovieInfo(currentMovieData.tmdbId, currentMovieData.mediaType, currentMovieData.title, currentMovieData.originalLang, currentMovieData.posterPath);
        }
        // ✅ FORZAR ACTUALIZACIÓN DE RECIENTES (con pequeño retraso)
        setTimeout(() => {
            loadRecentRow();
        }, 50);
    } else {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) switchTab(activeTab.dataset.tab);
        enableMainScroll();
    }

    if (backButtonTimer) clearTimeout(backButtonTimer);
    playerFullscreen.removeEventListener('mousemove', showBackButton);
    playerFullscreen.removeEventListener('click', showBackButton);
    playerFullscreen.removeEventListener('touchstart', showBackButton);
});


// ==================== CARRUSEL REUTILIZABLE ====================

// Cargar carrusel específico para anime (usando datos de AnimeAV1 + TMDB)
async function loadAnimeCarousel(containerId) {
    const heroContainer = document.getElementById(containerId);
    if (!heroContainer) return;
    if (loadedCarousels[containerId]) return; // ya cargado

    try {
        const animeSlides = await getAnimesForCarousel(5);
        if (animeSlides.length === 0) {
            heroContainer.style.display = 'none';
            return;
        }

        // Limpiar slides excepto el primero
        const slides = heroContainer.querySelectorAll('.hero-slide');
        for (let i = slides.length - 1; i > 0; i--) {
            slides[i].remove();
        }
        const baseSlide = heroContainer.querySelector('.hero-slide');

        // Actualizar primer slide y crear los demás
        await updateAnimeSlideContent(baseSlide, animeSlides[0], 0);
        for (let i = 1; i < animeSlides.length; i++) {
            const newSlide = baseSlide.cloneNode(true);
            newSlide.classList.remove('active');
            await updateAnimeSlideContent(newSlide, animeSlides[i], i);
            heroContainer.insertBefore(newSlide, heroContainer.querySelector('.carousel-prev'));
        }

        // Dots
        const dotsContainer = heroContainer.querySelector('.carousel-dots');
        dotsContainer.innerHTML = '';
        animeSlides.forEach((_, idx) => {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (idx === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(idx, containerId));
            dotsContainer.appendChild(dot);
        });

        // Guardar estado
        const state = getCarouselState(containerId);
        state.slides = animeSlides; // Guardamos los datos del slide
        state.currentSlide = 0;

        startCarousel(containerId);
        attachCarouselControls(containerId);
        loadedCarousels[containerId] = true;
    } catch (error) {
        console.error('Error cargando carrusel de anime:', error);
        heroContainer.style.display = 'none';
    }
}


// Obtener o crear el estado de un carrusel
function getCarouselState(containerId) {
    if (!carouselState[containerId]) {
        carouselState[containerId] = { currentSlide: 0, interval: null, slides: [] };
    }
    return carouselState[containerId];
}

// Cargar un carrusel en un contenedor específico
async function loadHeroCarousel(containerId, endpoint = '/movie/popular', options = { shuffle: false, limit: 5, mediaType: 'movie' }) {
    const heroContainer = document.getElementById(containerId);
    if (!heroContainer) return;
    // Si ya está cargado y no se fuerza, salir
    if (loadedCarousels[containerId] && !options.force) return;

    try {
        const response = await fetch(`https://api.themoviedb.org/3${endpoint}?api_key=${API_KEY}&language=es-ES`);
        const data = await response.json();
        if (!data.results || data.results.length === 0) return;

        let slidesData = data.results;
        if (options.shuffle) {
            // Mezclar aleatoriamente
            for (let i = slidesData.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [slidesData[i], slidesData[j]] = [slidesData[j], slidesData[i]];
            }
        }
        slidesData = slidesData.slice(0, options.limit || 5);

        // Limpiar slides excepto el primero
        const slides = heroContainer.querySelectorAll('.hero-slide');
        for (let i = slides.length - 1; i > 0; i--) {
            slides[i].remove();
        }
        const baseSlide = heroContainer.querySelector('.hero-slide');

        // Actualizar primer slide y crear los demás
        await updateSlideContent(baseSlide, slidesData[0], 0, options.mediaType);
        for (let i = 1; i < slidesData.length; i++) {
            const newSlide = baseSlide.cloneNode(true);
            newSlide.classList.remove('active');
            await updateSlideContent(newSlide, slidesData[i], i, options.mediaType);
            heroContainer.insertBefore(newSlide, heroContainer.querySelector('.carousel-prev'));
        }

        // Dots
        const dotsContainer = heroContainer.querySelector('.carousel-dots');
        dotsContainer.innerHTML = '';
        slidesData.forEach((_, idx) => {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (idx === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(idx, containerId));
            dotsContainer.appendChild(dot);
        });

        // Guardar estado
        const state = getCarouselState(containerId);
        state.slides = slidesData;
        state.currentSlide = 0;

        // Iniciar carrusel
        startCarousel(containerId);
        attachCarouselControls(containerId);

        loadedCarousels[containerId] = true;
    } catch (error) {
        console.error(`Error cargando carrusel ${containerId}:`, error);
    }
}

// Obtener el primer episodio de una serie (temporada y número)
async function getFirstEpisode(tvId) {
    try {
        // Obtener detalles de la serie
        const url = `https://api.themoviedb.org/3/tv/${tvId}?api_key=${API_KEY}&language=es-ES`;
        const response = await fetch(url);
        const data = await response.json();
        if (!data.seasons || data.seasons.length === 0) return null;
        // Buscar la primera temporada (season_number > 0)
        const firstSeason = data.seasons.find(s => s.season_number > 0);
        if (!firstSeason) return null;
        // Obtener episodios de esa temporada
        const seasonUrl = `https://api.themoviedb.org/3/tv/${tvId}/season/${firstSeason.season_number}?api_key=${API_KEY}&language=es-ES`;
        const seasonResp = await fetch(seasonUrl);
        const seasonData = await seasonResp.json();
        if (!seasonData.episodes || seasonData.episodes.length === 0) return null;
        const firstEpisode = seasonData.episodes[0];
        return {
            season: firstSeason.season_number,
            episode: firstEpisode.episode_number
        };
    } catch (error) {
        console.warn('Error obteniendo primer episodio:', error);
        return null;
    }
}

// Obtener animes populares desde AnimeAV1 y filtrar los que tienen TMDB ID
async function getAnimesForCarousel(limit = 5) {
    try {
        // Usar el endpoint de catálogo para obtener animes populares (por ejemplo, ordenados por popularidad)
        // Nota: asumimos que existe un endpoint /catalog con parámetros de ordenación. Si no, podemos usar /search con un término genérico como "popular" o simplemente obtener los primeros de la lista.
        // Como alternativa, podemos usar los géneros o simplemente obtener una lista de animes populares desde AnimeAV1.
        // Aquí usaremos /catalog?sort=popularity (si tu API lo soporta). Si no, podemos usar /search?q=popular.
        const data = await fetchAnimeApi(`/catalog?sort=popularity&provider=animeav1`);
        const results = data.results || [];
        if (results.length === 0) return [];

        // Tomar los primeros 'limit' animes, pero asegurarnos de que tengan TMDB ID
        const animeWithTMDB = [];
        for (const anime of results) {
            if (animeWithTMDB.length >= limit) break;
            // Intentar obtener tmdbId para este anime (serie)
            const tmdbId = await getTmdbIdByTitle(anime.title);
            if (tmdbId) {
                // Ahora obtener los detalles de TMDB para tener backdrop, etc.
                try {
                    const tmdbResp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${API_KEY}&language=es-ES`);
                    const tmdbData = await tmdbResp.json();
                    if (tmdbData.backdrop_path) {
                        animeWithTMDB.push({
                            ...anime,
                            tmdbId: tmdbId,
                            tmdbData: tmdbData
                        });
                    }
                } catch (e) {}
            }
        }
        return animeWithTMDB;
    } catch (error) {
        console.error('Error obteniendo animes para carrusel:', error);
        return [];
    }
}

async function updateAnimeSlideContent(slide, anime, index) {
    const tmdbData = anime.tmdbData;
    const backdropUrl = tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : '';
    const bgDiv = slide.querySelector('.hero-bg');
    if (bgDiv && backdropUrl) bgDiv.style.backgroundImage = `url('${backdropUrl}')`;
    slide.querySelector('.hero-title').innerText = anime.title;
    
    // Año
    const year = tmdbData.first_air_date ? tmdbData.first_air_date.split('-')[0] : 'Año desconocido';
    slide.querySelector('.hero-year').innerHTML = `📅 ${year}`;
    
    // Duración (mostrar número de temporadas y episodios si están disponibles)
    const seasons = (tmdbData.seasons || []).filter(s => s.season_number > 0);
    const totalEpisodes = tmdbData.number_of_episodes || '?';
    const durationText = `${seasons.length} temporada${seasons.length > 1 ? 's' : ''} · ${totalEpisodes} episodios`;
    slide.querySelector('.hero-duration').innerHTML = durationText;
    
    const synopsis = tmdbData.overview || anime.description || 'Sin sinopsis disponible';
    slide.querySelector('.hero-synopsis').innerText = synopsis;

    const buttonsContainer = slide.querySelector('.hero-buttons');
    buttonsContainer.innerHTML = ''; // Limpiar

    // Botón Reproducir (primer episodio)
    const playBtn = document.createElement('button');
    playBtn.className = 'hero-btn hero-play-btn';
    playBtn.innerHTML = '▶ Reproducir';
    playBtn.addEventListener('click', async () => {
        // Necesitamos la URL de AnimeAV1 del anime para obtener los episodios
        if (anime.url) {
            // Obtener información del anime desde AnimeAV1 para conseguir los episodios
            try {
                const infoData = await fetchAnimeApi(`/info?url=${encodeURIComponent(anime.url)}`);
                const episodes = infoData.episodes || [];
                if (episodes.length > 0) {
                const poster = anime.image || '';
                //addToRecent(anime.tmdbId, 'anime', anime.title, poster, 'ja', anime.url, false);
                    // Reproducir el primer episodio
                    playAnimeEpisode(episodes[0].url);
                } else {
                    alert('No se encontraron episodios para este anime.');
                }
            } catch (err) {
                alert('Error al obtener episodios.');
            }
        } else {
            alert('No se puede reproducir este anime.');
        }
    });
    buttonsContainer.appendChild(playBtn);

    // Botón Más Información
    const infoBtn = document.createElement('button');
    infoBtn.className = 'hero-btn hero-info-btn';
    infoBtn.innerHTML = 'Más Información';
    infoBtn.addEventListener('click', () => {
        if (anime.url) {
            showAnimeInfo(anime.url, anime.title, anime.tmdbId);
        } else {
            alert('No se puede mostrar información de este anime.');
        }
    });
    buttonsContainer.appendChild(infoBtn);
}

// Actualizar contenido de un slide (mantenemos esta función sin cambios, solo recibe el slide y los datos)
async function updateSlideContent(slide, movie, index, mediaType = 'movie') {
    const backdropUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : '';
    const bgDiv = slide.querySelector('.hero-bg');
    if (bgDiv && backdropUrl) bgDiv.style.backgroundImage = `url('${backdropUrl}')`;
    slide.querySelector('.hero-title').innerText = movie.title || movie.name;
    
    // Año
    const releaseDate = movie.release_date || movie.first_air_date;
    const year = releaseDate ? releaseDate.split('-')[0] : 'Año desconocido';
    slide.querySelector('.hero-year').innerHTML = `📅 ${year}`;
    
    // Duración (para series mostramos "Serie")
    try {
        const detailsRes = await fetch(`https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${movie.id}?api_key=${API_KEY}&language=es-ES`);
        const details = await detailsRes.json();
        let durationText = '';
        if (mediaType === 'tv') {
            const seasons = (details.seasons || []).filter(s => s.season_number > 0);
            const totalEpisodes = details.number_of_episodes || '?';
            durationText = `${seasons.length} temporada${seasons.length > 1 ? 's' : ''} · ${totalEpisodes} episodios`;
        } else {
            const runtime = details.runtime ? `${details.runtime} min` : 'Duración no disponible';
            durationText = `⏱️ ${runtime}`;
        }
        slide.querySelector('.hero-duration').innerHTML = durationText;
    } catch (error) {
        slide.querySelector('.hero-duration').innerHTML = mediaType === 'tv' ? 'Serie' : '⏱️ Duración no disponible';
    }
    
    const synopsis = movie.overview || 'Sin sinopsis disponible';
    slide.querySelector('.hero-synopsis').innerText = synopsis;

    const buttonsContainer = slide.querySelector('.hero-buttons');
    buttonsContainer.innerHTML = ''; // Limpiar

    // Botón Reproducir
    const playBtn = document.createElement('button');
    playBtn.className = 'hero-btn hero-play-btn';
    playBtn.innerHTML = '▶ Reproducir';
    playBtn.addEventListener('click', async () => {
        if (mediaType === 'tv') {
            // Obtener primer episodio
            const episodeInfo = await getFirstEpisode(movie.id);
            if (episodeInfo) {
                const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '';
                //addToRecent(movie.id, 'tv', movie.name, poster, movie.original_language);
                playMedia(movie.id, 'tv', movie.name, movie.original_language, episodeInfo.season, episodeInfo.episode);
            } else {
                alert('No se pudo encontrar el primer episodio de esta serie.');
            }
        } else {
            playMedia(movie.id, 'movie', movie.title, movie.original_language);
        }
    });
    buttonsContainer.appendChild(playBtn);

    // Botón Más Información
    const infoBtn = document.createElement('button');
    infoBtn.className = 'hero-btn hero-info-btn';
    infoBtn.innerHTML = 'Más Información';
    infoBtn.addEventListener('click', () => {
        const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'images/no-poster.jpg';
        if (mediaType === 'tv') {
            showMovieInfo(movie.id, 'tv', movie.name, movie.original_language, posterUrl);
        } else {
            showMovieInfo(movie.id, 'movie', movie.title, movie.original_language, posterUrl);
        }
    });
    buttonsContainer.appendChild(infoBtn);
}

// Funciones de navegación específicas por contenedor
function goToSlide(index, containerId) {
    const state = getCarouselState(containerId);
    const heroContainer = document.getElementById(containerId);
    const slidesList = heroContainer.querySelectorAll('.hero-slide');
    if (index === state.currentSlide || index >= slidesList.length) return;
    slidesList[state.currentSlide].classList.remove('active');
    slidesList[index].classList.add('active');
    heroContainer.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === index));
    state.currentSlide = index;
    resetCarouselTimer(containerId);
}

function nextSlide(containerId) {
    const heroContainer = document.getElementById(containerId);
    const slidesList = heroContainer.querySelectorAll('.hero-slide');
    const state = getCarouselState(containerId);
    const next = (state.currentSlide + 1) % slidesList.length;
    goToSlide(next, containerId);
}

function prevSlide(containerId) {
    const heroContainer = document.getElementById(containerId);
    const slidesList = heroContainer.querySelectorAll('.hero-slide');
    const state = getCarouselState(containerId);
    const prev = (state.currentSlide - 1 + slidesList.length) % slidesList.length;
    goToSlide(prev, containerId);
}

function startCarousel(containerId) {
    const state = getCarouselState(containerId);
    if (state.interval) clearInterval(state.interval);
    state.interval = setInterval(() => nextSlide(containerId), 8000);
}

function resetCarouselTimer(containerId) {
    const state = getCarouselState(containerId);
    if (state.interval) {
        clearInterval(state.interval);
        state.interval = setInterval(() => nextSlide(containerId), 8000);
    }
}

function attachCarouselControls(containerId) {
    const heroContainer = document.getElementById(containerId);
    const prevBtn = heroContainer.querySelector('.carousel-prev');
    const nextBtn = heroContainer.querySelector('.carousel-next');
    if (prevBtn) {
        prevBtn.removeEventListener('click', () => prevSlide(containerId));
        prevBtn.addEventListener('click', () => prevSlide(containerId));
    }
    if (nextBtn) {
        nextBtn.removeEventListener('click', () => nextSlide(containerId));
        nextBtn.addEventListener('click', () => nextSlide(containerId));
    }
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
function addToRecent(tmdbId, mediaType, title, posterPath, originalLang, animeUrl = null, isMovie = false) {
    console.log('addToRecent llamada con:', tmdbId, mediaType, title, posterPath, animeUrl);
    try {
        let recents = JSON.parse(localStorage.getItem('recentItems')) || [];
        // Generar identificador único
        let id;
        if (tmdbId) {
            id = tmdbId;          // ✅ Prioridad igual que en saveProgress
        } else if (mediaType === 'anime' && animeUrl) {
            id = animeUrl;
        } else {
            id = title;
        }

        console.log("Nuevo:", {
            id,
            tmdbId,
            mediaType,
            title,
            animeUrl
        });

        console.table(recents);

        recents = recents.filter(item => {
            const eliminar =
                (tmdbId && item.tmdbId == tmdbId) ||
                (animeUrl && item.animeUrl === animeUrl) ||
                (item.title === title && item.mediaType === mediaType);

            if (eliminar) {
                console.log("Eliminando:", item);
            }

            return !eliminar;
        });

        recents.unshift({
            id: id,
            tmdbId: tmdbId,
            mediaType: mediaType,
            title: title,
            posterPath: posterPath || '',
            originalLang: originalLang || '',
            animeUrl: animeUrl,
            isMovie: isMovie,
            timestamp: Date.now()
        });
        if (recents.length > 10) recents.pop();
        console.table(recents);
        localStorage.setItem('recentItems', JSON.stringify(recents));
        loadRecentRow();
    } catch (e) {
        console.error('Error guardando en recientes:', e);
    }
}


function loadRecentRow() {
    console.log(
    "loadRecentRow",
    document.querySelectorAll("#row-recientes").length
);

    const container = document.getElementById('categories-container-inicio');
    if (!container) return;


    let rowElement = document.getElementById('row-recientes');
    if (!rowElement) {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('category');
        categoryDiv.setAttribute('data-category-id', 'recientes');
        categoryDiv.innerHTML = `<h2>Mi Lista</h2><div class="row" id="row-recientes"></div>`;
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

    // Limitar a 5 (o el número que quieras)
    recents = recents.slice(0, 5);

    console.log("ANTES", rowElement.children.length);
    rowElement.innerHTML = '';
    let cardIndex = 0;

    recents.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('recent-item');

        let poster;
        if (item.posterPath && item.posterPath.startsWith('http')) {
            poster = item.posterPath;
        } else if (item.posterPath) {
            poster = `https://image.tmdb.org/t/p/w500${item.posterPath}`;
        } else {
            poster = "images/no-poster.jpg";
        }

        const identifier = item.tmdbId || item.id || item.animeUrl || item.title;
        const buttonText = getWatchButtonText(item.mediaType, identifier, item.isMovie || false);

        card.dataset.tmdbId = item.tmdbId || '';
        card.dataset.mediaType = item.mediaType || 'movie';
        card.dataset.title = item.title || '';
        card.dataset.originalLang = item.originalLang || '';
        card.dataset.poster = poster;
        card.dataset.animeUrl = item.animeUrl || '';
        card.dataset.identifier = identifier;

        // Usamos el póster como fondo (no obtenemos backdrops para evitar asincronía)
        card.innerHTML = `
            <div class="recent-expanded-content">
                <div class="expanded-backdrop" style="background-image: url('${poster}'); filter: blur(0.2px) brightness(0.5);"></div>
                <div class="expanded-info">
                    <div class="expanded-title">${item.title || 'Sin título'}</div>
                    <div class="expanded-meta">${getRecentLabel(item)}</div>
                    <button class="expanded-watch-btn">${buttonText}</button>
                </div>
            </div>
        `;

        // Evento click para abrir info
        card.addEventListener('click', async function(e) {
            if (e.target.closest('.expanded-watch-btn')) return;
            const tmdbId = this.dataset.tmdbId;
            const mediaType = this.dataset.mediaType;
            const title = this.dataset.title;
            const originalLang = this.dataset.originalLang;
            const posterUrl = this.dataset.poster;
            const animeUrl = this.dataset.animeUrl;

            if (mediaType === 'anime' && animeUrl) {
                showAnimeInfo(animeUrl, title, tmdbId || null);
            } else {
                showMovieInfo(tmdbId, mediaType, title, originalLang, posterUrl);
            }
        });

        // Evento click en el botón (reproducir directamente)
        const watchBtn = card.querySelector('.expanded-watch-btn');
        if (watchBtn) {
            watchBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const tmdbId = card.dataset.tmdbId;
                const mediaType = card.dataset.mediaType;
                const title = card.dataset.title;
                const originalLang = card.dataset.originalLang;
                const identifier = card.dataset.identifier;

                const progress = getProgress(identifier, mediaType);
                let season = null, episode = null;

                if (mediaType === 'tv' && progress && progress.season !== undefined && progress.episode !== undefined) {
                    season = progress.season;
                    episode = progress.episode;
                } else if (mediaType === 'anime' && !item.isMovie && progress && progress.episode !== undefined) {
                    card.click();
                    return;
                }

                if (mediaType === 'movie') {
                    playMedia(tmdbId, 'movie', title, originalLang);
                } else if (mediaType === 'tv' && season !== null && episode !== null) {
                    playMedia(tmdbId, 'tv', title, originalLang, season, episode);
                } else {
                    card.click();
                }
            });
        }

        card.style.animationDelay = `${cardIndex * 0.05}s`;
        rowElement.appendChild(card);
        cardIndex++;
    });

    console.log("DESPUÉS", rowElement.children.length);
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
            <img src="${poster}" alt="${item.title}" loading="lazy">
            <div class="movie-overlay">
                <div class="movie-info">
                    <div class="movie-title-hover">${item.title}</div>
                    <div class="movie-meta-hover">${item.mediaType === 'movie' ? 'Película' : (item.mediaType === 'tv' ? 'Serie' : 'Anime')}</div>
                </div>
            </div>
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
function saveProgress(identifier, mediaType, season = null, episode = null) {
    let progress = JSON.parse(localStorage.getItem('watchProgress')) || {};
    const key = `${mediaType}_${identifier}`; // Clave compuesta para evitar colisiones
    if (mediaType === 'movie') {
        progress[key] = { mediaType, watched: true, timestamp: Date.now() };
    } else if (mediaType === 'tv' && season !== null && episode !== null) {
        progress[key] = { mediaType, season, episode, timestamp: Date.now() };
    } else if (mediaType === 'anime' && episode !== null) {
        progress[key] = { mediaType, episode, timestamp: Date.now() };
    }
    localStorage.setItem('watchProgress', JSON.stringify(progress));
}

function getProgress(identifier, mediaType) {
    const progress = JSON.parse(localStorage.getItem('watchProgress')) || {};
    const key = `${mediaType}_${identifier}`;
    return progress[key] || null;
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
        // Si se pasan season/episode (selección manual), priorizar
        if (season !== null && episode !== null) {
            watchBtn.textContent = `VER CAPÍTULO ${episode}`;
            if (currentMovieData) {
                currentMovieData.season = season;
                currentMovieData.episode = episode;
            }
        } else {
            // Obtener progreso
            const progress = getProgress(currentMovieData?.tmdbId, 'tv');
            if (progress && progress.season !== undefined && progress.episode !== undefined) {
                watchBtn.textContent = `CONTINUAR CAPÍTULO ${progress.episode}`;
                if (currentMovieData) {
                    currentMovieData.season = progress.season;
                    currentMovieData.episode = progress.episode;
                }
            } else {
                // Si hay selección manual en currentMovieData (sin progreso)
                if (currentMovieData?.season !== undefined && currentMovieData?.episode !== undefined) {
                    watchBtn.textContent = `VER CAPÍTULO ${currentMovieData.episode}`;
                } else {
                    watchBtn.textContent = 'VER AHORA';
                }
            }
        }
} else if (mediaType === 'anime') {
    const identifier = currentMovieData?.tmdbId || currentMovieData?.animeUrl;
    if (!identifier) {
        watchBtn.textContent = 'VER AHORA';
        return;
    }
    const progress = getProgress(identifier, 'anime');
    if (currentMovieData?.isMovie) {
        // Película de anime
        if (progress && progress.episode !== undefined) {
            watchBtn.textContent = 'CONTINUAR VIENDO';
        } else {
            watchBtn.textContent = 'VER AHORA';
        }
    } else {
        // Serie de anime
        if (progress && progress.episode !== undefined) {
            watchBtn.textContent = `CONTINUAR CAPÍTULO ${progress.episode}`;
        } else {
            if (currentMovieData?.episodeNumber) {
                watchBtn.textContent = `VER CAPÍTULO ${currentMovieData.episodeNumber}`;
            } else {
                watchBtn.textContent = 'VER AHORA';
            }
        }
    }
}
}

// ==================== POPUNDER (CLIC EN CARRUSEL) ====================
let popunderLoaded = false;

function loadPopunder() {
    if (popunderLoaded) return;
    popunderLoaded = true;
    const script = document.createElement('script');
    script.src = 'https://pl30421603.effectivecpmnetwork.com/46/1d/2d/461d2dd94f730891520b7ed75a0205df.js';
    script.async = true;
    document.head.appendChild(script);
    console.log('🔄 Popunder activado');
}

// ==================== POPUNDER CONTROLADO ====================
let popunderScheduled = false;
let popunderTimer = null;
let popunderInterval = null;
const POPUNDER_FIRST_DELAY = 10000;      // 10 segundos
const POPUNDER_INTERVAL = 5 * 60 * 1000; // 20 minutos

function schedulePopunder() {
    if (popunderTimer) clearTimeout(popunderTimer);
    if (popunderInterval) clearInterval(popunderInterval);

    popunderTimer = setTimeout(() => {
        const lastShow = localStorage.getItem('popunder_last_show');
        const now = Date.now();
        if (!lastShow || (now - parseInt(lastShow)) > POPUNDER_INTERVAL) {
            loadPopunder();
            localStorage.setItem('popunder_last_show', String(now));
        }
        popunderInterval = setInterval(() => {
            const lastShowCheck = localStorage.getItem('popunder_last_show');
            const nowCheck = Date.now();
            if (!lastShowCheck || (nowCheck - parseInt(lastShowCheck)) > POPUNDER_INTERVAL) {
                loadPopunder();
                localStorage.setItem('popunder_last_show', String(nowCheck));
            }
        }, POPUNDER_INTERVAL);
    }, POPUNDER_FIRST_DELAY);
}

// Iniciar el temporizador en la primera interacción del usuario
document.addEventListener('click', function(e) {
    if (e.target.closest('#player-fullscreen') || e.target.closest('#info-window')) {
        return;
    }
    if (!popunderScheduled) {
        popunderScheduled = true;
        schedulePopunder();
    }
});

// Si el usuario ya interactuó antes (por ejemplo, recarga la página), programar directamente
if (localStorage.getItem('popunder_user_interacted') === 'true') {
    popunderScheduled = true;
    schedulePopunder();
}

// Marcar que el usuario interactuó en el primer clic (lo hacemos dentro del listener)
// También puedes usar un evento de scroll o mousemove como alternativa

// ==================== SMARTLINK DESPUÉS DE 5 MINUTOS ====================
const SMARTLINK_URL = 'https://www.effectivecpmnetwork.com/qxxkrnbr2t?key=5a28222862a82ecb880b4834e9d2c40f';
let watchTime = 0;
let watchInterval = null;
let smartlinkShown = false;
const SMARTLINK_THRESHOLD = 1 * 60; // 5 minutos en segundos

// Función para iniciar el seguimiento de tiempo de reproducción
function startWatchTimer() {
    if (watchInterval) return;
    
    watchInterval = setInterval(() => {
        // Verificar si el video se está reproduciendo
        const iframe = document.querySelector('#player-iframe-container iframe');
        // Nota: No podemos acceder directamente al tiempo de un iframe de terceros.
        // Alternativa: usar el tiempo de reproducción desde el reproductor o un contador simple.
        
        // Si el reproductor está visible, asumimos que se está reproduciendo
        if (playerFullscreen.style.display === 'flex') {
            watchTime++;
            
            if (watchTime >= SMARTLINK_THRESHOLD && !smartlinkShown) {
                smartlinkShown = true;
                showSmartlink();
                clearInterval(watchInterval);
                watchInterval = null;
            }
        }
    }, 1000); // Cada segundo
}

// Función para detener el temporizador
function stopWatchTimer() {
    if (watchInterval) {
        clearInterval(watchInterval);
        watchInterval = null;
    }
}

// Mostrar smartlink
function showSmartlink() {
    // Abrir el smartlink en una nueva ventana/pestaña
    window.open(SMARTLINK_URL, '_blank');
    
    // También podrías mostrarlo como un overlay o ventana modal
    console.log('🔗 Smartlink mostrado después de 5 minutos de reproducción');
}

// Reiniciar el contador cuando se cierra el reproductor
function resetWatchTimer() {
    watchTime = 0;
    smartlinkShown = false;
    stopWatchTimer();
}


// ==================== INICIALIZACIÓN ====================

window.addEventListener("DOMContentLoaded", () => {
    wakeUpAnimeApi();
    loadGenreMaps();
    createCategoryButtons();
 

    // Filtros de búsqueda
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Actualizar clase activa
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            // Cambiar filtro
            currentSearchFilter = this.dataset.filter;
            // Repetir búsqueda con el texto actual
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                performSearch(searchInput.value, currentSearchFilter);
            }
        });
    });

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

    //createKeyboard();
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', () => {
            performSearch(searchInput.value, currentSearchFilter);
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value, currentSearchFilter);
                e.preventDefault();
            }
            // Si la tecla es espacio, evitar propagación para que no active otros listeners
            if (e.key === ' ' || e.key === 'Space') {
                e.stopPropagation();
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

    // Botón de sonido del tráiler
    const unmuteBtn = document.getElementById('info-unmute-btn');
    if (unmuteBtn) {
        unmuteBtn.addEventListener('click', activarSonido);
    }

    document.addEventListener('mousemove', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('click', handleUserInteraction);
});

window.switchTab = switchTab;
