
// ==========================================
// SUPABASE CONFIGURATION
// ==========================================

const SUPABASE_URL = "https://nvismybgfjijwrxymrxo.supabase.co";
const SUPABASE_KEY = "sb_publishable_wvKD5Dbn1vd5wOqJjMWybA_ktDxq7pA";
const TMDB_API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlYTE1MmIxZGNlNjE4YTM1NDhiOTRmNWI1MzNmZWQ5OSIsIm5iZiI6MTc5Mzg2MzEyOC41ODA5OTk5LCJzdWIiOiI2YWVjMmRkOGFiYzljNWQxNzc4YjE2ZDIiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.SRoSDFN6Hvo8Fu27s83NzA_tB6YSEDeEXoz-1H6tC7A";

const genreNames = {
    28: "Akcja",
    12: "Przygodowy",
    16: "Animacja",
    35: "Komedia",
    80: "Kryminał",
    99: "Dokumentalny",
    18: "Dramat",
    10751: "Familijny",
    14: "Fantasy",
    36: "Historyczny",
    27: "Horror",
    10402: "Muzyczny",
    9648: "Tajemnica",
    10749: "Romans",
    878: "Science fiction",
    10770: "Film telewizyjny",
    53: "Thriller",
    10752: "Wojenny",
    37: "Western"
};

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ==========================================
// HTML ELEMENTS
// ==========================================

const loginScreen = document.getElementById("login-screen");
const mainScreen = document.getElementById("main-screen");

const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const loginError = document.getElementById("login-error");

const logoutButton = document.getElementById("logout-button");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

// ==========================================
// SCREEN MANAGEMENT
// ==========================================

function showLoginScreen() {
    loginScreen.classList.remove("hidden");
    mainScreen.classList.add("hidden");
}

function showMainScreen() {
    loginScreen.classList.add("hidden");
    mainScreen.classList.remove("hidden");
}

// ==========================================
// LOGIN
// ==========================================

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginError.textContent = "";

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        loginError.textContent = "Please enter your username and password.";
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
        const email = `${username}@moviescollection.invalid`;

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {
            throw error;
        }

showMainScreen();
await loadMovieStatistics();
await searchMovies();

loginForm.reset();

    } catch (error) {
        console.error("Login error:", error);
        loginError.textContent = "Invalid username or password.";

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Log in";
    }
});

// ==========================================
// LOGOUT
// ==========================================

logoutButton.addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout error:", error);
        return;
    }

    showLoginScreen();
});

// ==========================================
// LOAD MOVIE STATISTICS
// ==========================================

async function loadMovieStatistics() {

    const { data: { user }, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError || !user) {
        showLoginScreen();
        return;
    }

    const { count: watchedCount, error: watchedError } =
        await supabaseClient
            .from("movies")
            .select("*", { count: "exact", head: true })
            .eq("status", "watched");

    const { count: watchlistCount, error: watchlistError } =
        await supabaseClient
            .from("movies")
            .select("*", { count: "exact", head: true })
            .eq("status", "watchlist");

    if (watchedError || watchlistError) {
        console.error("Statistics error:", watchedError || watchlistError);
        return;
    }

    document.getElementById("watched-count").textContent =
        watchedCount ?? 0;

    document.getElementById("watchlist-count").textContent =
        watchlistCount ?? 0;
        await loadLibraryMovies();
}

// ==========================================
// SESSION CHECK
// ==========================================

async function checkSession() {

    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        console.error("Session error:", error);
        showLoginScreen();
        return;
    }

if (data.session) {
    showMainScreen();
    await loadMovieStatistics();
    await searchMovies();
}
}

// ==========================================
// AUTH STATE LISTENER
// ==========================================

supabaseClient.auth.onAuthStateChange((event, session) => {

    if (event === "SIGNED_OUT") {
        showLoginScreen();
    }

});

// ==========================================
// INITIALIZATION
// ==========================================

checkSession();


// ==========================================
// TMDB MOVIE SEARCH
// ==========================================

const movieSearchForm = document.getElementById("movie-search-form");
const movieSearchInput = document.getElementById("movie-search-input");
const searchResults = document.getElementById("search-results");
const searchError = document.getElementById("search-error");

const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w500";


let searchTimeout;


