// ==================== CONSTANTES GLOBALES ====================
let currentMovieData = null;
let trailerTimeout = null;      // ← AÑADIR
let currentTrailerId = null; 
let infoFadeTimer = null;
let isInfoVisible = true;
//let trailerReady = false;
const API_KEY = "73de3bc08df97d70e1cb81ad38422c03";

// Elementos del DOM (reproductor)
const logoDiv = document.querySelector(".logo");
const playerFullscreen = document.getElementById("player-fullscreen");
const playerContainer = document.getElementById("player-iframe-container");
const backButton = document.getElementById("back-button");

// Elementos de la nueva ventana de información
const infoWindow = document.getElementById('info-window');
const infoBackBtn = document.getElementById('info-back-button');
const infoTitle = document.getElementById('info-title');
const infoDuration = document.getElementById('info-duration');
const infoYear = document.getElementById('info-year');
const infoSynopsis = document.getElementById('info-synopsis');
const infoWatchBtn = document.getElementById('info-watch-btn');


// Cerrar con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('info-window').style.display === 'flex') {
        const infoWindow = document.getElementById('info-window');
        if (infoWindow) infoWindow.style.display = 'none';
        clearInfoFadeTimer();
        clearTrailer();
    }
});

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
            // Películas de Warner Bros. Pictures (productora)
            await loadDynamicRow("/discover/movie?with_companies=174&sort_by=popularity.desc", "row-warner-bros", "Warner Bros. Pictures", container.id, 'es-ES', 'movie');
            // Películas de Walt Disney Pictures (productora)
            await loadDynamicRow("/discover/movie?with_companies=2&sort_by=popularity.desc", "row-disney-peliculas", "Disney (Walt Disney Pictures)", container.id, 'es-ES', 'movie');
            // Películas de Apple Studios (productora)
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
        await loadDynamicRow("/discover/tv?with_networks=213&sort_by=first_air_date.desc&first_air_date.lte=2026-06-15", "row-series-nuevas-netflix", "Series nuevas en Netflix", "categories-container-series", "es-ES", "tv"); 
        await loadDynamicRow("/tv/popular", "row-series-populares", "Series populares", container.id, 'es-ES', 'tv');
        // Series de Disney+
        await loadDynamicRow("/discover/tv?with_networks=2739&sort_by=popularity.desc", "row-disney-plus", "Series de Disney+", container.id, 'es-ES', 'tv');
        // Series de Apple TV+
        await loadDynamicRow("/discover/tv?with_networks=2552&sort_by=popularity.desc", "row-apple-tv", "Series de Apple TV+", container.id, 'es-ES', 'tv');
        await loadDynamicRow("/discover/tv?with_genres=16&with_original_language=ja&certification_country=US&certification.lte=TV-14&sort_by=popularity.desc", "row-series-anime", "Anime (para todas las edades)", "categories-container-series", "es-ES", "tv");
        await loadDynamicRow("/discover/tv?with_genres=16,10751&certification_country=US&certification=TV-Y&sort_by=popularity.desc", "row-series-preescolar", "Series para niños pequeños", "categories-container-series", "es-ES", "tv");
        await loadDynamicRow("/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc", "row-anime-series", "Anime series", container.id, 'es-ES', 'tv');
        }

    } else if (tabId === 'buscar') {
    // No cargamos nada automático, solo mostramos la interfaz de búsqueda
    // El contenido ya está en el HTML

    } else if (tabId === 'favoritos') {
    loadFavorites();
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
        return trailer.key; // ← solo el ID
    } catch (error) {
        console.error('Error obteniendo tráiler:', error);
        return null;
    }
}


function playTrailer(videoId) {
    console.log('playTrailer ejecutado con ID:', videoId);

    // Desvanecer backdrop
    const backdrop = document.getElementById('info-backdrop');
    if (backdrop) {
        backdrop.style.transition = 'opacity 1.5s ease';
        backdrop.style.opacity = '0';
    }

    // Crear contenedor
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

    // Limpiar y crear iframe con mute=1 (para que el navegador permita autoplay)
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

    // Fade in del tráiler (después de 300ms)
    setTimeout(() => {
        trailerContainer.style.opacity = '1';
    }, 300);

    // UN SOLO setTimeout para activar sonido y modo cine (después de 1.5s)
    setTimeout(() => {
        console.log('🔊 Activando sonido automático (1.5s)');
        activarSonido();
        // Iniciar el temporizador para ocultar la información después de 5 segundos
        resetInfoFadeTimer();
    }, 1500);
}

