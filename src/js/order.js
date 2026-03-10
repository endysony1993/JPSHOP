document.addEventListener("DOMContentLoaded", () => {
	const CART_KEY = "cart";
	const EMAILJS_PUBLIC_KEY = "cslnYxPuDWfnLvvl6";
	const EMAILJS_SERVICE_ID = "service_uj3lh9d";
	const EMAILJS_TEMPLATE_ID = "template_khevdxm";

	const guestAccountInput = document.getElementById("guestAccountNumber");
	const submitButton = document.getElementById("checkoutButton");
	const statusElement = document.getElementById("orderStatus");
	const currentUser = getCurrentUser();

	function setStatus(message, state) {
		if (!statusElement) {
			return;
		}

		statusElement.textContent = message;
		if (state) {
			statusElement.dataset.state = state;
		} else {
			delete statusElement.dataset.state;
		}
	}

	function formatMoney(value) {
		return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
	}

	function formatOrderTime(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		const hours = String(date.getHours()).padStart(2, "0");
		const minutes = String(date.getMinutes()).padStart(2, "0");

		return `${year}-${month}-${day} ${hours}:${minutes}`;
	}

	function getCurrentUser() {
		try {
			const rawUser = localStorage.getItem("jpshop.currentUser");
			return rawUser ? JSON.parse(rawUser) : null;
		} catch {
			return null;
		}
	}

	function getDefaultGuestAccountNumber() {
		const username = String(currentUser?.username || "").trim();
		return username;
	}

	function applyDefaultGuestAccountNumber() {
		if (!guestAccountInput) {
			return;
		}

		const defaultAccountNumber = getDefaultGuestAccountNumber();
		if (!defaultAccountNumber) {
			return;
		}

		guestAccountInput.value = defaultAccountNumber;
	}

	function getCart() {
		try {
			const rawCart = localStorage.getItem(CART_KEY);
			const parsedCart = rawCart ? JSON.parse(rawCart) : [];
			return Array.isArray(parsedCart) ? parsedCart : [];
		} catch {
			return [];
		}
	}

	function calculateTotal(cart = getCart()) {
		return cart.reduce((sum, item) => {
			const price = Number(item.price) || 0;
			const quantity = Number(item.quantity) || 0;
			return sum + price * quantity;
		}, 0);
	}

	function generateOrderSummary(guestAccountNumber, cart = getCart(), orderTime = formatOrderTime(new Date())) {
		const totalPrice = calculateTotal(cart);
		const productLines = cart.map((item) => {
			return [
				item.name || "",
				`Code: ${item.code || ""}`,
				`Quantity: ${Number(item.quantity) || 0}`,
				`Price: ${formatMoney(item.price)}`,
				"--------------------------------",
			].join("\n");
		}).join("\n");

		return [
			"New Order",
			"",
			`Guest Account: ${guestAccountNumber}`,
			"",
			"Order Time:",
			orderTime,
			"",
			"Products",
			"--------------------------------",
			productLines,
			"",
			`Total Price: ${formatMoney(totalPrice)}`,
		].join("\n");
	}

	function getErrorMessage(error) {
		if (!error) {
			return "Failed to submit order";
		}

		const parts = [];
		if (error.status) {
			parts.push(`status ${error.status}`);
		}
		if (error.text) {
			parts.push(String(error.text));
		} else if (error.message) {
			parts.push(String(error.message));
		}

		return parts.length ? `Failed to submit order: ${parts.join(" - ")}` : "Failed to submit order";
	}

	async function submitOrder() {
		const cart = getCart();
		if (!cart.length) {
			setStatus("Cart is empty", "error");
			window.alert("Cart is empty");
			return;
		}

		const guestAccountNumber = guestAccountInput ? guestAccountInput.value.trim() : "";
		if (!guestAccountNumber) {
			setStatus("Please enter guest account number", "error");
			guestAccountInput?.focus();
			return;
		}

		if (!window.emailjs || EMAILJS_PUBLIC_KEY.startsWith("YOUR_") || EMAILJS_SERVICE_ID.startsWith("YOUR_") || EMAILJS_TEMPLATE_ID.startsWith("YOUR_")) {
			setStatus("EmailJS is not configured yet", "error");
			window.alert("EmailJS is not configured yet");
			return;
		}

		const orderTime = formatOrderTime(new Date());
		const totalPrice = calculateTotal(cart);
		const orderSummary = generateOrderSummary(guestAccountNumber, cart, orderTime);

		try {
			submitButton.disabled = true;
			setStatus("Submitting order...", "");

			await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
				guest_account: guestAccountNumber,
				order_time: orderTime,
				product_list: cart.map((item) => `${item.name} x${Number(item.quantity) || 0}`).join(", "),
				total_price: formatMoney(totalPrice),
				order_summary: orderSummary,
			});

			localStorage.removeItem(CART_KEY);
			window.dispatchEvent(new Event("cart:updated"));
			applyDefaultGuestAccountNumber();

			setStatus("Order submitted successfully", "success");
			window.alert("Bạn đã đặt hàng thành công - Cảm ơn bạn đã mua sắm tại Tokyo Shop");
		} catch (error) {
			console.error(error);
			const errorMessage = getErrorMessage(error);
			setStatus(errorMessage, "error");
			window.alert(errorMessage);
		} finally {
			if (submitButton) {
				submitButton.disabled = !getCart().length;
			}
		}
	}

	if (submitButton) {
		submitButton.addEventListener("click", submitOrder);
	}

	applyDefaultGuestAccountNumber();

	window.OrderSubmission = {
		getCart,
		calculateTotal,
		generateOrderSummary,
		submitOrder,
	};
});