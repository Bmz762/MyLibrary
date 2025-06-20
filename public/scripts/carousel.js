$(document).ready(async function () {
    const carousel = $('.cat-carousel');
    const userCarousel = $('.Userbooks-carousel');
    const userBooksContainer = $('.UserBooks');

    initializeSlick();
    await preloadBooks(8);
    updateUserBooksMessage();

    $(document).on('click', '.catalogue-next', async function () {
        await addBookToCarousel();
    });

    function initializeSlick() {
        if (!carousel.hasClass('slick-initialized')) {
            carousel.slick({
                lazyLoad: 'ondemand',
                slidesToShow: 6,
                slidesToScroll: 1,
                prevArrow: '.catalogue-prev',
                nextArrow: '.catalogue-next',
                infinite: false,
                draggable: false,
                swipe: false
            }).addClass('slick-initialized');

            overrideSlickPassiveEvents();
        }
    }

    function overrideSlickPassiveEvents() {
        $('.slick-list, .slick-track').each(function () {
            $(this).on('touchstart touchmove', (e) => {}, { passive: true });
        });
    }

    async function fetchNextBookId() {
        try {
            const response = await fetch("/getNextBookId");
            if (!response.ok) throw new Error("Network response was not ok");
            const { bookId } = await response.json();
            return bookId;
        } catch (error) {
            console.error("Error fetching book ID:", error);
            return null;
        }
    }

    async function addBookToCarousel() {
        if (!carousel.hasClass('slick-initialized')) return;

        const bookId = await fetchNextBookId();
        if (!bookId) return;

        const coverUrl = `https://covers.openlibrary.org/b/id/${bookId}-M.jpg`;
        const metadataUrl = `https://covers.openlibrary.org/b/id/${bookId}.json`;

        try {
            const metadataResponse = await fetch(metadataUrl);
            if (!metadataResponse.ok) throw new Error("Failed to fetch metadata");
            const { title = "Unknown Title" } = await metadataResponse.json();

            const newSlide = `
                <div class="book carousel__item" data-book-id="${bookId}">
                    <div class="book-cover">
                        <img class="bookcover" src="${coverUrl}" alt="${title}">
                    </div>
                    <div class="book-cta">
                        <button class="btn cta-btn cta-btn--available add-to-library">Add to Library</button>
                    </div>
                </div>
            `;

            setTimeout(() => carousel.slick('slickAdd', newSlide), 500);
        } catch (error) {
            console.error("Error fetching metadata for book ID:", bookId, error);
        }
    }

    async function preloadBooks(count) {
        for (let i = 0; i < count; i++) {
            await addBookToCarousel();
        }
    }

    $(document).on("click", ".add-to-library", async function () {
        const bookElement = $(this).closest(".book");
        const bookId = bookElement.data("book-id");
        const title = bookElement.find("img").attr("alt");
        const coverUrl = bookElement.find("img").attr("src");

        try {
            await addBookToUserLibrary(bookId, title, coverUrl);
            toggleBookInUserBooks(bookId, title, coverUrl);
        } catch (error) {
            console.error("Error adding book to user library:", error);
        }
    });

    async function addBookToUserLibrary(bookId, title, coverUrl) {
        const response = await fetch("/AddBook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookId, title, coverUrl })
        });

        if (!response.ok) throw new Error("Failed to add book");
        return await response.json();
    }

    function toggleBookInUserBooks(bookId, title, coverUrl) {
        let existingBook = userCarousel.find(`[data-book-id='${bookId}']`);
        if (existingBook.length > 0) {
            userCarousel.slick("slickRemove", existingBook.index());
        } else {
            const newSlide = `
                <div class="book carousel__item" data-book-id="${bookId}">
                    <div class="book-cover">
                        <img src="${coverUrl}" alt="${title}">
                    </div>
                    <div class="book-cta">
                        <button class="btn cta-btn cta-btn--available add-to-library">Remove</button>
                    </div>
                </div>
            `;
            initializeUserCarousel();
            userCarousel.slick("slickAdd", newSlide);
        }

        updateUserBooksMessage();
    }

    function initializeUserCarousel() {
        if (userCarousel.hasClass("slick-initialized")) return;

        userCarousel.slick({
            lazyLoad: "ondemand",
            slidesToShow: 6,
            slidesToScroll: 1,
            prevArrow: ".userbooks-prev",
            nextArrow: ".userbooks-next",
            infinite: false,
            draggable: false,
            swipe: false
        }).addClass("slick-initialized");
    }

    function resetUserCarousel() {
        if (userCarousel.hasClass("slick-initialized")) {
            userCarousel.slick("unslick");
            userCarousel.removeClass("slick-initialized");
        }
        userCarousel.empty(); // Clear all book elements
        initializeUserCarousel();
    }
    function updateUserBooksMessage() {
        const userBooksCarousel = $(".Userbooks-carousel");
        const bookCount = userBooksCarousel.find(".carousel__item").length;
    
        if (bookCount === 0) {
            if ($("#no-books-message").length === 0) {
                $(".UserBooks").append(
                    '<h1 style="color:white; text-align:center;" id="no-books-message">Add books to the library</h1>'
                );
            }
        } else {
            $("#no-books-message").remove();
        }
    }
    

    // function updateUserBooksMessage() {
    //     let userBooksCarousel = $(".Userbooks-carousel");
    //     if (userBooksCarousel.children().length === 0) {
    //         if ($("#no-books-message").length === 0) {
    //             $(".UserBooks").append('<h1 style="color:white; text-align:center;" id="no-books-message">Add books to the library</h1>');
    //         }
    //     } else {
    //         $("#no-books-message").remove();
    //     }
    // }

    // 👇 Render initialUserBooks on page load
    if (Array.isArray(initialUserBooks) && initialUserBooks.length > 0) {
        initializeUserCarousel();

        initialUserBooks.forEach(book => {
            const { coverUrl,bookId, title } = book;
            const bookSlide = `
                <div class="book carousel__item" data-book-id="${bookId}">
                    <div class="book-cover">
                        <img src="${coverUrl}" alt="${title}">
                    </div>
                    <div class="book-cta">
                        <button class="btn cta-btn cta-btn--available add-to-library">Remove</button>
                    </div>
                </div>
            `;
            userCarousel.slick('slickAdd', bookSlide);
        });

        updateUserBooksMessage();
    }

    updateUserBooksMessage();

    const observer = new MutationObserver(updateUserBooksMessage);
    observer.observe(document.querySelector(".Userbooks-carousel"), { childList: true });
});