// ==================== FUNCIONES PRINCIPALES ====================

// ==================== BUSCADOR ====================
async function performSearch(query) {
    const resultsGrid = document.getElementById('search-results-grid');
    const resultsTitle = document.getElementById('search-results-title');
    
    if (!query.trim()) {
        resultsGrid.innerHTML = `<div class="no-results">Escribe algo para buscar...</div>`;
        resultsTitle.textContent = 'Resultados';
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

        // Filtrar solo películas y series (excluir personas)
        const filtered = results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
        
        if (filtered.length === 0) {
            resultsGrid.innerHTML = `<div class="no-results">No se encontraron películas o series.</div>`;
            return;
        }

        resultsGrid.innerHTML = '';
        filtered.slice(0, 30).forEach(item => {
            const card = document.createElement('div');
            card.classList.add('search-result-item');
            card.tabIndex = 0;

            const title = item.title || item.name || 'Título desconocido';
            const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
            const poster = item.poster_path 
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
                : 'images/no-poster.jpg';

            card.innerHTML = `
                <img src="${poster}" alt="${title}">
                <div class="search-result-title">${title}</div>
            `;

            card.addEventListener('click', () => {
                const posterUrl = card.querySelector('img').src;
                showMovieInfo(item.id, mediaType, title, item.original_language, posterUrl);
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    card.click();
                }
            });

            resultsGrid.appendChild(card);
        });

    } catch (error) {
        console.error('Error en la búsqueda:', error);
        resultsGrid.innerHTML = `<div class="no-results">Error al buscar. Intenta de nuevo.</div>`;
    }
}

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

// Función para cerrar la ventana de información y detener el tráiler
function cerrarInfoWindow() {
    const infoWindow = document.getElementById('info-window');
    if (infoWindow) infoWindow.style.display = 'none';
    clearInfoFadeTimer();
    clearTrailer();
    console.log('Ventana cerrada y tráiler detenido');
}

