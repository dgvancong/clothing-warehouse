// ==================== index.js - Quản lý sản phẩm ====================

// ==================== CẤU HÌNH API ====================
const API_URL = "https://localhost:5001/api/products";
const ORDER_API_URL = "https://localhost:5001/api/orders";

// ==================== DỮ LIỆU MÀU SẮC ====================
const colors = [
  { name: "Đen", value: "Đen", code: "#000000" },
  { name: "Trắng", value: "Trắng", code: "#FFFFFF" },
  { name: "Đỏ", value: "Đỏ", code: "#FF0000" },
  { name: "Xanh dương", value: "Xanh dương", code: "#0000FF" },
  { name: "Xanh lá", value: "Xanh lá", code: "#00FF00" },
  { name: "Vàng", value: "Vàng", code: "#FFFF00" },
  { name: "Tím", value: "Tím", code: "#800080" },
  { name: "Cam", value: "Cam", code: "#FFA500" },
  { name: "Hồng", value: "Hồng", code: "#FFC0CB" },
  { name: "Xám", value: "Xám", code: "#808080" },
  { name: "Nâu", value: "Nâu", code: "#8B4513" },
  { name: "Xanh ngọc", value: "Xanh ngọc", code: "#008080" },
  { name: "Vàng kim", value: "Vàng kim", code: "#FFD700" },
  { name: "Bạc", value: "Bạc", code: "#C0C0C0" },
];

// ==================== BIẾN TOÀN CỤC ====================
let allData = [];
let currentPage = 1;
let pageSize = 10;
let totalCount = 0;
let showPurchasePrice = {};
let currentSearchTerm = "";
let searchTimeout = null;
let cartItems = []; // Giỏ hàng

// ==================== HELPER FUNCTIONS ====================

// Format giá tiền
function formatPrice(price) {
  if (!price && price !== 0) return "0đ";
  return price.toLocaleString("vi-VN") + "đ";
}

// Parse chuỗi màu sắc
function parseColors(colorStr) {
  if (!colorStr) return [];
  if (Array.isArray(colorStr)) return colorStr;
  return colorStr.split(",");
}

// Lấy mã màu theo tên màu
function getColorCode(colorName) {
  const found = colors.find(
    (c) => c.name === colorName || c.value === colorName,
  );
  return found ? found.code : "#cbd5e1";
}

// Lấy class cho trạng thái
function getStatusClass(status) {
  if (status === "active" || status === "Đang bán") return "status-active";
  if (status === "inactive" || status === "Ngừng bán") return "status-inactive";
  return "status-pending";
}

// Lấy text hiển thị trạng thái
function getStatusText(status) {
  const statusMap = {
    active: "Đang bán",
    inactive: "Ngừng bán",
    pending: "Chờ duyệt",
    "Đang bán": "Đang bán",
    "Ngừng bán": "Ngừng bán",
  };
  return statusMap[status] || status || "Đang bán";
}

// Toggle hiển thị giá nhập
function togglePurchasePrice(productId) {
  showPurchasePrice[productId] = !showPurchasePrice[productId];
  renderTable();
}

// Kiểm tra có hiển thị giá nhập không
function isShowPurchasePrice(productId) {
  return showPurchasePrice[productId] || false;
}

// Lấy giá nhập hiển thị
function getDisplayPurchasePrice(product) {
  const productId = product?.productID;
  if (isShowPurchasePrice(productId)) {
    return formatPrice(product.purchasePrice);
  }
  return "•••••••";
}

// ==================== HIỂN THỊ LOADING ====================
function showLoading() {
  let loadingDiv = document.getElementById("loadingOverlay");
  if (!loadingDiv) {
    loadingDiv = document.createElement("div");
    loadingDiv.id = "loadingOverlay";
    loadingDiv.className = "loading-overlay";
    loadingDiv.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(loadingDiv);
  }
  loadingDiv.style.display = "flex";
}

function hideLoading() {
  const loadingDiv = document.getElementById("loadingOverlay");
  if (loadingDiv) {
    loadingDiv.style.display = "none";
  }
}

// Trích xuất thông báo lỗi từ response API
async function extractErrorMessage(response) {
  try {
    const data = await response.json();
    if (data.errors && typeof data.errors === 'object') {
      const errors = Object.values(data.errors).flat();
      return errors.join(", ");
    }
    return data.title || data.message || `Lỗi ${response.status}`;
  } catch (e) {
    return `Lỗi ${response.status}`;
  }
}

// ==================== HIỂN THỊ THÔNG BÁO ====================
function showNotification(message, type = "info") {
  let notification = document.getElementById("searchNotification");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "searchNotification";
    notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
    document.body.appendChild(notification);

    const style = document.createElement("style");
    style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
    document.head.appendChild(style);
  }

  let bgColor, textColor, icon;
  switch (type) {
    case "success":
      bgColor = "#dcfce7";
      textColor = "#15803d";
      icon = "✓";
      break;
    case "error":
      bgColor = "#fee2e2";
      textColor = "#dc2626";
      icon = "✗";
      break;
    default:
      bgColor = "#eff6ff";
      textColor = "#1e40af";
      icon = "ℹ";
  }

  notification.style.backgroundColor = bgColor;
  notification.style.color = textColor;
  notification.innerHTML = `${icon} ${message}`;
  notification.style.display = "block";

  setTimeout(() => {
    notification.style.animation = "fadeOut 0.3s ease";
    setTimeout(() => {
      notification.style.display = "none";
      notification.style.animation = "";
    }, 300);
  }, 3000);
}

