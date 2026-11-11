
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


async function loadMovieStatistics(userId = null) {

    let targetUserId = userId;

    // If no user ID is provided, use the logged-in user
    if (!targetUserId) {
        const { data: { user }, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError || !user) {
            showLoginScreen();
            return;
        }

        targetUserId = user.id;
    }

    const { count: watchedCount, error: watchedError } =
        await supabaseClient
            .from("movies")
            .select("*", { count: "exact", head: true })
            .eq("user_id", targetUserId)
            .eq("status", "watched");

    const { count: watchlistCount, error: watchlistError } =
        await supabaseClient
            .from("movies")
            .select("*", { count: "exact", head: true })
            .eq("user_id", targetUserId)
            .eq("status", "watchlist");

    if (watchedError || watchlistError) {
        console.error("Statistics error:", watchedError || watchlistError);
        return;
    }

    document.getElementById("watched-count").textContent =
        watchedCount ?? 0;

    document.getElementById("watchlist-count").textContent =
        watchlistCount ?? 0;

    // Only load your own library when viewing your own profile
    if (!userId) {
        await loadLibraryMovies();
    }
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


const movieYearSelect = document.getElementById("movie-year");

// Generate year options
const currentYear = new Date().getFullYear();

for (let year = currentYear; year >= 1900; year--) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    movieYearSelect.appendChild(option);
}

const searchResults = document.getElementById("search-results");
const searchError = document.getElementById("search-error");

const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w500";


let searchTimeout;


