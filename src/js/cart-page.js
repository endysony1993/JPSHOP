document.addEventListener("DOMContentLoaded", () => {
	const cartRows = document.getElementById("cartRows");
	const emptyState = document.getElementById("emptyState");
	const cartTableWrap = document.getElementById("cartTableWrap");
	const totalItemsEl = document.getElementById("totalItems");
	const totalPriceEl = document.getElementById("totalPrice");
	const clearCartButton = document.getElementById("clearCartButton");
	const checkoutButton = document.getElementById("checkoutButton");
	const continueButtons = document.querySelectorAll("[data-continue-shopping]");
	const detailPanel = document.getElementById("detailPanel");
	const detailName = document.getElementById("detailName");
	const detailImage = document.getElementById("detailImage");
	const detailTable = document.getElementById("detailTable");
	const detailThumbs = document.getElementById("detailThumbs");
	const btnCloseDetail = document.getElementById("btnCloseDetail");
	const detailPrev = document.getElementById("detailPrev");
	const detailNext = document.getElementById("detailNext");
	const CURRENT_USER = getCurrentUser();
	const shouldHideProductCode = CURRENT_USER && CURRENT_USER.role === "guest";
	let PRODUCTS = [];
	let loadProductsPromise = null;
	let ACTIVE_DETAIL_CODE = "";
	let currentImages = [];
	let currentImageIndex = 0;

	function getCurrentUser() {
		try {
			const raw = localStorage.getItem("jpshop.currentUser");
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}

	function formatVND(value) {
		return Number(value || 0).toLocaleString("vi-VN");
	}

	function normaliseCode(code) {
		return String(code || "").trim().toUpperCase();
	}

	function buildProductDetailUrl(code) {
		return `inventory.html?product=${encodeURIComponent(normaliseCode(code))}`;
	}

	function escapeHtml(value) {
		return String(value ?? "")
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;")
			.replaceAll("'", "&#39;");
	}

	function getCartItem(code) {
		const targetCode = normaliseCode(code);
		return window.CartStore.getCart().find((item) => normaliseCode(item.code) === targetCode) || null;
	}

	function ensureProductsLoaded() {
		if (loadProductsPromise) {
			return loadProductsPromise;
		}

		loadProductsPromise = fetch(resolveImagePath("/public/data/products.json"))
			.then((response) => {
				if (!response.ok) {
					throw new Error("Không tải được dữ liệu sản phẩm.");
				}
				return response.json();
			})
			.then((data) => {
				if (Array.isArray(data)) {
					PRODUCTS = data;
				} else if (data && typeof data === "object" && Array.isArray(data.products)) {
					PRODUCTS = data.products;
				} else if (data && typeof data === "object") {
					PRODUCTS = [data];
				} else {
					PRODUCTS = [];
				}
				return PRODUCTS;
			})
			.catch((error) => {
				console.error(error);
				PRODUCTS = [];
				return PRODUCTS;
			});

		return loadProductsPromise;
	}

	function buildDetailRows(product, cartItem) {
		const rows = [];

		if (!shouldHideProductCode && (product?.code || cartItem?.code)) {
			rows.push({ label: "Mã sản phẩm", value: product?.code || cartItem?.code || "" });
		}

		if (product?.brand) {
			rows.push({ label: "Thương hiệu", value: product.brand });
		}

		rows.push({ label: "Tên sản phẩm", value: product?.name || cartItem?.name || "" });

		if (cartItem?.price) {
			rows.push({ label: "Đơn giá", value: formatVND(cartItem.price) });
		}

		if (product?.category) {
			rows.push({ label: "Danh mục", value: product.category });
		}

		if (product?.desc) {
			rows.push({ label: "Mô tả", value: product.desc });
		}

		for (let index = 1; index <= 11; index += 1) {
			const key = `desc${index}`;
			const text = product?.[key];
			if (!text) {
				continue;
			}

			let label = "Thông tin";
			let value = text;
			const separatorIndex = text.indexOf(":");
			if (separatorIndex !== -1) {
				label = text.slice(0, separatorIndex).trim() || label;
				value = text.slice(separatorIndex + 1).trim();
			}

			rows.push({ label, value });
		}

		if (!rows.length) {
			rows.push({ label: "Thông tin", value: "Chưa có mô tả chi tiết." });
		}

		return rows;
	}

	function renderDetailThumbs() {
		if (!detailThumbs) {
			return;
		}

		if (currentImages.length <= 1) {
			detailThumbs.innerHTML = "";
			return;
		}

		detailThumbs.innerHTML = currentImages.map((src, index) => `
			<button class="detail-thumb ${index === currentImageIndex ? "detail-thumb--active" : ""}" data-image-index="${index}" type="button">
				<img src="${escapeHtml(resolveImagePath(src))}" alt="Ảnh sản phẩm ${index + 1}" loading="lazy">
			</button>
		`).join("");

		detailThumbs.querySelectorAll(".detail-thumb").forEach((button) => {
			button.addEventListener("click", () => {
				const nextIndex = Number(button.getAttribute("data-image-index"));
				if (Number.isNaN(nextIndex) || !currentImages[nextIndex]) {
					return;
				}
				currentImageIndex = nextIndex;
				updateDetailImage();
				renderDetailThumbs();
			});
		});
	}

	function updateDetailImage() {
		if (!detailImage) {
			return;
		}

		const activeImage = currentImages[currentImageIndex] || currentImages[0] || "";
		if (!activeImage) {
			detailImage.removeAttribute("src");
			return;
		}

		detailImage.src = resolveImagePath(activeImage);
	}

	function hideDetail() {
		ACTIVE_DETAIL_CODE = "";
		currentImages = [];
		currentImageIndex = 0;
		if (detailPanel) {
			detailPanel.hidden = true;
		}
		document.body.style.overflow = "";
	}

	function showDetail(code) {
		const targetCode = normaliseCode(code);
		const cartItem = getCartItem(targetCode);
		if (!cartItem || !detailPanel || !detailTable || !detailName) {
			return;
		}

		const product = PRODUCTS.find((item) => normaliseCode(item.code) === targetCode) || cartItem;
		ACTIVE_DETAIL_CODE = targetCode;
		detailName.textContent = product.name || cartItem.name || targetCode;

		currentImages = Array.isArray(product.images) && product.images.length
			? product.images.filter(Boolean)
			: [product.image || cartItem.image].filter(Boolean);
		currentImageIndex = 0;

		if (detailImage) {
			detailImage.alt = product.name || cartItem.name || targetCode;
		}
		updateDetailImage();
		renderDetailThumbs();

		const rows = buildDetailRows(product, cartItem);
		detailTable.innerHTML = rows.map((row) => `
			<tr>
				<th>${escapeHtml(row.label)}</th>
				<td>${escapeHtml(row.value)}</td>
			</tr>
		`).join("");

		detailPanel.hidden = false;
		document.body.style.overflow = "hidden";
	}

	async function openProductDetail(code) {
		await ensureProductsLoaded();
		showDetail(code);
	}

	function resolveImagePath(path) {
		if (!path) {
			return "";
		}

		if (/^(https?:|data:|blob:)/i.test(path)) {
			return path;
		}

		const isFileProtocol = window.location.protocol === "file:";

		if (path.startsWith("/assets/")) {
			return isFileProtocol ? `./public${path}` : `/public${path}`;
		}

		if (path.startsWith("/public/")) {
			return isFileProtocol ? `.${path}` : path;
		}

		if (path.startsWith("/")) {
			return isFileProtocol ? `.${path}` : path;
		}

		return path;
	}

	function buildQuantityControl(item) {
		const wrapper = document.createElement("div");
		wrapper.className = "qty-control";

		const decrementButton = document.createElement("button");
		decrementButton.type = "button";
		decrementButton.className = "qty-button";
		decrementButton.textContent = "-";
		decrementButton.setAttribute("aria-label", `Giảm số lượng của ${item.name}`);
		decrementButton.addEventListener("click", () => {
			window.CartStore.updateQuantity(item.code, item.quantity - 1);
			renderCart();
		});

		const input = document.createElement("input");
		input.type = "number";
		input.className = "qty-input";
		input.min = "1";
		input.step = "1";
		input.value = String(item.quantity);
		input.setAttribute("aria-label", `Số lượng của ${item.name}`);
		input.addEventListener("change", () => {
			window.CartStore.updateQuantity(item.code, input.value);
			renderCart();
		});
		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				input.blur();
			}
		});

		const incrementButton = document.createElement("button");
		incrementButton.type = "button";
		incrementButton.className = "qty-button";
		incrementButton.textContent = "+";
		incrementButton.setAttribute("aria-label", `Tăng số lượng của ${item.name}`);
		incrementButton.addEventListener("click", () => {
			window.CartStore.updateQuantity(item.code, item.quantity + 1);
			renderCart();
		});

		wrapper.append(decrementButton, input, incrementButton);
		return wrapper;
	}

	function buildCartRow(item) {
		const row = document.createElement("tr");
		const subtotal = item.price * item.quantity;

		const productCell = document.createElement("td");
		productCell.className = "product-cell";
		productCell.setAttribute("data-label", "Sản phẩm");

		const image = document.createElement("img");
		image.className = "product-image";
		image.src = resolveImagePath(item.image);
		image.alt = item.name;
		image.loading = "lazy";

		const imageLink = document.createElement("button");
		imageLink.className = "product-image-link";
		imageLink.type = "button";
		imageLink.setAttribute("aria-label", `Xem chi tiết sản phẩm ${item.name}`);
		imageLink.addEventListener("click", () => {
			openProductDetail(item.code);
		});
		imageLink.appendChild(image);

		const productMeta = document.createElement("div");
		productMeta.className = "product-meta";

		const name = document.createElement("button");
		name.className = "product-name product-link";
		name.type = "button";
		name.textContent = item.name;
		name.addEventListener("click", () => {
			openProductDetail(item.code);
		});

		const code = document.createElement("div");
		code.className = "product-code";
		code.textContent = `Mã sản phẩm: ${item.code}`;

		productMeta.appendChild(name);
		if (!shouldHideProductCode) {
			productMeta.appendChild(code);
		}
		productCell.append(imageLink, productMeta);

		const priceCell = document.createElement("td");
		priceCell.className = "price-cell";
		priceCell.setAttribute("data-label", "Đơn giá");
		priceCell.textContent = formatVND(item.price);

		const quantityCell = document.createElement("td");
		quantityCell.setAttribute("data-label", "Số lượng");
		quantityCell.appendChild(buildQuantityControl(item));

		const subtotalCell = document.createElement("td");
		subtotalCell.setAttribute("data-label", "Tạm tính");
		subtotalCell.className = "subtotal-cell";
		subtotalCell.textContent = formatVND(subtotal);

		const actionCell = document.createElement("td");
		actionCell.className = "action-cell";
		actionCell.setAttribute("data-label", "Thao tác");

		const removeButton = document.createElement("button");
		removeButton.type = "button";
		removeButton.className = "btn btn--ghost btn--danger";
		removeButton.textContent = "Xóa";
		removeButton.addEventListener("click", () => {
			window.CartStore.removeFromCart(item.code);
			renderCart();
		});

		actionCell.appendChild(removeButton);
		row.append(productCell, priceCell, quantityCell, subtotalCell, actionCell);
		return row;
	}

	function renderCart() {
		const cart = window.CartStore.getCart();
		const totals = window.CartStore.calculateTotal(cart);

		cartRows.innerHTML = "";
		totalItemsEl.textContent = totals.totalItems.toLocaleString("vi-VN");
		totalPriceEl.textContent = formatVND(totals.totalPrice);

		const hasItems = cart.length > 0;
		emptyState.hidden = hasItems;
		cartTableWrap.hidden = !hasItems;
		clearCartButton.disabled = !hasItems;
		checkoutButton.disabled = !hasItems;

		if (!hasItems) {
			return;
		}

		cartRows.append(...cart.map(buildCartRow));
	}

	clearCartButton.addEventListener("click", () => {
		if (!window.CartStore.getCart().length) {
			return;
		}

		if (window.confirm("Bạn có chắc muốn xóa toàn bộ sản phẩm khỏi giỏ hàng?")) {
			window.CartStore.clearCart();
			renderCart();
		}
	});

	continueButtons.forEach((button) => {
		button.addEventListener("click", () => {
			window.location.href = "inventory.html";
		});
	});

	if (btnCloseDetail) {
		btnCloseDetail.addEventListener("click", hideDetail);
	}

	if (detailPanel) {
		detailPanel.addEventListener("click", (event) => {
			if (event.target === detailPanel) {
				hideDetail();
			}
		});
	}

	if (detailPrev) {
		detailPrev.addEventListener("click", () => {
			if (currentImages.length <= 1) {
				return;
			}
			currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
			updateDetailImage();
			renderDetailThumbs();
		});
	}

	if (detailNext) {
		detailNext.addEventListener("click", () => {
			if (currentImages.length <= 1) {
				return;
			}
			currentImageIndex = (currentImageIndex + 1) % currentImages.length;
			updateDetailImage();
			renderDetailThumbs();
		});
	}

	window.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && detailPanel && !detailPanel.hidden) {
			hideDetail();
		}
	});

	window.addEventListener("storage", (event) => {
		if (event.key === window.CartStore.STORAGE_KEY) {
			renderCart();
		}
	});

	window.addEventListener("cart:updated", renderCart);
	window.addToCart = window.CartStore.addToCart;
	window.getCart = window.CartStore.getCart;
	window.saveCart = window.CartStore.saveCart;
	window.removeFromCart = window.CartStore.removeFromCart;
	window.updateQuantity = window.CartStore.updateQuantity;
	window.calculateTotal = window.CartStore.calculateTotal;
	window.clearCart = window.CartStore.clearCart;

	ensureProductsLoaded();
	renderCart();
});