// ==================== CẬP NHẬT PHÂN TRANG ====================
function updatePaginationInfo(start, end, total, currentPage, totalPages) {
  const startSpan = document.getElementById("startCount");
  const endSpan = document.getElementById("endCount");
  const totalSpan = document.getElementById("totalCount");
  const currentPageSpan = document.getElementById("currentPage");
  const totalPagesSpan = document.getElementById("totalPages");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");

  if (startSpan) startSpan.textContent = start;
  if (endSpan) endSpan.textContent = end;
  if (totalSpan) totalSpan.textContent = total;
  if (currentPageSpan) currentPageSpan.textContent = currentPage;
  if (totalPagesSpan) totalPagesSpan.textContent = totalPages || 1;

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

// ==================== CẬP NHẬT NÚT GIỎ HÀNG ====================
function updateCartButtonDisplay() {
  const cartButton = document.getElementById("cartButton");
  const cartCountSpan = document.getElementById("cartCount");

  if (!cartButton) return;

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (totalItems > 0) {
    // Có sản phẩm trong giỏ -> hiện nút
    cartButton.style.display = "flex";
    cartButton.disabled = false;
    cartButton.style.opacity = "1";
    cartButton.style.cursor = "pointer";
    if (cartCountSpan) {
      cartCountSpan.textContent = totalItems > 99 ? "99+" : totalItems;
      cartCountSpan.style.display = "flex";
    }
  } else {
    // Không có sản phẩm -> ẩn nút
    cartButton.style.display = "none";
    if (cartCountSpan) cartCountSpan.style.display = "none";
  }
}

// ==================== GỌI API ====================
async function getProductsFromAPI() {
  try {
    showLoading();

    const params = new URLSearchParams();
    params.append("pageNumber", currentPage.toString());
    params.append("pageSize", pageSize.toString());

    if (currentSearchTerm && currentSearchTerm.trim() !== "") {
      params.append("searchTerm", currentSearchTerm.trim());
    }

    const url = `${API_URL}?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();

    let productsData = [];

    if (result.items && Array.isArray(result.items)) {
      productsData = result.items;
      totalCount = result.totalCount || result.items.length;
    } else if (result.data && Array.isArray(result.data)) {
      productsData = result.data;
      totalCount = result.totalCount || result.data.length;
    } else if (result.results && Array.isArray(result.results)) {
      productsData = result.results;
      totalCount = result.totalCount || result.results.length;
    } else if (Array.isArray(result)) {
      productsData = result;
      totalCount = result.length;
    } else {
      let foundArray = false;
      for (let key in result) {
        if (Array.isArray(result[key])) {
          productsData = result[key];
          totalCount = result.totalCount || result[key].length;
          foundArray = true;
          break;
        }
      }
      if (!foundArray) {
        productsData = [];
        totalCount = 0;
      }
    }

    allData = productsData;
    renderTable();
  } catch (error) {
    console.error("Lỗi khi gọi API:", error);
    allData = [];
    totalCount = 0;
    renderTable();
    if (currentSearchTerm) {
      showNotification(`Lỗi tìm kiếm: ${error.message}`, "error");
    }
  } finally {
    hideLoading();
  }
}

// ==================== TÌM KIẾM SẢN PHẨM ====================
function handleSearchInput() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  const searchTerm = searchInput.value;
  const clearBtn = document.getElementById("searchClearBtn");

  if (clearBtn) {
    clearBtn.style.display = searchTerm.length > 0 ? "block" : "none";
  }

  if (searchTimeout) clearTimeout(searchTimeout);

  if (!searchTerm || searchTerm.trim() === "") {
    if (currentSearchTerm !== "") {
      currentSearchTerm = "";
      currentPage = 1;
      getProductsFromAPI();
      showNotification("Đã xóa tìm kiếm, hiển thị tất cả sản phẩm", "success");
    }
    return;
  }

  searchTimeout = setTimeout(() => {
    currentPage = 1;
    currentSearchTerm = searchTerm.trim();
    getProductsFromAPI();
  }, 500);
}

function resetSearch() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.value = "";
    currentSearchTerm = "";
    currentPage = 1;
    getProductsFromAPI();
    const clearBtn = document.getElementById("searchClearBtn");
    if (clearBtn) clearBtn.style.display = "none";
    showNotification("Đã xóa tìm kiếm", "success");
  }
}

function addClearButtonToSearch() {
  const searchWrapper = document.querySelector(
    ".search-wrapper .position-relative",
  );
  if (!searchWrapper || document.getElementById("searchClearBtn")) return;

  const clearBtn = document.createElement("button");
  clearBtn.id = "searchClearBtn";
  clearBtn.innerHTML = "✕";
  clearBtn.style.cssText = `
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        font-size: 14px;
        color: #94a3b8;
        cursor: pointer;
        display: none;
        padding: 4px 8px;
        border-radius: 50%;
        transition: all 0.2s;
        z-index: 10;
    `;
  clearBtn.onmouseover = () => (clearBtn.style.backgroundColor = "#f1f5f9");
  clearBtn.onmouseout = () => (clearBtn.style.backgroundColor = "transparent");
  clearBtn.onclick = resetSearch;

  searchWrapper.appendChild(clearBtn);
}

// ==================== GIỎ HÀNG - MODAL ====================

// Hiển thị modal thêm sản phẩm vào giỏ hàng
function showAddToCartModal(product) {
  let modal = document.getElementById("addToCartModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "addToCartModal";
    modal.className = "cart-modal-overlay";
    modal.innerHTML = `
            <div class="cart-modal">
                <div class="cart-modal-header">
                    <h3 class="cart-modal-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M6 6H20L18 16H8L6 6ZM6 6L5 3H2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="8" cy="20" r="1.5"/>
                            <circle cx="18" cy="20" r="1.5"/>
                        </svg>
                        Thêm vào giỏ hàng
                    </h3>
                    <button class="cart-modal-close" onclick="window.closeAddToCartModal()">×</button>
                </div>
                <div class="cart-modal-body">
                    <div class="product-info-modal">
                        <div class="product-info-row">
                            <span class="product-info-label">Mã sản phẩm:</span>
                            <span class="product-info-value" id="modalProductCode">-</span>
                        </div>
                        <div class="product-info-row">
                            <span class="product-info-label">Tên sản phẩm:</span>
                            <span class="product-info-value" id="modalProductName">-</span>
                        </div>
                        <div class="product-info-row">
                            <span class="product-info-label">Giá bán:</span>
                            <span class="product-info-value" id="modalProductPrice">-</span>
                        </div>
                        <div class="product-info-row">
                            <span class="product-info-label">Tồn kho:</span>
                            <span class="product-info-value" id="modalProductStock">-</span>
                        </div>
                    </div>
                    <div class="quantity-input-wrapper">
                        <label class="quantity-label">Số lượng:</label>
                        <div class="quantity-controls">
                            <button type="button" class="quantity-btn" onclick="window.decrementQuantity()">−</button>
                            <input type="number" id="cartQuantity" class="quantity-input" value="1" min="1" max="99">
                            <button type="button" class="quantity-btn" onclick="window.incrementQuantity()">+</button>
                        </div>
                        <div class="stock-warning" id="stockWarning" style="display: none;">
                            ⚠️ Số lượng vượt quá tồn kho!
                        </div>
                    </div>
                </div>
                <div class="cart-modal-footer">
                    <button class="cart-modal-btn btn-cancel" onclick="window.closeAddToCartModal()">Hủy</button>
                    <button class="cart-modal-btn btn-confirm" onclick="window.confirmAddToCart()">Xác nhận</button>
                </div>
            </div>
        `;
    document.body.appendChild(modal);

    const style = document.createElement("style");
    style.textContent = `
            .cart-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                visibility: hidden;
                opacity: 0;
                transition: all 0.3s ease;
            }
            .cart-modal-overlay.active {
                visibility: visible;
                opacity: 1;
            }
            .cart-modal {
                background: white;
                border-radius: 20px;
                width: 450px;
                max-width: 90%;
                box-shadow: 0 20px 35px rgba(0,0,0,0.2);
                animation: modalSlideIn 0.3s ease;
            }
            @keyframes modalSlideIn {
                from { transform: translateY(-30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .cart-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e9edf2;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .cart-modal-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 18px;
                font-weight: 600;
                color: #1e293b;
                margin: 0;
            }
            .cart-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #94a3b8;
                transition: all 0.2s;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
            }
            .cart-modal-close:hover {
                background: #f1f5f9;
                color: #1e293b;
            }
            .cart-modal-body {
                padding: 24px;
            }
            .product-info-modal {
                background: #f8fafc;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 20px;
            }
            .product-info-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e2e8f0;
            }
            .product-info-row:last-child {
                border-bottom: none;
            }
            .product-info-label {
                font-weight: 500;
                color: #64748b;
            }
            .product-info-value {
                color: #1e293b;
                font-weight: 500;
            }
            .quantity-input-wrapper {
                margin-top: 16px;
            }
            .quantity-label {
                display: block;
                font-weight: 500;
                color: #1e293b;
                margin-bottom: 12px;
            }
            .quantity-controls {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }
            .quantity-btn {
                width: 36px;
                height: 36px;
                border: 1px solid #e2e8f0;
                background: white;
                border-radius: 10px;
                font-size: 20px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .quantity-btn:hover {
                background: #f1f5f9;
                border-color: #cbd5e1;
            }
            .quantity-input {
                width: 160px;
                height: 36px;
                text-align: center;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 500;
            }
            .quantity-input:focus {
                outline: none;
                border-color: #03A9F4;
                box-shadow: 0 0 0 2px rgba(3,169,244,0.1);
            }
            .stock-warning {
                margin-top: 8px;
                color: #dc2626;
                font-size: 12px;
            }
            .cart-modal-footer {
                padding: 16px 24px 24px;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                border-top: 1px solid #e9edf2;
            }
            .cart-modal-btn {
                padding: 10px 24px;
                border-radius: 40px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }
            .btn-cancel {
                background: #f1f5f9;
                color: #475569;
            }
            .btn-cancel:hover {
                background: #e2e8f0;
            }
            .btn-confirm {
                background: #03A9F4;
                color: white;
            }
            .btn-confirm:hover {
                background: #0288d1;
                transform: translateY(-1px);
            }
        `;
    document.head.appendChild(style);
  }

  window.currentProductToAdd = product;

  document.getElementById("modalProductCode").textContent =
    product.productCode || product.productID || product.id || "—";
  document.getElementById("modalProductName").textContent =
    product.productName || product.name || "—";
  document.getElementById("modalProductPrice").textContent = formatPrice(
    product.sellingPrice || product.price,
  );
  document.getElementById("modalProductStock").textContent =
    product.quantityInStock || product.stock || 0;

  const quantityInput = document.getElementById("cartQuantity");
  if (quantityInput) quantityInput.value = 1;

  const stockWarning = document.getElementById("stockWarning");
  if (stockWarning) stockWarning.style.display = "none";

  modal.classList.add("active");
}

function closeAddToCartModal() {
  const modal = document.getElementById("addToCartModal");
  if (modal) modal.classList.remove("active");
  window.currentProductToAdd = null;
}

function incrementQuantity() {
  const input = document.getElementById("cartQuantity");
  const stock =
    window.currentProductToAdd?.quantityInStock ||
    window.currentProductToAdd?.stock ||
    99;
  let value = parseInt(input.value) || 1;
  if (value < stock) {
    input.value = value + 1;
    const warning = document.getElementById("stockWarning");
    if (warning) warning.style.display = "none";
  } else {
    const warning = document.getElementById("stockWarning");
    if (warning) warning.style.display = "block";
  }
}

function decrementQuantity() {
  const input = document.getElementById("cartQuantity");
  let value = parseInt(input.value) || 1;
  if (value > 1) {
    input.value = value - 1;
    const warning = document.getElementById("stockWarning");
    if (warning) warning.style.display = "none";
  }
}

function confirmAddToCart() {
  const product = window.currentProductToAdd;
  if (!product) return;
  const quantityInput = document.getElementById("cartQuantity");
  let quantity = parseInt(quantityInput.value) || 1;
  const maxStock = product.quantityInStock || product.stock || 99;

  if (quantity > maxStock) {
    showNotification(
      `Số lượng vượt quá tồn kho (tối đa: ${maxStock})`,
      "error",
    );
    return;
  }
  const productId = product.productID || product.id || product.productCode;
  const existingItem = cartItems.find((item) => item.id === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cartItems.push({
      id: productId,
      productID: product.productID,
      code: product.productCode,
      name: product.productName || product.name,
      price: product.sellingPrice || product.price,
      quantity: quantity,
    });
  }
  showNotification(
    `✅ Đã thêm ${quantity} ${product.productName || product.name} vào giỏ hàng!`,
    "success",
  );
  closeAddToCartModal();
  updateCartButtonDisplay();
}



// ==================== THANH TOÁN GIỎ HÀNG (HIỂN THỊ MODAL) ====================
async function checkoutCart() {
  if (cartItems.length === 0) {
    showNotification("Giỏ hàng trống, không thể thanh toán!", "error");
    return;
  }
  
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Tạo modal thanh toán nếu chưa có
  let checkoutModal = document.getElementById("checkoutInfoModal");
  if (!checkoutModal) {
    checkoutModal = document.createElement("div");
    checkoutModal.id = "checkoutInfoModal";
    checkoutModal.className = "checkout-modal-overlay";
    checkoutModal.innerHTML = `
      <div class="checkout-modal">
        <div class="checkout-modal-header">
          <div class="checkout-modal-title">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#03A9F4" stroke-width="1.5">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
              <path d="M8 14h.01M12 14h.01M16 14h.01" stroke-linecap="round"/>
            </svg>
            <div>
              <h3>Thông tin thanh toán</h3>
              <p class="modal-subtitle">Nhập thông tin để hoàn tất đơn hàng</p>
            </div>
          </div>
          <button class="checkout-modal-close" onclick="closeCheckoutModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        
        <div class="checkout-modal-body">
          <!-- Tóm tắt đơn hàng -->
          <div class="order-summary">
            <div class="order-summary-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" stroke-linecap="round"/>
              </svg>
              <span>Đơn hàng của bạn</span>
              <span class="order-items-count" id="orderItemsCount">${totalItems} sản phẩm</span>
            </div>
            <div class="order-items" id="orderItemsPreview"></div>
            <div class="order-total">
              <span>Tổng cộng:</span>
              <strong id="orderTotalAmount">0₫</strong>
            </div>
          </div>
          
          <!-- Form thông tin thanh toán -->
          <div class="checkout-form">
            <div class="form-row">
              <div class="form-group full-width">
                <label class="form-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  Phương thức thanh toán
                </label>
                <div class="payment-methods">
                  <label class="payment-method active">
                    <input type="radio" name="paymentMethod" value="COD" checked>
                    <span class="payment-icon">📦</span>
                    <div class="payment-info">
                      <strong>COD</strong>
                      <small>Thanh toán khi nhận hàng</small>
                    </div>
                  </label>
                  <label class="payment-method">
                    <input type="radio" name="paymentMethod" value="Chuyển khoản">
                    <span class="payment-icon">🏦</span>
                    <div class="payment-info">
                      <strong>Chuyển khoản</strong>
                      <small>Chuyển khoản ngân hàng</small>
                    </div>
                  </label>
                  <label class="payment-method">
                    <input type="radio" name="paymentMethod" value="Momo">
                    <span class="payment-icon">💜</span>
                    <div class="payment-info">
                      <strong>Ví Momo</strong>
                      <small>Thanh toán qua ví Momo</small>
                    </div>
                  </label>
                  <label class="payment-method">
                    <input type="radio" name="paymentMethod" value="ZaloPay">
                    <span class="payment-icon">💚</span>
                    <div class="payment-info">
                      <strong>ZaloPay</strong>
                      <small>Thanh toán qua ZaloPay</small>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">👤 Nhân viên bán hàng</label>
                <input type="text" id="salesPerson" class="form-control" value="Clothing Warehouse" placeholder="Nhân viên bán hàng">
              </div>
              <div class="form-group">
                <label class="form-label">💰 Giảm giá</label>
                <div class="discount-input-wrapper">
                  <span class="discount-symbol">₫</span>
                  <input type="text" id="discountAmount" class="form-control" value="0" placeholder="0">
                </div>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group full-width">
                <label class="form-label">📝 Ghi chú đơn hàng</label>
                <textarea id="orderNotes" class="form-control" rows="3" placeholder="Ghi chú về đơn hàng (nếu có)..."></textarea>
              </div>
            </div>
          </div>
        </div>
        
        <div class="checkout-modal-footer">
          <button class="btn-cancel-checkout" onclick="closeCheckoutModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
            </svg>
            Hủy bỏ
          </button>
          <button class="btn-confirm-checkout" id="confirmCheckoutBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
              <path d="M20 6L9 17l-5-5" stroke-linecap="round"/>
            </svg>
            Xác nhận đặt hàng
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(checkoutModal);
    
    // Thêm CSS cho modal thanh toán
    const style = document.createElement("style");
    style.textContent = `
      /* Checkout Modal Styles */
      .checkout-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10003;
        visibility: hidden;
        opacity: 0;
        transition: all 0.3s ease;
      }
      .checkout-modal-overlay.active {
        visibility: visible;
        opacity: 1;
      }
      .checkout-modal {
        background: white;
        border-radius: 28px;
        width: 650px;
        max-width: 90%;
        max-height: 85vh;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
        animation: slideInUp 0.35s ease;
      }
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .checkout-modal-header {
        padding: 20px 24px;
        background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
        border-bottom: 1px solid #e9edf2;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .checkout-modal-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .checkout-modal-title h3 {
        font-size: 18px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 4px 0;
      }
      .modal-subtitle {
        font-size: 12px;
        color: #64748b;
        margin: 0;
      }
      .checkout-modal-close {
        background: #f1f5f9;
        border: none;
        cursor: pointer;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .checkout-modal-close:hover {
        background: #fee2e2;
      }
      .checkout-modal-body {
        padding: 24px;
        max-height: 60vh;
        overflow-y: auto;
      }
      /* Order Summary */
      .order-summary {
        background: #f8fafc;
        border-radius: 20px;
        padding: 16px;
        margin-bottom: 24px;
      }
      .order-summary-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 12px;
        font-weight: 600;
        color: #1e293b;
      }
      .order-items-count {
        margin-left: auto;
        font-size: 12px;
        color: #64748b;
      }
      .order-items {
        margin-bottom: 12px;
        max-height: 200px;
        overflow-y: auto;
      }
      .order-item-preview {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid #e2e8f0;
      }
      .order-item-preview:last-child {
        border-bottom: none;
      }
      .order-item-name {
        font-size: 14px;
        color: #334155;
      }
      .order-item-price {
        font-weight: 600;
        color: #03A9F4;
      }
      .order-total {
        display: flex;
        justify-content: space-between;
        padding-top: 12px;
        font-size: 16px;
        font-weight: 700;
        border-top: 2px solid #e2e8f0;
        color: #1e293b;
      }
      /* Payment Methods */
      .payment-methods {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      .payment-method {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1.5px solid #e2e8f0;
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .payment-method:hover {
        border-color: #03A9F4;
        background: #f0f9ff;
      }
      .payment-method.active {
        border-color: #03A9F4;
        background: #f0f9ff;
      }
      .payment-method input {
        position: absolute;
        opacity: 0;
      }
      .payment-icon {
        font-size: 24px;
      }
      .payment-info strong {
        display: block;
        font-size: 14px;
        color: #1e293b;
      }
      .payment-info small {
        font-size: 10px;
        color: #64748b;
      }
      /* Form */
      .form-row {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
      }
      .form-group {
        flex: 1;
      }
      .form-group.full-width {
        flex: 100%;
      }
      .form-label {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #334155;
      }
      .form-control {
        width: 100%;
        padding: 10px 12px;
        border: 1.5px solid #e2e8f0;
        border-radius: 12px;
        font-size: 14px;
        transition: all 0.2s;
      }
      .form-control:focus {
        outline: none;
        border-color: #03A9F4;
        box-shadow: 0 0 0 3px rgba(3,169,244,0.1);
      }
      .discount-input-wrapper {
        position: relative;
      }
      .discount-symbol {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 14px;
        color: #94a3b8;
      }
      .discount-input-wrapper .form-control {
        padding-left: 28px;
        text-align: right;
      }
      .discount-input-wrapper .form-control:focus {
        text-align: left;
      }
      textarea.form-control {
        resize: vertical;
        min-height: 80px;
      }
      /* Footer */
      .checkout-modal-footer {
        padding: 16px 24px 24px;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        border-top: 1px solid #e9edf2;
        background: white;
      }
      .btn-cancel-checkout, .btn-confirm-checkout {
        padding: 10px 24px;
        border-radius: 40px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
        border: none;
      }
      .btn-cancel-checkout {
        background: #f1f5f9;
        color: #475569;
      }
      .btn-cancel-checkout:hover {
        background: #e2e8f0;
      }
      .btn-confirm-checkout {
        background: linear-gradient(135deg, #03A9F4 0%, #0288d1 100%);
        color: white;
      }
      .btn-confirm-checkout:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(3,169,244,0.3);
      }
      @media (max-width: 640px) {
        .form-row {
          flex-direction: column;
          gap: 12px;
        }
        .payment-methods {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
    
    // 🔧 GẮN EVENT LISTENER cho nút xác nhận đặt hàng
    const confirmBtn = checkoutModal.querySelector("#confirmCheckoutBtn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", confirmCheckout);
    }
  }
  
  // Cập nhật preview đơn hàng
  const orderItemsContainer = document.getElementById("orderItemsPreview");
  const orderTotalSpan = document.getElementById("orderTotalAmount");
  const orderItemsCount = document.getElementById("orderItemsCount");
  
  let itemsHtml = "";
  cartItems.forEach((item, idx) => {
    itemsHtml += `
      <div class="order-item-preview">
        <span class="order-item-name">${idx + 1}. ${item.name} x ${item.quantity}</span>
        <span class="order-item-price">${formatPrice(item.price * item.quantity)}</span>
      </div>
    `;
  });
  orderItemsContainer.innerHTML = itemsHtml;
  orderTotalSpan.textContent = formatPrice(total);
  if (orderItemsCount) orderItemsCount.textContent = `${totalItems} sản phẩm`;
  
  // Reset form
  const codRadio = document.querySelector('input[name="paymentMethod"][value="COD"]');
  if (codRadio) codRadio.checked = true;
  
  // Cập nhật active class cho payment methods
  const paymentMethods = document.querySelectorAll('.payment-method');
  paymentMethods.forEach(method => {
    method.addEventListener('click', function() {
      paymentMethods.forEach(m => m.classList.remove('active'));
      this.classList.add('active');
      const radio = this.querySelector('input');
      if (radio) radio.checked = true;
    });
  });
  
  const salesPersonInput = document.getElementById("salesPerson");
  const discountAmountInput = document.getElementById("discountAmount");
  const orderNotesInput = document.getElementById("orderNotes");
  
  if (salesPersonInput) salesPersonInput.value = "Clothing Warehouse";
  if (discountAmountInput) {
    discountAmountInput.value = "0";
    // Thêm event cho discount input
    setupDiscountInput();
  }
  if (orderNotesInput) orderNotesInput.value = "";
  
  // Hiển thị modal
  checkoutModal.classList.add("active");
}

// ==================== HÀM FORMAT SỐ VÀ CẬP NHẬT TỔNG TIỀN ====================

// Format số với dấu phân cách hàng nghìn
function formatNumberWithCommas(value) {
  if (!value && value !== 0) return '0';
  let cleanValue = value.toString().replace(/[^0-9]/g, '');
  if (!cleanValue) return '0';
  return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Chuyển đổi từ chuỗi có dấu phẩy về số
function parseNumberFromFormatted(value) {
  if (!value) return 0;
  return parseInt(value.toString().replace(/,/g, '')) || 0;
}

// Cập nhật tổng tiền sau khi giảm giá
function updateTotalAfterDiscount() {
  const discountInput = document.getElementById("discountAmount");
  const orderTotalSpan = document.getElementById("orderTotalAmount");
  
  if (!discountInput || !orderTotalSpan) return;
  
  // Tính tổng tiền gốc từ giỏ hàng
  const originalTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Lấy giá trị giảm giá (bỏ dấu phẩy)
  let discountValue = parseNumberFromFormatted(discountInput.value);
  
  // Đảm bảo giảm giá không âm và không vượt quá tổng tiền
  if (discountValue < 0) discountValue = 0;
  if (discountValue > originalTotal) discountValue = originalTotal;
  
  // Tính tổng tiền sau giảm giá
  const finalTotal = originalTotal - discountValue;
  
  // Thêm animation
  orderTotalSpan.classList.add('update');
  setTimeout(() => {
    orderTotalSpan.classList.remove('update');
  }, 300);
  
  // Cập nhật hiển thị tổng tiền
  orderTotalSpan.textContent = formatPrice(finalTotal);
  
  // Lưu giá trị giảm giá đã format vào input
  discountInput.value = formatNumberWithCommas(discountValue);
}

// Thiết lập sự kiện cho ô giảm giá
function setupDiscountInput() {
  const discountInput = document.getElementById("discountAmount");
  if (!discountInput) return;
  
  // Xóa event cũ nếu có bằng cách clone
  const newInput = discountInput.cloneNode(true);
  discountInput.parentNode.replaceChild(newInput, discountInput);
  
  // Thêm event mới
  newInput.addEventListener('input', function(e) {
    // Lưu vị trí con trỏ
    const cursorPos = e.target.selectionStart;
    
    // Lấy giá trị số
    let rawValue = this.value.replace(/,/g, '');
    if (rawValue === '') rawValue = '0';
    let numValue = parseInt(rawValue) || 0;
    
    // Format lại với dấu phẩy
    this.value = formatNumberWithCommas(numValue);
    
    // Khôi phục vị trí con trỏ
    const newCursorPos = Math.min(cursorPos + (this.value.length - rawValue.length), this.value.length);
    this.setSelectionRange(newCursorPos, newCursorPos);
    
    // Cập nhật tổng tiền
    updateTotalAfterDiscount();
  });
  
  newInput.addEventListener('blur', function() {
    let value = parseNumberFromFormatted(this.value);
    if (isNaN(value)) value = 0;
    this.value = formatNumberWithCommas(value);
    updateTotalAfterDiscount();
  });
  
  newInput.addEventListener('focus', function() {
    let value = parseNumberFromFormatted(this.value);
    this.value = value.toString();
  });
}

// Đóng modal thanh toán
function closeCheckoutModal() {
  const modal = document.getElementById("checkoutInfoModal");
  if (modal) modal.classList.remove("active");
}

// Xác nhận thanh toán và tạo đơn hàng
async function confirmCheckout() {
  const confirmBtn = document.getElementById("confirmCheckoutBtn");
  
  // Disable nút ngay lập tức để tránh click nhiều lần
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = "0.5";
    confirmBtn.style.cursor = "not-allowed";
  }
  
  try {
    // Lấy giá trị từ form
    const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = selectedPayment ? selectedPayment.value : "COD";
    const salesPerson = document.getElementById("salesPerson")?.value || "Clothing Warehouse";
    const discountInput = document.getElementById("discountAmount");
    let discountAmount = parseNumberFromFormatted(discountInput?.value) || 0;
    const notes = document.getElementById("orderNotes")?.value || "";
    
    closeCheckoutModal();
    
    const result = await createOrderFromCart(paymentMethod, salesPerson, discountAmount, notes);
    
    if (result) {
      await getProductsFromAPI();
      closeCartDetailModal();
      showNotification("✅ Đặt hàng thành công! Đơn hàng đã được tạo.", "success");
    }
  } finally {
    // Enable lại nút (nếu modal vẫn còn)
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = "1";
      confirmBtn.style.cursor = "pointer";
    }
  }
}

// Cập nhật hàm createOrderFromCart để nhận tham số
async function createOrderFromCart(paymentMethod, salesPerson, discountAmount, notes) {
  if (cartItems.length === 0) {
    showNotification("Giỏ hàng trống, không thể tạo đơn hàng!", "error");
    return false;
  }
  
  const orderData = {
    paymentMethod: paymentMethod,
    salesPerson: salesPerson,
    discountAmount: discountAmount,
    notes: notes,
    items: cartItems.map((item) => ({
      productID: item.productID || item.id,
      quantity: item.quantity,
      unitPrice: item.price,
      discountAmount: 0,
    })),
  };
  
  console.log("📦 Dữ liệu đơn hàng gửi đi:", orderData);
  
  try {
    showLoading();
    
    const response = await fetch(ORDER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      let errorMessage = `Lỗi ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.errors) {
          const errors = Object.values(errorData.errors).flat();
          errorMessage = errors.join(", ");
        } else if (errorData.title) {
          errorMessage = errorData.title;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("✅ Đơn hàng được tạo thành công:", result);
    
    // Cập nhật số lượng tồn kho
    for (const item of cartItems) {
      const product = allData.find(p => {
        const pId = p.productID || p.id || p.productCode;
        return pId && pId.toString() === (item.productID || item.id).toString();
      });
      
      if (product) {
        const newStock = (product.quantityInStock || product.stock || 0) - item.quantity;
        if (product.quantityInStock !== undefined) product.quantityInStock = newStock;
        if (product.stock !== undefined) product.stock = newStock;
      }
    }
    
    // Xóa giỏ hàng
    cartItems = [];
    updateCartButtonDisplay();
    
    return result;
    
  } catch (error) {
    console.error("❌ Lỗi khi tạo đơn hàng:", error);
    showNotification(`❌ Đặt hàng thất bại: ${error.message}`, "error");
    return null;
  } finally {
    hideLoading();
  }
}

// Cập nhật tổng tiền sau khi giảm giá (có animation)
function updateTotalAfterDiscount() {
  const discountInput = document.getElementById("discountAmount");
  const orderTotalSpan = document.getElementById("orderTotalAmount");
  
  if (!discountInput || !orderTotalSpan) return;
  
  const originalTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discountValue = parseNumberFromFormatted(discountInput.value);
  
  if (discountValue < 0) discountValue = 0;
  if (discountValue > originalTotal) discountValue = originalTotal;
  
  const finalTotal = originalTotal - discountValue;
  
  // Thêm animation
  orderTotalSpan.classList.add('update');
  setTimeout(() => {
    orderTotalSpan.classList.remove('update');
  }, 300);
  
  orderTotalSpan.textContent = formatPrice(finalTotal);
  discountInput.value = formatNumberWithCommas(discountValue);
}

// Xem giỏ hàng - Hiển thị modal đầy đủ
function viewCart() {
  if (cartItems.length === 0) {
    showNotification("Giỏ hàng của bạn đang trống!", "info");
    return;
  }
  let cartModal = document.getElementById("cartDetailModal");
  if (!cartModal) {
    cartModal = document.createElement("div");
    cartModal.id = "cartDetailModal";
    cartModal.className = "cart-detail-modal-overlay";
    cartModal.innerHTML = `
            <div class="cart-detail-modal">
                <div class="cart-detail-modal-header">
                    <h3 class="cart-detail-modal-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M6 6H20L18 16H8L6 6ZM6 6L5 3H2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="8" cy="20" r="1.5"/>
                            <circle cx="18" cy="20" r="1.5"/>
                        </svg>
                        Giỏ hàng của bạn
                    </h3>
                    <button class="cart-detail-modal-close" onclick="closeCartDetailModal()">×</button>
                </div>
                <div class="cart-detail-modal-body" id="cartDetailBody">
                    <!-- Nội dung giỏ hàng sẽ được render bằng JS -->
                </div>
                <div class="cart-detail-modal-footer">
                    <div class="cart-total-info">
                        <span class="cart-total-label">Tổng cộng:</span>
                        <span class="cart-total-amount" id="cartTotalAmount">0đ</span>
                    </div>
                    <div class="cart-modal-actions">
                        <button class="cart-modal-btn btn-cancel" onclick="closeCartDetailModal()">Hủy</button>
                        <button class="cart-modal-btn btn-checkout" onclick="checkoutCart()">Thanh toán</button>
                    </div>
                </div>
            </div>
        `;
    document.body.appendChild(cartModal);

    // Thêm CSS cho modal
    const style = document.createElement("style");
    style.textContent = `
            .cart-detail-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                visibility: hidden;
                opacity: 0;
                transition: all 0.3s ease;
            }
            .cart-detail-modal-overlay.active {
                visibility: visible;
                opacity: 1;
            }
            .cart-detail-modal {
                background: white;
                border-radius: 24px;
                width: 550px;
                max-width: 90%;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 35px rgba(0,0,0,0.2);
                animation: modalSlideIn 0.3s ease;
            }
            @keyframes modalSlideIn {
                from { transform: translateY(-30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .cart-detail-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e9edf2;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .cart-detail-modal-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 20px;
                font-weight: 600;
                color: #1e293b;
                margin: 0;
            }
            .cart-detail-modal-close {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: #94a3b8;
                transition: all 0.2s;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 10px;
            }
            .cart-detail-modal-close:hover {
                background: #f1f5f9;
                color: #1e293b;
            }
            .cart-detail-modal-body {
                flex: 1;
                overflow-y: auto;
                padding: 16px 24px;
                max-height: 400px;
            }
            .cart-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 0;
                border-bottom: 1px solid #edf2f7;
            }
            .cart-item-info {
                flex: 1;
            }
            .cart-item-name {
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 4px;
            }
            .cart-item-price {
                font-size: 13px;
                color: #64748b;
            }
            .cart-item-quantity {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .cart-qty-btn {
                width: 28px;
                height: 28px;
                border: 1px solid #e2e8f0;
                background: white;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.2s;
            }
            .cart-qty-btn:hover {
                background: #f1f5f9;
            }
            .cart-item-qty {
                min-width: 40px;
                text-align: center;
                font-weight: 500;
            }
            .cart-item-total {
                font-weight: 600;
                color: #03A9F4;
                min-width: 100px;
                text-align: right;
            }
            .cart-item-remove {
                cursor: pointer;
                padding: 6px;
                border-radius: 8px;
                transition: all 0.2s;
                margin-left: 12px;
            }
            .cart-item-remove:hover {
                background: #fee2e2;
            }
            .cart-item-remove svg {
                stroke: #94a3b8;
            }
            .cart-item-remove:hover svg {
                stroke: #dc2626;
            }
            .empty-cart {
                text-align: center;
                padding: 40px 20px;
                color: #94a3b8;
            }
            .cart-detail-modal-footer {
                padding: 16px 24px 24px;
                border-top: 1px solid #e9edf2;
            }
            .cart-total-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0;
                margin-bottom: 16px;
                font-size: 18px;
            }
            .cart-total-label {
                font-weight: 600;
                color: #1e293b;
            }
            .cart-total-amount {
                font-weight: 700;
                color: #03A9F4;
                font-size: 22px;
            }
            .cart-modal-actions {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            .cart-modal-btn {
                padding: 10px 28px;
                border-radius: 40px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }
            .btn-cancel {
                background: #f1f5f9;
                color: #475569;
            }
            .btn-cancel:hover {
                background: #e2e8f0;
            }
            .btn-checkout {
                background: #03A9F4;
                color: white;
            }
            .btn-checkout:hover {
                background: #0288d1;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(3,169,244,0.3);
            }
        `;
    document.head.appendChild(style);
  }

  // Render nội dung giỏ hàng
  renderCartDetail();

  // Hiển thị modal
  cartModal.classList.add("active");
}

// Render chi tiết giỏ hàng
function renderCartDetail() {
  const cartBody = document.getElementById("cartDetailBody");
  const totalAmountSpan = document.getElementById("cartTotalAmount");

  if (!cartBody) return;

  if (cartItems.length === 0) {
    cartBody.innerHTML = `
            <div class="empty-cart">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5">
                    <path d="M6 6H20L18 16H8L6 6ZM6 6L5 3H2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="8" cy="20" r="1.5"/>
                    <circle cx="18" cy="20" r="1.5"/>
                </svg>
                <p style="margin-top: 16px;">Giỏ hàng của bạn đang trống</p>
            </div>
        `;
    if (totalAmountSpan) totalAmountSpan.textContent = "0đ";
    return;
  }

  let total = 0;
  let cartHtml = "";

  cartItems.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    cartHtml += `
            <div class="cart-item" data-item-id="${item.id}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatPrice(item.price)}</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="cart-qty-btn" onclick="updateCartItemQuantity('${item.id}', -1)">−</button>
                    <span class="cart-item-qty">${item.quantity}</span>
                    <button class="cart-qty-btn" onclick="updateCartItemQuantity('${item.id}', 1)">+</button>
                </div>
                <div class="cart-item-total">${formatPrice(itemTotal)}</div>
                <div class="cart-item-remove" onclick="removeCartItem('${item.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" stroke-linecap="round"/>
                        <path d="M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" stroke-linecap="round"/>
                    </svg>
                </div>
            </div>
        `;
  });

  cartBody.innerHTML = cartHtml;
  if (totalAmountSpan) totalAmountSpan.textContent = formatPrice(total);
}