async function searchMovies() {
    const query = movieSearchInput.value.trim();

    searchResults.innerHTML = "";
    searchError.textContent = "Loading movies...";

    try {
        let url;

        if (query) {
            // Search by title
            url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=pl-PL&page=1`;
        } else {
            // Discover recently released movies
            const today = new Date().toISOString().split("T")[0];

            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const startDate = sixMonthsAgo.toISOString().split("T")[0];

            url = `https://api.themoviedb.org/3/discover/movie?language=pl-PL&sort_by=primary_release_date.desc&primary_release_date.gte=${startDate}&primary_release_date.lte=${today}&vote_count.gte=20&include_adult=false&page=1`;
        }

        const response = await fetch(url, {
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${TMDB_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`TMDB request failed: ${response.status}`);
        }

        const data = await response.json();

        searchError.textContent = "";

        if (!data.results || data.results.length === 0) {
            searchError.textContent = "No movies found.";
            return;
        }

        const moviesToDisplay = query
            ? data.results
            : data.results.slice(0, 8);

            // Sprawdzenie, które filmy są już w bibliotece
const savedMovieStatuses = new Map();

const { data: savedMovies, error: savedMoviesError } =
    await supabaseClient
        .from("movies")
        .select("tmdb_id, status")
        .in("tmdb_id", moviesToDisplay.map(movie => movie.id));

if (savedMoviesError) {
    console.error("Błąd sprawdzania biblioteki:", savedMoviesError);
} else {
    savedMovies.forEach(movie => {
        savedMovieStatuses.set(movie.tmdb_id, movie.status);
    });
}

        moviesToDisplay.forEach(movie => {
            const movieCard = document.createElement("div");
            movieCard.className = "movie-card";

            const poster = movie.poster_path
                ? `${TMDB_IMAGE_URL}${movie.poster_path}`
                : "";

            const image = document.createElement("img");

            if (poster) {
                image.src = poster;
                image.alt = `${movie.title} poster`;
            }

            const movieInfo = document.createElement("div");
            movieInfo.className = "movie-info";

            const title = document.createElement("h3");
            title.textContent = movie.title;

            const releaseYear = document.createElement("p");
releaseYear.textContent = movie.release_date
    ? movie.release_date.substring(0, 4)
    : "Nieznany rok";

// Gatunki filmu
const genres = document.createElement("p");
genres.className = "movie-genres";
genres.textContent = movie.genre_ids?.length
    ? movie.genre_ids.map(id => genreNames[id]).filter(Boolean).join(", ")
    : "Brak informacji o gatunkach";

            const watchlistButton = document.createElement("button");
watchlistButton.textContent = "Dodaj do obejrzenia";

const watchedButton = document.createElement("button");
watchedButton.textContent = "Oznacz jako obejrzany";

// Sprawdzenie aktualnego statusu filmu
const savedStatus = savedMovieStatuses.get(movie.id);

if (savedStatus === "watchlist") {
    watchlistButton.textContent = "Dodano do obejrzenia ✓";
    watchlistButton.disabled = true;
}

if (savedStatus === "watched") {
    watchlistButton.textContent = "Obejrzany ✓";
    watchlistButton.disabled = true;

    watchedButton.textContent = "Obejrzany ✓";
    watchedButton.disabled = true;
}

            watchlistButton.addEventListener("click", () => {
                saveMovie(movie, "watchlist", watchlistButton);
            });

            watchedButton.addEventListener("click", () => {
                saveMovie(movie, "watched", watchedButton);
            });
movieInfo.append(
    title,
    releaseYear,
    genres,
    watchlistButton,
    watchedButton
);

            if (poster) {
                movieCard.append(image, movieInfo);
            } else {
                const noPoster = document.createElement("div");
                noPoster.className = "no-poster";
                noPoster.textContent = "No poster available";

                movieCard.append(noPoster, movieInfo);
            }

            searchResults.appendChild(movieCard);
        });

    } catch (error) {
        console.error("TMDB search error:", error);
        searchError.textContent = "Could not load movies. Check your API key.";
    }
}


// Automatic search while typing
movieSearchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        searchMovies();
    }, 300);
});

// Prevent form submission from reloading the page
movieSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearTimeout(searchTimeout);
    searchMovies();
});



async function saveMovie(movie, status, button) {
    button.disabled = true;
    button.textContent = "Saving...";

    try {
        const { data: { user }, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError || !user) {
            throw new Error("You must be logged in.");
        }

        const genres = (movie.genre_ids || [])
            .map(id => genreNames[id])
            .filter(Boolean);

        const releaseYear = movie.release_date
            ? parseInt(movie.release_date.substring(0, 4))
            : null;

        const { error } = await supabaseClient
            .from("movies")
            .upsert({
                user_id: user.id,
                tmdb_id: movie.id,
                title: movie.title,
                release_year: releaseYear,
                poster_path: movie.poster_path,
                genres: genres,
                genre_ids: movie.genre_ids || [],
                status: status,
                added_at: new Date().toISOString(),
                watched_at: status === "watched"
                    ? new Date().toISOString()
                    : null
            }, {
                onConflict: "user_id,tmdb_id"
            });

        if (error) throw error;

        button.textContent = status === "watched"
            ? "Obejrzany"
            : "Dodano na listę";

await loadMovieStatistics();
await searchMovies();

    } catch (error) {
        console.error("Save movie error:", error);
        searchError.textContent = error.message;
        button.disabled = false;
        button.textContent = status === "watched"
            ? "Oznacz jako obejrzany"
            : "Dodaj do obejrzenia";
    }
}

