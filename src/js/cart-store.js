(function (global) {
	const STORAGE_KEY = "cart";

	function normaliseCode(code) {
		return String(code || "").trim().toUpperCase();
	}

	function normaliseQuantity(quantity) {
		const parsed = Number.parseInt(quantity, 10);
		if (!Number.isFinite(parsed) || parsed <= 0) {
			return 1;
		}

		return parsed;
	}

	function normalisePrice(price) {
		const parsed = Number(price);
		return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
	}

	function normaliseCartItem(product) {
		if (!product || typeof product !== "object") {
			return null;
		}

		const code = normaliseCode(product.code);
		const name = String(product.name || "").trim();
		const image = String(product.image || "").trim();
		const price = normalisePrice(product.price);
		const quantity = normaliseQuantity(product.quantity);

		if (!code || !name) {
			return null;
		}

		return {
			code,
			name,
			price,
			quantity,
			image,
		};
	}

	function emitUpdate(cart) {
		global.dispatchEvent(
			new CustomEvent("cart:updated", {
				detail: {
					cart,
					storageKey: STORAGE_KEY,
				},
			})
		);
	}

	function ensureToastHost() {
		let host = global.document.getElementById("cartToastHost");

		if (host) {
			return host;
		}

		host = global.document.createElement("div");
		host.id = "cartToastHost";
		host.setAttribute(
			"style",
			[
				"position:fixed",
				"right:16px",
				"bottom:16px",
				"z-index:9999",
				"display:grid",
				"gap:10px",
				"pointer-events:none",
			].join(";")
		);
		global.document.body.appendChild(host);
		return host;
	}

	function showCartMessage(message) {
		if (!global.document || !global.document.body) {
			global.alert(message);
			return;
		}

		const host = ensureToastHost();
		const toast = global.document.createElement("div");
		toast.textContent = message;
		toast.setAttribute(
			"style",
			[
				"min-width:220px",
				"max-width:320px",
				"padding:12px 16px",
				"border-radius:14px",
				"background:rgba(15,23,42,0.94)",
				"color:#fff",
				"font:600 14px/1.4 'Be Vietnam Pro','Segoe UI',sans-serif",
				"box-shadow:0 16px 30px rgba(15,23,42,0.25)",
				"transform:translateY(8px)",
				"opacity:0",
				"transition:opacity .18s ease, transform .18s ease",
				"pointer-events:auto",
			].join(";")
		);

		host.appendChild(toast);
		global.requestAnimationFrame(() => {
			toast.style.opacity = "1";
			toast.style.transform = "translateY(0)";
		});

		global.setTimeout(() => {
			toast.style.opacity = "0";
			toast.style.transform = "translateY(8px)";
			global.setTimeout(() => toast.remove(), 180);
		}, 1800);
	}

	function getCart() {
		try {
			const raw = global.localStorage.getItem(STORAGE_KEY);
			const parsed = raw ? JSON.parse(raw) : [];

			if (!Array.isArray(parsed)) {
				return [];
			}

			return parsed.map(normaliseCartItem).filter(Boolean);
		} catch (error) {
			console.warn("Unable to parse cart from localStorage.", error);
			return [];
		}
	}

	function saveCart(cart) {
		const nextCart = Array.isArray(cart) ? cart.map(normaliseCartItem).filter(Boolean) : [];
		global.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCart));
		emitUpdate(nextCart);
		return nextCart;
	}

	function addToCart(product) {
		const nextProduct = normaliseCartItem(product);

		if (!nextProduct) {
			return getCart();
		}

		const cart = getCart();
		const existingItem = cart.find((item) => item.code === nextProduct.code);

		if (existingItem) {
			existingItem.quantity += 1;
		} else {
			cart.push({
				...nextProduct,
				quantity: 1,
			});
		}

		const savedCart = saveCart(cart);
		showCartMessage("Product added to cart");
		return savedCart;
	}

	function removeFromCart(code) {
		const targetCode = normaliseCode(code);
		const nextCart = getCart().filter((item) => item.code !== targetCode);
		return saveCart(nextCart);
	}

	function updateQuantity(code, quantity) {
		const targetCode = normaliseCode(code);
		const parsedQuantity = Number.parseInt(quantity, 10);

		if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
			return removeFromCart(targetCode);
		}

		const cart = getCart().map((item) =>
			item.code === targetCode
				? {
					...item,
					quantity: parsedQuantity,
				}
				: item
		);

		return saveCart(cart);
	}

	function clearCart() {
		global.localStorage.removeItem(STORAGE_KEY);
		emitUpdate([]);
		return [];
	}

	function calculateTotal(cart) {
		const activeCart = Array.isArray(cart) ? cart.map(normaliseCartItem).filter(Boolean) : getCart();
		return activeCart.reduce(
			(totals, item) => {
				totals.totalItems += item.quantity;
				totals.totalPrice += item.price * item.quantity;
				return totals;
			},
			{ totalItems: 0, totalPrice: 0 }
		);
	}

	global.CartStore = {
		STORAGE_KEY,
		getCart,
		saveCart,
		addToCart,
		removeFromCart,
		updateQuantity,
		calculateTotal,
		clearCart,
	};

	global.addToCart = addToCart;
})(window);