// ==================== FORMAT GIÁ TRỊ VÀ CẬP NHẬT TỔNG TIỀN ====================

// Format số với dấu phân cách hàng nghìn
function formatNumberWithCommas(value) {
  if (!value && value !== 0) return '0';
  let cleanValue = value.toString().replace(/[^0-9]/g, '');
  if (!cleanValue) return '0';
  return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Chuyển đổi từ chuỗi có dấu phẩy về số
function parseNumberFromFormatted(value) {
  if (!value) return 0;
  return parseInt(value.toString().replace(/,/g, '')) || 0;
}

// Cập nhật tổng tiền sau khi giảm giá
function updateTotalAfterDiscount() {
  const discountInput = document.getElementById("discountAmount");
  const orderTotalSpan = document.getElementById("orderTotalAmount");
  
  if (!discountInput || !orderTotalSpan) return;
  
  // Tính tổng tiền gốc từ giỏ hàng
  const originalTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Lấy giá trị giảm giá (bỏ dấu phẩy)
  let discountValue = parseNumberFromFormatted(discountInput.value);
  
  // Đảm bảo giảm giá không âm và không vượt quá tổng tiền
  if (discountValue < 0) discountValue = 0;
  if (discountValue > originalTotal) discountValue = originalTotal;
  
  // Tính tổng tiền sau giảm giá
  const finalTotal = originalTotal - discountValue;
  
  // Cập nhật hiển thị tổng tiền
  orderTotalSpan.textContent = formatPrice(finalTotal);
  
  // Lưu giá trị giảm giá đã format vào input
  discountInput.value = formatNumberWithCommas(discountValue);
}

// Thiết lập sự kiện cho ô giảm giá
function setupDiscountInput() {
  const discountInput = document.getElementById("discountAmount");
  if (!discountInput) return;
  
  // Xóa event cũ nếu có
  const newInput = discountInput.cloneNode(true);
  discountInput.parentNode.replaceChild(newInput, discountInput);
  
  // Thêm event mới
  newInput.addEventListener('input', function(e) {
    // Lưu vị trí con trỏ
    const cursorPos = e.target.selectionStart;
    
    // Lấy giá trị số
    let rawValue = this.value.replace(/,/g, '');
    if (rawValue === '') rawValue = '0';
    let numValue = parseInt(rawValue) || 0;
    
    // Format lại với dấu phẩy
    this.value = formatNumberWithCommas(numValue);
    
    // Khôi phục vị trí con trỏ
    const newCursorPos = cursorPos + (this.value.length - (rawValue.length + (rawValue.length > 0 ? 0 : 0)));
    this.setSelectionRange(newCursorPos, newCursorPos);
    
    // Cập nhật tổng tiền
    updateTotalAfterDiscount();
  });
  
  newInput.addEventListener('blur', function() {
    let value = parseNumberFromFormatted(this.value);
    if (isNaN(value)) value = 0;
    this.value = formatNumberWithCommas(value);
    updateTotalAfterDiscount();
  });
  
  newInput.addEventListener('focus', function() {
    let value = parseNumberFromFormatted(this.value);
    this.value = value.toString();
  });
}

// Cập nhật số lượng sản phẩm trong giỏ
function updateCartItemQuantity(productId, change) {
  const searchId = typeof productId === 'string' && !isNaN(Number(productId)) ? Number(productId) : productId;
  const itemIndex = cartItems.findIndex((item) => {
    const itemId = typeof item.id === 'string' && !isNaN(Number(item.id)) ? Number(item.id) : item.id;
    return itemId === searchId || item.id.toString() === productId.toString();
  });
  if (itemIndex === -1) return;
  const newQuantity = cartItems[itemIndex].quantity + change;
  if (newQuantity <= 0) {
    cartItems.splice(itemIndex, 1);
    showNotification("Đã xóa sản phẩm khỏi giỏ hàng", "info");
  } else {
    cartItems[itemIndex].quantity = newQuantity;
  }
  renderCartDetail();
  updateCartButtonDisplay();
  if (cartItems.length === 0) {
    closeCartDetailModal();
  }
}

// Xóa sản phẩm khỏi giỏ
function removeCartItem(productId) {
  const itemIndex = cartItems.findIndex((item) => item.id === productId);
  if (itemIndex !== -1) {
    const itemName = cartItems[itemIndex].name;
    cartItems.splice(itemIndex, 1);
    showNotification(`Đã xóa "${itemName}" khỏi giỏ hàng`, "success");

    renderCartDetail();
    updateCartButtonDisplay();

    if (cartItems.length === 0) {
      closeCartDetailModal();
    }
  }
}

// Đóng modal giỏ hàng chi tiết
function closeCartDetailModal() {
  const cartModal = document.getElementById("cartDetailModal");
  if (cartModal) cartModal.classList.remove("active");
}

// ==================== BỘ LỌC SẢN PHẨM ====================
let filterState = {
  isOpen: false,
  productType: "",
  selectedColors: [],
  priceRange: [0, 30000000],
  hasActiveFilters: false,
};

// Dữ liệu màu sắc cho bộ lọc (sử dụng 11 màu đầu tiên từ mảng colors chính)
// Nếu muốn thêm màu, chỉnh sửa mảng colors ở trên và thay đổi số slice nếu cần
const filterColors = colors.slice(0, 11);

// Khởi tạo bộ lọc
function initFilter() {
  renderColorOptions();
  setupFilterEventListeners();
}

// Render các tùy chọn màu sắc
function renderColorOptions() {
  const colorContainer = document.getElementById("colorOptions");
  if (!colorContainer) return;

  colorContainer.innerHTML = filterColors
    .map(
      (color) => `
        <div class="color-item" data-color="${color.value}" onclick="toggleColorFilter('${color.value}')">
            <div class="color-box" style="background-color: ${color.code}; border: ${color.name === "Trắng" ? "1px solid #ddd" : "none"}">
                ${filterState.selectedColors.includes(color.value) ? '<span class="check-icon">✓</span>' : ""}
            </div>
            <span class="color-name">${color.name}</span>
        </div>
    `,
    )
    .join("");
}

// Toggle chọn màu
function toggleColorFilter(colorValue) {
  const index = filterState.selectedColors.indexOf(colorValue);
  if (index === -1) {
    filterState.selectedColors.push(colorValue);
  } else {
    filterState.selectedColors.splice(index, 1);
  }

  // Cập nhật UI
  const colorItems = document.querySelectorAll(".color-item");
  colorItems.forEach((item) => {
    const color = item.getAttribute("data-color");
    if (color === colorValue) {
      if (filterState.selectedColors.includes(colorValue)) {
        item.classList.add("active");
        const colorBox = item.querySelector(".color-box");
        if (colorBox && !colorBox.querySelector(".check-icon")) {
          colorBox.innerHTML = '<span class="check-icon">✓</span>';
        }
      } else {
        item.classList.remove("active");
        const colorBox = item.querySelector(".color-box");
        if (colorBox) {
          colorBox.innerHTML = "";
        }
      }
    }
  });
}

// Cập nhật slider giá
function setupPriceSliders() {
  const minSlider = document.getElementById("priceMinRange");
  const maxSlider = document.getElementById("priceMaxRange");
  const minInput = document.getElementById("priceMinInput");
  const maxInput = document.getElementById("priceMaxInput");

  if (!minSlider || !maxSlider) return;

  function formatPriceValue(value) {
    return parseInt(value).toLocaleString("vi-VN");
  }

  function parsePriceValue(value) {
    return parseInt(value.replace(/[^0-9]/g, "")) || 0;
  }

  minSlider.addEventListener("input", function () {
    let value = parseInt(this.value);
    let max = parseInt(maxSlider.value);
    if (value > max) {
      value = max;
      this.value = value;
    }
    filterState.priceRange[0] = value;
    minInput.value = formatPriceValue(value);
    updatePriceSliders();
  });

  maxSlider.addEventListener("input", function () {
    let value = parseInt(this.value);
    let min = parseInt(minSlider.value);
    if (value < min) {
      value = min;
      this.value = value;
    }
    filterState.priceRange[1] = value;
    maxInput.value = formatPriceValue(value);
    updatePriceSliders();
  });

  minInput.addEventListener("change", function () {
    let value = parsePriceValue(this.value);
    if (isNaN(value)) value = 0;
    if (value < 0) value = 0;
    if (value > filterState.priceRange[1]) value = filterState.priceRange[1];
    filterState.priceRange[0] = value;
    minSlider.value = value;
    this.value = formatPriceValue(value);
    updatePriceSliders();
  });

  maxInput.addEventListener("change", function () {
    let value = parsePriceValue(this.value);
    if (isNaN(value)) value = 30000000;
    if (value > 30000000) value = 30000000;
    if (value < filterState.priceRange[0]) value = filterState.priceRange[0];
    filterState.priceRange[1] = value;
    maxSlider.value = value;
    this.value = formatPriceValue(value);
    updatePriceSliders();
  });
}

function updatePriceSliders() {
  const minSlider = document.getElementById("priceMinRange");
  const maxSlider = document.getElementById("priceMaxRange");
  if (minSlider && maxSlider) {
    minSlider.value = filterState.priceRange[0];
    maxSlider.value = filterState.priceRange[1];
  }
}

// Áp dụng preset giá
function applyPricePreset(min, max) {
  filterState.priceRange = [min, max];
  updatePriceSliders();

  const minInput = document.getElementById("priceMinInput");
  const maxInput = document.getElementById("priceMaxInput");
  if (minInput) minInput.value = min.toLocaleString("vi-VN");
  if (maxInput) maxInput.value = max.toLocaleString("vi-VN");
}

// Toggle dropdown bộ lọc
function toggleFilterDropdown() {
  const dropdown = document.getElementById("filterDropdown");
  if (!dropdown) return;

  filterState.isOpen = !filterState.isOpen;
  dropdown.style.display = filterState.isOpen ? "block" : "none";
}

// Đóng dropdown
function closeFilterDropdown() {
  const dropdown = document.getElementById("filterDropdown");
  if (dropdown) {
    dropdown.style.display = "none";
    filterState.isOpen = false;
  }
}

// Xóa tất cả bộ lọc
function clearAllFilters() {
  filterState.productType = "";
  filterState.selectedColors = [];
  filterState.priceRange = [0, 30000000];
  filterState.hasActiveFilters = false;

  // Cập nhật UI
  const productTypeSelect = document.getElementById("productTypeSelect");
  if (productTypeSelect) productTypeSelect.value = "";

  renderColorOptions();
  updatePriceSliders();

  const minInput = document.getElementById("priceMinInput");
  const maxInput = document.getElementById("priceMaxInput");
  if (minInput) minInput.value = "0";
  if (maxInput) maxInput.value = "30.000.000";

  updateActiveFilterBadge();
}

// Cập nhật badge hiển thị bộ lọc đang active
function updateActiveFilterBadge() {
  const hasFilters =
    filterState.productType !== "" ||
    filterState.selectedColors.length > 0 ||
    filterState.priceRange[0] > 0 ||
    filterState.priceRange[1] < 30000000;

  filterState.hasActiveFilters = hasFilters;
  const badge = document.getElementById("activeFilterBadge");
  if (badge) {
    badge.style.display = hasFilters ? "block" : "none";
  }
}

// Áp dụng bộ lọc và gọi API
function applyFilters() {
  // Lấy giá trị từ UI
  const productTypeSelect = document.getElementById("productTypeSelect");
  if (productTypeSelect) {
    filterState.productType = productTypeSelect.value;
  }

  updateActiveFilterBadge();

  // Gọi API với các tham số lọc
  currentPage = 1;
  getProductsFromAPIWithFilters();

  // Đóng dropdown
  closeFilterDropdown();
}

// Hủy bộ lọc (đóng dropdown mà không áp dụng)
function cancelFilters() {
  closeFilterDropdown();
}

// Gọi API có kèm bộ lọc
async function getProductsFromAPIWithFilters() {
  try {
    showLoading();

    const params = new URLSearchParams();
    params.append("pageNumber", currentPage.toString());
    params.append("pageSize", pageSize.toString());

    if (currentSearchTerm && currentSearchTerm.trim() !== "") {
      params.append("searchTerm", currentSearchTerm.trim());
    }

    // Thêm các tham số lọc
    if (filterState.productType) {
      params.append("categoryName", filterState.productType);
    }

    if (filterState.selectedColors.length > 0) {
      params.append("colors", filterState.selectedColors.join(","));
    }

    if (filterState.priceRange[0] > 0) {
      params.append("minPrice", filterState.priceRange[0].toString());
    }

    if (filterState.priceRange[1] < 30000000) {
      params.append("maxPrice", filterState.priceRange[1].toString());
    }

    const url = `${API_URL}?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();

    let productsData = [];
    if (result.items && Array.isArray(result.items)) {
      productsData = result.items;
      totalCount = result.totalCount || result.items.length;
    } else if (result.data && Array.isArray(result.data)) {
      productsData = result.data;
      totalCount = result.totalCount || result.data.length;
    } else if (Array.isArray(result)) {
      productsData = result;
      totalCount = result.length;
    } else {
      productsData = [];
      totalCount = 0;
    }

    allData = productsData;
    renderTable();

    const filterMsg = [];
    if (filterState.productType)
      filterMsg.push(`loại: ${filterState.productType}`);
    if (filterState.selectedColors.length)
      filterMsg.push(`màu: ${filterState.selectedColors.length}`);
    if (filterState.priceRange[0] > 0 || filterState.priceRange[1] < 30000000)
      filterMsg.push(
        `giá: ${formatPrice(filterState.priceRange[0])} - ${formatPrice(filterState.priceRange[1])}`,
      );

    if (filterMsg.length > 0) {
      showNotification(`Đã áp dụng bộ lọc: ${filterMsg.join(", ")}`, "success");
    }
  } catch (error) {
    console.error("Lỗi khi gọi API có bộ lọc:", error);
    showNotification("Lỗi khi áp dụng bộ lọc!", "error");
  } finally {
    hideLoading();
  }
}

// Thiết lập sự kiện cho bộ lọc
function setupFilterEventListeners() {
  const filterBtn = document.getElementById("filterBtn");
  const applyBtn = document.getElementById("applyFilterBtn");
  const cancelBtn = document.getElementById("cancelFilterBtn");
  const clearAllBtn = document.getElementById("clearAllFiltersBtn");
  const presetBtns = document.querySelectorAll(".price-preset-btn");

  if (filterBtn) {
    filterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFilterDropdown();
    });
  }

  if (applyBtn) applyBtn.addEventListener("click", applyFilters);
  if (cancelBtn) cancelBtn.addEventListener("click", cancelFilters);
  if (clearAllBtn) clearAllBtn.addEventListener("click", clearAllFilters);

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const min = parseInt(btn.getAttribute("data-min"));
      const max = parseInt(btn.getAttribute("data-max"));
      applyPricePreset(min, max);
    });
  });

  // Đóng dropdown khi click ra ngoài
  document.addEventListener("click", function (e) {
    const filterWrapper = document.getElementById("filterWrapper");
    if (
      filterWrapper &&
      !filterWrapper.contains(e.target) &&
      filterState.isOpen
    ) {
      closeFilterDropdown();
    }
  });

  setupPriceSliders();
}

// Khởi tạo bộ lọc khi trang load
initFilter();

// ==================== RENDER TABLE ====================
function renderTable() {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;

  const totalPages = Math.ceil(totalCount / pageSize);
  const start = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  if (!allData || allData.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center p-4">
                    <div style="padding: 40px 20px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin-bottom: 16px;">
                            <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" stroke-linecap="round"/>
                        </svg>
                        <h5 class="text-muted mb-2">${currentSearchTerm ? `Không tìm thấy sản phẩm cho "${currentSearchTerm}"` : "Không có dữ liệu"}</h5>
                        <p class="text-muted small">${currentSearchTerm ? "Vui lòng thử lại với từ khóa khác" : "Chưa có sản phẩm nào trong danh sách"}</p>
                    </div>
                </td>
            </tr>
        `;
    updatePaginationInfo(0, 0, 0, 1, 1);
    return;
  }

  tbody.innerHTML = "";

  allData.forEach((data, index) => {
    const row = document.createElement("tr");
    const productId =
      data.productID || data.id || data.productCode || `temp_${index}`;

    let colorHtml = '<span class="text-muted">—</span>';
    const colorsList = parseColors(data.color);
    if (colorsList.length > 0) {
      colorHtml = `
                <div class="color-tags">
                    ${colorsList
                      .map(
                        (colorName) => `
                        <span class="color-tag">
                            <span class="color-dot" style="background-color: ${getColorCode(colorName.trim())}; border: ${colorName === "Trắng" ? "1px solid #ddd" : "none"}"></span>
                            ${colorName}
                        </span>
                    `,
                      )
                      .join("")}
                </div>
            `;
    }

    row.innerHTML = `
            <td class="td-custom">${data.productCode || data.productID || data.id || "—"}</td>
            <td class="td-custom">${data.productName || data.name || "—"}</td>
            <td class="td-custom">${data.categoryName || data.category || "—"}</td>
            <td class="td-custom">${data.brandName || data.brand || "—"}</td>
            <td class="td-custom">${colorHtml}</td>
            <td class="td-custom">${data.size || "—"}</td>
            <td class="td-custom">
                <div class="price-display">
                    <span class="price-value">${getDisplayPurchasePrice({ ...data, productID: productId })}</span>
                    <span class="eye-icon" onclick="window.togglePurchasePrice('${productId}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </span>
                </div>
            </td>
            <td class="td-custom">${formatPrice(data.sellingPrice || data.price)}</td>
            <td class="td-custom">${data.quantityInStock || data.stock || 0}</td>
            <td class="td-custom">
                <span class="status-badge ${getStatusClass(data.status)}">
                    <span class="status-dot"></span>
                    ${getStatusText(data.status)}
                </span>
            </td>
            <td class="text-center">
                <div class="d-flex align-items-center justify-content-center gap-3">
                    <span class="action-btn" onclick="window.handleAddToCart('${productId}')" title="Thêm vào giỏ hàng">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M6 6H20L18 16H8L6 6ZM6 6L5 3H2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="8" cy="20" r="1.5"/>
                            <circle cx="18" cy="20" r="1.5"/>
                        </svg>
                    </span>
                    <span class="action-btn" onclick="window.handleDelete('${productId}')" title="Xóa sản phẩm">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" stroke-linecap="round"/>
                            <path d="M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" stroke-linecap="round"/>
                        </svg>
                    </span>
                </div>
            </td>
        `;
    tbody.appendChild(row);
  });

  updatePaginationInfo(start, end, totalCount, currentPage, totalPages);
}
// ==================== ACTION HANDLERS ====================
function handleAddToCart(productId) {
  const product = allData.find((p) => {
    const pId = p.productID || p.id || p.productCode;
    return pId && pId.toString() === productId.toString();
  });
  if (product) {
    showAddToCartModal(product);
  } else {
    showNotification("Không tìm thấy thông tin sản phẩm!", "error");
  }
}
// ==================== XÓA SẢN PHẨM ====================
// Hiển thị modal xác nhận xóa
function showDeleteConfirm(productId, productName) {
  let deleteModal = document.getElementById("deleteConfirmModal");
  if (!deleteModal) {
    deleteModal = document.createElement("div");
    deleteModal.id = "deleteConfirmModal";
    deleteModal.className = "delete-modal-overlay";
    deleteModal.innerHTML = `
            <div class="delete-modal">
                <div class="delete-modal-header">
                    <div class="delete-modal-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <h3 class="delete-modal-title">Xác nhận xóa</h3>
                    <button class="delete-modal-close" onclick="closeDeleteModal()">×</button>
                </div>
                <div class="delete-modal-body">
                    <p>Bạn có chắc chắn muốn xóa sản phẩm <strong id="deleteProductName"></strong>?</p>
                    <p class="delete-warning">Hành động này không thể hoàn tác!</p>
                </div>
                <div class="delete-modal-footer">
                    <button class="delete-modal-btn btn-cancel-delete" onclick="closeDeleteModal()">Hủy</button>
                    <button class="delete-modal-btn btn-confirm-delete" id="confirmDeleteBtn">Xóa sản phẩm</button>
                </div>
            </div>
        `;
    document.body.appendChild(deleteModal);
    const style = document.createElement("style");
    style.textContent = `
            .delete-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
                visibility: hidden;
                opacity: 0;
                transition: all 0.3s ease;
            }
            .delete-modal-overlay.active {
                visibility: visible;
                opacity: 1;
            }
            .delete-modal {
                background: white;
                border-radius: 20px;
                width: 400px;
                max-width: 90%;
                box-shadow: 0 20px 35px rgba(0,0,0,0.2);
                animation: modalSlideIn 0.3s ease;
                overflow: hidden;
            }
            .delete-modal-header {
                padding: 20px 24px;
                display: flex;
                align-items: center;
                gap: 12px;
                border-bottom: 1px solid #e9edf2;
                position: relative;
            }
            .delete-modal-icon {
                width: 40px;
                height: 40px;
                background: #fee2e2;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .delete-modal-icon svg {
                stroke: #dc2626;
                width: 20px;
                height: 20px;
            }
            .delete-modal-title {
                font-size: 18px;
                font-weight: 600;
                color: #1e293b;
                margin: 0;
                flex: 1;
            }
            .delete-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #94a3b8;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
            }
            .delete-modal-close:hover {
                background: #f1f5f9;
            }
            .delete-modal-body {
                padding: 24px;
            }
            .delete-modal-body p {
                margin: 0 0 12px 0;
                color: #475569;
                line-height: 1.5;
            }
            .delete-warning {
                color: #dc2626;
                font-size: 13px;
                background: #fef2f2;
                padding: 8px 12px;
                border-radius: 8px;
                margin-top: 12px;
            }
            .delete-modal-footer {
                padding: 16px 24px 24px;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                border-top: 1px solid #e9edf2;
            }
            .delete-modal-btn {
                padding: 10px 24px;
                border-radius: 40px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }
            .btn-cancel-delete {
                background: #f1f5f9;
                color: #475569;
            }
            .btn-cancel-delete:hover {
                background: #e2e8f0;
            }
            .btn-confirm-delete {
                background: #dc2626;
                color: white;
            }
            .btn-confirm-delete:hover {
                background: #b91c1c;
                transform: translateY(-1px);
            }
        `;
    document.head.appendChild(style);
  }
  const productNameSpan = document.getElementById("deleteProductName");
  if (productNameSpan) productNameSpan.textContent = productName;
  window.productToDelete = productId;
  deleteModal.classList.add("active");
}
// Đóng modal xóa
function closeDeleteModal() {
  const deleteModal = document.getElementById("deleteConfirmModal");
  if (deleteModal) deleteModal.classList.remove("active");
  window.productToDelete = null;
}
// Thực hiện xóa sản phẩm
async function executeDeleteProduct() {
  const productId = window.productToDelete;
  if (!productId) return;
  closeDeleteModal();
  try {
    showLoading();
    const url = `${API_URL}/${productId}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Không tìm thấy sản phẩm để xóa");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json().catch(() => ({}));
    showNotification("✅ Xóa sản phẩm thành công!", "success");
    currentPage = 1;
    await getProductsFromAPI();
  } catch (error) {
    console.error("Lỗi khi xóa sản phẩm:", error);
    showNotification(`❌ Xóa sản phẩm thất bại: ${error.message}`, "error");
  } finally {
    hideLoading();
  }
}
function handleDelete(productId) {
  const product = allData.find((p) => p.productID === productId);
  const productName = product?.productName || product?.name || "sản phẩm này";
  showDeleteConfirm(productId, productName);
}

// ==================== PAGINATION HANDLERS ====================
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    getProductsFromAPI();
  }
}

function nextPage() {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    getProductsFromAPI();
  }
}

function changePageSize() {
  const select = document.getElementById("pageSizeSelect");
  if (select) {
    pageSize = parseInt(select.value);
    currentPage = 1;
    getProductsFromAPI();
  }
}

// ==================== KHỞI TẠO ====================
document.addEventListener("DOMContentLoaded", function () {
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const pageSizeSelect = document.getElementById("pageSizeSelect");
  const searchInput = document.getElementById("searchInput");
  const cartButton = document.getElementById("cartButton");
  const addBtn = document.querySelector(".add");

  if (prevBtn) prevBtn.addEventListener("click", prevPage);
  if (nextBtn) nextBtn.addEventListener("click", nextPage);
  if (pageSizeSelect) pageSizeSelect.addEventListener("change", changePageSize);
  if (searchInput) searchInput.addEventListener("input", handleSearchInput);
  if (cartButton) cartButton.addEventListener("click", viewCart);
  if (addBtn) addBtn.addEventListener("click", openAddProductModal);

  document.addEventListener("click", function (e) {
  const confirmDeleteBtn = e.target.closest("#confirmDeleteBtn");
    if (confirmDeleteBtn) {
      executeDeleteProduct();
    }
  });
  
  addClearButtonToSearch();
  updateCartButtonDisplay();
  getProductsFromAPI();

});

// ==================== THÊM MỚI SẢN PHẨM ====================

// Mở modal thêm sản phẩm
function openAddProductModal() {
  const modal = document.getElementById("addProductModal");
  if (modal) {
    modal.style.display = "flex";
    document.getElementById("addProductForm").reset();
  }
}
// Đóng modal thêm sản phẩm
function closeAddProductModal() {
  const modal = document.getElementById("addProductModal");
  if (modal) {
    modal.style.display = "none";
  }
}
// Lấy giá trị màu sắc từ checkboxes
function getSelectedColors() {
  const checkboxes = document.querySelectorAll(
    '#colorGroup input[type="checkbox"]:checked',
  );
  const colors = [];
  checkboxes.forEach((cb) => {
    colors.push(cb.value);
  });
  return colors;
}
// Submit thêm sản phẩm
async function submitAddProduct() {
  const productCode = document.getElementById("productCode").value.trim();
  const productName = document.getElementById("productName").value.trim();
  const supplierName = document.getElementById("supplierName").value.trim();
  const categoryName = document.getElementById("categoryName").value || null;
  const color = getSelectedColors();
  const size = document.getElementById("size").value.trim() || null;
  const purchasePrice =
    parseFloat(document.getElementById("purchasePrice").value) || 0;
  const sellingPrice =
    parseFloat(document.getElementById("sellingPrice").value) || 0;
  const quantityInStock =
    parseInt(document.getElementById("quantityInStock").value) || 0;
  const description =
    document.getElementById("description").value.trim() || null;
  const brandName = document.getElementById("brandName").value.trim() || null;
  const material = document.getElementById("material").value.trim() || null;

  if (!productCode) {
    showNotification("Vui lòng nhập mã sản phẩm!", "error");
    return;
  }
  if (!productName) {
    showNotification("Vui lòng nhập tên sản phẩm!", "error");
    return;
  }
  if (!categoryName) {
    showNotification("Vui lòng chọn danh mục!", "error");
    return;
  }
  if (purchasePrice <= 0) {
    showNotification("Vui lòng nhập giá nhập hợp lệ!", "error");
    return;
  }
  if (sellingPrice <= 0) {
    showNotification("Vui lòng nhập giá bán hợp lệ!", "error");
    return;
  }
  if (quantityInStock < 0) {
    showNotification("Số lượng tồn kho không hợp lệ!", "error");
    return;
  }

  const productData = {
    productCode: productCode,
    productName: productName,
    supplierName: supplierName || null,
    categoryName: categoryName,
    color: color.length > 0 ? color.join(",") : null,
    size: size || null,
    purchasePrice: purchasePrice,
    sellingPrice: sellingPrice,
    quantityInStock: quantityInStock,
    description: description || null,
    brandName: brandName || null,
    material: material || null,
  };

  try {
    showLoading();
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      let errorMessage = `Lỗi ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.errors) {
          const errors = Object.values(errorData.errors).flat();
          errorMessage = errors.join(", ");
        } else if (errorData.title) {
          errorMessage = errorData.title;
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }

    const result = await response.json();
    showNotification("✅ Thêm sản phẩm thành công!", "success");
    closeAddProductModal();
    document.getElementById("addProductForm").reset();
    currentPage = 1;
    await getProductsFromAPI();
  } catch (error) {
    console.error("Lỗi khi thêm sản phẩm:", error);
    showNotification(`❌ Thêm sản phẩm thất bại: ${error.message}`, "error");
  } finally {
    hideLoading();
  }
}



// Export global functions
window.togglePurchasePrice = togglePurchasePrice;
window.handleAddToCart = handleAddToCart;
window.prevPage = prevPage;
window.nextPage = nextPage;
window.resetSearch = resetSearch;
window.closeAddToCartModal = closeAddToCartModal;
window.incrementQuantity = incrementQuantity;
window.decrementQuantity = decrementQuantity;
window.viewCart = viewCart;
window.closeCartDetailModal = closeCartDetailModal;
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeCartItem = removeCartItem;
window.checkoutCart = checkoutCart;  
window.closeCheckoutModal = closeCheckoutModal;
window.confirmCheckout = confirmCheckout; 
window.createOrderFromCart = createOrderFromCart;
window.showDeleteConfirm = showDeleteConfirm;
window.closeDeleteModal = closeDeleteModal;
window.executeDeleteProduct = executeDeleteProduct;
window.handleDelete = handleDelete;