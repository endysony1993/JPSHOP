document.addEventListener("DOMContentLoaded", () => {
	const form = document.getElementById("loginForm");
	const errorEl = document.getElementById("loginError");

	if (!form) {
		return;
	}

	form.addEventListener("submit", (event) => {
		event.preventDefault();

		const usernameInput = document.getElementById("username");
		const passwordInput = document.getElementById("password");
		const roleInput = /** @type {HTMLInputElement | null} */ (document.querySelector("input[name='role']:checked"));

		if (!usernameInput || !passwordInput || !roleInput) {
			return;
		}

		const username = usernameInput.value.trim();
		const password = passwordInput.value;
		const role = roleInput.value;

		errorEl.textContent = "";

		if (!username || !password) {
			errorEl.textContent = "Please enter username and password.";
			return;
		}

		const isAdmin = role === "admin";
		const isGuest = role === "guest";

		if (isAdmin) {
			const validAdmin = username === "admin" && password === "admin123";
			if (!validAdmin) {
				errorEl.textContent = "Invalid admin credentials.";
				return;
			}
		} else if (isGuest) {
			const validGuest = username === "guest01" && password === "555123";
			if (!validGuest) {
				errorEl.textContent = "Invalid guest credentials.";
				return;
			}
		}

		const user = {
			username,
			role,
			loggedInAt: new Date().toISOString(),
		};

		try {
			localStorage.setItem("jpshop.currentUser", JSON.stringify(user));
		} catch (e) {
			// If storage fails, just continue without persisting.
		}

		window.location.href = "inventory.html";
	});
});