// Función para reproducir la película/serie desde la ventana de información
function reproducirDesdeInfo() {
    if (currentMovieData) {
        const { tmdbId, mediaType, title, originalLang, season, episode, posterPath } = currentMovieData;
        console.log('reproducirDesdeInfo: llamando a addToRecent'); // <-- LOG
        addToRecent(tmdbId, mediaType, title, posterPath, originalLang);
        const infoWindow = document.getElementById('info-window');
        if (infoWindow) infoWindow.style.display = 'none';
        clearInfoFadeTimer();
        clearTrailer();
        playMedia(tmdbId, mediaType, title, originalLang, season, episode);
    }
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


async function loadDynamicRow(endpoint, rowId, categoryTitle, parentContainerId = 'categories-container', language = 'es-ES', contentType = 'movie') {
    const container = document.getElementById(parentContainerId);
    if (!container) {
        console.error(`No se encuentra contenedor ${parentContainerId}`);
        return;
    }

    // Crear la categoría si no existe
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
            // Usamos el contentType pasado como parámetro (movie o tv)
            const mediaType = contentType;
            // Para series, el título está en 'name'; para películas en 'title'
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

        
        // Crear la tarjeta "Ver más"
        const verMasCard = document.createElement('div');
        verMasCard.classList.add('ver-mas-card', 'movie'); // reutiliza estilos de .movie
        verMasCard.innerHTML = `
            <div class="ver-mas-content">
                <span>Ver más</span>
                <span class="ver-mas-icon">→</span>
            </div>
        `;
        verMasCard.addEventListener('click', () => {
            // Aquí irá la lógica de cargar más películas (paginación)
            console.log(`Cargar más películas para la fila ${rowId}`);
            // Por ahora solo un aviso
            alert('Funcionalidad de "Ver más" en desarrollo');
        });
        rowElement.appendChild(verMasCard);


    } catch (error) {
        console.error(`Error cargando ${categoryTitle}:`, error);
        rowElement.innerHTML = `<div style="color: red; padding: 20px;">Error al cargar ${categoryTitle}. Ver consola.</div>`;
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

        // Datos comunes
        infoTitle.innerText = title;
        const releaseDate = mediaType === "movie" ? data.release_date : data.first_air_date;
        const year = releaseDate ? releaseDate.split('-')[0] : "Año desconocido";
        const posterPath = data.poster_path
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

        currentMovieData = { tmdbId, mediaType, title, originalLang, season: null, episode: null,  posterPath: data.poster_path || ''  };

        // --- Fondo backdrop (corregido) ---
        const backdropDiv = document.getElementById('info-backdrop');
        if (backdropDiv) {
            const backdropUrl = data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '';
            if (backdropUrl) {
                backdropDiv.style.backgroundImage = `url('${backdropUrl}')`;
            } else {
                backdropDiv.style.backgroundImage = 'none';
                backdropDiv.style.backgroundColor = '#0f0f0f';
            }
            backdropDiv.style.display = 'block'; // Asegura visibilidad
        }

    
        // Dentro de showMovieInfo, después del backdrop:
        if (mediaType === 'movie') {
            clearTrailer();
            const trailerKey = await getTrailer(tmdbId);
            console.log('Trailer key obtenido:', trailerKey); // ← debe ser solo el ID
            if (trailerKey) {
                currentTrailerId = trailerKey;
                trailerTimeout = setTimeout(() => {
                    playTrailer(trailerKey); // ← pasa el ID
                }, 4000);
            }
        }
        
        // Mostrar ventana
        infoWindow.style.display = "flex";
        // Actualizar el texto del botón VER según progreso
        if (mediaType === 'movie') {
            updateWatchButton(mediaType);
        } else if (mediaType === 'tv') {
            // Para series, ver si hay progreso guardado y actualizar
            const progress = getProgress(tmdbId, 'tv');
            if (progress) {
                // Cargar la temporada y episodio guardados para que el botón muestre "CONTINUAR"
                // También podemos seleccionar automáticamente ese capítulo en el panel lateral
                // (opcional: cargar la temporada guardada y resaltar el episodio)
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

// ==================== FUNCIÓN PARA CARGAR EPISODIOS (ACTUALIZADA) ====================
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
                // Quitar selección anterior
                document.querySelectorAll('.episode-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                if (currentMovieData) {
                    currentMovieData.season = seasonNumber;
                    currentMovieData.episode = ep.episode_number;
                    // ✅ Actualizar el botón VER
                    updateWatchButton('tv', null, seasonNumber, ep.episode_number);
                }
                // Centrar el botón en el contenedor
                btn.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                // Cambiar texto del botón VER
                const watchBtn = document.getElementById('info-watch-btn');
                if (watchBtn) watchBtn.innerText = `VER CAPÍTULO ${ep.episode_number}`;
            });
            episodesContainer.appendChild(btn);
        });
        // Seleccionar el primer episodio por defecto
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

function playMedia(tmdbId, mediaType, title, originalLang, season = null, episode = null) {
    
    // Guardar en recientes
    if (currentMovieData && currentMovieData.posterPath) {
        addToRecent(tmdbId, mediaType, title, currentMovieData.posterPath, originalLang);
    }

    // ✅ Guardar progreso (marcar como visto)
    if (mediaType === 'movie') {
        saveProgress(tmdbId, 'movie');
    } else if (mediaType === 'tv' && season !== null && episode !== null) {
        saveProgress(tmdbId, 'tv', season, episode);
    }

    // Forzar subtítulos en español para series SIEMPRE.
    // Para películas, solo si el idioma original es inglés o japonés.
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

    // Ocultar todo y mostrar reproductor...
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
            // 1. Detener el audio inmediatamente
            iframe.src = 'about:blank';
            try {
                iframe.contentWindow.stop();
            } catch (e) {
                // Ignorar errores de seguridad
            }
            // 2. Eliminar el contenedor después de un breve momento
            setTimeout(() => {
                const cont = document.getElementById('trailer-container');
                if (cont) cont.remove();
                console.log('Contenedor del tráiler eliminado');
            }, 150);
        } else {
            // Si no hay iframe, eliminar directamente
            container.remove();
        }
    }

    // Restaurar backdrop
    const backdrop = document.getElementById('info-backdrop');
    if (backdrop) {
        backdrop.style.transition = 'opacity 1.5s ease';
        backdrop.style.opacity = '1';
        backdrop.style.display = 'block';
    }

    // Limpiar timeout del tráiler
    if (trailerTimeout) {
        clearTimeout(trailerTimeout);
        trailerTimeout = null;
    }

    // Limpiar timeout del modo cine
    if (infoFadeTimer) {
        clearTimeout(infoFadeTimer);
        infoFadeTimer = null;
    }
}

