$(function () {
    var TOKEN_KEY = "rc_admin_token";
    var TOKEN_EXP_KEY = "rc_admin_token_exp";
    var LOGIN_PAGE = "/admin/login";

    var loginModalEl = document.getElementById("adminLoginModal");
    var resetModalEl = document.getElementById("adminResetModal");
    var newsFormModalEl = document.getElementById("newsFormModal");
    var sidebar = $("#adminSidebar");
    var sidebarMenuToggle = $("#sidebarMenuToggle");
    var sidebarPasswordLink = $("#sidebarPasswordLink");
    var loginError = $("#adminLoginError");
    var resetError = $("#adminResetError");
    var resetHint = $("#resetTokenHint");
    var preloaderEl = document.getElementById("adminPreloader");
    var loaderBarEl = document.getElementById("adminLoaderBar");
    var loaderPercentEl = document.getElementById("adminLoaderPercent");

    var bannerGrid = $("#bannerGrid");
    var addCarouselBtn = $("#addCarouselBtn");
    var addCarouselInput = $("#addCarouselInput");

    var navViewLinks = $(".nav-link[data-admin-view]");
    var dashboardSection = $("#dashboardSection");
    var bannersSection = $("#bannersSection");
    var enquiriesSection = $("#enquiriesSection");
    var portfolioSection = $("#portfolioSection");
    var portfolioCategorySelect = $("#portfolioCategorySelect");
    var activePortfolioFolderBadge = $("#activePortfolioFolderBadge");
    var addPortfolioFilesBtn = $("#addPortfolioFilesBtn");
    var addPortfolioFilesInput = $("#addPortfolioFilesInput");
    var newPortfolioFolderName = $("#newPortfolioFolderName");
    var createPortfolioFolderBtn = $("#createPortfolioFolderBtn");
    var deletePortfolioFolderBtn = $("#deletePortfolioFolderBtn");
    var portfolioFolderCardGrid = $("#portfolioFolderCardGrid");
    var portfolioFileGrid = $("#portfolioFileGrid");
    var newsSection = $("#newsSection");
    var imagesSection = $("#imagesSection");
    var videosSection = $("#videosSection");
    var dashboardTotalProjects = $("#dashboardTotalProjects");
    var dashboardEndedProjects = $("#dashboardEndedProjects");
    var dashboardPhotoFolders = $("#dashboardPhotoFolders");
    var dashboardVideoFolders = $("#dashboardVideoFolders");
    var dashboardPhotoCount = $("#dashboardPhotoCount");
    var dashboardVideoCount = $("#dashboardVideoCount");
    var dashboardPhotoDelta = $("#dashboardPhotoDelta");
    var dashboardVideoDelta = $("#dashboardVideoDelta");
    var dashboardEnquiryQueue = $("#dashboardEnquiryQueue");
    var dashboardNewsCount = $("#dashboardNewsCount");
    var dashboardSliderDelta = $("#dashboardSliderDelta");
    var dashboardEnquiriesDelta = $("#dashboardEnquiriesDelta");
    var dashboardNewsDelta = $("#dashboardNewsDelta");
    var dashboardAnalyticsChartEl = document.getElementById("dashboardAnalyticsChart");
    var dashboardAnalyticsStats = $("#dashboardAnalyticsStats");
    var dashboardLiveClock = $("#dashboardLiveClock");
    var dashboardProgressRing = $("#dashboardProgressRing");
    var dashboardProjectProgressPercent = $("#dashboardProjectProgressPercent");
    var dashboardProjectProgressLabel = $("#dashboardProjectProgressLabel");
    var dashboardProgressDoneCount = $("#dashboardProgressDoneCount");
    var dashboardProgressActiveCount = $("#dashboardProgressActiveCount");
    var dashboardProgressPendingCount = $("#dashboardProgressPendingCount");
    var dashboardAdminAvatar = $("#dashboardAdminAvatar");
    var dashboardAdminName = $("#dashboardAdminName");
    var dashboardAdminEmail = $("#dashboardAdminEmail");
    var enquiryListWrap = $("#enquiryListWrap");
    var newsForm = $("#newsForm");
    var newsIdInput = $("#newsIdInput");
    var newsTitleInput = $("#newsTitleInput");
    var newsContentInput = $("#newsContentInput");
    var newsContentCounter = $("#newsContentCounter");
    var newsImageFileInput = $("#newsImageFileInput");
    var newsSubmitBtn = $("#newsSubmitBtn");
    var newsCancelBtn = $("#newsCancelBtn");
    var addNewsBtn = $("#addNewsBtn");
    var newsFormModalLabel = $("#newsFormModalLabel");
    var newsListWrap = $("#newsListWrap");
    var refreshNewsBtn = $("#refreshNewsBtn");
    var toggleNewsPauseBtn = $("#toggleNewsPauseBtn");
    var newsPauseStatus = $("#newsPauseStatus");
    var galleryImageGrid = $("#galleryImageGrid");
    var galleryFolderCardGrid = $("#galleryFolderCardGrid");
    var addGalleryImagesBtn = $("#addGalleryImagesBtn");
    var addGalleryImagesInput = $("#addGalleryImagesInput");
    var activeGalleryFolderBadge = $("#activeGalleryFolderBadge");
    var showAllGalleryFoldersBtn = $("#showAllGalleryFoldersBtn");
    var galleryFolderSequenceWrap = $("#galleryFolderSequenceWrap");
    var galleryFolderSequenceSelect = $("#galleryFolderSequenceSelect");
    var changeGalleryFolderSequenceBtn = $("#changeGalleryFolderSequenceBtn");
    var createGalleryFolderBtn = $("#createGalleryFolderBtn");
    var deleteGalleryFolderBtn = $("#deleteGalleryFolderBtn");
    var newGalleryFolderName = $("#newGalleryFolderName");
    var videoFileGrid = $("#videoFileGrid");
    var videoFolderCardGrid = $("#videoFolderCardGrid");
    var addGalleryVideosBtn = $("#addGalleryVideosBtn");
    var addGalleryVideosInput = $("#addGalleryVideosInput");
    var activeVideoFolderBadge = $("#activeVideoFolderBadge");
    var videoFolderSequenceWrap = $("#videoFolderSequenceWrap");
    var videoFolderSequenceSelect = $("#videoFolderSequenceSelect");
    var changeVideoFolderSequenceBtn = $("#changeVideoFolderSequenceBtn");
    var createVideoFolderBtn = $("#createVideoFolderBtn");
    var deleteVideoFolderBtn = $("#deleteVideoFolderBtn");
    var newVideoFolderName = $("#newVideoFolderName");
    var refreshEnquiriesBtn = $("#refreshEnquiriesBtn");
    var currentNewsItems = [];
    var newsScrollPaused = false;
    var currentView = "dashboard";
    var currentGalleryFolder = "";
    var showOnlySelectedGalleryFolder = false;
    var currentGalleryFolderOrder = [];
    var currentVideoFolder = "";
    var currentVideoFolderOrder = [];
    var currentPortfolioCategory = "printing";
    var currentPortfolioFolder = "";
    var dashboardMetrics = {
        videos: 0,
        images: 0,
        slider: 0,
        news: 0,
        enquiries: 0,
        imageFolders: 0,
        imageFiles: 0,
        videoFolders: 0,
        videoFiles: 0,
    };
    var dashboardClockTimer = null;
    var dashboardAnalyticsChart = null;
    var analyticsRefreshTimer = null;
    var lastAnalyticsSnapshot = null;
    var NEWS_CONTENT_MAX_LENGTH = 1210;

    var currentBanners = [];
    var mobileSidebarQuery = window.matchMedia ? window.matchMedia("(max-width: 992px)") : null;

    var loginModal = null;
    var resetModal = null;
    var newsFormModal = null;
    if (loginModalEl) {
        loginModal = new bootstrap.Modal(loginModalEl, {
            backdrop: "static",
            keyboard: false,
        });
    }
    if (resetModalEl) {
        resetModal = new bootstrap.Modal(resetModalEl, {
            backdrop: "static",
            keyboard: false,
        });
    }
    if (newsFormModalEl) {
        newsFormModal = new bootstrap.Modal(newsFormModalEl, {
            backdrop: "static",
            keyboard: true,
        });
    }

    // Simulates startup progress for 2-3 seconds and reveals the app shell smoothly.
    var runAdminBootAnimation = function () {
        var bodyEl = document.body;
        if (!bodyEl) {
            return;
        }

        var finishWithoutPreloader = function () {
            bodyEl.classList.remove("is-loading");
            bodyEl.classList.add("is-ready");
        };

        if (!preloaderEl || !loaderBarEl || !loaderPercentEl) {
            finishWithoutPreloader();
            return;
        }

        var progress = 0;
        var startedAt = Date.now();
        var minDurationMs = 2200 + Math.floor(Math.random() * 700);
        var pageLoaded = document.readyState === "complete";
        var isDone = false;
        var progressTimer = null;

        var setProgress = function (nextValue) {
            progress = Math.max(0, Math.min(100, Math.round(nextValue)));
            loaderBarEl.style.width = String(progress) + "%";
            loaderPercentEl.textContent = String(progress);
        };

        var completePreloader = function (force) {
            var elapsed = Date.now() - startedAt;
            if (!force && (!pageLoaded || elapsed < minDurationMs || progress < 100)) {
                return;
            }
            if (isDone) {
                return;
            }

            isDone = true;
            if (progressTimer) {
                window.clearInterval(progressTimer);
            }

            setProgress(100);
            preloaderEl.classList.add("is-hidden");
            bodyEl.classList.remove("is-loading");
            bodyEl.classList.add("is-ready");

            window.setTimeout(function () {
                if (preloaderEl && preloaderEl.parentNode) {
                    preloaderEl.parentNode.removeChild(preloaderEl);
                }
            }, 700);
        };

        progressTimer = window.setInterval(function () {
            var elapsed = Date.now() - startedAt;

            if (!pageLoaded) {
                setProgress(progress + (Math.random() * 5 + 1.2));
                if (progress > 92) {
                    setProgress(92);
                }
            } else if (elapsed < minDurationMs) {
                setProgress(progress + (Math.random() * 3 + 0.8));
                if (progress > 96) {
                    setProgress(96);
                }
            } else {
                setProgress(progress + (Math.random() * 10 + 4));
            }

            completePreloader(false);
        }, 90);

        window.addEventListener("load", function () {
            pageLoaded = true;
            completePreloader(false);
        }, { once: true });

        // Fallbacks keep loader from hanging if any external asset is slow.
        window.setTimeout(function () {
            pageLoaded = true;
            completePreloader(false);
        }, 3200);

        window.setTimeout(function () {
            completePreloader(true);
        }, 5000);
    };

    var alertTimer = null;

    var hideAlert = function () {
        var alertBox = $("#alertBox");
        if (!alertBox.length) {
            return;
        }
        alertBox.addClass("d-none").removeClass("alert-success alert-danger").text("");
    };

    var showAlert = function (message, type) {
        var alertBox = $("#alertBox");
        if (!alertBox.length) {
            return;
        }
        if (currentView === "dashboard") {
            hideAlert();
            return;
        }
        alertBox.removeClass("d-none alert-success alert-danger").addClass("alert-" + type);
        alertBox.text(message);
        if (alertTimer) {
            window.clearTimeout(alertTimer);
        }
        alertTimer = window.setTimeout(function () {
            hideAlert();
        }, 2000);
    };

    var looksLikeEmail = function (value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
    };

    var parseJwtPayload = function (token) {
        var parts = String(token || "").split(".");
        if (parts.length < 2) {
            return null;
        }

        try {
            var base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            while (base64.length % 4 !== 0) {
                base64 += "=";
            }
            var decoded = window.atob(base64);
            return JSON.parse(decoded);
        } catch (error) {
            return null;
        }
    };

    var buildAdminDisplayName = function (email) {
        var normalized = String(email || "").trim().toLowerCase();
        if (!looksLikeEmail(normalized)) {
            return "Admin";
        }
        return normalized;
    };

    var buildAdminAvatar = function (email) {
        var normalized = String(email || "").trim().toLowerCase();
        if (!looksLikeEmail(normalized)) {
            return "AD";
        }

        var localPart = (normalized.split("@")[0] || "").replace(/[^a-z0-9]/gi, "");
        if (localPart.length >= 2) {
            return localPart.slice(0, 2).toUpperCase();
        }
        if (localPart.length === 1) {
            return (localPart + "A").toUpperCase();
        }
        return "AD";
    };

    var setAdminIdentity = function (email) {
        var normalized = String(email || "").trim().toLowerCase();
        if (!looksLikeEmail(normalized)) {
            dashboardAdminName.text("Admin");
            dashboardAdminEmail.text("-");
            dashboardAdminAvatar.text("AD");
            return;
        }

        dashboardAdminName.text(buildAdminDisplayName(normalized));
        dashboardAdminEmail.text(normalized);
        dashboardAdminAvatar.text(buildAdminAvatar(normalized));
    };

    var getAdminEmailFromToken = function () {
        var token = localStorage.getItem(TOKEN_KEY);
        var payload = parseJwtPayload(token);
        var email = String(
            (payload && (payload.username || payload.email || payload.user || payload.sub)) || ""
        ).trim().toLowerCase();

        return looksLikeEmail(email) ? email : "";
    };

    var refreshAdminIdentity = function () {
        var email = getAdminEmailFromToken();
        if (!email) {
            var loginEmail = String($("#tlemail").val() || "").trim().toLowerCase();
            if (looksLikeEmail(loginEmail)) {
                email = loginEmail;
            }
        }
        if (email) {
            setAdminIdentity(email);
            return;
        }
        setAdminIdentity("");
    };

    var clearAuth = function () {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXP_KEY);
        refreshAdminIdentity();
    };

    var tokenValid = function () {
        var token = localStorage.getItem(TOKEN_KEY);
        var exp = Number(localStorage.getItem(TOKEN_EXP_KEY) || 0);
        if (!token) {
            return false;
        }
        if (Date.now() > exp) {
            clearAuth();
            return false;
        }
        return true;
    };

    var redirectToLogin = function () {
        if (window.location.pathname === LOGIN_PAGE) {
            return;
        }
        var next = String(window.location.pathname || "") +
            String(window.location.search || "") +
            String(window.location.hash || "");
        var target = LOGIN_PAGE + "?next=" + encodeURIComponent(next || "/admin");
        window.location.replace(target);
    };

    var ensureAuth = function () {
        if (tokenValid()) {
            return true;
        }
        redirectToLogin();
        return false;
    };

    var getAuthHeaders = function () {
        return {
            Authorization: "Bearer " + localStorage.getItem(TOKEN_KEY),
        };
    };

    var renderEmptyState = function (message) {
        bannerGrid.html(
            '<div class="col-12"><div class="banner-empty-state">' +
                String(message || "No carousel slides found.") +
                "</div></div>"
        );
    };

    var renderEnquiryEmptyState = function (message) {
        enquiryListWrap.html(
            '<div class="banner-empty-state">' +
                String(message || "No enquiries found.") +
                "</div>"
        );
    };

    var renderNewsEmptyState = function (message) {
        newsListWrap.html(
            '<div class="banner-empty-state">' +
                String(message || "No news items found.") +
                "</div>"
        );
    };

    var renderGalleryImageEmptyState = function (message) {
        galleryImageGrid.html(
            '<div class="col-12"><div class="banner-empty-state">' +
                String(message || "No images found in folder.") +
                "</div></div>"
        );
    };

    var renderVideoFileEmptyState = function (message) {
        videoFileGrid.html(
            '<div class="col-12"><div class="banner-empty-state">' +
                String(message || "No videos found in folder.") +
                "</div></div>"
        );
    };

    var handleAuthError = function (xhr) {
        if (xhr && xhr.status === 401) {
            clearAuth();
            redirectToLogin();
            if (currentView === "dashboard") {
                resetDashboardMetrics();
            } else if (currentView === "enquiries") {
                renderEnquiryEmptyState("Login required to view enquiries.");
            } else if (currentView === "news") {
                setNewsPauseState(false);
                renderNewsEmptyState("Login required to manage news.");
            } else if (currentView === "images") {
                currentGalleryFolderOrder = [];
                galleryFolderCardGrid.html("");
                activeGalleryFolderBadge.text("Folder: -");
                showAllGalleryFoldersBtn.addClass("d-none");
                if (galleryFolderSequenceWrap.length) {
                    galleryFolderSequenceWrap.addClass("d-none");
                }
                galleryFolderSequenceSelect.html("");
                renderGalleryImageEmptyState("Login required to manage image folder.");
            } else if (currentView === "videos") {
                currentVideoFolderOrder = [];
                videoFolderCardGrid.html("");
                activeVideoFolderBadge.text("Folder: -");
                if (videoFolderSequenceWrap.length) {
                    videoFolderSequenceWrap.addClass("d-none");
                }
                videoFolderSequenceSelect.html("");
                renderVideoFileEmptyState("Login required to manage video folder.");
            } else {
                renderEmptyState("Login required to manage carousel slides.");
            }
            return true;
        }
        return false;
    };

    var bannerTitle = function (name) {
        var raw = String(name || "").toLowerCase();
        var suffix = raw.replace("banner", "");
        if (!suffix) {
            return "Banner";
        }
        return "Banner " + suffix;
    };

    var buildSequenceOptions = function (total, selected) {
        var options = "";
        for (var i = 1; i <= total; i += 1) {
            var selectedAttr = i === selected ? " selected" : "";
            options += '<option value="' + String(i) + '"' + selectedAttr + ">" + String(i) + "</option>";
        }
        return options;
    };

    var buildCardHtml = function (banner, cacheBust, sequence, total) {
        var name = String((banner && banner.name) || "");
        var path = String((banner && banner.path) || ("/uploads/" + name));
        var title = bannerTitle(name);
        var previewUrl = path + "?v=" + cacheBust;
        var sequenceOptions = buildSequenceOptions(total, sequence);

        return (
            '<div class="col-md-6 col-xl-4">' +
                '<div class="banner-card" data-banner="' + name + '">' +
                    '<div class="banner-preview">' +
                        '<img src="' + previewUrl + '" alt="' + title + '">' +
                        "<span>" + title + "</span>" +
                    "</div>" +
                    '<div class="banner-form">' +
                        '<input class="form-control banner-file-input" type="file" accept="image/jpeg,image/png">' +
                        '<div class="sequence-row">' +
                            '<label class="form-label mb-1">Sequence</label>' +
                            '<div class="sequence-controls">' +
                                '<select class="form-select form-select-sm banner-sequence-select">' +
                                    sequenceOptions +
                                "</select>" +
                                '<button class="btn btn-outline-secondary btn-sm btn-sequence" type="button">Change Sequence</button>' +
                            "</div>" +
                        "</div>" +
                        '<div class="banner-actions">' +
                            '<button class="btn btn-primary btn-update" type="button">Update</button>' +
                            '<button class="btn btn-outline-danger btn-remove" type="button">Remove</button>' +
                        "</div>" +
                        '<small class="text-muted">Only JPG/PNG. Max 5MB.<br>Any image size allowed (auto-fit in slider)</small>' +
                    "</div>" +
                "</div>" +
            "</div>"
        );
    };

    var renderBanners = function (banners) {
        if (!Array.isArray(banners) || !banners.length) {
            currentBanners = [];
            renderEmptyState("No carousel slides available. Click \"Add New Carousel\" to create one.");
            return;
        }

        currentBanners = banners.slice();
        var cacheBust = Date.now();
        var cards = banners.map(function (banner, index) {
            return buildCardHtml(banner, cacheBust, index + 1, currentBanners.length);
        }).join("");
        bannerGrid.html(cards);
    };

    var loadBanners = function () {
        if (!tokenValid()) {
            renderEmptyState("Login required to manage carousel slides.");
            return;
        }

        $.ajax({
            url: "/admin/carousel",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                renderBanners((response && response.banners) || []);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load carousel slides.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                renderEmptyState(msg);
                showAlert(msg, "danger");
            },
        });
    };

    var escapeHtml = function (text) {
        return String(text == null ? "" : text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };

    var normalizeNewsUrl = function (value) {
        var raw = String(value || "").trim();
        if (!raw) {
            return "";
        }
        if (raw.charAt(0) === "/") {
            return raw;
        }
        if (!/^https?:\/\//i.test(raw)) {
            return "";
        }
        try {
            var parsed = new URL(raw);
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                return "";
            }
            return parsed.toString();
        } catch (error) {
            return "";
        }
    };

    var isPdfNewsUrl = function (value) {
        return /\.pdf(?:[?#].*)?$/i.test(String(value || ""));
    };

    var getNewsFileNameFromUrl = function (value) {
        var raw = String(value || "");
        if (!raw) {
            return "";
        }
        try {
            var parsed = new URL(raw, window.location.origin);
            var pathname = String(parsed.pathname || "");
            var fileName = pathname.split("/").pop() || "";
            return decodeURIComponent(fileName);
        } catch (error) {
            return String(raw).split("/").pop() || "";
        }
    };

    var isAllowedNewsMediaFile = function (file) {
        var mime = String(file && file.type || "").toLowerCase();
        if (mime === "image/jpeg" || mime === "image/jpg" || mime === "image/png" || mime === "application/pdf") {
            return true;
        }
        var name = String(file && file.name || "").toLowerCase();
        return /\.(?:jpe?g|png|pdf)$/.test(name);
    };

    var uploadNewsMediaFile = function (file) {
        var formData = new FormData();
        formData.append("file", file);

        return $.ajax({
            url: "/admin/news-media",
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            headers: getAuthHeaders(),
        });
    };

    var updateNewsContentCounter = function () {
        if (!newsContentCounter.length) {
            return;
        }
        var currentLength = String(newsContentInput.val() || "").length;
        var maxLength = Number(newsContentInput.attr("maxlength")) || NEWS_CONTENT_MAX_LENGTH;
        newsContentCounter.text(String(currentLength) + "/" + String(maxLength) + " characters");
    };

    var formatDateTime = function (value) {
        if (!value) {
            return "-";
        }
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return escapeHtml(value);
        }
        return date.toLocaleString("en-IN", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    var formatDateTimeParts = function (value) {
        if (!value) {
            return {
                date: "-",
                time: "-",
            };
        }

        var date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return {
                date: String(value),
                time: "-",
            };
        }

        return {
            date: date.toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "2-digit",
            }),
            time: date.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
            }),
        };
    };

    var formatAddressPreview = function (value) {
        var normalized = String(value == null ? "" : value).trim().replace(/\s+/g, " ");
        if (!normalized) {
            return {
                full: "-",
                preview: "-",
                truncated: false,
            };
        }

        var words = normalized.split(" ");
        if (words.length <= 2) {
            return {
                full: normalized,
                preview: normalized,
                truncated: false,
            };
        }

        return {
            full: normalized,
            preview: words.slice(0, 2).join(" ") + "...",
            truncated: true,
        };
    };

    var renderEnquiries = function (items) {
        if (!Array.isArray(items) || !items.length) {
            renderEnquiryEmptyState("No enquiries found yet.");
            return;
        }

        var rows = items.map(function (item, index) {
            var enquiryId = Number(item && item.id);
            var receivedParts = formatDateTimeParts(item && item.createdAt);
            var addressParts = formatAddressPreview(item && item.address);
            var addressTitle = addressParts.truncated ? (' title="' + escapeHtml(addressParts.full) + '"') : "";
            var deleteAction = "-";
            if (Number.isInteger(enquiryId) && enquiryId > 0) {
                deleteAction =
                    '<button class="btn btn-outline-danger btn-sm btn-enquiry-delete enquiry-delete-icon-btn" type="button" data-enquiry-id="' +
                    String(enquiryId) +
                    '" aria-label="Delete enquiry" title="Delete enquiry">' +
                    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
                        '<path d="M4 7h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
                        '<path d="M10 3h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
                        '<path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>' +
                        '<path d="M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
                    "</svg>" +
                    "</button>";
            }
            return (
                "<tr>" +
                    '<td class="text-nowrap" data-label="#">' + String(index + 1) + "</td>" +
                    '<td data-label="Name">' + escapeHtml(item.fullName) + "</td>" +
                    '<td class="text-nowrap" data-label="Phone">' + escapeHtml(item.phone) + "</td>" +
                    '<td data-label="Email">' + escapeHtml(item.email) + "</td>" +
                    '<td class="enquiry-address-cell" data-label="Address"><div class="enquiry-address-text"' + addressTitle + ">" + escapeHtml(addressParts.preview) + "</div></td>" +
                    '<td class="enquiry-message-cell" data-label="Message"><div class="enquiry-message-text">' + escapeHtml(item.message) + "</div></td>" +
                    '<td class="text-nowrap enquiry-received-cell" data-label="Received">' +
                        '<span class="enquiry-received-date">' + escapeHtml(receivedParts.date) + "</span>" +
                        '<span class="enquiry-received-time">' + escapeHtml(receivedParts.time) + "</span>" +
                    "</td>" +
                    '<td class="text-nowrap enquiry-actions-cell" data-label="Action">' + deleteAction + "</td>" +
                "</tr>"
            );
        }).join("");

        enquiryListWrap.html(
            '<div class="table-responsive enquiry-table-wrap">' +
                '<table class="table table-hover align-middle enquiry-table">' +
                    "<thead>" +
                        "<tr>" +
                            "<th>#</th>" +
                            "<th>Name</th>" +
                            "<th>Phone</th>" +
                            "<th>Email</th>" +
                            "<th>Address</th>" +
                            "<th>Message</th>" +
                            "<th>Received</th>" +
                            "<th>Action</th>" +
                        "</tr>" +
                    "</thead>" +
                    "<tbody>" + rows + "</tbody>" +
                "</table>" +
            "</div>"
        );
    };

    var loadEnquiries = function () {
        if (!tokenValid()) {
            renderEnquiryEmptyState("Login required to view enquiries.");
            return;
        }

        $.ajax({
            url: "/admin/enquiries",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                renderEnquiries((response && response.enquiries) || []);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load enquiries.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                renderEnquiryEmptyState(msg);
                showAlert(msg, "danger");
            },
        });
    };

    var setNewsFormMode = function (editing) {
        if (editing) {
            newsSubmitBtn.text("Update News");
            newsCancelBtn.removeClass("d-none");
            newsFormModalLabel.text("Edit News");
            return;
        }
        newsSubmitBtn.text("Add News");
        newsCancelBtn.addClass("d-none");
        newsFormModalLabel.text("Add News");
    };

    var resetNewsForm = function () {
        newsIdInput.val("");
        newsTitleInput.val("");
        newsContentInput.val("");
        newsImageFileInput.val("");
        updateNewsContentCounter();
        setNewsFormMode(false);
    };

    var openNewsFormModal = function () {
        if (!newsFormModal) {
            return;
        }
        newsFormModal.show();
        window.setTimeout(function () {
            newsTitleInput.trigger("focus");
        }, 120);
    };

    var closeNewsFormModal = function () {
        if (!newsFormModal) {
            return;
        }
        newsFormModal.hide();
    };

    var setNewsPauseState = function (paused) {
        newsScrollPaused = paused === true;
        var isRunning = !newsScrollPaused;
        newsPauseStatus.text(isRunning ? "News scroll running" : "News scroll paused");
        toggleNewsPauseBtn.toggleClass("is-on", isRunning);
        toggleNewsPauseBtn.attr("aria-checked", isRunning ? "true" : "false");
        toggleNewsPauseBtn.attr("aria-label", isRunning ? "Pause news scroll" : "Resume news scroll");
    };

    var renderNewsItems = function (items) {
        var rows = Array.isArray(items) ? items : [];
        currentNewsItems = rows.slice();

        if (!rows.length) {
            renderNewsEmptyState("No news items found yet.");
            return;
        }

        var cards = rows.map(function (item, index) {
            var newsId = Number(item && item.id);
            if (!Number.isInteger(newsId) || newsId <= 0) {
                return "";
            }

            var title = escapeHtml(item && item.title);
            var content = escapeHtml(item && item.content);
            var imageUrl = normalizeNewsUrl(item && item.imageUrl);
            var contentLink = normalizeNewsUrl(item && item.contentLink);
            var linkUrl = contentLink;
            var linkText = linkUrl
                ? String(linkUrl).replace(/^https?:\/\//i, "")
                : "-";
            var dateParts = formatDateTimeParts(item && (item.updatedAt || item.createdAt));
            var sequence = Number(item && item.sequence);
            if (!Number.isInteger(sequence) || sequence < 1) {
                sequence = index + 1;
            }
            var sequenceOptions = buildSequenceOptions(rows.length, sequence);
            var imageIsPdf = isPdfNewsUrl(imageUrl);
            var fileName = getNewsFileNameFromUrl(imageUrl) || "Open file";
            var imageHtml = imageUrl
                ? (
                    imageIsPdf
                        ? (
                            '<div class="news-item-media">' +
                                '<a class="news-item-image-link news-item-file-link" href="' + escapeHtml(imageUrl) + '" target="_blank" rel="noopener noreferrer">' +
                                    '<span class="news-item-file-badge">PDF</span>' +
                                    '<span class="news-item-file-name">' + escapeHtml(fileName) + "</span>" +
                                "</a>" +
                            "</div>"
                        )
                        : (
                            '<div class="news-item-media">' +
                                '<a class="news-item-image-link" href="' + escapeHtml(imageUrl) + '" target="_blank" rel="noopener noreferrer">' +
                                    '<img class="news-item-image" src="' + escapeHtml(imageUrl) + '" alt="' + title + ' image" loading="lazy">' +
                                "</a>" +
                            "</div>"
                        )
                )
                : '<div class="news-item-media news-item-media-empty"><span class="news-item-image-empty">No media</span></div>';

            var linkHtml = linkUrl
                ? (
                    '<a class="news-item-link-text" href="' + escapeHtml(linkUrl) + '" target="_blank" rel="noopener noreferrer" title="' + escapeHtml(linkUrl) + '">' +
                        escapeHtml(linkText) +
                    "</a>"
                )
                : '<span class="news-item-link-text news-item-link-empty">-</span>';

            return (
                '<article class="news-item-card" data-news-id="' + String(newsId) + '">' +
                    '<div class="news-item-col news-item-col-sno" data-label="S. No.">' + String(index + 1) + ".</div>" +
                    '<div class="news-item-col news-item-col-news" data-label="News">' +
                        '<h3 class="news-item-title">' + title + "</h3>" +
                        '<p class="news-item-content">' + content + "</p>" +
                    "</div>" +
                    '<div class="news-item-col news-item-col-link" data-label="Link">' +
                        linkHtml +
                        imageHtml +
                    "</div>" +
                    '<div class="news-item-col news-item-col-date" data-label="Date/Time">' +
                        '<span class="news-item-date">' + escapeHtml(dateParts.date) + "</span>" +
                        '<span class="news-item-time">' + escapeHtml(dateParts.time) + "</span>" +
                    "</div>" +
                    '<div class="news-item-col news-item-col-actions" data-label="Order/Action">' +
                        '<div class="news-item-actions">' +
                            '<div class="news-sequence-controls">' +
                                '<select class="form-select form-select-sm news-sequence-select">' +
                                    sequenceOptions +
                                "</select>" +
                                '<button class="btn btn-outline-secondary btn-sm btn-news-sequence" type="button" data-news-id="' + String(newsId) + '">Change</button>' +
                            "</div>" +
                            '<div class="news-action-buttons">' +
                                '<button class="btn btn-outline-primary btn-sm btn-news-edit" type="button" data-news-id="' + String(newsId) + '">Edit</button>' +
                                '<button class="btn btn-outline-danger btn-sm btn-news-delete" type="button" data-news-id="' + String(newsId) + '">Delete</button>' +
                            "</div>" +
                        "</div>" +
                    "</div>" +
                "</article>"
            );
        }).join("");

        var head =
            '<div class="news-list-head">' +
                "<span>S. No.</span>" +
                "<span>News</span>" +
                "<span>Link</span>" +
                "<span>Date/Time</span>" +
                "<span>Order/Action</span>" +
            "</div>";

        if (!cards) {
            renderNewsEmptyState("No news items found yet.");
            return;
        }

        newsListWrap.html(head + cards);
    };

    var loadNewsItems = function () {
        if (!tokenValid()) {
            setNewsPauseState(false);
            renderNewsEmptyState("Login required to manage news.");
            return;
        }

        $.ajax({
            url: "/admin/news-items",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                setNewsPauseState(Boolean(response && response.paused));
                renderNewsItems((response && response.items) || []);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load news items.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                renderNewsEmptyState(msg);
                showAlert(msg, "danger");
            },
        });
    };

    var formatBytes = function (value) {
        var bytes = Number(value || 0);
        if (!Number.isFinite(bytes) || bytes <= 0) {
            return "0 KB";
        }
        if (bytes < 1024) {
            return String(bytes) + " B";
        }
        if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(1) + " KB";
        }
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    var normalizeFolderName = function (value) {
        var normalized = String(value || "")
            .trim()
            .replace(/[^a-zA-Z0-9_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,39}$/.test(normalized)) {
            return "";
        }
        return normalized;
    };

    var folderKey = function (value) {
        return String(value || "").trim().toLowerCase();
    };

    var updateActiveGalleryFolderBadge = function () {
        if (!activeGalleryFolderBadge.length) {
            return;
        }

        if (!currentGalleryFolder) {
            activeGalleryFolderBadge.text("Folder: -");
            return;
        }

        activeGalleryFolderBadge.text("Folder: " + currentGalleryFolder);
    };

    var setGalleryFolderSequenceControls = function (folderNames, selectedFolder) {
        if (!galleryFolderSequenceWrap.length || !galleryFolderSequenceSelect.length) {
            return;
        }

        var names = Array.isArray(folderNames) ? folderNames.slice() : [];
        var selected = normalizeFolderName(selectedFolder);
        var selectedIndex = names.indexOf(selected);

        if (!selected || selectedIndex === -1 || names.length <= 1) {
            galleryFolderSequenceWrap.addClass("d-none");
            galleryFolderSequenceSelect.html("");
            return;
        }

        galleryFolderSequenceSelect.html(buildSequenceOptions(names.length, selectedIndex + 1));
        galleryFolderSequenceWrap.removeClass("d-none");
    };

    var renderGalleryFolderCards = function (folders, preferredFolder) {
        var list = Array.isArray(folders) ? folders : [];
        if (!list.length) {
            currentGalleryFolder = "";
            showOnlySelectedGalleryFolder = false;
            currentGalleryFolderOrder = [];
            updateActiveGalleryFolderBadge();
            setGalleryFolderSequenceControls([], "");
            if (showAllGalleryFoldersBtn.length) {
                showAllGalleryFoldersBtn.addClass("d-none");
            }
            galleryFolderCardGrid.html(
                '<div class="col-12"><div class="banner-empty-state">No folders found.</div></div>'
            );
            return false;
        }

        var normalizedCards = list.map(function (item) {
            var name = normalizeFolderName(item && item.name);
            return {
                name: name,
                imageCount: Number(item && item.imageCount) || 0,
                coverPath: String((item && item.coverPath) || ""),
            };
        }).filter(function (item) {
            return Boolean(item.name);
        });

        if (!normalizedCards.length) {
            currentGalleryFolder = "";
            showOnlySelectedGalleryFolder = false;
            currentGalleryFolderOrder = [];
            updateActiveGalleryFolderBadge();
            setGalleryFolderSequenceControls([], "");
            if (showAllGalleryFoldersBtn.length) {
                showAllGalleryFoldersBtn.addClass("d-none");
            }
            galleryFolderCardGrid.html(
                '<div class="col-12"><div class="banner-empty-state">No folders found.</div></div>'
            );
            return false;
        }

        var selected = normalizeFolderName(preferredFolder);
        var exists = normalizedCards.some(function (item) {
            return item.name === selected;
        });
        if (!selected || !exists) {
            selected = "";
        }

        currentGalleryFolderOrder = normalizedCards.map(function (item) {
            return item.name;
        });
        currentGalleryFolder = selected;
        updateActiveGalleryFolderBadge();
        setGalleryFolderSequenceControls(currentGalleryFolderOrder, selected);

        var cardsToRender = normalizedCards;
        if (showOnlySelectedGalleryFolder && selected) {
            cardsToRender = normalizedCards.filter(function (item) {
                return item.name === selected;
            });
            if (!cardsToRender.length) {
                showOnlySelectedGalleryFolder = false;
                cardsToRender = normalizedCards;
            }
        } else {
            showOnlySelectedGalleryFolder = false;
        }

        if (showAllGalleryFoldersBtn.length) {
            showAllGalleryFoldersBtn.toggleClass("d-none", !(showOnlySelectedGalleryFolder && Boolean(selected)));
        }

        var cardsHtml = cardsToRender.map(function (item) {
            var activeClass = item.name === selected ? " is-active" : "";
            var coverMarkup = item.coverPath
                ? '<img src="' + item.coverPath + '" alt="' + escapeHtml(item.name) + ' cover">'
                : '<span class="gallery-folder-placeholder">No Image</span>';

            return (
                '<div class="col-sm-6 col-md-4 col-xl-3">' +
                    '<button class="gallery-folder-card' + activeClass + '" type="button" data-folder-name="' + item.name + '">' +
                        '<span class="gallery-folder-cover">' + coverMarkup + "</span>" +
                        '<span class="gallery-folder-info">' +
                            '<span class="gallery-folder-name">' + escapeHtml(item.name) + "</span>" +
                            '<span class="gallery-folder-count">' + String(item.imageCount) + " image(s)</span>" +
                        "</span>" +
                    "</button>" +
                "</div>"
            );
        }).join("");

        galleryFolderCardGrid.html(cardsHtml);
        return true;
    };

    var loadGalleryFolderCards = function (preferredFolder) {
        if (!tokenValid()) {
            currentGalleryFolderOrder = [];
            setGalleryFolderSequenceControls([], "");
            renderGalleryImageEmptyState("Login required to manage image folder.");
            return;
        }

        $.ajax({
            url: "/admin/gallery-folder-cards",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                var folders = (response && response.folders) || [];
                var targetFolder = preferredFolder || currentGalleryFolder;
                var hasFolder = renderGalleryFolderCards(folders, targetFolder);
                if (hasFolder && currentGalleryFolder) {
                    loadGalleryImages();
                } else {
                    renderGalleryImageEmptyState("No folder selected.");
                }
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load folder list.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                galleryFolderCardGrid.html(
                    '<div class="col-12"><div class="banner-empty-state">' + escapeHtml(msg) + "</div></div>"
                );
                currentGalleryFolderOrder = [];
                setGalleryFolderSequenceControls([], "");
                renderGalleryImageEmptyState(msg);
            },
        });
    };

    var renderGalleryImages = function (items) {
        if (!Array.isArray(items) || !items.length) {
            renderGalleryImageEmptyState("No images found in /images/gallery/" + currentGalleryFolder + ".");
            return;
        }

        var cacheBust = Date.now();
        var cards = items.map(function (item) {
            var fileName = String((item && item.name) || "");
            if (!fileName) {
                return "";
            }
            var imagePath = String((item && item.path) || "");
            var sizeText = formatBytes(item && item.size);
            var createdAt = formatDateTime(item && item.createdAt);

            return (
                '<div class="col-sm-6 col-lg-4 col-xl-3">' +
                    '<article class="gallery-image-card" data-file-name="' + fileName + '">' +
                        '<div class="gallery-image-preview">' +
                            '<img src="' + imagePath + "?v=" + cacheBust + '" alt="' + escapeHtml(fileName) + '">' +
                        "</div>" +
                        '<div class="gallery-image-body">' +
                            '<p class="gallery-image-name" title="' + escapeHtml(fileName) + '">' + escapeHtml(fileName) + "</p>" +
                            '<p class="gallery-image-meta">' + escapeHtml(createdAt) + " | " + escapeHtml(sizeText) + "</p>" +
                            '<button class="btn btn-outline-danger btn-sm btn-gallery-remove" type="button" data-file-name="' + fileName + '">Delete</button>' +
                        "</div>" +
                    "</article>" +
                "</div>"
            );
        }).join("");

        galleryImageGrid.html(cards || '<div class="col-12"><div class="banner-empty-state">No images found in /images/gallery.</div></div>');
    };

    var loadGalleryImages = function () {
        if (!tokenValid()) {
            renderGalleryImageEmptyState("Login required to manage image folder.");
            return;
        }
        var folderName = normalizeFolderName(currentGalleryFolder);
        if (!folderName) {
            updateActiveGalleryFolderBadge();
            renderGalleryImageEmptyState("No folder selected.");
            return;
        }

        currentGalleryFolder = folderName;
        updateActiveGalleryFolderBadge();

        $.ajax({
            url: "/admin/gallery-images?folder=" + encodeURIComponent(folderName),
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                var serverFolder = normalizeFolderName(response && response.folder);
                if (serverFolder) {
                    currentGalleryFolder = serverFolder;
                }
                updateActiveGalleryFolderBadge();
                renderGalleryImages((response && response.images) || []);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load image folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                renderGalleryImageEmptyState(msg);
                showAlert(msg, "danger");
            },
        });
    };

    var updateActiveVideoFolderBadge = function () {
        if (!activeVideoFolderBadge.length) {
            return;
        }

        if (!currentVideoFolder) {
            activeVideoFolderBadge.text("Folder: -");
            return;
        }

        activeVideoFolderBadge.text("Folder: " + currentVideoFolder);
    };

    var setVideoFolderSequenceControls = function (folderNames, selectedFolder) {
        if (!videoFolderSequenceWrap.length || !videoFolderSequenceSelect.length) {
            return;
        }

        var names = Array.isArray(folderNames) ? folderNames.slice() : [];
        var selected = normalizeFolderName(selectedFolder);
        var selectedIndex = names.indexOf(selected);

        if (!selected || selectedIndex === -1 || names.length <= 1) {
            videoFolderSequenceWrap.addClass("d-none");
            videoFolderSequenceSelect.html("");
            return;
        }

        videoFolderSequenceSelect.html(buildSequenceOptions(names.length, selectedIndex + 1));
        videoFolderSequenceWrap.removeClass("d-none");
    };

    var renderVideoFolderCards = function (folders, preferredFolder) {
        var list = Array.isArray(folders) ? folders : [];
        if (!list.length) {
            currentVideoFolder = "";
            currentVideoFolderOrder = [];
            updateActiveVideoFolderBadge();
            setVideoFolderSequenceControls([], "");
            videoFolderCardGrid.html(
                '<div class="col-12"><div class="banner-empty-state">No folders found.</div></div>'
            );
            return false;
        }

        var normalizedCards = list.map(function (item) {
            var name = normalizeFolderName(item && item.name);
            return {
                name: name,
                videoCount: Number(item && item.videoCount) || 0,
                coverPath: String((item && item.coverPath) || ""),
            };
        }).filter(function (item) {
            return Boolean(item.name);
        });

        if (!normalizedCards.length) {
            currentVideoFolder = "";
            currentVideoFolderOrder = [];
            updateActiveVideoFolderBadge();
            setVideoFolderSequenceControls([], "");
            videoFolderCardGrid.html(
                '<div class="col-12"><div class="banner-empty-state">No folders found.</div></div>'
            );
            return false;
        }

        var selected = normalizeFolderName(preferredFolder);
        var exists = normalizedCards.some(function (item) {
            return item.name === selected;
        });
        if (!selected || !exists) {
            selected = normalizedCards[0].name;
        }

        currentVideoFolder = selected;
        currentVideoFolderOrder = normalizedCards.map(function (item) {
            return item.name;
        });
        updateActiveVideoFolderBadge();
        setVideoFolderSequenceControls(currentVideoFolderOrder, selected);

        var cardsHtml = normalizedCards.map(function (item) {
            var activeClass = item.name === selected ? " is-active" : "";
            var coverMarkup = item.coverPath
                ? '<video src="' + item.coverPath + '" muted playsinline preload="metadata"></video>'
                : '<span class="gallery-folder-placeholder">No Video</span>';

            return (
                '<div class="col-sm-6 col-md-4 col-xl-3">' +
                    '<button class="gallery-folder-card gallery-folder-card-video' + activeClass + '" type="button" data-folder-name="' + item.name + '">' +
                        '<span class="gallery-folder-cover gallery-folder-cover-video">' + coverMarkup + "</span>" +
                        '<span class="gallery-folder-info">' +
                            '<span class="gallery-folder-name">' + escapeHtml(item.name) + "</span>" +
                            '<span class="gallery-folder-count">' + String(item.videoCount) + " video(s)</span>" +
                        "</span>" +
                    "</button>" +
                "</div>"
            );
        }).join("");

        videoFolderCardGrid.html(cardsHtml);
        return true;
    };

    var loadVideoFolderCards = function (preferredFolder) {
        if (!tokenValid()) {
            currentVideoFolderOrder = [];
            setVideoFolderSequenceControls([], "");
            renderVideoFileEmptyState("Login required to manage video folder.");
            return;
        }

        $.ajax({
            url: "/admin/video-folder-cards",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                var folders = (response && response.folders) || [];
                var targetFolder = preferredFolder || currentVideoFolder;
                var hasFolder = renderVideoFolderCards(folders, targetFolder);
                if (hasFolder) {
                    loadVideoFiles();
                } else {
                    renderVideoFileEmptyState("No folder selected.");
                }
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load video folder list.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                videoFolderCardGrid.html(
                    '<div class="col-12"><div class="banner-empty-state">' + escapeHtml(msg) + "</div></div>"
                );
                currentVideoFolderOrder = [];
                setVideoFolderSequenceControls([], "");
                renderVideoFileEmptyState(msg);
            },
        });
    };

    var renderVideoFiles = function (items) {
        if (!Array.isArray(items) || !items.length) {
            renderVideoFileEmptyState("No videos found in /videos/gallery/" + currentVideoFolder + ".");
            return;
        }

        var cacheBust = Date.now();
        var cards = items.map(function (item) {
            var fileName = String((item && item.name) || "");
            if (!fileName) {
                return "";
            }
            var videoPath = String((item && item.path) || "");
            var sizeText = formatBytes(item && item.size);
            var createdAt = formatDateTime(item && item.createdAt);
            var previewPath = videoPath + "?v=" + cacheBust;

            return (
                '<div class="col-sm-6 col-lg-4 col-xl-3">' +
                    '<article class="gallery-image-card" data-video-name="' + fileName + '">' +
                        '<div class="gallery-image-preview gallery-video-preview">' +
                            '<video src="' + previewPath + '" controls preload="metadata" playsinline></video>' +
                        "</div>" +
                        '<div class="gallery-image-body">' +
                            '<p class="gallery-image-name" title="' + escapeHtml(fileName) + '">' + escapeHtml(fileName) + "</p>" +
                            '<p class="gallery-image-meta">' + escapeHtml(createdAt) + " | " + escapeHtml(sizeText) + "</p>" +
                            '<button class="btn btn-outline-danger btn-sm btn-video-remove" type="button" data-file-name="' + fileName + '">Delete</button>' +
                        "</div>" +
                    "</article>" +
                "</div>"
            );
        }).join("");

        videoFileGrid.html(cards || '<div class="col-12"><div class="banner-empty-state">No videos found in /videos/gallery.</div></div>');
    };

    var updateActivePortfolioFolderBadge = function () {
        if (!activePortfolioFolderBadge.length) return;
        if (!currentPortfolioFolder) {
            activePortfolioFolderBadge.text("Folder: -");
            return;
        }
        activePortfolioFolderBadge.text("Folder: " + currentPortfolioFolder);
    };

    var renderPortfolioFolderCards = function (folders, preferredFolder) {
        var list = Array.isArray(folders) ? folders : [];
        if (!list.length) {
            currentPortfolioFolder = "";
            updateActivePortfolioFolderBadge();
            portfolioFolderCardGrid.html('<div class="col-12"><div class="banner-empty-state">No folders found.</div></div>');
            return false;
        }
        
        var normalizedCards = list.map(function (item) {
            var name = normalizeFolderName(item && item.name);
            return {
                name: name,
                fileCount: Number(item && item.fileCount) || 0,
                coverPath: String((item && item.coverPath) || ""),
                coverType: String((item && item.coverType) || "")
            };
        }).filter(function (item) { return Boolean(item.name); });

        if (!normalizedCards.length) {
            currentPortfolioFolder = "";
            updateActivePortfolioFolderBadge();
            portfolioFolderCardGrid.html('<div class="col-12"><div class="banner-empty-state">No folders found.</div></div>');
            return false;
        }
        
        var selected = normalizeFolderName(preferredFolder);
        var exists = normalizedCards.some(function (item) { return item.name === selected; });
        if (!selected || !exists) {
            selected = normalizedCards[0].name;
        }
        
        currentPortfolioFolder = selected;
        updateActivePortfolioFolderBadge();
        
        var cardsHtml = normalizedCards.map(function (item) {
            var activeClass = item.name === selected ? " is-active" : "";
            var coverMarkup = '<span class="gallery-folder-placeholder">No Media</span>';
            if (item.coverPath) {
                if (item.coverType === "video") {
                    coverMarkup = '<video src="' + item.coverPath + '" muted playsinline preload="metadata"></video>';
                } else {
                    coverMarkup = '<img src="' + item.coverPath + '" alt="' + escapeHtml(item.name) + ' cover">';
                }
            }
            
            return (
                '<div class="col-sm-6 col-md-4 col-xl-3">' +
                    '<button class="gallery-folder-card gallery-folder-card-portfolio' + activeClass + '" type="button" data-folder-name="' + item.name + '">' +
                        '<span class="gallery-folder-cover">' + coverMarkup + '</span>' +
                        '<span class="gallery-folder-info">' +
                            '<span class="gallery-folder-name">' + escapeHtml(item.name) + '</span>' +
                            '<span class="gallery-folder-count">' + String(item.fileCount) + ' file(s)</span>' +
                        '</span>' +
                    '</button>' +
                '</div>'
            );
        }).join("");
        
        portfolioFolderCardGrid.html(cardsHtml);
        return true;
    };

    var renderPortfolioFileEmptyState = function(msg) {
        portfolioFileGrid.html('<div class="col-12"><div class="banner-empty-state">' + escapeHtml(msg) + '</div></div>');
    };

    var loadPortfolioFolderCards = function (preferredFolder) {
        if (!tokenValid()) {
            renderPortfolioFileEmptyState("Login required to manage portfolio folders.");
            return;
        }
        
        currentPortfolioCategory = portfolioCategorySelect.val() || "printing";
        
        $.ajax({
            url: "/admin/portfolio-folders?category=" + encodeURIComponent(currentPortfolioCategory),
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                var folders = (response && response.folders) || [];
                var targetFolder = preferredFolder || currentPortfolioFolder;
                var hasFolder = renderPortfolioFolderCards(folders, targetFolder);
                if (hasFolder) {
                    loadPortfolioFiles();
                } else {
                    renderPortfolioFileEmptyState("No folder selected.");
                }
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) return;
                var msg = "Unable to load folder list.";
                if (xhr.responseJSON && xhr.responseJSON.message) msg = xhr.responseJSON.message;
                showAlert(msg, "danger");
                portfolioFolderCardGrid.html('<div class="col-12"><div class="banner-empty-state">' + escapeHtml(msg) + '</div></div>');
                renderPortfolioFileEmptyState(msg);
            }
        });
    };

    portfolioCategorySelect.on("change", function() {
        currentPortfolioFolder = "";
        loadPortfolioFolderCards("");
    });

    var renderPortfolioFiles = function (items) {
        if (!Array.isArray(items) || !items.length) {
            renderPortfolioFileEmptyState("No files found in this folder.");
            return;
        }
        
        var cacheBust = Date.now();
        var cards = items.map(function (item) {
            var fileName = String((item && item.name) || "");
            if (!fileName) return "";
            
            var filePath = String((item && item.path) || "");
            var sizeText = formatBytes(item && item.size);
            var createdAt = formatDateTime(item && item.createdAt);
            var isVideo = fileName.toLowerCase().endsWith(".mp4");
            var previewUrl = filePath + "?v=" + cacheBust;
            
            var mediaHtml = isVideo
                ? '<video src="' + previewUrl + '" controls preload="metadata" playsinline></video>'
                : '<img src="' + previewUrl + '" alt="' + escapeHtml(fileName) + '">';
                
            return (
                '<div class="col-sm-6 col-lg-4 col-xl-3">' +
                    '<article class="gallery-image-card" data-file-name="' + fileName + '">' +
                        '<div class="gallery-image-preview' + (isVideo ? ' gallery-video-preview' : '') + '">' + mediaHtml + '</div>' +
                        '<div class="gallery-image-body">' +
                            '<p class="gallery-image-name" title="' + escapeHtml(fileName) + '">' + escapeHtml(fileName) + '</p>' +
                            '<p class="gallery-image-meta">' + escapeHtml(createdAt) + ' | ' + escapeHtml(sizeText) + '</p>' +
                            '<button class="btn btn-outline-danger btn-sm btn-portfolio-remove" type="button" data-file-name="' + fileName + '">Delete</button>' +
                        '</div>' +
                    '</article>' +
                '</div>'
            );
        }).join("");
        
        portfolioFileGrid.html(cards || '<div class="col-12"><div class="banner-empty-state">No files found.</div></div>');
    };

    var loadPortfolioFiles = function () {
        if (!tokenValid()) {
            renderPortfolioFileEmptyState("Login required to manage portfolio folder.");
            return;
        }
        var folderName = normalizeFolderName(currentPortfolioFolder);
        if (!folderName) {
            updateActivePortfolioFolderBadge();
            renderPortfolioFileEmptyState("No folder selected.");
            return;
        }
        
        $.ajax({
            url: "/admin/portfolio-files?category=" + encodeURIComponent(currentPortfolioCategory) + "&folder=" + encodeURIComponent(folderName),
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                var serverFolder = normalizeFolderName(response && response.folder);
                if (serverFolder) currentPortfolioFolder = serverFolder;
                updateActivePortfolioFolderBadge();
                renderPortfolioFiles((response && response.files) || []);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) return;
                var msg = "Unable to load files.";
                if (xhr.responseJSON && xhr.responseJSON.message) msg = xhr.responseJSON.message;
                renderPortfolioFileEmptyState(msg);
                showAlert(msg, "danger");
            }
        });
    };

    var renderAnalyticsTrendLine = function () {
        if (dashboardAnalyticsChart) {
            dashboardAnalyticsChart.resize();
        }
    };


    var loadVideoFiles = function () {
        if (!tokenValid()) {
            renderVideoFileEmptyState("Login required to manage video folder.");
            return;
        }
        var folderName = normalizeFolderName(currentVideoFolder);
        if (!folderName) {
            updateActiveVideoFolderBadge();
            renderVideoFileEmptyState("No folder selected.");
            return;
        }

        currentVideoFolder = folderName;
        updateActiveVideoFolderBadge();

        $.ajax({
            url: "/admin/video-files?folder=" + encodeURIComponent(folderName),
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                var serverFolder = normalizeFolderName(response && response.folder);
                if (serverFolder) {
                    currentVideoFolder = serverFolder;
                }
                updateActiveVideoFolderBadge();
                renderVideoFiles((response && response.videos) || []);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load video folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                renderVideoFileEmptyState(msg);
                showAlert(msg, "danger");
            },
        });
    };

    var coerceAnalyticsCount = function (value) {
        var num = Number(value);
        if (!Number.isFinite(num) || num < 0) {
            return 0;
        }
        return Math.round(num);
    };

    var normalizeAnalyticsPayload = function (payload) {
        var source = payload && typeof payload === "object" ? payload : {};
        var imageFiles = source.imageFiles != null ? source.imageFiles : source.images;
        var videoFiles = source.videoFiles != null ? source.videoFiles : source.videos;
        return {
            videos: coerceAnalyticsCount(source.videos != null ? source.videos : videoFiles),
            images: coerceAnalyticsCount(source.images != null ? source.images : imageFiles),
            slider: coerceAnalyticsCount(source.slider),
            news: coerceAnalyticsCount(source.news),
            enquiries: coerceAnalyticsCount(source.enquiries),
            imageFolders: coerceAnalyticsCount(source.imageFolders),
            imageFiles: coerceAnalyticsCount(imageFiles),
            videoFolders: coerceAnalyticsCount(source.videoFolders),
            videoFiles: coerceAnalyticsCount(videoFiles),
        };
    };

    var analyticsPalette = [
        { key: "videos", label: "Videos", className: "solid", color: "#2ad7b5" },
        { key: "images", label: "Images", className: "mid", color: "#9066ff" },
        { key: "slider", label: "Slider", className: "dark", color: "#b31217" },
        { key: "news", label: "News", className: "striped", color: "#ff8e3b" },
        { key: "enquiries", label: "Enquiries", className: "accent", color: "#f43f5e" },
    ];

    var buildAnalyticsItems = function (payload) {
        var normalized = normalizeAnalyticsPayload(payload);
        return analyticsPalette.map(function (item) {
            return {
                key: item.key,
                label: item.label,
                value: normalized[item.key],
                className: item.className,
                color: item.color,
            };
        });
    };

    var generateRandomAnalytics = function () {
        var randomBetween = function (min, max) {
            return Math.floor(min + Math.random() * (max - min + 1));
        };

        var images = randomBetween(12, 96);
        var videos = randomBetween(6, 60);
        var imageFolders = Math.max(1, Math.round(images / 12));
        var videoFolders = Math.max(1, Math.round(videos / 10));

        return {
            videos: videos,
            images: images,
            slider: randomBetween(4, 36),
            news: randomBetween(5, 42),
            enquiries: randomBetween(3, 50),
            imageFolders: imageFolders,
            imageFiles: images,
            videoFolders: videoFolders,
            videoFiles: videos,
        };
    };

    var updateMetricDelta = function (element, delta) {
        if (!element || !element.length) {
            return;
        }
        var value = Number(delta) || 0;
        var text = value === 0
            ? "No change"
            : "Change: " + (value > 0 ? "+" : "") + String(value);
        element
            .removeClass("is-up is-down is-flat")
            .addClass(value > 0 ? "is-up" : value < 0 ? "is-down" : "is-flat")
            .text(text);
    };

    var ensureAnalyticsChart = function (seedData) {
        if (dashboardAnalyticsChart || !dashboardAnalyticsChartEl || typeof Chart === "undefined") {
            return;
        }

        var items = buildAnalyticsItems(seedData || dashboardMetrics);
        var ctx = dashboardAnalyticsChartEl.getContext("2d");
        dashboardAnalyticsChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: items.map(function (item) {
                    return item.label;
                }),
                datasets: [{
                    label: "Records",
                    data: items.map(function (item) {
                        return item.value;
                    }),
                    backgroundColor: items.map(function (item) {
                        return item.color;
                    }),
                    borderColor: items.map(function (item) {
                        return item.color;
                    }),
                    borderWidth: 1.2,
                    borderRadius: 12,
                    borderSkipped: false,
                    maxBarThickness: 46,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 900,
                    easing: "easeOutQuart",
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        backgroundColor: "#0f172a",
                        titleColor: "#f8fafc",
                        bodyColor: "#e2e8f0",
                        padding: 12,
                        displayColors: false,
                    },
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                        },
                        ticks: {
                            color: "#475569",
                            font: {
                                weight: "600",
                            },
                        },
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: "#64748b",
                            precision: 0,
                        },
                        grid: {
                            color: "rgba(15, 23, 42, 0.08)",
                        },
                    },
                },
            },
        });
    };

    var updateAnalyticsChart = function (items) {
        if (!dashboardAnalyticsChart) {
            ensureAnalyticsChart(items.reduce(function (acc, item) {
                acc[item.key] = item.value;
                return acc;
            }, {}));
        }
        if (!dashboardAnalyticsChart) {
            return;
        }

        dashboardAnalyticsChart.data.labels = items.map(function (item) {
            return item.label;
        });
        dashboardAnalyticsChart.data.datasets[0].data = items.map(function (item) {
            return item.value;
        });
        dashboardAnalyticsChart.data.datasets[0].backgroundColor = items.map(function (item) {
            return item.color;
        });
        dashboardAnalyticsChart.data.datasets[0].borderColor = items.map(function (item) {
            return item.color;
        });
        dashboardAnalyticsChart.update();
    };

    var updateAnalyticsStats = function (items) {
        if (!dashboardAnalyticsStats.length) {
            return;
        }

        var total = items.reduce(function (sum, item) {
            return sum + (Number(item.value) || 0);
        }, 0);

        var statsHtml = items.map(function (item) {
            var ratio = total > 0 ? item.value / total : 0;
            var pctText = (ratio * 100).toFixed(1).replace(/\.0$/, "");
            return (
                '<div class="analytics-stat-row">' +
                    '<span class="analytics-stat-label"><i class="analytics-stat-dot ' +
                        item.className +
                        '"></i>' +
                        escapeHtml(item.label) +
                    "</span>" +
                    '<strong class="analytics-stat-value">' + pctText + "%</strong>" +
                "</div>"
            );
        }).join("");

        dashboardAnalyticsStats.html(statsHtml);
    };

    var renderDashboardMetrics = function (previousData) {
        var current = normalizeAnalyticsPayload(dashboardMetrics);
        var previous = normalizeAnalyticsPayload(previousData || current);
        var items = buildAnalyticsItems(current);
        var total = items.reduce(function (sum, item) {
            return sum + (Number(item.value) || 0);
        }, 0);

        if (dashboardTotalProjects.length) {
            dashboardTotalProjects.text(String(total));
        }

        dashboardEndedProjects.text(String(current.slider));
        dashboardPhotoFolders.text(String(current.imageFiles));
        dashboardVideoFolders.text(String(current.videoFiles));
        dashboardEnquiryQueue.text(String(current.enquiries));
        dashboardNewsCount.text(String(current.news));

        updateMetricDelta(dashboardSliderDelta, current.slider - previous.slider);
        if (dashboardPhotoCount.length) {
            dashboardPhotoCount.text("Photo folders: " + String(current.imageFolders));
        }
        if (dashboardVideoCount.length) {
            dashboardVideoCount.text("Video folders: " + String(current.videoFolders));
        }
        updateMetricDelta(dashboardPhotoDelta, current.imageFiles - previous.imageFiles);
        updateMetricDelta(dashboardVideoDelta, current.videoFiles - previous.videoFiles);
        updateMetricDelta(dashboardEnquiriesDelta, current.enquiries - previous.enquiries);
        updateMetricDelta(dashboardNewsDelta, current.news - previous.news);

        updateAnalyticsChart(items);
        updateAnalyticsStats(items);
    };

    var resetDashboardMetrics = function () {
        dashboardMetrics = {
            videos: 0,
            images: 0,
            slider: 0,
            news: 0,
            enquiries: 0,
            imageFolders: 0,
            imageFiles: 0,
            videoFolders: 0,
            videoFiles: 0,
        };
        lastAnalyticsSnapshot = null;
        renderDashboardMetrics(dashboardMetrics);
    };

    var fetchAnalyticsData = function () {
        var headers = {};
        if (tokenValid()) {
            headers = getAuthHeaders();
        }

        return fetch("/analytics", { method: "GET", headers: headers, cache: "no-store" })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Analytics request failed.");
                }
                return response.json();
            })
            .then(function (payload) {
                return normalizeAnalyticsPayload(payload);
            });
    };

    var loadDashboardMetrics = function () {
        if (!tokenValid()) {
            resetDashboardMetrics();
            return;
        }

        if (!dashboardAnalyticsChart) {
            ensureAnalyticsChart(generateRandomAnalytics());
        }

        fetchAnalyticsData()
            .then(function (payload) {
                var previous = lastAnalyticsSnapshot;
                dashboardMetrics = normalizeAnalyticsPayload(payload);
                renderDashboardMetrics(previous);
                lastAnalyticsSnapshot = dashboardMetrics;
            })
            .catch(function () {
                if (!lastAnalyticsSnapshot) {
                    dashboardMetrics = normalizeAnalyticsPayload(generateRandomAnalytics());
                    renderDashboardMetrics();
                    lastAnalyticsSnapshot = dashboardMetrics;
                }
            });
    };

    var startAnalyticsAutoRefresh = function () {
        if (analyticsRefreshTimer) {
            window.clearInterval(analyticsRefreshTimer);
        }
        loadDashboardMetrics();
        analyticsRefreshTimer = window.setInterval(function () {
            if (currentView === "dashboard") {
                loadDashboardMetrics();
            }
        }, 5000);
    };

    var stopAnalyticsAutoRefresh = function () {
        if (analyticsRefreshTimer) {
            window.clearInterval(analyticsRefreshTimer);
            analyticsRefreshTimer = null;
        }
    };

    var startDashboardClock = function () {
        if (!dashboardLiveClock.length) {
            return;
        }
        if (dashboardClockTimer) {
            window.clearInterval(dashboardClockTimer);
        }

        var updateClock = function () {
            var now = new Date();
            var hh = String(now.getHours()).padStart(2, "0");
            var mm = String(now.getMinutes()).padStart(2, "0");
            var ss = String(now.getSeconds()).padStart(2, "0");
            dashboardLiveClock.text(hh + ":" + mm + ":" + ss);
        };

        updateClock();
        dashboardClockTimer = window.setInterval(updateClock, 1000);
    };

    var updateViewQuery = function (view) {
        if (!window.history || !window.history.replaceState) {
            return;
        }
        var url = new URL(window.location.href);
        if (view === "dashboard") {
            url.searchParams.delete("view");
        } else if (view === "banners" || view === "enquiries" || view === "portfolio" || view === "news" || view === "images" || view === "videos") {
            url.searchParams.set("view", view);
        } else {
            url.searchParams.delete("view");
        }
        window.history.replaceState(null, "", url.pathname + url.search);
    };

    var isMobileSidebar = function () {
        if (mobileSidebarQuery) {
            return mobileSidebarQuery.matches;
        }
        return window.innerWidth <= 992;
    };

    var closeSidebarMenu = function () {
        sidebar.removeClass("is-open");
        sidebarMenuToggle.attr("aria-expanded", "false");
    };

    var toggleSidebarMenu = function (forceOpen) {
        if (!isMobileSidebar()) {
            closeSidebarMenu();
            return;
        }
        var shouldOpen = typeof forceOpen === "boolean"
            ? forceOpen
            : !sidebar.hasClass("is-open");
        sidebar.toggleClass("is-open", shouldOpen);
        sidebarMenuToggle.attr("aria-expanded", shouldOpen ? "true" : "false");
    };

    var setView = function (view, syncUrl) {
        var normalized = "dashboard";
        if (view === "dashboard" || view === "banners" || view === "enquiries" || view === "portfolio" || view === "news" || view === "images" || view === "videos") {
            normalized = view;
        }
        currentView = normalized;

        navViewLinks.removeClass("active");
        navViewLinks.filter("[data-admin-view='" + normalized + "']").addClass("active");

        dashboardSection.toggleClass("d-none", normalized !== "dashboard");
        bannersSection.toggleClass("d-none", normalized !== "banners");
        enquiriesSection.toggleClass("d-none", normalized !== "enquiries");
        portfolioSection.toggleClass("d-none", normalized !== "portfolio");
        newsSection.toggleClass("d-none", normalized !== "news");
        imagesSection.toggleClass("d-none", normalized !== "images");
        videosSection.toggleClass("d-none", normalized !== "videos");

        if (normalized === "dashboard") {
            hideAlert();
        }

        if (syncUrl) {
            updateViewQuery(normalized);
        }

        if (normalized === "dashboard") {
            startAnalyticsAutoRefresh();
        } else if (normalized === "enquiries") {
            stopAnalyticsAutoRefresh();
            loadEnquiries();
        } else if (normalized === "portfolio") {
            stopAnalyticsAutoRefresh();
            loadPortfolioFolderCards(currentPortfolioFolder);
        } else if (normalized === "news") {
            stopAnalyticsAutoRefresh();
            loadNewsItems();
        } else if (normalized === "images") {
            stopAnalyticsAutoRefresh();
            loadGalleryFolderCards(currentGalleryFolder);
        } else if (normalized === "videos") {
            stopAnalyticsAutoRefresh();
            loadVideoFolderCards(currentVideoFolder);
        } else {
            stopAnalyticsAutoRefresh();
            loadBanners();
        }
    };

    var getInitialView = function () {
        try {
            var url = new URL(window.location.href);
            var view = String(url.searchParams.get("view") || "");
            if (view === "dashboard" || view === "banners" || view === "enquiries" || view === "portfolio" || view === "news" || view === "images" || view === "videos") {
                return view;
            }
        } catch (error) {
            // Ignore URL parsing failures and fallback.
        }
        return "dashboard";
    };

    runAdminBootAnimation();
    startDashboardClock();
    refreshAdminIdentity();
    if (!ensureAuth()) {
        return;
    }
    setView(getInitialView(), false);
    closeSidebarMenu();

    sidebarMenuToggle.on("click", function () {
        toggleSidebarMenu();
    });

    $(window).on("resize", function () {
        if (!isMobileSidebar()) {
            closeSidebarMenu();
        }
        window.requestAnimationFrame(renderAnalyticsTrendLine);
    });

    $(document).on("keydown", function (event) {
        if (event && event.key === "Escape") {
            closeSidebarMenu();
        }
    });

    navViewLinks.on("click", function (event) {
        event.preventDefault();
        var view = String($(this).data("adminView") || "");
        if (!view) {
            return;
        }
        setView(view, true);
        closeSidebarMenu();
    });

    $(".password-toggle").on("click", function () {
        var target = $(this).data("target");
        if (!target) {
            return;
        }
        var input = document.querySelector(target);
        if (!input) {
            return;
        }
        var makeVisible = input.type === "password";
        input.type = makeVisible ? "text" : "password";
        $(this).toggleClass("is-visible", makeVisible);
    });

    $("#forgotLink").on("click", function () {
        if (loginModal) {
            loginModal.hide();
        }
        if (resetModal) {
            resetModal.show();
        }
    });

    sidebarPasswordLink.on("click", function (event) {
        event.preventDefault();
        closeSidebarMenu();
        if (loginModal) {
            loginModal.hide();
        }
        if (resetModal) {
            resetModal.show();
        }
    });

    if (resetModalEl) {
        $(resetModalEl).on("hidden.bs.modal", function () {
            resetError.removeClass("is-visible");
            resetHint.text("");
            if (!tokenValid()) {
                redirectToLogin();
            }
        });
    }

    $("#adminLoginForm").on("submit", function (event) {
        event.preventDefault();
        var username = String($(this).find("input[name='email']").val() || "").trim();
        var password = String($(this).find("input[name='pwd']").val() || "");

        $.ajax({
            url: "/admin/login",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ username: username, password: password }),
            success: function (response) {
                if (response && response.token) {
                    localStorage.setItem(TOKEN_KEY, response.token);
                    var expiresInMs = Number(response.expiresIn || 1800) * 1000;
                    localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + expiresInMs));
                    refreshAdminIdentity();
                    if (loginModal) {
                        loginModal.hide();
                    }
                    loginError.removeClass("is-visible");
                    $("#adminLoginForm")[0].reset();
                    setView(currentView, false);
                    return;
                }

                loginError.addClass("is-visible");
            },
            error: function (xhr) {
                var msg = "Invalid email or password.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                loginError.text(msg).addClass("is-visible");
            },
        });
    });

    $("#sendResetCode").on("click", function () {
        var sendButton = $(this);
        if (sendButton.prop("disabled")) {
            return;
        }
        var defaultLabel = sendButton.data("defaultLabel");
        if (!defaultLabel) {
            defaultLabel = sendButton.text();
            sendButton.data("defaultLabel", defaultLabel);
        }
        var email = $("#adminResetForm").find("input[name='email']").val().trim();
        resetError.removeClass("is-visible");
        resetHint.text("Sending reset code...");
        sendButton.prop("disabled", true).text("Sending...");

        $.ajax({
            url: "/admin/forgot-password",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ email: email }),
            success: function (response) {
                resetHint.text("Reset code sent to your email (valid 5 minutes).");
                showAlert(response.message || "Reset code sent.", "success");
            },
            error: function (xhr) {
                var msg = "Unable to generate reset code.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                resetError.text(msg).addClass("is-visible");
                resetHint.text("");
            },
            complete: function () {
                sendButton.prop("disabled", false).text(defaultLabel);
            },
        });
    });

    $("#adminResetForm").on("submit", function (event) {
        event.preventDefault();
        resetError.removeClass("is-visible");

        var email = $(this).find("input[name='email']").val().trim();
        var token = $(this).find("input[name='token']").val().trim();
        var newPassword = $(this).find("input[name='newPassword']").val();

        $.ajax({
            url: "/admin/reset-password",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ email: email, token: token, newPassword: newPassword }),
            success: function (response) {
                showAlert(response.message || "Password updated.", "success");
                if (resetModal) {
                    resetModal.hide();
                }
                if (loginModal) {
                    loginModal.show();
                }
                $("#adminResetForm")[0].reset();
                resetHint.text("");
            },
            error: function (xhr) {
                var msg = "Unable to reset password.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                resetError.text(msg).addClass("is-visible");
            },
        });
    });

    addCarouselBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }
        addCarouselInput.val("");
        addCarouselInput.trigger("click");
    });

    addCarouselInput.on("change", function () {
        var files = this.files ? Array.from(this.files) : [];
        if (!files.length) {
            return;
        }
        if (!ensureAuth()) {
            return;
        }
        if (files.length > 5) {
            showAlert("Please select up to 5 slider images at one time.", "danger");
            return;
        }

        var formData = new FormData();
        files.forEach(function (file) {
            formData.append("banners", file);
        });

        $.ajax({
            url: "/admin/carousel",
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "Carousel banner(s) added successfully.", "success");
                addCarouselInput.val("");
                loadBanners();
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to add carousel banner.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
        });
    });

    addGalleryImagesBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }
        addGalleryImagesInput.val("");
        addGalleryImagesInput.trigger("click");
    });

    addGalleryImagesInput.on("change", function () {
        var files = this.files ? Array.from(this.files) : [];
        if (!files.length) {
            return;
        }
        if (!ensureAuth()) {
            return;
        }

        var folderName = normalizeFolderName(currentGalleryFolder);
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }

        var formData = new FormData();
        formData.append("folder", folderName);
        files.forEach(function (file) {
            formData.append("images", file);
        });

        $.ajax({
            url: "/admin/gallery-images",
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "Images uploaded successfully.", "success");
                addGalleryImagesInput.val("");
                var serverFolder = normalizeFolderName(response && response.folder);
                if (serverFolder) {
                    currentGalleryFolder = serverFolder;
                }
                loadGalleryFolderCards(currentGalleryFolder);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to upload images.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
        });
    });

    galleryFolderCardGrid.on("click", ".gallery-folder-card", function () {
        var selected = normalizeFolderName($(this).data("folderName"));
        if (!selected) {
            showAlert("Invalid folder selected.", "danger");
            return;
        }
        currentGalleryFolder = selected;
        showOnlySelectedGalleryFolder = true;
        loadGalleryFolderCards(currentGalleryFolder);
    });

    showAllGalleryFoldersBtn.on("click", function () {
        showOnlySelectedGalleryFolder = false;
        loadGalleryFolderCards(currentGalleryFolder);
    });

    changeGalleryFolderSequenceBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }

        var folderName = normalizeFolderName(currentGalleryFolder);
        var sequence = Number(galleryFolderSequenceSelect.val());

        if (!folderName || !Number.isInteger(sequence) || sequence < 1) {
            showAlert("Please select a valid folder and sequence.", "danger");
            return;
        }

        changeGalleryFolderSequenceBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/gallery-folders/reorder",
            method: "POST",
            contentType: "application/json",
            headers: getAuthHeaders(),
            data: JSON.stringify({ folderName: folderName, sequence: sequence }),
            success: function (response) {
                var selectedFolder = normalizeFolderName(response && response.folderName) || folderName;
                currentGalleryFolder = selectedFolder;
                showAlert(response.message || "Folder sequence updated successfully.", "success");

                var cards = (response && response.cards) || [];
                var hasFolder = renderGalleryFolderCards(cards, selectedFolder);
                if (hasFolder && currentGalleryFolder) {
                    loadGalleryImages();
                } else {
                    renderGalleryImageEmptyState("No folder selected.");
                }
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to update folder sequence.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                changeGalleryFolderSequenceBtn.prop("disabled", false);
            },
        });
    });

    changeVideoFolderSequenceBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }

        var folderName = normalizeFolderName(currentVideoFolder);
        var sequence = Number(videoFolderSequenceSelect.val());

        if (!folderName || !Number.isInteger(sequence) || sequence < 1) {
            showAlert("Please select a valid folder and sequence.", "danger");
            return;
        }

        changeVideoFolderSequenceBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/video-folders/reorder",
            method: "POST",
            contentType: "application/json",
            headers: getAuthHeaders(),
            data: JSON.stringify({ folderName: folderName, sequence: sequence }),
            success: function (response) {
                var selectedFolder = normalizeFolderName(response && response.folderName) || folderName;
                currentVideoFolder = selectedFolder;
                showAlert(response.message || "Video folder sequence updated successfully.", "success");

                var cards = (response && response.cards) || [];
                var hasFolder = renderVideoFolderCards(cards, selectedFolder);
                if (hasFolder && currentVideoFolder) {
                    loadVideoFiles();
                } else {
                    renderVideoFileEmptyState("No folder selected.");
                }
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to update video folder sequence.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                changeVideoFolderSequenceBtn.prop("disabled", false);
            },
        });
    });

    addGalleryVideosBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }
        addGalleryVideosInput.val("");
        addGalleryVideosInput.trigger("click");
    });

    addGalleryVideosInput.on("change", function () {
        var files = this.files ? Array.from(this.files) : [];
        if (!files.length) {
            return;
        }
        if (!ensureAuth()) {
            return;
        }

        var folderName = normalizeFolderName(currentVideoFolder);
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }

        var formData = new FormData();
        formData.append("folder", folderName);
        files.forEach(function (file) {
            formData.append("videos", file);
        });

        $.ajax({
            url: "/admin/video-files",
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "Videos uploaded successfully.", "success");
                addGalleryVideosInput.val("");
                var serverFolder = normalizeFolderName(response && response.folder);
                if (serverFolder) {
                    currentVideoFolder = serverFolder;
                }
                loadVideoFolderCards(currentVideoFolder);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to upload videos.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
        });
    });

    videoFolderCardGrid.on("click", ".gallery-folder-card-video", function () {
        var selected = normalizeFolderName($(this).data("folderName"));
        if (!selected) {
            showAlert("Invalid folder selected.", "danger");
            return;
        }
        currentVideoFolder = selected;
        videoFolderCardGrid.find(".gallery-folder-card-video").removeClass("is-active");
        $(this).addClass("is-active");
        updateActiveVideoFolderBadge();
        setVideoFolderSequenceControls(currentVideoFolderOrder, selected);
        loadVideoFiles();
    });

    var createFolderAction = function () {
        if (!ensureAuth()) {
            return;
        }

        var rawName = String(newGalleryFolderName.val() || "");
        var folderName = normalizeFolderName(rawName);
        if (!folderName) {
            showAlert("Enter a valid folder name.", "danger");
            return;
        }
        if (currentGalleryFolderOrder.some(function (name) {
            return folderKey(name) === folderKey(folderName);
        })) {
            showAlert("Folder already exists.", "danger");
            return;
        }

        createGalleryFolderBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/gallery-folders",
            method: "POST",
            contentType: "application/json",
            headers: getAuthHeaders(),
            data: JSON.stringify({ folderName: folderName }),
            success: function (response) {
                var createdName = normalizeFolderName(response && response.folderName) || folderName;
                newGalleryFolderName.val("");
                showAlert(response.message || "Folder created successfully.", "success");
                loadGalleryFolderCards(createdName);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to create folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                createGalleryFolderBtn.prop("disabled", false);
            },
        });
    };

    createGalleryFolderBtn.on("click", createFolderAction);

    newGalleryFolderName.on("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            createFolderAction();
        }
    });

    deleteGalleryFolderBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }

        var folderName = normalizeFolderName(currentGalleryFolder);
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }

        if (!window.confirm('Delete folder "' + folderName + '" and all images inside it?')) {
            return;
        }

        deleteGalleryFolderBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/gallery-folders/" + encodeURIComponent(folderName),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                currentGalleryFolder = "";
                updateActiveGalleryFolderBadge();
                showAlert(response.message || "Folder deleted successfully.", "success");
                loadGalleryFolderCards("");
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to delete folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                deleteGalleryFolderBtn.prop("disabled", false);
            },
        });
    });

    var createVideoFolderAction = function () {
        if (!ensureAuth()) {
            return;
        }

        var rawName = String(newVideoFolderName.val() || "");
        var folderName = normalizeFolderName(rawName);
        if (!folderName) {
            showAlert("Enter a valid folder name.", "danger");
            return;
        }
        if (currentVideoFolderOrder.some(function (name) {
            return folderKey(name) === folderKey(folderName);
        })) {
            showAlert("Video folder already exists.", "danger");
            return;
        }

        createVideoFolderBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/video-folders",
            method: "POST",
            contentType: "application/json",
            headers: getAuthHeaders(),
            data: JSON.stringify({ folderName: folderName }),
            success: function (response) {
                var createdName = normalizeFolderName(response && response.folderName) || folderName;
                newVideoFolderName.val("");
                showAlert(response.message || "Video folder created successfully.", "success");
                loadVideoFolderCards(createdName);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to create video folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                createVideoFolderBtn.prop("disabled", false);
            },
        });
    };

    createVideoFolderBtn.on("click", createVideoFolderAction);

    newVideoFolderName.on("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            createVideoFolderAction();
        }
    });

    deleteVideoFolderBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }

        var folderName = normalizeFolderName(currentVideoFolder);
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }

        if (!window.confirm('Delete folder "' + folderName + '" and all videos inside it?')) {
            return;
        }

        deleteVideoFolderBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/video-folders/" + encodeURIComponent(folderName),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                currentVideoFolder = "";
                updateActiveVideoFolderBadge();
                showAlert(response.message || "Video folder deleted successfully.", "success");
                loadVideoFolderCards("");
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to delete video folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                deleteVideoFolderBtn.prop("disabled", false);
            },
        });
    });

    bannerGrid.on("change", ".banner-file-input", function () {
        var file = this.files && this.files[0];
        if (!file) {
            return;
        }

        var card = $(this).closest(".banner-card");
        var preview = card.find(".banner-preview img")[0];
        if (!preview) {
            return;
        }

        var reader = new FileReader();
        reader.onload = function (event) {
            preview.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    bannerGrid.on("click", ".btn-update", function () {
        if (!ensureAuth()) {
            return;
        }

        var card = $(this).closest(".banner-card");
        var bannerName = String(card.data("banner") || "");
        var input = card.find(".banner-file-input")[0];
        if (!input || !input.files || !input.files.length) {
            showAlert("Please select a JPG/PNG image before updating.", "danger");
            return;
        }

        var formData = new FormData();
        formData.append("banner", input.files[0]);

        $.ajax({
            url: "/admin/update-banner/" + encodeURIComponent(bannerName),
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "Banner updated successfully.", "success");
                var img = card.find(".banner-preview img");
                var cacheBust = Date.now();
                var path = (response && response.path) || ("/uploads/" + bannerName);
                img.attr("src", path + "?v=" + cacheBust);
                input.value = "";
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Upload failed. Please try again.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
        });
    });

    bannerGrid.on("click", ".btn-sequence", function () {
        if (!ensureAuth()) {
            return;
        }

        var card = $(this).closest(".banner-card");
        var bannerName = String(card.data("banner") || "");
        var sequence = Number(card.find(".banner-sequence-select").val());

        if (!bannerName || !Number.isInteger(sequence) || sequence < 1) {
            showAlert("Please select a valid sequence number.", "danger");
            return;
        }

        $.ajax({
            url: "/admin/carousel/reorder",
            method: "POST",
            contentType: "application/json",
            headers: getAuthHeaders(),
            data: JSON.stringify({ bannerName: bannerName, sequence: sequence }),
            success: function (response) {
                showAlert(response.message || "Carousel sequence updated successfully.", "success");
                renderBanners((response && response.banners) || []);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to update sequence.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
        });
    });

    bannerGrid.on("click", ".btn-remove", function () {
        if (!ensureAuth()) {
            return;
        }

        var card = $(this).closest(".banner-card");
        var bannerName = String(card.data("banner") || "");
        if (!bannerName) {
            return;
        }

        if (!window.confirm("Remove " + bannerTitle(bannerName) + " from carousel?")) {
            return;
        }

        $.ajax({
            url: "/admin/carousel/" + encodeURIComponent(bannerName),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "Carousel banner removed successfully.", "success");
                loadBanners();
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to remove carousel banner.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
        });
    });

    refreshEnquiriesBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }
        loadEnquiries();
    });

    addNewsBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }
        resetNewsForm();
        openNewsFormModal();
    });

    if (newsFormModalEl) {
        $(newsFormModalEl).on("hidden.bs.modal", function () {
            newsSubmitBtn.prop("disabled", false);
            newsCancelBtn.prop("disabled", false);
            resetNewsForm();
        });
    }

    refreshNewsBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }
        loadNewsItems();
    });

    toggleNewsPauseBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }

        var nextPaused = !newsScrollPaused;
        toggleNewsPauseBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/news-scroll-state",
            method: "PUT",
            headers: getAuthHeaders(),
            contentType: "application/json",
            data: JSON.stringify({
                paused: nextPaused,
            }),
            success: function (response) {
                var paused = Boolean(response && response.paused);
                setNewsPauseState(paused);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to update news scroll state.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                toggleNewsPauseBtn.prop("disabled", false);
            },
        });
    });

    newsCancelBtn.on("click", function () {
        resetNewsForm();
        closeNewsFormModal();
    });

    newsContentInput.on("input", updateNewsContentCounter);

    newsForm.on("submit", function (event) {
        event.preventDefault();
        if (!ensureAuth()) {
            return;
        }

        var newsId = Number(newsIdInput.val());
        var title = String(newsTitleInput.val() || "").trim();
        var content = String(newsContentInput.val() || "").trim();
        var editing = Number.isInteger(newsId) && newsId > 0;
        var currentItem = editing
            ? currentNewsItems.find(function (item) {
                return Number(item && item.id) === newsId;
            })
            : null;
        var existingImageUrl = normalizeNewsUrl(currentItem && currentItem.imageUrl);
        var imageFile = newsImageFileInput[0] && newsImageFileInput[0].files
            ? newsImageFileInput[0].files[0]
            : null;

        if (!title || !content) {
            showAlert("Title and content are required.", "danger");
            return;
        }

        var url = editing
            ? "/admin/news-items/" + encodeURIComponent(String(newsId))
            : "/admin/news-items";
        var method = editing ? "PUT" : "POST";

        var setFormBusy = function (busy) {
            newsSubmitBtn.prop("disabled", busy);
            newsCancelBtn.prop("disabled", busy);
        };

        var saveNewsItem = function (resolvedImageUrl) {
            $.ajax({
                url: url,
                method: method,
                headers: getAuthHeaders(),
                contentType: "application/json",
                data: JSON.stringify({
                    title: title,
                    content: content,
                    imageUrl: resolvedImageUrl,
                }),
                success: function (response) {
                    showAlert(response.message || (editing ? "News updated successfully." : "News added successfully."), "success");
                    resetNewsForm();
                    closeNewsFormModal();
                    if (response && typeof response.paused === "boolean") {
                        setNewsPauseState(Boolean(response.paused));
                    }
                    if (response && Array.isArray(response.items)) {
                        renderNewsItems(response.items);
                    } else {
                        loadNewsItems();
                    }
                },
                error: function (xhr) {
                    if (handleAuthError(xhr)) {
                        return;
                    }
                    var msg = editing ? "Unable to update news item." : "Unable to add news item.";
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        msg = xhr.responseJSON.message;
                    }
                    showAlert(msg, "danger");
                },
                complete: function () {
                    setFormBusy(false);
                },
            });
        };

        setFormBusy(true);

        if (!imageFile) {
            saveNewsItem(existingImageUrl);
            return;
        }

        if (!isAllowedNewsMediaFile(imageFile)) {
            showAlert("Please select a JPG, PNG, or PDF file.", "danger");
            setFormBusy(false);
            return;
        }

        uploadNewsMediaFile(imageFile)
            .done(function (response) {
                var uploadedPath = normalizeNewsUrl(response && response.file && response.file.path);
                if (!uploadedPath) {
                    showAlert("File uploaded but path was invalid. Please try again.", "danger");
                    setFormBusy(false);
                    return;
                }
                saveNewsItem(uploadedPath);
            })
            .fail(function (xhr) {
                if (handleAuthError(xhr)) {
                    setFormBusy(false);
                    return;
                }
                var msg = "Unable to upload file.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                setFormBusy(false);
            });
    });

    newsListWrap.on("click", ".btn-news-sequence", function () {
        if (!ensureAuth()) {
            return;
        }

        var button = $(this);
        var card = button.closest(".news-item-card");
        var newsId = Number(button.data("newsId") || card.data("newsId"));
        var sequence = Number(card.find(".news-sequence-select").val());

        if (!Number.isInteger(newsId) || newsId <= 0) {
            showAlert("Invalid news id.", "danger");
            return;
        }
        if (!Number.isInteger(sequence) || sequence < 1) {
            showAlert("Please select a valid sequence number.", "danger");
            return;
        }

        button.prop("disabled", true);

        $.ajax({
            url: "/admin/news-items/reorder",
            method: "POST",
            headers: getAuthHeaders(),
            contentType: "application/json",
            data: JSON.stringify({
                id: newsId,
                sequence: sequence,
            }),
            success: function (response) {
                showAlert(response.message || "News sequence updated successfully.", "success");
                if (response && Array.isArray(response.items)) {
                    renderNewsItems(response.items);
                } else {
                    loadNewsItems();
                }
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    button.prop("disabled", false);
                    return;
                }
                var msg = "Unable to update news sequence.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                button.prop("disabled", false);
            },
            complete: function () {
                button.prop("disabled", false);
            },
        });
    });

    newsListWrap.on("click", ".btn-news-edit", function () {
        if (!ensureAuth()) {
            return;
        }

        var newsId = Number($(this).data("newsId"));
        if (!Number.isInteger(newsId) || newsId <= 0) {
            showAlert("Invalid news id.", "danger");
            return;
        }

        var targetItem = currentNewsItems.find(function (item) {
            return Number(item && item.id) === newsId;
        });

        if (!targetItem) {
            showAlert("News item not found.", "danger");
            return;
        }

        newsIdInput.val(String(newsId));
        newsTitleInput.val(String(targetItem.title || ""));
        newsContentInput.val(String(targetItem.content || ""));
        updateNewsContentCounter();
        setNewsFormMode(true);
        openNewsFormModal();
    });

    newsListWrap.on("click", ".btn-news-delete", function () {
        if (!ensureAuth()) {
            return;
        }

        var button = $(this);
        var newsId = Number(button.data("newsId"));
        if (!Number.isInteger(newsId) || newsId <= 0) {
            showAlert("Invalid news id.", "danger");
            return;
        }

        if (!window.confirm("Delete this news item permanently?")) {
            return;
        }

        button.prop("disabled", true);

        $.ajax({
            url: "/admin/news-items/" + encodeURIComponent(String(newsId)),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                    if (Number(newsIdInput.val()) === newsId) {
                    resetNewsForm();
                }
                if (response && typeof response.paused === "boolean") {
                    setNewsPauseState(Boolean(response.paused));
                }
                showAlert(response.message || "News item deleted successfully.", "success");
                if (response && Array.isArray(response.items)) {
                    renderNewsItems(response.items);
                } else {
                    loadNewsItems();
                }
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    button.prop("disabled", false);
                    return;
                }
                var msg = "Unable to delete news item.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                button.prop("disabled", false);
            },
        });
    });

    var createPortfolioFolderAction = function () {
        if (!ensureAuth()) return;
        
        var rawName = String(newPortfolioFolderName.val() || "");
        var folderName = normalizeFolderName(rawName);
        if (!folderName) {
            showAlert("Enter a valid folder name.", "danger");
            return;
        }
        
        createPortfolioFolderBtn.prop("disabled", true);
        
        $.ajax({
            url: "/admin/portfolio-folders",
            method: "POST",
            contentType: "application/json",
            headers: getAuthHeaders(),
            data: JSON.stringify({ category: currentPortfolioCategory, folderName: folderName }),
            success: function (response) {
                var createdName = normalizeFolderName(response && response.folderName) || folderName;
                newPortfolioFolderName.val("");
                showAlert(response.message || "Portfolio folder created successfully.", "success");
                loadPortfolioFolderCards(createdName);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) return;
                var msg = "Unable to create folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) msg = xhr.responseJSON.message;
                showAlert(msg, "danger");
            },
            complete: function () {
                createPortfolioFolderBtn.prop("disabled", false);
            }
        });
    };

    createPortfolioFolderBtn.on("click", createPortfolioFolderAction);

    newPortfolioFolderName.on("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            createPortfolioFolderAction();
        }
    });

    deletePortfolioFolderBtn.on("click", function () {
        if (!ensureAuth()) return;
        
        var folderName = normalizeFolderName(currentPortfolioFolder);
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }
        
        if (!window.confirm('Delete folder "' + folderName + '" and all files inside it?')) return;
        
        deletePortfolioFolderBtn.prop("disabled", true);
        
        $.ajax({
            url: "/admin/portfolio-folders/" + encodeURIComponent(folderName) + "?category=" + encodeURIComponent(currentPortfolioCategory),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                currentPortfolioFolder = "";
                updateActivePortfolioFolderBadge();
                showAlert(response.message || "Folder deleted successfully.", "success");
                loadPortfolioFolderCards("");
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) return;
                var msg = "Unable to delete folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) msg = xhr.responseJSON.message;
                showAlert(msg, "danger");
            },
            complete: function () {
                deletePortfolioFolderBtn.prop("disabled", false);
            }
        });
    });

    portfolioFolderCardGrid.on("click", ".gallery-folder-card-portfolio", function () {
        var selected = normalizeFolderName($(this).data("folderName"));
        if (!selected) {
            showAlert("Invalid folder selected.", "danger");
            return;
        }
        currentPortfolioFolder = selected;
        portfolioFolderCardGrid.find(".gallery-folder-card-portfolio").removeClass("is-active");
        $(this).addClass("is-active");
        updateActivePortfolioFolderBadge();
        loadPortfolioFiles();
    });

    addPortfolioFilesBtn.on("click", function () {
        if (!ensureAuth()) return;
        addPortfolioFilesInput.val("");
        addPortfolioFilesInput.trigger("click");
    });

    addPortfolioFilesInput.on("change", function () {
        var files = this.files ? Array.from(this.files) : [];
        if (!files.length) return;
        if (!ensureAuth()) return;
        
        var folderName = normalizeFolderName(currentPortfolioFolder);
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }
        
        var formData = new FormData();
        formData.append("category", currentPortfolioCategory);
        formData.append("folder", folderName);
        files.forEach(function (file) { formData.append("files", file); });
        
        $.ajax({
            url: "/admin/portfolio-files",
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "Files uploaded successfully.", "success");
                addPortfolioFilesInput.val("");
                loadPortfolioFolderCards(currentPortfolioFolder);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) return;
                var msg = "Unable to upload files.";
                if (xhr.responseJSON && xhr.responseJSON.message) msg = xhr.responseJSON.message;
                showAlert(msg, "danger");
            }
        });
    });

    portfolioFileGrid.on("click", ".btn-portfolio-remove", function () {
        if (!ensureAuth()) return;
        
        var button = $(this);
        var fileName = String(button.data("fileName") || "").trim();
        var folderName = normalizeFolderName(currentPortfolioFolder);
        if (!fileName || !folderName) {
            showAlert("Invalid file or folder.", "danger");
            return;
        }
        
        if (!window.confirm("Delete this file?")) return;
        
        button.prop("disabled", true);
        
        $.ajax({
            url: "/admin/portfolio-files/" + encodeURIComponent(fileName) + "?category=" + encodeURIComponent(currentPortfolioCategory) + "&folder=" + encodeURIComponent(folderName),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "File removed successfully.", "success");
                loadPortfolioFolderCards(currentPortfolioFolder);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    button.prop("disabled", false);
                    return;
                }
                var msg = "Unable to remove file.";
                if (xhr.responseJSON && xhr.responseJSON.message) msg = xhr.responseJSON.message;
                showAlert(msg, "danger");
                button.prop("disabled", false);
            }
        });
    });

    enquiryListWrap.on("click", ".btn-enquiry-delete", function () {
        if (!ensureAuth()) {
            return;
        }

        var button = $(this);
        var enquiryId = Number(button.data("enquiryId"));
        if (!Number.isInteger(enquiryId) || enquiryId <= 0) {
            showAlert("Invalid enquiry id.", "danger");
            return;
        }

        if (!window.confirm("Delete this enquiry permanently?")) {
            return;
        }

        button.prop("disabled", true);

        $.ajax({
            url: "/admin/enquiries/" + encodeURIComponent(String(enquiryId)),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "Enquiry deleted successfully.", "success");
                loadEnquiries();
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    button.prop("disabled", false);
                    return;
                }
                var msg = "Unable to delete enquiry.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                button.prop("disabled", false);
            },
        });
    });

    galleryImageGrid.on("click", ".btn-gallery-remove", function () {
        if (!ensureAuth()) {
            return;
        }

        var button = $(this);
        var fileName = String(button.data("fileName") || "").trim();
        var folderName = normalizeFolderName(currentGalleryFolder);
        if (!fileName) {
            showAlert("Invalid file name.", "danger");
            return;
        }
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }

        if (!window.confirm("Delete this image from folder?")) {
            return;
        }

        button.prop("disabled", true);

        $.ajax({
            url: "/admin/gallery-images/" + encodeURIComponent(fileName) + "?folder=" + encodeURIComponent(folderName),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                var serverFolder = normalizeFolderName(response && response.folder);
                if (serverFolder) {
                    currentGalleryFolder = serverFolder;
                }
                showAlert(response.message || "Image removed successfully.", "success");
                loadGalleryFolderCards(currentGalleryFolder);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    button.prop("disabled", false);
                    return;
                }
                var msg = "Unable to remove image.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                button.prop("disabled", false);
            },
        });
    });

    videoFileGrid.on("click", ".btn-video-remove", function () {
        if (!ensureAuth()) {
            return;
        }

        var button = $(this);
        var fileName = String(button.data("fileName") || "").trim();
        var folderName = normalizeFolderName(currentVideoFolder);
        if (!fileName) {
            showAlert("Invalid file name.", "danger");
            return;
        }
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }

        if (!window.confirm("Delete this video from folder?")) {
            return;
        }

        button.prop("disabled", true);

        $.ajax({
            url: "/admin/video-files/" + encodeURIComponent(fileName) + "?folder=" + encodeURIComponent(folderName),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                var serverFolder = normalizeFolderName(response && response.folder);
                if (serverFolder) {
                    currentVideoFolder = serverFolder;
                }
                showAlert(response.message || "Video removed successfully.", "success");
                loadVideoFolderCards(currentVideoFolder);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    button.prop("disabled", false);
                    return;
                }
                var msg = "Unable to remove video.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                button.prop("disabled", false);
            },
        });
    });

    $(".logout-btn").on("click", function (event) {
        if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
        }
        closeSidebarMenu();
        clearAuth();
        currentGalleryFolder = "";
        showOnlySelectedGalleryFolder = false;
        currentGalleryFolderOrder = [];
        currentVideoFolder = "";
        currentVideoFolderOrder = [];
        currentNewsItems = [];
        newsScrollPaused = false;
        activeGalleryFolderBadge.text("Folder: -");
        showAllGalleryFoldersBtn.addClass("d-none");
        if (galleryFolderSequenceWrap.length) {
            galleryFolderSequenceWrap.addClass("d-none");
        }
        galleryFolderSequenceSelect.html("");
        galleryFolderCardGrid.html("");
        activeVideoFolderBadge.text("Folder: -");
        if (videoFolderSequenceWrap.length) {
            videoFolderSequenceWrap.addClass("d-none");
        }
        videoFolderSequenceSelect.html("");
        videoFolderCardGrid.html("");
        newGalleryFolderName.val("");
        newVideoFolderName.val("");
        resetNewsForm();
        closeNewsFormModal();
        setNewsPauseState(false);
        renderEmptyState("Login required to manage carousel slides.");
        renderEnquiryEmptyState("Login required to view enquiries.");
        renderNewsEmptyState("Login required to manage news.");
        renderGalleryImageEmptyState("Login required to manage image folder.");
        renderVideoFileEmptyState("Login required to manage video folder.");
        resetDashboardMetrics();
        showAlert("Logged out successfully.", "success");
        redirectToLogin();
    });
});