async function searchMovies() {
    const query = movieSearchInput.value.trim();
    const selectedYear = movieYearSelect.value;
    searchResults.innerHTML = "";
    searchError.textContent = "Loading movies...";

    try {
        let url;

        if (query) {
            // Search by title and optionally filter by year
            url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=pl-PL&page=1`;

            if (selectedYear) {
                url += `&primary_release_year=${selectedYear}`;
            }

        } else {
            // Discover recently released movies
            const today = new Date().toISOString().split("T")[0];

            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const startDate = sixMonthsAgo.toISOString().split("T")[0];

            if (selectedYear) {
                url = `https://api.themoviedb.org/3/discover/movie?language=pl-PL&sort_by=popularity.desc&primary_release_year=${selectedYear}&vote_count.gte=5&include_adult=false&page=1`;
            } else {
                url = `https://api.themoviedb.org/3/discover/movie?language=pl-PL&sort_by=primary_release_date.desc&primary_release_date.gte=${startDate}&primary_release_date.lte=${today}&vote_count.gte=20&include_adult=false&page=1`;
            }
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
            // Kolor ramki zależny od statusu filmu
            if (savedStatus === "watched") {
                movieCard.classList.add("movie-watched");
            }

            if (savedStatus === "watchlist") {
                movieCard.classList.add("movie-to-watch");
            }

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

// Search when selected year changes
movieYearSelect.addEventListener("change", () => {
    searchMovies();
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

// ==========================================
// PUBLIC USER LIBRARIES
// ==========================================

const usersTab = document.getElementById("users-tab");
const usersSection = document.getElementById("users-section");
const usersList = document.getElementById("users-list");

const userLibraryView = document.getElementById("user-library-view");
const userLibraryMovies = document.getElementById("user-library-movies");

const selectedUsername = document.getElementById("selected-username");
const backToUsersButton = document.getElementById("back-to-users");

const publicWatchlistTab = document.getElementById("public-watchlist-tab");
const publicWatchedTab = document.getElementById("public-watched-tab");

let selectedPublicUserId = null;
let activePublicTab = "watchlist";

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

// Open public users section
usersTab.addEventListener("click", () => {

    watchlistTab.classList.remove("active");
    watchedTab.classList.remove("active");
    usersTab.classList.add("active");

    libraryMovies.classList.add("hidden");
    usersSection.classList.remove("hidden");

    userLibraryView.classList.add("hidden");
    usersList.classList.remove("hidden");

    loadPublicUsers();
});

// Return to personal library when selecting its tabs

function showLibraryTab(status) {
    activeLibraryTab = status;

    // Przywróć własne zakładki
    watchlistTab.classList.toggle("active", status === "watchlist");
    watchedTab.classList.toggle("active", status === "watched");
    usersTab.classList.remove("active");

    // Pokaż własną bibliotekę
    usersSection.classList.add("hidden");
    libraryMovies.classList.remove("hidden");

    // Przygotuj widok użytkowników na następne wejście
    userLibraryView.classList.add("hidden");
    usersList.classList.remove("hidden");

    // Załaduj filmy zalogowanego użytkownika
    loadMovieStatistics();
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
        .eq("user_id", user.id)
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
        removeButton.textContent = "Usuń";
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


// ==========================================
// LOAD PUBLIC USERS
// ==========================================

async function loadPublicUsers() {

    usersList.innerHTML = "<p>Ładowanie użytkowników...</p>";

    const { data: { user }, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError || !user) {
        usersList.textContent = "Nie udało się pobrać użytkownika.";
        return;
    }

    const { data: users, error } = await supabaseClient
        .from("profiles")
        .select("id, username")
        .eq("is_public", true)
        .neq("id", user.id)
        .order("username");

    if (error) {
        console.error("Users loading error:", error);
        usersList.textContent = "Nie udało się załadować użytkowników.";
        return;
    }

    usersList.innerHTML = "";

    if (!users || users.length === 0) {
        usersList.innerHTML = "<p>Nie znaleziono innych publicznych profili.</p>";
        return;
    }

    users.forEach(publicUser => {

        const card = document.createElement("div");
        card.className = "movie-card user-card";

        const username = document.createElement("h3");
        username.textContent = publicUser.username;

        const viewButton = document.createElement("button");
        viewButton.textContent = "Zobacz bibliotekę";

        viewButton.addEventListener("click", () => {
            openPublicUserLibrary(publicUser.id, publicUser.username);
        });

        card.append(username, viewButton);
        usersList.appendChild(card);
    });
}


// ==========================================
// OPEN SELECTED USER LIBRARY
// ==========================================

async function openPublicUserLibrary(userId, username) {

    selectedPublicUserId = userId;

    activePublicTab = "watchlist";

    selectedUsername.textContent = `Biblioteka użytkownika: ${username}`;

    usersList.classList.add("hidden");
    userLibraryView.classList.remove("hidden");

    publicWatchlistTab.classList.add("active");
    publicWatchedTab.classList.remove("active");

    await loadMovieStatistics(userId);
    await loadPublicUserMovies();
}

// Add a movie from another user's profile to my library
async function addPublicMovieToMyLibrary(movie, status) {

    const { data: { user }, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError || !user) {
        alert("Musisz być zalogowany.");
        return;
    }

    // Check if movie already exists in my library
    const { data: existingMovie, error: checkError } =
        await supabaseClient
            .from("movies")
            .select("id")
            .eq("user_id", user.id)
            .eq("tmdb_id", movie.tmdb_id)
            .maybeSingle();

    if (checkError) {
        console.error("Movie check error:", checkError);
        return;
    }

    if (existingMovie) {
        alert("Ten film znajduje się już w Twojej bibliotece.");
        await loadPublicUserMovies();
        return;
    }

    // Add movie to my library
    const { error: insertError } = await supabaseClient
        .from("movies")
        .insert({
            user_id: user.id,
            tmdb_id: movie.tmdb_id,
            title: movie.title,
            release_year: movie.release_year,
            poster_path: movie.poster_path,
            genres: movie.genres,
            genre_ids: movie.genre_ids,
            status: status,
            added_at: new Date().toISOString(),
            watched_at: status === "watched"
                ? new Date().toISOString()
                : null
        });

    if (insertError) {
        console.error("Movie insert error:", insertError);
        alert("Nie udało się dodać filmu.");
        return;
    }

    // Refresh public movies to update button status
    await loadPublicUserMovies();
}
// ==========================================
// LOAD PUBLIC USER MOVIES
// ==========================================


async function loadPublicUserMovies() {

    userLibraryMovies.innerHTML = "<p>Ładowanie filmów...</p>";

    const { data: { user }, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError || !user) {
        userLibraryMovies.textContent = "Nie udało się pobrać użytkownika.";
        return;
    }

    // Load selected user's movies
    const { data: movies, error } = await supabaseClient
        .from("movies")
        .select("*")
        .eq("user_id", selectedPublicUserId)
        .eq("status", activePublicTab)
        .order("added_at", { ascending: false });

    if (error) {
        console.error("Public library error:", error);
        userLibraryMovies.textContent = "Nie udało się załadować filmów.";
        return;
    }

    // Load my own movie collection
    const { data: myMovies, error: myMoviesError } =
        await supabaseClient
            .from("movies")
            .select("tmdb_id, status")
            .eq("user_id", user.id);

    if (myMoviesError) {
        console.error("My movies loading error:", myMoviesError);
        return;
    }

    // Create a map of my existing movies
    const myMovieStatuses = new Map(
        myMovies.map(movie => [
            String(movie.tmdb_id),
            movie.status
        ])
    );

    userLibraryMovies.innerHTML = "";

    if (!movies || movies.length === 0) {
        userLibraryMovies.innerHTML =
            "<p>Ta lista jest jeszcze pusta.</p>";
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
            noPoster.textContent = "Brak plakatu";
            card.appendChild(noPoster);
        }

        // Movie information
        const info = document.createElement("div");
        info.className = "movie-info";

        const title = document.createElement("h3");
        title.textContent = movie.title;

        const year = document.createElement("p");
        year.textContent = movie.release_year || "Nieznany rok";

        const genres = document.createElement("p");
        genres.className = "movie-genres";
        genres.textContent =
            movie.genres?.join(", ") || "Brak gatunków";

        info.append(title, year, genres);

        // Movie actions
        const actions = document.createElement("div");
        actions.className = "movie-actions";

        const existingStatus =
            myMovieStatuses.get(String(movie.tmdb_id));

        if (existingStatus === "watched") {

            const statusLabel = document.createElement("button");
            statusLabel.textContent = "Obejrzany ✓";
            statusLabel.disabled = true;
            actions.appendChild(statusLabel);

        } else if (existingStatus === "watchlist") {

            const statusLabel = document.createElement("button");
            statusLabel.textContent = "Dodano do obejrzenia ✓";
            statusLabel.disabled = true;
            actions.appendChild(statusLabel);

        } else {

            const watchlistButton = document.createElement("button");
            watchlistButton.textContent = "Dodaj do obejrzenia";

            watchlistButton.addEventListener("click", async () => {
                watchlistButton.disabled = true;
                await addPublicMovieToMyLibrary(movie, "watchlist");
            });

            const watchedButton = document.createElement("button");
            watchedButton.textContent = "Dodaj do obejrzanych";

            watchedButton.addEventListener("click", async () => {
                watchedButton.disabled = true;
                await addPublicMovieToMyLibrary(movie, "watched");
            });

            actions.append(watchlistButton, watchedButton);
        }

        info.appendChild(actions);
        card.appendChild(info);

        userLibraryMovies.appendChild(card);
    });
}



// ==========================================
// PUBLIC LIBRARY TABS
// ==========================================

publicWatchlistTab.addEventListener("click", () => {

    activePublicTab = "watchlist";

    publicWatchlistTab.classList.add("active");
    publicWatchedTab.classList.remove("active");

    loadPublicUserMovies();
});

publicWatchedTab.addEventListener("click", () => {

    activePublicTab = "watched";

    publicWatchedTab.classList.add("active");
    publicWatchlistTab.classList.remove("active");

    loadPublicUserMovies();
});


// ==========================================
// BACK TO USERS LIST
// ==========================================

backToUsersButton.addEventListener("click", () => {

    userLibraryView.classList.add("hidden");
    usersList.classList.remove("hidden");

});


// Back to top button
const backToTopButton = document.getElementById("back-to-top");

if (backToTopButton) {

    // Show button after scrolling down
    window.addEventListener("scroll", () => {
        if (window.scrollY > 300) {
            backToTopButton.classList.add("visible");
        } else {
            backToTopButton.classList.remove("visible");
        }
    });

    // Scroll smoothly to the top
    backToTopButton.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

}