// ==================== MODO CINE PARA EL TRÁILER ====================

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
        }, 8000); // ← tiempo en milisegundos (5 segundos)
    }
}

function clearInfoFadeTimer() {
    if (infoFadeTimer) {
        clearTimeout(infoFadeTimer);
        infoFadeTimer = null;
    }
    // Asegurar que la información esté visible al cerrar
    showInfoOverlay();
}

// Detectar interacción del usuario
function handleUserInteraction() {
    if (!isInfoVisible) {
        showInfoOverlay();
    }
    resetInfoFadeTimer();
}


// Evento del botón de sonido (siempre visible)
document.getElementById('info-unmute-btn').addEventListener('click', function() {
    if (trailerIframe) {
        // Recargar el iframe sin mute
        const currentSrc = trailerIframe.src;
        // Cambiar mute=1 a mute=0 y asegurar autoplay
        let newSrc = currentSrc.replace('mute=1', 'mute=0');
        if (!newSrc.includes('autoplay=1')) {
            newSrc = newSrc.replace('?', '?autoplay=1&');
        }
        trailerIframe.src = newSrc;
        this.style.background = 'rgba(0,255,0,0.3)';
        this.innerText = '🔊 Sonido activado';
        setTimeout(() => {
            this.style.background = 'rgba(255,255,255,0.2)';
            this.innerText = '🔊 Activar sonido';
        }, 3000);
    } else {
        alert('No hay tráiler cargado');
    }
});

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

// ==================== CONTROL DE SCROLL ====================
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

// ==================== RECIENTES (localStorage) ====================
function addToRecent(tmdbId, mediaType, title, posterPath, originalLang) {
    console.log('addToRecent llamada con:', tmdbId, mediaType, title, posterPath); 
    try {
        let recents = JSON.parse(localStorage.getItem('recentItems')) || [];
        // Eliminar si ya existe (para evitar duplicados)
        recents = recents.filter(item => item.tmdbId !== tmdbId || item.mediaType !== mediaType);
        // Añadir al principio
        recents.unshift({
            tmdbId: tmdbId,
            mediaType: mediaType,
            title: title,
            posterPath: posterPath || '',
            originalLang: originalLang || '',
            timestamp: Date.now()
        });
        // Limitar a 10 elementos
        if (recents.length > 10) recents.pop();
        localStorage.setItem('recentItems', JSON.stringify(recents));
        // Recargar la fila de recientes en la interfaz
        loadRecentRow();
    } catch (e) {
        console.error('Error guardando en recientes:', e);
    }
}

function loadRecentRow() {
    const container = document.getElementById('categories-container-inicio');
    if (!container) return;

    // Buscar o crear la fila
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
        const poster = item.posterPath ? `https://image.tmdb.org/t/p/w500${item.posterPath}` : "images/no-poster.jpg";
        card.dataset.tmdbId = item.tmdbId;
        card.dataset.mediaType = item.mediaType;
        card.dataset.title = item.title;
        card.dataset.originalLang = item.originalLang;
        card.tabIndex = 0;
        card.innerHTML = `<img src="${poster}" alt="${item.title}"><div class="movie-title">${item.title}</div>`;
        card.addEventListener('click', () => {
            const posterUrl = card.querySelector('img').src;
            showMovieInfo(item.tmdbId, item.mediaType, item.title, item.originalLang, posterUrl);
        });
        rowElement.appendChild(card);
    });
}

// ==================== FAVORITOS (localStorage) ====================