// ==========================================
// PERSONAL MOVIE LIBRARY
// ==========================================

let activeLibraryTab = "watchlist";

const libraryMovies = document.getElementById("library-movies");
const watchlistTab = document.getElementById("watchlist-tab");
const watchedTab = document.getElementById("watched-tab");

const watchedStat = document.getElementById("watched-stat");
const watchlistStat = document.getElementById("watchlist-stat");

watchedStat.addEventListener("click", () => {
    showLibraryTab("watched");

    document.querySelector(".library-section").scrollIntoView({
        behavior: "smooth"
    });
});

watchlistStat.addEventListener("click", () => {
    showLibraryTab("watchlist");

    document.querySelector(".library-section").scrollIntoView({
        behavior: "smooth"
    });
});

// Library tab buttons
watchlistTab.addEventListener("click", () => {
    showLibraryTab("watchlist");
});

watchedTab.addEventListener("click", () => {
    showLibraryTab("watched");
});

function showLibraryTab(status) {
    activeLibraryTab = status;

    watchlistTab.classList.toggle("active", status === "watchlist");
    watchedTab.classList.toggle("active", status === "watched");

    loadLibraryMovies();
}

// Load movies from Supabase
async function loadLibraryMovies() {
    libraryMovies.innerHTML = "<p>Loading movies...</p>";

    const { data: { user }, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError || !user) {
        libraryMovies.textContent = "Please log in to view your library.";
        return;
    }

    const { data: movies, error } = await supabaseClient
        .from("movies")
        .select("*")
        .eq("status", activeLibraryTab)
        .order("added_at", { ascending: false });

    if (error) {
        console.error("Library loading error:", error);
        libraryMovies.textContent = "Could not load your movies.";
        return;
    }

    libraryMovies.innerHTML = "";

    if (!movies || movies.length === 0) {
        libraryMovies.innerHTML = `
            <p class="empty-library">
                ${activeLibraryTab === "watchlist"
                    ? "Twoja lista obejrzanych filmów jest pusta."
                    : "Nie masz jeszcze żadnych obejrzanych filmów."}
            </p>
        `;
        return;
    }

    movies.forEach(movie => {
        const card = document.createElement("div");
        card.className = "movie-card";

        // Movie poster
        if (movie.poster_path) {
            const poster = document.createElement("img");
            poster.src = `${TMDB_IMAGE_URL}${movie.poster_path}`;
            poster.alt = `${movie.title} poster`;
            card.appendChild(poster);
        } else {
            const noPoster = document.createElement("div");
            noPoster.className = "no-poster";
            noPoster.textContent = "No poster available";
            card.appendChild(noPoster);
        }

        // Movie information
        const info = document.createElement("div");
        info.className = "movie-info";

        const title = document.createElement("h3");
        title.textContent = movie.title;

        const year = document.createElement("p");
        year.textContent = movie.release_year || "Unknown year";

        const genres = document.createElement("p");
        genres.textContent = movie.genres?.join(", ") || "No genres";

        info.append(title, year, genres);

        // Action buttons
        const actions = document.createElement("div");
        actions.className = "movie-actions";

        // Move to Watched button (only in To Watch)
        if (activeLibraryTab === "watchlist") {
            const watchedButton = document.createElement("button");
            watchedButton.textContent = "Oznacz jako obejrzany";

            watchedButton.addEventListener("click", async () => {
                watchedButton.disabled = true;
                watchedButton.textContent = "Updating...";

                const { error: updateError } = await supabaseClient
                    .from("movies")
                    .update({
                        status: "watched",
                        watched_at: new Date().toISOString()
                    })
                    .eq("id", movie.id)
                    .eq("user_id", user.id);

                if (updateError) {
                    console.error("Movie update error:", updateError);
                    watchedButton.disabled = false;
                    watchedButton.textContent = "Mark as Watched";
                    return;
                }

                await loadMovieStatistics();
            });

            actions.appendChild(watchedButton);
        }

        // Remove button (in both tabs)
        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove";
        removeButton.className = "remove-movie-button";

        removeButton.addEventListener("click", async () => {
            if (!confirm(`Remove "${movie.title}" from your library?`)) {
                return;
            }

            removeButton.disabled = true;
            removeButton.textContent = "Removing...";

            const { error: deleteError } = await supabaseClient
                .from("movies")
                .delete()
                .eq("id", movie.id)
                .eq("user_id", user.id);

            if (deleteError) {
                console.error("Movie deletion error:", deleteError);
                removeButton.disabled = false;
                removeButton.textContent = "Usuń";
                return;
            }

            await loadMovieStatistics();
        });

        actions.appendChild(removeButton);

        info.appendChild(actions);
        card.appendChild(info);
        libraryMovies.appendChild(card);
    });
}
