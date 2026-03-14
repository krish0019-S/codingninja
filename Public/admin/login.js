(function () {
    var TOKEN_KEY = "rc_admin_token";
    var TOKEN_EXP_KEY = "rc_admin_token_exp";

    var loginForm = document.getElementById("adminLoginForm");
    var loginError = document.getElementById("adminLoginError");
    var resetForm = document.getElementById("adminResetForm");
    var resetError = document.getElementById("adminResetError");
    var resetHint = document.getElementById("resetTokenHint");
    var forgotLink = document.getElementById("forgotLink");
    var backToLogin = document.getElementById("backToLogin");
    var loginPanel = document.getElementById("adminLoginPanel");
    var resetPanel = document.getElementById("adminResetPanel");
    var sendResetBtn = document.getElementById("sendResetCode");

    var tokenValid = function () {
        var token = localStorage.getItem(TOKEN_KEY);
        var exp = Number(localStorage.getItem(TOKEN_EXP_KEY) || 0);
        if (!token) {
            return false;
        }
        if (Date.now() > exp) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(TOKEN_EXP_KEY);
            return false;
        }
        return true;
    };

    var getNextUrl = function () {
        var params = new URLSearchParams(window.location.search || "");
        var next = String(params.get("next") || "").trim();
        if (!next) {
            return "/admin";
        }
        return next;
    };

    var showPanel = function (panel) {
        if (!loginPanel || !resetPanel) {
            return;
        }
        if (panel === "reset") {
            loginPanel.classList.add("d-none");
            resetPanel.classList.remove("d-none");
            return;
        }
        resetPanel.classList.add("d-none");
        loginPanel.classList.remove("d-none");
    };

    document.querySelectorAll(".password-toggle").forEach(function (button) {
        button.addEventListener("click", function () {
            var target = button.getAttribute("data-target");
            if (!target) {
                return;
            }
            var input = document.querySelector(target);
            if (!input) {
                return;
            }
            var makeVisible = input.type === "password";
            input.type = makeVisible ? "text" : "password";
            button.classList.toggle("is-visible", makeVisible);
        });
    });

    if (tokenValid()) {
        window.location.replace(getNextUrl());
        return;
    }

    if (forgotLink) {
        forgotLink.addEventListener("click", function (event) {
            event.preventDefault();
            showPanel("reset");
        });
    }

    if (backToLogin) {
        backToLogin.addEventListener("click", function (event) {
            event.preventDefault();
            showPanel("login");
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();
            if (loginError) {
                loginError.classList.remove("is-visible");
            }

            var formData = new FormData(loginForm);
            var username = String(formData.get("email") || "").trim();
            var password = String(formData.get("pwd") || "");

            fetch("/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username, password: password }),
            })
                .then(function (response) {
                    return response.json().then(function (data) {
                        return { ok: response.ok, data: data };
                    });
                })
                .then(function (result) {
                    if (result.ok && result.data && result.data.token) {
                        localStorage.setItem(TOKEN_KEY, result.data.token);
                        var expiresInMs = Number(result.data.expiresIn || 1800) * 1000;
                        localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + expiresInMs));
                        window.location.replace(getNextUrl());
                        return;
                    }
                    var msg = "Invalid email or password.";
                    if (result.data && result.data.message) {
                        msg = result.data.message;
                    }
                    if (loginError) {
                        loginError.textContent = msg;
                        loginError.classList.add("is-visible");
                    }
                })
                .catch(function () {
                    if (loginError) {
                        loginError.textContent = "Unable to login right now.";
                        loginError.classList.add("is-visible");
                    }
                });
        });
    }

    if (sendResetBtn) {
        sendResetBtn.addEventListener("click", function () {
            if (resetError) {
                resetError.classList.remove("is-visible");
            }
            if (resetHint) {
                resetHint.textContent = "";
            }

            var emailInput = resetForm ? resetForm.querySelector("input[name='email']") : null;
            var email = emailInput ? String(emailInput.value || "").trim() : "";

            fetch("/admin/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email }),
            })
                .then(function (response) {
                    return response.json().then(function (data) {
                        return { ok: response.ok, data: data };
                    });
                })
                .then(function (result) {
                    if (!result.ok) {
                        var msg = "Unable to generate reset code.";
                        if (result.data && result.data.message) {
                            msg = result.data.message;
                        }
                        if (resetError) {
                            resetError.textContent = msg;
                            resetError.classList.add("is-visible");
                        }
                        return;
                    }
                    if (resetHint) {
                        resetHint.textContent = "Reset code sent to your email (valid 5 minutes).";
                    }
                })
                .catch(function () {
                    if (resetError) {
                        resetError.textContent = "Unable to generate reset code.";
                        resetError.classList.add("is-visible");
                    }
                });
        });
    }

    if (resetForm) {
        resetForm.addEventListener("submit", function (event) {
            event.preventDefault();
            if (resetError) {
                resetError.classList.remove("is-visible");
            }

            var formData = new FormData(resetForm);
            var email = String(formData.get("email") || "").trim();
            var token = String(formData.get("token") || "").trim();
            var newPassword = String(formData.get("newPassword") || "");

            fetch("/admin/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email, token: token, newPassword: newPassword }),
            })
                .then(function (response) {
                    return response.json().then(function (data) {
                        return { ok: response.ok, data: data };
                    });
                })
                .then(function (result) {
                    if (!result.ok) {
                        var msg = "Unable to reset password.";
                        if (result.data && result.data.message) {
                            msg = result.data.message;
                        }
                        if (resetError) {
                            resetError.textContent = msg;
                            resetError.classList.add("is-visible");
                        }
                        return;
                    }
                    if (resetHint) {
                        resetHint.textContent = "Password updated. Please log in.";
                    }
                    showPanel("login");
                })
                .catch(function () {
                    if (resetError) {
                        resetError.textContent = "Unable to reset password.";
                        resetError.classList.add("is-visible");
                    }
                });
        });
    }
})();