// Guardar/eliminar favoritos
function toggleFavorite(tmdbId, mediaType, title, posterPath, originalLang) {
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const index = favorites.findIndex(item => item.tmdbId === tmdbId && item.mediaType === mediaType);
    
    if (index !== -1) {
        // Si ya existe, eliminarlo
        favorites.splice(index, 1);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavButton(false);
        loadFavorites();
        return false; // ya no es favorito
    } else {
        // Añadir
        favorites.push({
            tmdbId: tmdbId,
            mediaType: mediaType,
            title: title,
            posterPath: posterPath || '',
            originalLang: originalLang || '',
            timestamp: Date.now()
        });
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavButton(true);
        loadFavorites();
        return true; // ahora es favorito
    }
}

// Verificar si un contenido está en favoritos
function isFavorite(tmdbId, mediaType) {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    return favorites.some(item => item.tmdbId === tmdbId && item.mediaType === mediaType);
}

// Actualizar el estado del botón de favoritos
function updateFavButton(isFav) {
    const favBtn = document.getElementById('info-fav-btn');
    if (!favBtn) return;
    if (isFav) {
        favBtn.textContent = '♥ Quitar de Favoritos';
        favBtn.classList.add('active');
    } else {
        favBtn.textContent = '♡ Agregar a Favoritos';
        favBtn.classList.remove('active');
    }
}

// Cargar y mostrar favoritos en la cuadrícula
function loadFavorites() {
    const grid = document.getElementById('favoritos-grid');
    if (!grid) return;
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    if (favorites.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#aaa; font-size:1.2rem; padding:40px;">No tienes favoritos aún.</div>`;
        return;
    }

    grid.innerHTML = '';
    favorites.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('favorito-item');
        card.tabIndex = 0;

        const poster = item.posterPath ? `https://image.tmdb.org/t/p/w500${item.posterPath}` : "images/no-poster.jpg";
        card.innerHTML = `
            <img src="${poster}" alt="${item.title}">
            <div class="favorito-title">${item.title}</div>
        `;

        card.addEventListener('click', () => {
            const posterUrl = card.querySelector('img').src;
            showMovieInfo(item.tmdbId, item.mediaType, item.title, item.originalLang, posterUrl);
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') card.click();
        });

        grid.appendChild(card);
    });
}

// ==================== PROGRESO DE VISUALIZACIÓN ====================

// Guardar progreso (para películas: booleano; para series: season/episode)
function saveProgress(tmdbId, mediaType, season = null, episode = null) {
    let progress = JSON.parse(localStorage.getItem('watchProgress')) || {};
    
    if (mediaType === 'movie') {
        progress[tmdbId] = {
            mediaType: 'movie',
            watched: true,
            timestamp: Date.now()
        };
    } else if (mediaType === 'tv' && season !== null && episode !== null) {
        progress[tmdbId] = {
            mediaType: 'tv',
            season: season,
            episode: episode,
            timestamp: Date.now()
        };
    }
    
    localStorage.setItem('watchProgress', JSON.stringify(progress));
}

// Obtener progreso de un contenido
function getProgress(tmdbId, mediaType) {
    const progress = JSON.parse(localStorage.getItem('watchProgress')) || {};
    return progress[tmdbId] || null;
}

// Actualizar el texto del botón VER AHORA según el progreso
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
        // Para series, si se ha seleccionado un capítulo, mostrar "VER CAPÍTULO X"
        if (season !== null && episode !== null) {
            watchBtn.textContent = `VER CAPÍTULO ${episode}`;
        } else {
            // Si no hay capítulo seleccionado, revisar si hay progreso guardado
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

    // Botón de favoritos
    const favBtn = document.getElementById('info-fav-btn');
    if (favBtn) {
        favBtn.addEventListener('click', () => {
            if (currentMovieData) {
                const { tmdbId, mediaType, title, originalLang, posterPath } = currentMovieData;
                toggleFavorite(tmdbId, mediaType, title, posterPath, originalLang);
            }
        });
    }

    createKeyboard();
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    if (searchInput && searchBtn) {
        // Buscar al hacer clic en el botón
        searchBtn.addEventListener('click', () => {
            performSearch(searchInput.value);
        });

        // Buscar al presionar Enter
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });
    }

    // Pestañas
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            if (tabId) switchTab(tabId);
        });
    });
    switchTab('inicio');

    // Detectar interacción del usuario para restaurar la información
    document.addEventListener('mousemove', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('click', handleUserInteraction);
});

window.switchTab = switchTab;