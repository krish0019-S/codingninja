(function () {
    var loader = document.querySelector(".page-loader");
    var topBar = document.querySelector(".top-bar");
    var navBar = document.querySelector(".nav-bar");
    var navToggle = document.querySelector(".nav-toggle");
    var navLinks = document.querySelector(".nav-links");
    var navDropdowns = document.querySelectorAll("[data-nav-dropdown]");
    var revealItems = document.querySelectorAll(".reveal-on-scroll");

    var hideLoader = function () {
        if (!loader) {
            return;
        }
        loader.classList.add("hidden");
    };

    window.addEventListener("load", hideLoader);
    setTimeout(hideLoader, 2000);

    var updateNavOffset = function () {
        if (!navBar) {
            return;
        }
        var navHeight = navBar.offsetHeight;
        var topHeight = topBar ? topBar.offsetHeight : 0;
        var offset = Math.max(0, topHeight - window.scrollY);
        document.documentElement.style.setProperty("--nav-height", navHeight + "px");
        document.documentElement.style.setProperty("--header-height", navHeight + "px");
        document.documentElement.style.setProperty("--nav-offset", offset + "px");
    };

    var closeNavDropdowns = function () {
        navDropdowns.forEach(function (dropdown) {
            dropdown.classList.remove("is-open");
            var toggle = dropdown.querySelector(".nav-gallery-toggle");
            if (toggle) {
                toggle.setAttribute("aria-expanded", "false");
            }
        });
    };

    navDropdowns.forEach(function (dropdown) {
        var toggle = dropdown.querySelector(".nav-gallery-toggle");
        if (!toggle) {
            return;
        }
        toggle.addEventListener("click", function (event) {
            event.preventDefault();
            var shouldOpen = !dropdown.classList.contains("is-open");
            closeNavDropdowns();
            dropdown.classList.toggle("is-open", shouldOpen);
            toggle.setAttribute("aria-expanded", String(shouldOpen));
        });
    });

    document.addEventListener("click", function (event) {
        if (!event.target.closest("[data-nav-dropdown]")) {
            closeNavDropdowns();
        }
    });

    if (navToggle && navLinks) {
        navToggle.addEventListener("click", function () {
            var isOpen = navLinks.classList.toggle("is-open");
            navToggle.setAttribute("aria-expanded", String(isOpen));
            if (!isOpen) {
                closeNavDropdowns();
            }
            updateNavOffset();
        });

        navLinks.addEventListener("click", function (event) {
            if (event.target.tagName === "A" && !event.target.classList.contains("nav-gallery-toggle")) {
                closeNavDropdowns();
                navLinks.classList.remove("is-open");
                navToggle.setAttribute("aria-expanded", "false");
            }
        });
    }

    if (revealItems.length) {
        if (!("IntersectionObserver" in window)) {
            revealItems.forEach(function (item) {
                item.classList.add("is-visible");
            });
        } else {
            var revealObserver = new IntersectionObserver(function (entries, observer) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.16 });
            revealItems.forEach(function (item) {
                revealObserver.observe(item);
            });
        }
    }

    var footerForm = document.querySelector(".footer-form");
    if (footerForm) {
        var emailInput = footerForm.querySelector("input[type=\"email\"]");
        var parentElement = footerForm.parentElement;
        var status = parentElement ? parentElement.querySelector(".footer-success") : null;
        var submitButton = footerForm.querySelector("button[type=\"submit\"]");

        var showFooterStatus = function (message, isError) {
            if (!status) {
                return;
            }
            status.textContent = message;
            status.classList.toggle("is-error", Boolean(isError));
            status.classList.add("is-visible");
        };

        footerForm.addEventListener("submit", function (event) {
            event.preventDefault();

            if (!emailInput) {
                return;
            }

            if (!footerForm.reportValidity()) {
                showFooterStatus("Please enter a valid email address.", true);
                return;
            }

            var email = emailInput.value.trim();
            if (!email) {
                showFooterStatus("Please enter a valid email address.", true);
                return;
            }

            if (submitButton) {
                submitButton.disabled = true;
            }

            showFooterStatus("Sending...", false);

            fetch("/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email }),
            })
                .then(function (response) {
                    return response.json().catch(function () {
                        return {};
                    }).then(function (data) {
                        return { response: response, data: data };
                    });
                })
                .then(function (result) {
                    if (result.response.ok && result.data.ok) {
                        showFooterStatus("Thanks For Subscribe Rudraksh Creation", false);
                        emailInput.value = "";
                    } else {
                        showFooterStatus(result.data.message || "Unable to send email right now.", true);
                    }
                })
                .catch(function () {
                    showFooterStatus("Unable to send email right now.", true);
                })
                .finally(function () {
                    if (submitButton) {
                        submitButton.disabled = false;
                    }
                });
        });
    }

    updateNavOffset();
    window.addEventListener("scroll", updateNavOffset, { passive: true });
    window.addEventListener("resize", updateNavOffset);
})();
