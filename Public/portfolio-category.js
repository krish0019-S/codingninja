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

    // Fetch and render portfolio for frontend pages
    var portfolioCategory = document.body.getAttribute("data-portfolio-category");
    if (portfolioCategory) {
        var publicFolderGrid = document.querySelector("[data-public-folder-grid]");
        var publicImageGrid = document.querySelector("[data-public-image-grid]");
        var publicSelectedFolder = document.querySelector("[data-public-selected-folder]");
        var publicBrowserTitle = document.querySelector("[data-public-browser-title]");
        var publicBrowserSubtitle = document.querySelector("[data-public-browser-subtitle]");
        var publicFolderBack = document.querySelector("[data-public-folder-back]");
        
        var currentPublicFolder = String(new URLSearchParams(window.location.search).get("folder") || "").trim().toLowerCase();

        var escapeHtml = function (text) {
            return String(text == null ? "" : text)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        };

        var prettifyName = function (value) {
            return String(value || "").trim().replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
        };

        var setPublicViewMode = function (mode, folderName) {
            var isFolderView = mode === "folder";
            if (publicFolderGrid) publicFolderGrid.hidden = isFolderView;
            if (publicImageGrid) publicImageGrid.hidden = !isFolderView;
            if (publicSelectedFolder) publicSelectedFolder.hidden = !isFolderView;
            if (publicFolderBack) publicFolderBack.hidden = !isFolderView;
            
            if (publicBrowserTitle) {
                publicBrowserTitle.textContent = isFolderView ? prettifyName(folderName) + " Folder" : "Project Folders";
            }
            if (publicBrowserSubtitle) {
                publicBrowserSubtitle.textContent = isFolderView ? "Showing media uploaded in this folder." : "Open a folder to view our work.";
            }
            if (publicSelectedFolder) {
                publicSelectedFolder.textContent = isFolderView ? "Folder: " + prettifyName(folderName) : "Folder: -";
            }
            if (publicFolderBack) {
                var url = new URL(window.location.href);
                url.searchParams.delete("folder");
                publicFolderBack.href = url.toString();
            }
        };

        if (publicFolderBack) {
            publicFolderBack.addEventListener("click", function(e) {
                e.preventDefault();
                var url = new URL(window.location.href);
                url.searchParams.delete("folder");
                window.history.pushState({}, "", url);
                setPublicViewMode("folders", "");
                currentPublicFolder = "";
            });
        }

        var loadPortfolioFiles = function (folderName) {
            if (!folderName) return;
            fetch("/admin/portfolio-files-public?category=" + encodeURIComponent(portfolioCategory) + "&folder=" + encodeURIComponent(folderName))
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (!data.ok) throw new Error(data.message);
                    setPublicViewMode("folder", folderName);
                    
                    var files = data.files || [];
                    if (!files.length) {
                        publicImageGrid.innerHTML = '<div class="gallery-empty-state">No items found in this folder.</div>';
                        return;
                    }
                    
                    var cards = files.map(function (item) {
                        var filePath = String(item.path || "");
                        var fileName = String(item.name || "");
                        var title = prettifyName(fileName);
                        var isVideo = fileName.toLowerCase().endsWith(".mp4");
                        
                        var mediaMarkup = isVideo
                            ? '<video src="' + escapeHtml(filePath) + '" controls preload="metadata"></video>'
                            : '<img src="' + escapeHtml(filePath) + '" alt="' + escapeHtml(title) + '" loading="lazy">';
                            
                        return (
                            '<article class="gallery-card gallery-card-public' + (isVideo ? ' gallery-video-card' : '') + '">' +
                                '<button class="gallery-open" type="button" data-lightbox-open data-full="' + escapeHtml(filePath) + '" data-title="' + escapeHtml(title) + '" data-meta="' + escapeHtml(folderName) + '" data-type="' + (isVideo ? 'video' : 'image') + '">' +
                                    (isVideo ? '<div class="gallery-video-frame">' + mediaMarkup + '</div>' : mediaMarkup) +
                                    '<span class="gallery-overlay"><span>' + escapeHtml(folderName) + '</span></span>' +
                                '</button>' +
                            '</article>'
                        );
                    }).join("");
                    
                    publicImageGrid.innerHTML = cards;
                })
                .catch(function(err) {
                    publicImageGrid.innerHTML = '<div class="gallery-empty-state">Unable to load files.</div>';
                });
        };

        var loadPortfolioFolders = function () {
            fetch("/admin/portfolio-folders-public?category=" + encodeURIComponent(portfolioCategory))
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (!data.ok) throw new Error(data.message);
                    var folders = data.folders || [];
                    if (!folders.length) {
                        publicFolderGrid.innerHTML = '<div class="gallery-empty-state">No folders available right now.</div>';
                        return;
                    }
                    
                    var cards = folders.map(function (item) {
                        var isVideo = item.coverType === "video";
                        var coverMarkup = item.coverPath
                            ? (isVideo ? '<video src="' + escapeHtml(item.coverPath) + '" muted playsinline preload="metadata"></video>' : '<img src="' + escapeHtml(item.coverPath) + '" alt="cover" loading="lazy">')
                            : '<span class="gallery-folder-placeholder">No Media</span>';
                        
                        var folderLink = "?folder=" + encodeURIComponent(item.name);
                        
                        return (
                            '<a class="gallery-folder-card-public" href="' + folderLink + '" data-public-folder-name="' + escapeHtml(item.name) + '">' +
                                '<span class="gallery-folder-cover' + (isVideo ? ' gallery-folder-cover-video' : '') + '">' + coverMarkup + '<span class="gallery-folder-cover-title">' + escapeHtml(prettifyName(item.name)) + '</span></span>' +
                                '<span class="gallery-folder-info">' +
                                    '<span class="gallery-folder-count">' + item.fileCount + ' item(s)</span>' +
                                '</span>' +
                            '</a>'
                        );
                    }).join("");
                    
                    publicFolderGrid.innerHTML = cards;
                    
                    if (currentPublicFolder) {
                        var exists = folders.some(function(f) { return f.name.toLowerCase() === currentPublicFolder.toLowerCase(); });
                        if (exists) {
                            loadPortfolioFiles(currentPublicFolder);
                        } else {
                            setPublicViewMode("folders", "");
                        }
                    } else {
                        setPublicViewMode("folders", "");
                    }
                })
                .catch(function(err) {
                    publicFolderGrid.innerHTML = '<div class="gallery-empty-state">Unable to load folders.</div>';
                });
        };
        
        if (publicFolderGrid) {
            loadPortfolioFolders();
        }

        if (publicFolderGrid) {
            publicFolderGrid.addEventListener("click", function(e) {
                var card = e.target.closest(".gallery-folder-card-public");
                if (card) {
                    e.preventDefault();
                    var folderName = card.getAttribute("data-public-folder-name");
                    var url = new URL(window.location.href);
                    url.searchParams.set("folder", folderName);
                    window.history.pushState({}, "", url);
                    currentPublicFolder = folderName;
                    loadPortfolioFiles(folderName);
                }
            });
        }

        // Lightbox logic
        var lightbox = document.querySelector("[data-lightbox]");
        if (lightbox) {
            var lightboxContainer = lightbox.querySelector(".gallery-lightbox-media-container");
            var lightboxTitle = lightbox.querySelector("[data-lightbox-title]");
            var lightboxMeta = lightbox.querySelector("[data-lightbox-meta]");
            var lightboxCloses = lightbox.querySelectorAll("[data-lightbox-close]");

            var closeLightbox = function () {
                lightbox.classList.remove("is-open");
                lightbox.setAttribute("aria-hidden", "true");
                document.body.classList.remove("gallery-lightbox-open");
                if (lightboxContainer) lightboxContainer.innerHTML = "";
            };

            var openLightbox = function (trigger) {
                var fullMedia = trigger.dataset.full || "";
                var title = trigger.dataset.title || "";
                var meta = trigger.dataset.meta || "";
                var type = trigger.dataset.type || "image";

                if (lightboxContainer) {
                    if (type === "video") {
                        lightboxContainer.innerHTML = '<video src="' + escapeHtml(fullMedia) + '" controls autoplay style="max-width:100%; max-height:80vh; outline:none; border-radius:8px;"></video>';
                    } else {
                        lightboxContainer.innerHTML = '<img src="' + escapeHtml(fullMedia) + '" alt="' + escapeHtml(title) + '" data-lightbox-image>';
                    }
                }
                
                if (lightboxTitle) lightboxTitle.textContent = title;
                if (lightboxMeta) lightboxMeta.textContent = meta;

                lightbox.classList.add("is-open");
                lightbox.setAttribute("aria-hidden", "false");
                document.body.classList.add("gallery-lightbox-open");
            };

            document.addEventListener("click", function (event) {
                var trigger = event.target.closest("[data-lightbox-open]");
                if (trigger) openLightbox(trigger);
            });

            lightboxCloses.forEach(function (closer) {
                closer.addEventListener("click", closeLightbox);
            });

            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
                    closeLightbox();
                }
            });
        }
    }

    updateNavOffset();
    window.addEventListener("scroll", updateNavOffset, { passive: true });
    window.addEventListener("resize", updateNavOffset);
})();
