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
let cartItems = [];
let selectedVariant = null;
let selectedColor = null;
let currentProductToAdd = null;
let selectedSizeData = null;
let filterState = {
  isOpen: false,
  productType: "",
  selectedColors: [],
  priceRange: [0, 30000000],
  hasActiveFilters: false,
};
const filterColors = colors.slice(0, 11);
let colorVariantCount = 1;
let currentEditProduct = null;
let editColorVariantsData = [];

// ==================== HELPER FUNCTIONS ====================

function formatPrice(price) {
  if (!price && price !== 0) return "0đ";
  return price.toLocaleString("vi-VN") + "đ";
}

function formatPurchasePrice(input) {
  let value = parseFloat(input.value) || 0;
  const displaySpan = document.getElementById("purchasePriceDisplay");
  if (displaySpan) {
    displaySpan.textContent = formatPrice(value);
  }
}

// Format giá bán
function formatSellingPrice(input) {
  let value = parseFloat(input.value) || 0;
  const displaySpan = document.getElementById("sellingPriceDisplay");
  if (displaySpan) {
    displaySpan.textContent = formatPrice(value);
  }
}

// ========== KHỞI TẠO GIÁ TRỊ MẶC ĐỊNH ==========
function initPriceDisplay() {
  const purchaseInput = document.getElementById("purchasePrice");
  const sellingInput = document.getElementById("sellingPrice");

  if (purchaseInput) {
    formatPurchasePrice(purchaseInput);
  }
  if (sellingInput) {
    formatSellingPrice(sellingInput);
  }
}

// Gọi khi trang load
document.addEventListener("DOMContentLoaded", () => {
  initPriceDisplay();
});

function parseColors(colorStr) {
  if (!colorStr) return [];
  if (Array.isArray(colorStr)) return colorStr;
  return colorStr.split(",");
}

function getColorCode(colorName) {
  const found = colors.find(
    (c) => c.name === colorName || c.value === colorName,
  );
  return found ? found.code : "#cbd5e1";
}

function getStatusClass(status) {
  if (status === "active" || status === "Đang bán") return "status-active";
  if (status === "status-out-of-stock" || status === "Hết hàng")
    return "status-outstock";
  if (status === "inactive" || status === "Ngừng bán") return "status-inactive";
  return "status-pending";
}

function getStatusText(status) {
  const statusMap = {
    active: "Đang bán",
    inactive: "Ngừng bán",
    outstock: "Hết hàng",
    pending: "Chờ duyệt",
    "Đang bán": "Đang bán",
    "Ngừng bán": "Ngừng bán",
    "Hết hàng": "Hết hàng",
  };
  return statusMap[status] || status || "Đang bán";
}

function togglePurchasePrice(productId) {
  showPurchasePrice[productId] = !showPurchasePrice[productId];
  renderTable();
}

function isShowPurchasePrice(productId) {
  return showPurchasePrice[productId] || false;
}

function getDisplayPurchasePrice(product) {
  const productId = product?.productID;
  const purchasePrice =
    product?.variants?.[0]?.purchasePrice || product?.purchasePrice;
  if (isShowPurchasePrice(productId)) {
    return formatPrice(purchasePrice);
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

async function extractErrorMessage(response) {
  try {
    const data = await response.json();
    if (data.errors && typeof data.errors === "object") {
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
    cartButton.style.display = "flex";
    cartButton.disabled = false;
    cartButton.style.opacity = "1";
    cartButton.style.cursor = "pointer";
    if (cartCountSpan) {
      cartCountSpan.textContent = totalItems > 99 ? "99+" : totalItems;
      cartCountSpan.style.display = "flex";
    }
  } else {
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
    } else if (Array.isArray(result)) {
      productsData = result;
      totalCount = result.length;
    } else {
      productsData = [];
      totalCount = 0;
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
          <!-- Thông tin sản phẩm -->
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
              <span class="product-info-label">Thương hiệu:</span>
              <span class="product-info-value" id="modalProductBrand">-</span>
            </div>
          </div>

          <!-- Chọn màu sắc -->
          <div class="variant-group" id="colorGroup">
            <label class="variant-label">
            Màu sắc <span class="required">*</span>
            </label>
            <div class="variant-options" id="colorOptions">
              <span class="placeholder-text">Đang tải màu sắc...</span>
            </div>
          </div>

          <!-- Chọn kích thước -->
          <div class="variant-group" id="sizeGroup">
            <label class="variant-label">
              Kích thước <span class="required">*</span>
            </label>
            <div class="variant-options" id="sizeOptions">
              <span class="placeholder-text">Vui lòng chọn màu sắc trước</span>
            </div>
          </div>

          <!-- Số lượng -->
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

          <!-- Thông tin đã chọn -->
          <div class="selected-info" id="selectedVariantInfo" style="display: none;">
            <div class="selected-tag">
              <span class="selected-label">Đã chọn:</span>
              <span class="selected-value" id="selectedColorText">-</span>
              <span class="selected-separator">-</span>
              <span class="selected-value" id="selectedSizeText">-</span>
            </div>
            <div class="selected-stock">
              Tồn kho: <strong id="selectedStock">0</strong> sản phẩm
            </div>
          </div>
        </div>
        <div class="cart-modal-footer">
          <button class="cart-modal-btn btn-cancel" onclick="window.closeAddToCartModal()">Hủy</button>
          <button class="cart-modal-btn btn-confirm" onclick="window.confirmAddToCart()">Thêm vào giỏ</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const qtyInput = modal.querySelector("#cartQuantity");
    qtyInput.addEventListener("input", () => {
      const max = parseInt(qtyInput.max);
      const value = parseInt(qtyInput.value);
      if (value > max) {
        qtyInput.value = max;
        modal.querySelector("#stockWarning").style.display = "block";
      } else {
        modal.querySelector("#stockWarning").style.display = "none";
      }
    });
    if (!document.getElementById("cartModalStyles")) {
      const style = document.createElement("style");
      style.id = "cartModalStyles";
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
          border-radius: 24px;
          width: 500px;
          max-width: 90%;
          max-height: 85vh;
          overflow: hidden;
          box-shadow: 0 20px 35px rgba(0,0,0,0.2);
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
          margin: 0;
        }
        .cart-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: 8px;
        }
        .cart-modal-body {
          padding: 20px 24px;
          max-height: 60vh;
          overflow-y: auto;
        }
        .product-info-modal {
          background: #f8fafc;
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
        }
        .product-info-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #e2e8f0;
          font-size: 13px;
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
        .variant-group {
          margin-bottom: 20px;
        }
        .variant-label {
          display: block;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .required {
          color: #ef4444;
        }
        .variant-options {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .variant-option {
          padding: 8px 18px;
          border: 1.5px solid #e2e8f0;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
          background: white;
          color: #334155;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .variant-option:hover {
          border-color: #03A9F4;
          background: #f0f9ff;
        }
        .variant-option.selected {
          background: #03A9F4;
          border-color: #03A9F4;
          color: white;
        }
        .color-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: inline-block;
        }
        .placeholder-text {
          color: #94a3b8;
          font-size: 13px;
          padding: 8px 0;
        }
        .quantity-input-wrapper {
          margin-top: 20px;
        }
        .quantity-label {
          display: block;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 10px;
          font-size: 13px;
        }
        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .quantity-btn {
          width: 36px;
          height: 36px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 10px;
          font-size: 18px;
          cursor: pointer;
        }
        .quantity-input {
          width: 100px;
          height: 36px;
          text-align: center;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
        }
        .stock-warning {
          margin-top: 8px;
          color: #dc2626;
          font-size: 12px;
        }
        .selected-info {
          background: #eef2ff;
          border-radius: 12px;
          padding: 12px;
          margin-top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .selected-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }
        .selected-label {
          color: #64748b;
        }
        .selected-value {
          font-weight: 600;
          color: #1e293b;
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
          border: none;
        }
        .btn-cancel {
          background: #f1f5f9;
          color: #475569;
        }
        .btn-confirm {
          background: #03A9F4;
          color: white;
        }
      `;
      document.head.appendChild(style);
    }
  }
  document.getElementById("modalProductCode").textContent =
    product.productCode || "—";
  document.getElementById("modalProductName").textContent =
    product.productName || "—";
  document.getElementById("modalProductBrand").textContent =
    product.brandName || "—";

  const sellingPrice = product.sellingPrice || 0;
  document.getElementById("modalProductPrice").textContent =
    formatPrice(sellingPrice);

  window.currentProductToAdd = product;
  window.selectedColor = null;
  window.selectedSizeData = null;

  if (product.variants && product.variants?.length > 0) {
    document.getElementById("colorGroup").style.display = "block";
    document.getElementById("sizeGroup").style.display = "block";
  } else {
    document.getElementById("colorGroup").style.display = "none";
    document.getElementById("sizeGroup").style.display = "none";
  }
  const qtyInput = modal.querySelector("#cartQuantity");
  qtyInput.value = 1;
  qtyInput.max = 1;
  qtyInput.disabled = true;
  modal.querySelector("#stockWarning").style.display = "none";
  modal.querySelector("#selectedVariantInfo").style.display = "none";
  modal.classList.add("active");
  requestAnimationFrame(() => {
    renderColorOptionsDirect(product);
  });
}

function renderColorOptionsDirect(product) {
  const colorMap = new Map();
  product.variants.forEach((v) => {
    if (!colorMap.has(v.colorName)) {
      colorMap.set(v.colorName, {
        colorName: v.colorName,
        colorCode: v.colorCode,
      });
    }
  });
  const colorList = Array.from(colorMap.values());
  const modal = document.getElementById("addToCartModal");
  const colorContainer = modal.querySelector("#colorOptions");
  if (!colorContainer) return;
  if (colorList.length === 0) {
    colorContainer.innerHTML = `<span class="placeholder-text">Không có màu sắc</span>`;
    return;
  }
  colorContainer.innerHTML = colorList
    .map(
      (color) => `
    <div class="variant-option color-option"
         data-color="${color.colorName}"
         onclick="selectColor(this.dataset.color)">
      <span class="color-dot"
            style="background:${color.colorCode}; width:16px; height:16px; border-radius:50%;">
      </span>
      ${color.colorName}
    </div>
  `,
    )
    .join("");
  window.currentProductVariants = product.variants;
}

function selectColor(colorName) {
  const modal = document.getElementById("addToCartModal");

  // Lưu màu đã chọn
  window.selectedColor = colorName;

  // 👇 RESET SIZE ĐÃ CHỌN
  window.selectedSizeData = null;
  window.selectedSizeName = null;

  // Cập nhật UI màu sắc
  modal.querySelectorAll(".color-option").forEach((opt) => {
    opt.classList.toggle("selected", opt.dataset.color === colorName);
  });

  // Lọc size theo màu
  const variants = window.currentProductVariants || [];
  const sizes = variants.filter((v) => v.colorName === colorName);

  // Render lại danh sách size (không có class selected)
  const sizeContainer = modal.querySelector("#sizeOptions");

  if (!sizes || sizes.length === 0) {
    sizeContainer.innerHTML =
      '<span class="placeholder-text">Không có kích thước cho màu này</span>';
  } else {
    sizeContainer.innerHTML = sizes
      .map(
        (s) => `
        <div class="variant-option size-option ${s.quantityInStock === 0 ? "disabled" : ""}"
             data-size="${s.sizeName}"
             data-stock="${s.quantityInStock}"
             data-price="${s.sellingPrice}"
             data-variant-id="${s.variantID}"
             data-size-id="${s.sizeID}"
             onclick="${s.quantityInStock === 0 ? "" : `selectSize('${s.sizeName}', ${s.quantityInStock}, ${s.sellingPrice}, ${s.variantID}, ${s.sizeID})`}"
             style="${s.quantityInStock === 0 ? "opacity:0.5;pointer-events:none;cursor:not-allowed;" : ""}">
          ${s.sizeName}
          <span style="font-size: 11px; margin-left: 4px; ${s.quantityInStock === 0 ? "color:#dc2626" : "color:#64748b"}">
            (${s.quantityInStock})
          </span>
        </div>
      `,
      )
      .join("");
  }

  // Reset số lượng
  const qtyInput = modal.querySelector("#cartQuantity");
  if (qtyInput) {
    qtyInput.disabled = true;
    qtyInput.value = 1;
    qtyInput.max = 1;
  }

  // Ẩn thông tin đã chọn
  const selectedInfo = modal.querySelector("#selectedVariantInfo");
  if (selectedInfo) selectedInfo.style.display = "none";

  // Reset text size và stock
  const selectedSizeText = document.getElementById("selectedSizeText");
  const selectedStock = document.getElementById("selectedStock");
  if (selectedSizeText) selectedSizeText.textContent = "-";
  if (selectedStock) selectedStock.textContent = "0";
}

function selectSize(sizeName, stock, price, variantID, sizeID) {
  const modal = document.getElementById("addToCartModal");

  // Lưu kích thước đã chọn
  window.selectedSizeData = {
    sizeName: sizeName,
    stock: stock,
    sellingPrice: price,
    variantID: variantID,
    sizeID: sizeID,
  };
  window.selectedSizeName = sizeName;

  // 👉 Xóa class selected của tất cả size, sau đó chỉ thêm cho size được chọn
  const allSizeOptions = modal.querySelectorAll(".size-option");
  allSizeOptions.forEach((opt) => {
    opt.classList.remove("selected");
  });

  // Thêm class selected cho size vừa chọn
  const selectedDiv = Array.from(allSizeOptions).find(
    (opt) => opt.getAttribute("data-size") === sizeName,
  );
  if (selectedDiv) {
    selectedDiv.classList.add("selected");
  }

  // Cập nhật số lượng
  const qtyInput = modal.querySelector("#cartQuantity");
  if (qtyInput) {
    qtyInput.disabled = false;
    qtyInput.max = stock;
    qtyInput.value = 1;
  }

  // Ẩn cảnh báo
  const stockWarning = modal.querySelector("#stockWarning");
  if (stockWarning) stockWarning.style.display = "none";

  // Hiển thị thông tin đã chọn
  const selectedInfo = modal.querySelector("#selectedVariantInfo");
  if (selectedInfo) selectedInfo.style.display = "flex";

  // Cập nhật text
  const selectedSizeText = document.getElementById("selectedSizeText");
  const selectedStockSpan = document.getElementById("selectedStock");

  if (selectedSizeText) selectedSizeText.textContent = sizeName;
  if (selectedStockSpan) selectedStockSpan.textContent = stock;
}

function confirmAddToCart() {
  const product = window.currentProductToAdd;
  if (!product) return;
  if (product.variants && product.variants.length > 0) {
    if (!window.selectedColor || !window.selectedSizeData) {
      showNotification("Vui lòng chọn đầy đủ màu sắc và kích thước!", "error");
      return;
    }
    const quantityInput = document.getElementById("cartQuantity");
    let quantity = parseInt(quantityInput.value) || 1;
    const variant = product.variants.find(
      (v) =>
        v.colorName === window.selectedColor &&
        v.sizeName === window.selectedSizeData.sizeName,
    );
    if (!variant) {
      showNotification("Không tìm thấy biến thể sản phẩm!", "error");
      return;
    }
    const maxStock = variant.quantityInStock;
    const variantItem = {
      id: variant.variantID,
      productID: product.productID,
      productCode: product.productCode,
      name: product.productName,
      color: variant.colorName,
      colorID: variant.colorID,
      colorCode: variant.colorCode,
      size: variant.sizeName,
      sizeID: variant.sizeID,
      price: product.sellingPrice,
      quantity: quantity,
      brandName: product.brandName,
      categoryName: product.categoryName,
    };
    const existingItem = cartItems.find(
      (item) =>
        item.productID === product.productID &&
        item.colorID === variant.colorID &&
        item.sizeID === variant.sizeID,
    );
    let currentQty = existingItem ? existingItem.quantity : 0;
    let totalAfterAdd = currentQty + quantity;
    if (totalAfterAdd > maxStock) {
      showNotification(
        `❌ Không đủ tồn kho! (Tồn kho: ${maxStock}, trong giỏ: ${currentQty})`,
        "error",
      );
      return;
    }
    if (existingItem) {
      existingItem.quantity = totalAfterAdd;
    } else {
      cartItems.push(variantItem);
    }

    showNotification(
      `✅ Đã thêm ${quantity} ${product.productName} (${variant.colorName} - ${variant.sizeName}) vào giỏ hàng!`,
      "success",
    );
  } else {
    const quantityInput = document.getElementById("cartQuantity");
    let quantity = parseInt(quantityInput.value) || 1;
    const maxStock = product.quantityInStock || 99;
    const productId = product.productID || product.id || product.productCode;
    const existingItem = cartItems.find((item) => item.id === productId);
    let currentQty = existingItem ? existingItem.quantity : 0;
    let totalAfterAdd = currentQty + quantity;
    if (totalAfterAdd > maxStock) {
      showNotification(
        `❌ Không đủ tồn kho! (Tồn kho: ${maxStock}, trong giỏ: ${currentQty})`,
        "error",
      );
      return;
    }
    if (existingItem) {
      existingItem.quantity = totalAfterAdd;
    } else {
      cartItems.push({
        id: productId,
        productID: product.productID,
        productCode: product.productCode,
        name: product.productName,
        price: product.sellingPrice || product.price,
        quantity: quantity,
        brandName: product.brandName,
        categoryName: product.categoryName,
      });
    }

    showNotification(
      `✅ Đã thêm ${quantity} ${product.productName} vào giỏ hàng!`,
      "success",
    );
  }
  closeAddToCartModal();
  updateCartButtonDisplay();
}

function closeAddToCartModal() {
  const modal = document.getElementById("addToCartModal");
  if (modal) {
    modal.classList.remove("active");
    const colorOptions = modal.querySelectorAll(".color-option");
    colorOptions.forEach((opt) => opt.classList.remove("selected"));
    const sizeOptions = modal.querySelectorAll(".size-option");
    sizeOptions.forEach((opt) => opt.classList.remove("selected"));
    const sizeContainer = modal.querySelector("#sizeOptions");
    if (sizeContainer) {
      sizeContainer.innerHTML =
        '<span class="placeholder-text">Vui lòng chọn màu sắc trước</span>';
    }
    const qtyInput = modal.querySelector("#cartQuantity");
    if (qtyInput) {
      qtyInput.value = 1;
      qtyInput.disabled = true;
      qtyInput.max = 1;
    }
    const stockWarning = modal.querySelector("#stockWarning");
    if (stockWarning) stockWarning.style.display = "none";
    const selectedInfo = modal.querySelector("#selectedVariantInfo");
    if (selectedInfo) selectedInfo.style.display = "none";
    const selectedColorText = document.getElementById("selectedColorText");
    const selectedSizeText = document.getElementById("selectedSizeText");
    const selectedStock = document.getElementById("selectedStock");
    if (selectedColorText) selectedColorText.textContent = "-";
    if (selectedSizeText) selectedSizeText.textContent = "-";
    if (selectedStock) selectedStock.textContent = "0";
  }
  window.currentProductToAdd = null;
  window.selectedColor = null;
  window.selectedSizeData = null;
  window.selectedSizeName = null;
  window.currentAvailableSizes = [];
}

function selectSizeVariant(sizeName, stock, price, variantID, sizeID) {
  // Lưu kích thước đã chọn
  window.selectedSizeData = {
    sizeName: sizeName,
    stock: stock,
    sellingPrice: price,
    variantID: variantID,
    sizeID: sizeID,
  };
  window.selectedSizeName = sizeName;

  // Xóa class selected của tất cả size
  const allSizeOptions = document.querySelectorAll(".size-option");
  allSizeOptions.forEach((opt) => opt.classList.remove("selected"));

  // Thêm class selected cho size được chọn
  const selectedDiv = Array.from(allSizeOptions).find(
    (opt) => opt.getAttribute("data-size") === sizeName,
  );
  if (selectedDiv) {
    selectedDiv.classList.add("selected");
  }

  // Cập nhật số lượng
  const qtyInput = document.getElementById("cartQuantity");
  if (qtyInput) {
    qtyInput.disabled = false;
    qtyInput.max = stock;
    qtyInput.value = 1;
  }

  // Hiển thị thông tin đã chọn
  const selectedInfo = document.getElementById("selectedVariantInfo");
  if (selectedInfo) selectedInfo.style.display = "flex";

  // Cập nhật text
  const selectedSizeText = document.getElementById("selectedSizeText");
  const selectedStockSpan = document.getElementById("selectedStock");

  if (selectedSizeText) selectedSizeText.textContent = sizeName;
  if (selectedStockSpan) selectedStockSpan.textContent = stock;
}

window.incrementQuantity = function () {
  const modal = document.getElementById("addToCartModal");
  const input = modal.querySelector("#cartQuantity");

  if (input.disabled) return;

  let val = parseInt(input.value) || 1;
  const max = parseInt(input.max);

  if (val < max) input.value = val + 1;
};

window.decrementQuantity = function () {
  const modal = document.getElementById("addToCartModal");
  const input = modal.querySelector("#cartQuantity");

  if (input.disabled) return;

  let val = parseInt(input.value) || 1;

  if (val > 1) input.value = val - 1;
};

function confirmAddVariantToCart() {
  if (!window.selectedColor || !window.selectedSizeData) {
    showNotification("Vui lòng chọn đầy đủ màu sắc và kích thước!", "error");
    return;
  }
  const quantityInput = document.getElementById("variantQuantity");
  let quantity = parseInt(quantityInput.value) || 1;
  const maxStock = window.selectedSizeData.quantity;
  if (quantity > maxStock) {
    showNotification(
      `Số lượng vượt quá tồn kho (tối đa: ${maxStock})`,
      "error",
    );
    return;
  }
  const product = window.currentVariantProduct;
  const variantItem = {
    variantID: window.selectedSizeData.variantId,
    productID: product.productID,
    colorID: window.selectedSizeData.colorID,
    sizeID: window.selectedSizeData.sizeID,
    color: window.selectedColor,
    size: window.selectedSizeData.sizeName,
    price: window.selectedSizeData.price,
    quantity: quantity,
    brandName: product.brandName,
    categoryName: product.categoryName,
    image: product.image,
  };
  const existingItem = cartItems.find(
    (item) =>
      item.productID === product.productID &&
      item.color === variantItem.color &&
      item.size === variantItem.size,
  );
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cartItems.push(variantItem);
  }
  showNotification(
    `✅ Đã thêm ${quantity} ${product.productName} (${variantItem.color} - ${variantItem.size}) vào giỏ hàng!`,
    "success",
  );
  closeVariantModal();
  updateCartButtonDisplay();
}

function renderVariantOptions(product) {
  const container = document.getElementById("variantModalBody");
  if (!container) return;

  const colorMap = new Map();
  product.variants.forEach((variant) => {
    if (!colorMap.has(variant.colorName)) {
      colorMap.set(variant.colorName, {
        colorName: variant.colorName,
        colorCode: variant.colorCode,
        sizes: [],
      });
    }
    colorMap.get(variant.colorName).sizes.push({
      sizeName: variant.sizeName,
      quantity: variant.quantityInStock,
      variantID: variant.variantID,
    });
  });

  const colorList = Array.from(colorMap.values());

  container.innerHTML = `
    <div class="product-info-card">
      <h4>${product.productName}</h4>
      <div class="product-info-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #64748b;">Mã SP:</span>
        <span style="font-weight: 500;">${product.productCode}</span>
      </div>
      <div class="product-info-row" style="display: flex; justify-content: space-between;">
        <span style="color: #64748b;">Thương hiệu:</span>
        <span style="font-weight: 500;">${product.brandName || "—"}</span>
      </div>
    </div>
    
    <div class="variant-group">
      <label class="variant-label">🎨 Màu sắc</label>
      <div class="variant-options" id="colorOptions">
        ${colorList
          .map(
            (color) => `
          <div class="variant-option color-option" data-color="${color.colorName}" data-color-code="${color.colorCode}" onclick="selectColorVariant('${color.colorName}')">
            <span class="color-dot-small" style="background-color: ${color.colorCode}; display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; vertical-align: middle;"></span>
            ${color.colorName}
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
    
    <div class="variant-group">
      <label class="variant-label">📏 Kích thước</label>
      <div class="variant-options" id="sizeOptions">
        <span style="color: #94a3b8; font-size: 13px;">Vui lòng chọn màu sắc trước</span>
      </div>
    </div>
    
    <div class="selected-info" id="selectedVariantInfo" style="display: none;">
      <p><strong>Đã chọn:</strong> <span id="selectedColorText">-</span> - <span id="selectedSizeText">-</span></p>
      <p>Giá bán: <span class="price" id="selectedPrice">0₫</span></p>
      <p>Tồn kho: <span id="selectedStock">0</span> sản phẩm</p>
      <div class="quantity-input-wrapper" style="margin-top: 12px;">
        <label class="quantity-label">Số lượng:</label>
        <div class="quantity-controls">
          <button type="button" class="quantity-btn" onclick="decrementVariantQuantity()">−</button>
          <input type="number" id="variantQuantity" class="quantity-input" value="1" min="1" max="99" style="width: 100px;">
          <button type="button" class="quantity-btn" onclick="incrementVariantQuantity()">+</button>
        </div>
        <div class="stock-warning" id="variantStockWarning" style="display: none; text-align: center; margin-top: 8px;">
          ⚠️ Số lượng vượt quá tồn kho!
        </div>
      </div>
    </div>
  `;
  window.currentColorList = colorList;
  window.selectedColor = null;
  window.selectedSizeData = null;
}

function selectColorVariant(colorName) {
  // Lưu màu đã chọn
  window.selectedColor = colorName;

  // 👇 RESET SIZE ĐÃ CHỌN
  window.selectedSizeData = null;
  window.selectedSizeName = null;

  // Cập nhật UI màu sắc
  document.querySelectorAll(".color-option").forEach((opt) => {
    if (opt.getAttribute("data-color") === colorName) {
      opt.classList.add("selected");
    } else {
      opt.classList.remove("selected");
    }
  });

  // Xóa class selected của tất cả size cũ
  const allSizeOptions = document.querySelectorAll(".size-option");
  allSizeOptions.forEach((opt) => opt.classList.remove("selected"));

  // Tìm dữ liệu màu
  const colorData = window.currentColorList?.find(
    (c) => c.colorName === colorName,
  );

  if (!colorData || !colorData.sizes || colorData.sizes.length === 0) {
    const sizeContainer = document.getElementById("sizeOptions");
    if (sizeContainer) {
      sizeContainer.innerHTML =
        '<span class="placeholder-text">Không có kích thước cho màu này</span>';
    }
    return;
  }

  // Render lại danh sách size
  const sizeContainer = document.getElementById("sizeOptions");
  if (sizeContainer) {
    sizeContainer.innerHTML = colorData.sizes
      .map((size) => {
        const isOutOfStock = size.quantity === 0;
        return `
          <div class="variant-option size-option ${isOutOfStock ? "disabled" : ""}" 
               data-size="${size.sizeName}" 
               data-quantity="${size.quantity}"
               data-price="${size.sellingPrice}"
               data-variant-id="${size.variantID}"
               data-size-id="${size.sizeID}"
               onclick="${isOutOfStock ? "" : `selectSizeVariant('${size.sizeName}', ${size.quantity}, ${size.sellingPrice}, ${size.variantID}, ${size.sizeID})`}"
               style="${isOutOfStock ? "opacity:0.5; pointer-events:none; cursor:not-allowed;" : ""}">
            ${size.sizeName}
            <span style="font-size: 11px; margin-left: 4px; ${isOutOfStock ? "color:#dc2626" : "color:#64748b"}">
              (${size.quantity})
            </span>
          </div>
        `;
      })
      .join("");
  }

  // Reset UI
  const selectedInfo = document.getElementById("selectedVariantInfo");
  if (selectedInfo) selectedInfo.style.display = "none";

  const selectedColorText = document.getElementById("selectedColorText");
  const selectedSizeText = document.getElementById("selectedSizeText");
  const selectedStock = document.getElementById("selectedStock");

  if (selectedColorText) selectedColorText.textContent = colorName;
  if (selectedSizeText) selectedSizeText.textContent = "-";
  if (selectedStock) selectedStock.textContent = "0";

  // Reset số lượng
  const qtyInput = document.getElementById("cartQuantity");
  if (qtyInput) {
    qtyInput.disabled = true;
    qtyInput.value = 1;
    qtyInput.max = 1;
  }
}

function closeVariantModal() {
  const modal = document.getElementById("variantSelectionModal");
  if (modal) modal.classList.remove("active");
  window.currentVariantProduct = null;
  window.selectedVariant = null;
  window.selectedColor = null;
  window.selectedSizeData = null;
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

// ==================== THANH TOÁN GIỎ HÀNG (HIỂN THỊ MODAL) ====================
async function checkoutCart() {
  if (cartItems.length === 0) {
    showNotification("Giỏ hàng trống, không thể thanh toán!", "error");
    return;
  }
  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
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

    const style = document.createElement("style");
    style.textContent = `
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

    const confirmBtn = checkoutModal.querySelector("#confirmCheckoutBtn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", confirmCheckout);
    }
  }

  const orderItemsContainer = document.getElementById("orderItemsPreview");
  const orderTotalSpan = document.getElementById("orderTotalAmount");
  const orderItemsCount = document.getElementById("orderItemsCount");

  let itemsHtml = "";
  cartItems.forEach((item, idx) => {
    itemsHtml += `
  <div class="order-item-preview">

    <div class="order-item-name">
      ${idx + 1}. ${item.productName || item.name}

      ${
        item.color
          ? `
            <div class="order-item-variant">
              <span 
                class="color-dot" 
                style="background:${item.colorCode || "#000"}">
              </span>

              <span class="variant-text">
                ${item.color || ""} 
                ${item.size ? `- ${item.size}` : ""}
              </span>
            </div>
          `
          : ""
      }
    </div>

    <span class="order-item-price">
      ${formatPrice((item.price || 0) * item.quantity)}
    </span>

  </div>
`;
  });
  orderItemsContainer.innerHTML = itemsHtml;
  orderTotalSpan.textContent = formatPrice(total);
  if (orderItemsCount) orderItemsCount.textContent = `${totalItems} sản phẩm`;

  const codRadio = document.querySelector(
    'input[name="paymentMethod"][value="COD"]',
  );
  if (codRadio) codRadio.checked = true;

  const paymentMethods = document.querySelectorAll(".payment-method");
  paymentMethods.forEach((method) => {
    method.addEventListener("click", function () {
      paymentMethods.forEach((m) => m.classList.remove("active"));
      this.classList.add("active");
      const radio = this.querySelector("input");
      if (radio) radio.checked = true;
    });
  });

  const salesPersonInput = document.getElementById("salesPerson");
  const discountAmountInput = document.getElementById("discountAmount");
  const orderNotesInput = document.getElementById("orderNotes");

  if (salesPersonInput) salesPersonInput.value = "Clothing Warehouse";
  if (discountAmountInput) {
    discountAmountInput.value = "0";
    setupDiscountInput();
  }
  if (orderNotesInput) orderNotesInput.value = "";
  checkoutModal.classList.add("active");
}

function closeCheckoutModal() {
  const modal = document.getElementById("checkoutInfoModal");
  if (modal) modal.classList.remove("active");
  hideLoading();
  const confirmBtn = document.getElementById("confirmCheckoutBtn");
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = "1";
    confirmBtn.style.cursor = "pointer";
  }
}

async function confirmCheckout() {
  const confirmBtn = document.getElementById("confirmCheckoutBtn");
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = "0.5";
    confirmBtn.style.cursor = "not-allowed";
  }
  try {
    const selectedPayment = document.querySelector(
      'input[name="paymentMethod"]:checked',
    );
    const paymentMethod = selectedPayment ? selectedPayment.value : "COD";
    const salesPerson =
      document.getElementById("salesPerson")?.value || "Clothing Warehouse";
    const discountInput = document.getElementById("discountAmount");
    let discountAmount = parseNumberFromFormatted(discountInput?.value) || 0;
    const notes = document.getElementById("orderNotes")?.value || "";

    closeCheckoutModal();

    const result = await createOrderFromCart(
      paymentMethod,
      salesPerson,
      discountAmount,
      notes,
    );

    if (result) {
      await getProductsFromAPI();
      closeCartDetailModal();
      showNotification(
        "✅ Đặt hàng thành công! Đơn hàng đã được tạo.",
        "success",
      );
    }
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = "1";
      confirmBtn.style.cursor = "pointer";
    }
  }
}

async function createOrderFromCart(
  paymentMethod,
  salesPerson,
  discountAmount,
  notes,
) {
  if (cartItems.length === 0) {
    showNotification("Giỏ hàng trống, không thể tạo đơn hàng!", "error");
    return false;
  }
  const items = [];
  for (const item of cartItems) {
    if (!item.id) {
      showNotification(`Thiếu variantID cho sản phẩm ${item.name}`, "error");
      return false;
    }
    if (!item.productID) {
      showNotification(`Thiếu productID cho sản phẩm ${item.name}`, "error");
      return false;
    }
    if (item.quantity <= 0) {
      showNotification(
        `Số lượng không hợp lệ cho sản phẩm ${item.name}`,
        "error",
      );
      return false;
    }
    if (item.price <= 0) {
      showNotification(`Giá không hợp lệ cho sản phẩm ${item.name}`, "error");
      return false;
    }
    const orderItem = {
      variantID: item.id,
      productID: item.productID,
      quantity: item.quantity,
      unitPrice: item.price,
      discountAmount: 0,
    };
    if (item.colorID) orderItem.colorID = item.colorID;
    if (item.sizeID) orderItem.sizeID = item.sizeID;
    items.push(orderItem);
  }
  const orderData = {
    paymentMethod: paymentMethod,
    salesPerson: salesPerson,
    discountAmount: discountAmount,
    notes: notes,
    items: items,
  };
  try {
    showLoading();
    const response = await fetch(ORDER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });
    const responseText = await response.text();
    if (!response.ok) {
      let errorMessage = `Lỗi ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.innerException) {
          errorMessage += ` - ${errorData.innerException}`;
        }
        if (errorData.errors) {
          const errors = Object.values(errorData.errors).flat();
          errorMessage = errors.join(", ");
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }
    const result = JSON.parse(responseText);
    for (const item of cartItems) {
      const product = allData.find((p) => p.productID === item.productID);
      if (product && product.variants) {
        const variant = product.variants.find((v) => v.variantID === item.id);
        if (variant) {
          variant.quantityInStock -= item.quantity;
          product.totalQuantityInStock = product.variants.reduce(
            (sum, v) => sum + v.quantityInStock,
            0,
          );
        }
      }
    }
    cartItems = [];
    updateCartButtonDisplay();
    renderTable();
    return result;
  } catch (error) {
    console.error("❌ Lỗi khi tạo đơn hàng:", error);
    showNotification(`❌ Đặt hàng thất bại: ${error.message}`, "error");
    return null;
  } finally {
    hideLoading();
  }
}

// ==================== XEM GIỎ HÀNG ====================
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
  renderCartDetail();
  cartModal.classList.add("active");
}

function renderCartDetail() {
  const cartBody = document.getElementById("cartDetailBody");
  const totalAmountSpan = document.getElementById("cartTotalAmount");
  if (!cartItems || cartItems.length === 0) {
    cartBody.innerHTML = `<div class="empty-cart">Giỏ hàng trống</div>`;
    totalAmountSpan.textContent = "0đ";
    return;
  }
  const grouped = groupCartItems();
  let total = 0;
  let html = "";
  grouped.forEach((group, index) => {
    const groupId = `group-${index}`;
    let groupTotal = 0;
    const childHtml = group.items
      .map((item) => {
        const unitPrice = item.price || item.sellingPrice || 0;
        const itemTotal = unitPrice * item.quantity;
        groupTotal += itemTotal;
        total += itemTotal;

        return `
        <div class="cart-child">
          <div class="cart-color">
            <span class="color-dot" style="background:${item.colorCode || "#ccc"}"></span>
            ${item.color || item.colorName} - ${item.size || item.sizeName}
          </div>
          <div class="cart-item-quantity">
            <button onclick="updateCartItemQuantity('${item.id}', -1)">−</button>
            <span>${item.quantity}</span>
            <button onclick="updateCartItemQuantity('${item.id}', 1)">+</button>
          </div>
          <div>${formatPrice(itemTotal)}</div>
        </div>
      `;
      })
      .join("");

    html += `
      <div class="cart-group">
        <div class="cart-group-header" onclick="toggleGroup('${groupId}')">
          <strong>${group.productName}</strong>
          <span>${formatPrice(groupTotal)}</span>
        </div>
        <div class="cart-group-body" id="${groupId}" style="display:block;">
          ${childHtml}
        </div>
      </div>
    `;
  });

  cartBody.innerHTML = html;
  totalAmountSpan.textContent = formatPrice(total);
}

function groupCartItems() {
  const map = new Map();
  cartItems.forEach((item) => {
    const productName = item.productName || item.name;
    if (!map.has(item.productID)) {
      map.set(item.productID, {
        productName: productName,
        productID: item.productID,
        items: [],
      });
    }
    map.get(item.productID).items.push(item);
  });
  return Array.from(map.values());
}

function toggleGroup(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === "none" ? "block" : "none";
}

// ==================== FORMAT GIÁ TRỊ VÀ CẬP NHẬT TỔNG TIỀN ====================
function formatNumberWithCommas(value) {
  if (!value && value !== 0) return "0";
  let cleanValue = value.toString().replace(/[^0-9]/g, "");
  if (!cleanValue) return "0";
  return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseNumberFromFormatted(value) {
  if (!value) return 0;
  return parseInt(value.toString().replace(/,/g, "")) || 0;
}

function updateTotalAfterDiscount() {
  const discountInput = document.getElementById("discountAmount");
  const orderTotalSpan = document.getElementById("orderTotalAmount");

  if (!discountInput || !orderTotalSpan) return;

  // Tính tổng tiền gốc từ giỏ hàng
  const originalTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

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

function setupDiscountInput() {
  const discountInput = document.getElementById("discountAmount");
  if (!discountInput) return;

  // Xóa event cũ nếu có
  const newInput = discountInput.cloneNode(true);
  discountInput.parentNode.replaceChild(newInput, discountInput);

  // Thêm event mới
  newInput.addEventListener("input", function (e) {
    // Lưu vị trí con trỏ
    const cursorPos = e.target.selectionStart;

    // Lấy giá trị số
    let rawValue = this.value.replace(/,/g, "");
    if (rawValue === "") rawValue = "0";
    let numValue = parseInt(rawValue) || 0;

    // Format lại với dấu phẩy
    this.value = formatNumberWithCommas(numValue);

    // Khôi phục vị trí con trỏ
    const newCursorPos =
      cursorPos +
      (this.value.length - (rawValue.length + (rawValue.length > 0 ? 0 : 0)));
    this.setSelectionRange(newCursorPos, newCursorPos);

    // Cập nhật tổng tiền
    updateTotalAfterDiscount();
  });

  newInput.addEventListener("blur", function () {
    let value = parseNumberFromFormatted(this.value);
    if (isNaN(value)) value = 0;
    this.value = formatNumberWithCommas(value);
    updateTotalAfterDiscount();
  });

  newInput.addEventListener("focus", function () {
    let value = parseNumberFromFormatted(this.value);
    this.value = value.toString();
  });
}

function updateCartItemQuantity(productId, change) {
  const searchId =
    typeof productId === "string" && !isNaN(Number(productId))
      ? Number(productId)
      : productId;

  const itemIndex = cartItems.findIndex((item) => {
    const itemId =
      typeof item.id === "string" && !isNaN(Number(item.id))
        ? Number(item.id)
        : item.id;

    return itemId === searchId || item.id.toString() === productId.toString();
  });

  if (itemIndex === -1) return;

  const item = cartItems[itemIndex];
  const product = allData.find((p) => p.productID === item.productID);
  let maxStock = 99;
  if (product?.variants?.length > 0 && item.color && item.size) {
    const variant = product.variants.find(
      (v) => v.colorName === item.color && v.sizeName === item.size,
    );
    maxStock = variant?.quantityInStock ?? 99;
  }
  const newQuantity = item.quantity + change;
  if (newQuantity > maxStock) {
    showNotification(`⚠️ Chỉ còn ${maxStock} sản phẩm trong kho`, "error");
    return;
  }
  if (newQuantity <= 0) {
    cartItems.splice(itemIndex, 1);
    showNotification("Đã xóa sản phẩm khỏi giỏ hàng", "info");
  } else {
    item.quantity = newQuantity;
  }

  renderCartDetail();
  updateCartButtonDisplay();

  if (cartItems.length === 0) {
    closeCartDetailModal();
  }
}

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

function closeCartDetailModal() {
  const cartModal = document.getElementById("cartDetailModal");
  if (cartModal) cartModal.classList.remove("active");
}

// ==================== BỘ LỌC SẢN PHẨM ====================

function initFilter() {
  renderColorOptions();
  setupFilterEventListeners();
}

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

function applyPricePreset(min, max) {
  filterState.priceRange = [min, max];
  updatePriceSliders();

  const minInput = document.getElementById("priceMinInput");
  const maxInput = document.getElementById("priceMaxInput");
  if (minInput) minInput.value = min.toLocaleString("vi-VN");
  if (maxInput) maxInput.value = max.toLocaleString("vi-VN");
}

function toggleFilterDropdown() {
  const dropdown = document.getElementById("filterDropdown");
  if (!dropdown) return;

  filterState.isOpen = !filterState.isOpen;
  dropdown.style.display = filterState.isOpen ? "block" : "none";
}

function closeFilterDropdown() {
  const dropdown = document.getElementById("filterDropdown");
  if (dropdown) {
    dropdown.style.display = "none";
    filterState.isOpen = false;
  }
}

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

function cancelFilters() {
  closeFilterDropdown();
}

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

    // ========== LỌC: CHỈ LẤY VARIANT CÒN HÀNG (quantityInStock > 0) ==========
    const availableVariants = (data.variants || []).filter(
      (v) => v.quantityInStock > 0,
    );

    const colorMap = new Map();
    availableVariants.forEach((variant) => {
      if (!colorMap.has(variant.colorName)) {
        colorMap.set(variant.colorName, {
          colorName: variant.colorName,
          colorCode: variant.colorCode,
          expanded: false,
          sizes: [],
        });
      }
      colorMap.get(variant.colorName).sizes.push({
        sizeName: variant.sizeName,
        quantity: variant.quantityInStock || 0,
        variantID: variant.variantID,
      });
    });

    const colorList = Array.from(colorMap.values());
    const totalStock = availableVariants.reduce(
      (sum, v) => sum + (v.quantityInStock || 0),
      0,
    );

    const priceDisplay = data?.sellingPrice || 0;
    const purchasePrice = data?.purchasePrice || 0;
    const colorExpandKey = `color_${productId}`;
    if (window.colorExpandState === undefined) {
      window.colorExpandState = {};
    }

    let colorHtml = '<span class="text-muted">—</span>';
    if (colorList.length > 0) {
      colorHtml = `
        <div class="color-group-list">
          ${colorList
            .map((color, idx) => {
              const isExpanded =
                window.colorExpandState[
                  `${colorExpandKey}_${color.colorName}`
                ] || false;
              const totalColorStock = color.sizes.reduce(
                (sum, s) => sum + s.quantity,
                0,
              );
              // Chỉ hiển thị màu nếu có tổng số lượng > 0
              if (totalColorStock === 0) return "";
              return `
              <div class="color-group-item" data-color="${color.colorName}">
                <div class="color-header" onclick="toggleColorExpand('${productId}', '${color.colorName}')">
                  <div class="color-header-left">
                    <span class="color-dot" style="background-color: ${color.colorCode}; border: ${color.colorName === "Trắng" ? "1px solid #ddd" : "none"}"></span>
                    <span class="color-name">${color.colorName}</span>
                  </div>
                  <div class="color-header-right">
                    <span class="color-total-stock ${getStockClass(totalColorStock)}">
                      ${totalColorStock}
                    </span>
                    <span class="color-expand-icon">
                      <svg class="expand-svg ${isExpanded ? "rotated" : ""}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 9l6 6 6-6" stroke-linecap="round"/>
                      </svg>
                    </span>
                  </div>
                </div>
                <div class="size-list ${isExpanded ? "expanded" : "collapsed"}">
                  ${color.sizes
                    .map((size) => {
                      // Chỉ hiển thị size có số lượng > 0
                      if (size.quantity === 0) return "";
                      return `
                        <div class="size-item">
                          <span class="size-name">${size.sizeName}</span>
                          <span class="size-quantity ${getStockClass(size.quantity)}">${size.quantity}</span>
                        </div>
                      `;
                    })
                    .filter((html) => html !== "")
                    .join("")}
                </div>
              </div>
            `;
            })
            .filter((html) => html !== "")
            .join("")}
        </div>
      `;
    }

    let sizeHtml = '<span class="text-muted">—</span>';
    const allSizes = [];
    colorList.forEach((color) => {
      color.sizes.forEach((size) => {
        if (size.quantity === 0) return;
        const existing = allSizes.find((s) => s.name === size.sizeName);
        if (existing) {
          existing.quantity += size.quantity;
        } else {
          allSizes.push({ name: size.sizeName, quantity: size.quantity });
        }
      });
    });

    if (allSizes.length > 0) {
      sizeHtml = `
        <div class="size-summary-list">
          ${allSizes
            .map(
              (size) => `
            <div class="size-summary-item">
              <span class="size-name">${size.name}</span>
              <span class="size-quantity ${getStockClass(size.quantity)}">${size.quantity}</span>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    }

    const statusDisplay =
      availableVariants.length === 0 ? "Hết hàng" : getStatusText(data?.status);
    const statusClass =
      availableVariants.length === 0
        ? "status-outstock"
        : getStatusClass(data.status);

    row.innerHTML = `
      <td class="td-custom">${data.productCode || "—"}</td>
      <td class="td-custom td-product-name">
        <div class="product-name-wrapper">
          <strong>${data.productName || data.name || "—"}</strong>
        </div>
      </td>
      <td class="td-custom">${data.categoryName || data.category || "—"}</td>
      <td class="td-custom">${data.brandName || data.brand || "—"}</td>
      <td class="td-custom color-cell">${colorHtml}</td>
      <td class="td-custom">
        <div class="price-display">
          <span class="price-value">${getDisplayPurchasePrice({ ...data, productID: productId, purchasePrice: purchasePrice })}</span>
          <span class="eye-icon" onclick="window.togglePurchasePrice('${productId}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </span>
        </div>
      </td>
      <td class="td-custom">${formatPrice(priceDisplay)}</td>
      <td class="td-custom td-stock">
        <div class="stock-wrapper">
          <span class="stock-number ${getStockClass(totalStock)}">
            ${totalStock}
          </span>
        </div>
      </td>
      <td class="td-custom">
        <span class="status-badge ${statusClass}">
          <span class="status-dot"></span>
          ${statusDisplay}
        </span>
      </td>
      <td class="text-center">
        <div class="dropdown">
          <button class="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1"/>
              <circle cx="19" cy="12" r="1"/>
              <circle cx="5" cy="12" r="1"/>
            </svg>
          </button>
          <ul class="dropdown-menu">
            <!-- Thêm vào giỏ hàng -->
            <li class="p-2">
              <a class="dropdown-item ${availableVariants.length === 0 ? "disabled" : ""}" 
                href="#"
                ${availableVariants.length === 0 ? 'tabindex="-1" aria-disabled="true"' : `onclick="window.handleAddToCart('${productId}'); return false;"`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="me-2">
                  <path d="M6 6H20L18 16H8L6 6ZM6 6L5 3H2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="8" cy="20" r="1.5"/>
                  <circle cx="18" cy="20" r="1.5"/>
                </svg>
                Thêm vào giỏ
                ${availableVariants.length === 0 ? '<span class="badge bg-danger ms-2">Hết hàng</span>' : ""}
              </a>
            </li>

            <!-- Sửa sản phẩm -->
            <li class="p-2">
              <a class="dropdown-item" href="#" onclick="window.editProduct('${productId}'); return false;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="me-2">
                  <path d="M17 3l4 4-7 7H10v-4l7-7z" stroke-linecap="round"/>
                  <path d="M3 21h18" stroke-linecap="round"/>
                </svg>
                Sửa sản phẩm
              </a>
            </li>
            
            <!-- Xóa sản phẩm -->
            <li class="p-2">
              <a class="dropdown-item text-danger" href="#" onclick="window.handleDelete('${productId}'); return false;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="me-2">
                  <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" stroke-linecap="round"/>
                  <path d="M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" stroke-linecap="round"/>
                </svg>
                Xóa sản phẩm
              </a>
            </li>
            
            <!-- Chi tiết sản phẩm (tuỳ chọn) -->
            <li><hr class="dropdown-divider"></li>
            <li class="p-2">
              <a class="dropdown-item" href="#" onclick="window.viewProductDetail('${productId}'); return false;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="me-2">
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path d="M2.5 12c0 7 5.5 8 9.5 8s9.5-1 9.5-8-5.5-8-9.5-8-9.5 1-9.5 8z" stroke-linecap="round"/>
                </svg>
                Chi tiết
              </a>
            </li>
          </ul>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  updatePaginationInfo(start, end, totalCount, currentPage, totalPages);
}

// ==================== HÀM ĐÓNG/MỞ DANH SÁCH SIZE THEO MÀU ====================
function toggleColorExpand(productId, colorName) {
  const key = `color_${productId}_${colorName}`;
  if (window.colorExpandState === undefined) {
    window.colorExpandState = {};
  }
  window.colorExpandState[key] = !window.colorExpandState[key];
  renderTable();
}

function getStockClass(quantity) {
  if (quantity === 0) return "stock-zero";
  if (quantity < 5) return "stock-low";
  if (quantity < 20) return "stock-medium";
  return "stock-high";
}

// ==================== XÓA SẢN PHẨM ====================
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

function closeDeleteModal() {
  const deleteModal = document.getElementById("deleteConfirmModal");
  if (deleteModal) deleteModal.classList.remove("active");
  window.productToDelete = null;
}

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

function openAddProductModal() {
  const modal = document.getElementById("addProductModal");
  if (modal) {
    modal.style.display = "flex";
    document.getElementById("addProductForm").reset();
  }
}

function closeAddProductModal() {
  const modal = document.getElementById("addProductModal");
  if (modal) {
    modal.style.display = "none";
  }
}

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

function addColorVariant() {
  const container = document.getElementById("colorVariantsContainer");
  const template = document
    .querySelector(".color-variant-block")
    .cloneNode(true);
  const index = colorVariantCount;
  template.setAttribute("data-color-index", index);
  template.querySelector(".color-select").value = "";
  template.querySelectorAll(".size-qty").forEach((input) => (input.value = 0));
  template
    .querySelectorAll(".size-price")
    .forEach((input) => (input.value = 0));
  template.querySelectorAll(".size-cost").forEach((input) => (input.value = 0));
  const deleteBtn = template.querySelector(".btn-danger");
  deleteBtn.style.display = "inline-block";
  container.appendChild(template);
  colorVariantCount++;
}

function removeColorVariant(btn) {
  const block = btn.closest(".color-variant-block");
  if (document.querySelectorAll(".color-variant-block").length > 1) {
    block.remove();
  } else {
    showNotification("Phải có ít nhất một màu sắc!", "error");
  }
}

// ========== MAP MÀU SẮC ==========
const colorMap = {
  Đỏ: 1,
  Xanh: 2,
  Đen: 3,
  Trắng: 4,
  Vàng: 5,
  Hồng: 6,
  Xám: 7,
  Tím: 8,
  Cam: 9,
  Nâu: 10,
  "Xanh lá": 11,
};

// ========== MAP KÍCH THƯỚC (ĐẦY ĐỦ) ==========
const sizeMap = {
  S: 1,
  M: 2,
  L: 3,
  XL: 4,
  XXL: 5,
  XXXL: 6,
  XXXXL: 7,
  XXXXXL: 8,
  28: 9,
  29: 10,
  30: 11,
  31: 12,
  32: 13,
  33: 14,
  34: 15,
  35: 16,
  36: 17,
  37: 18,
  38: 19,
  FreeSize: 20,
  OneSize: 21,
};

// ========== SUBMIT FORM THÊM SẢN PHẨM ==========
async function submitAddProductV2() {
  // 1. Lấy thông tin cơ bản
  const productCode =
    document.getElementById("productCode")?.value?.trim() || "";
  const productName = document.getElementById("productName")?.value?.trim();
  const categoryName =
    document.getElementById("categoryName")?.value?.trim() || "";
  const brandName = document.getElementById("brandName")?.value?.trim() || "";
  const supplierName =
    document.getElementById("supplierName")?.value?.trim() || "";
  const material = document.getElementById("material")?.value?.trim() || "";
  const description =
    document.getElementById("description")?.value?.trim() || "";

  const purchasePrice =
    parseFloat(document.getElementById("purchasePrice")?.value) || 0;
  const sellingPrice =
    parseFloat(document.getElementById("sellingPrice")?.value) || 0;

  if (!productName) {
    showNotification("Vui lòng nhập tên sản phẩm!", "error");
    return;
  }

  if (purchasePrice < 0 || sellingPrice < 0) {
    showNotification("Giá nhập và giá bán không được âm!", "error");
    return;
  }

  const variants = [];
  const colorBlocks = document.querySelectorAll(".color-variant-block");

  if (colorBlocks.length === 0) {
    showNotification("Vui lòng thêm ít nhất một màu sắc!", "error");
    return;
  }

  for (const block of colorBlocks) {
    const colorSelect = block.querySelector(".color-select");
    const colorName = colorSelect?.value;
    if (!colorName) {
      showNotification("Vui lòng chọn màu sắc!", "error");
      return;
    }
    const colorID = colorMap[colorName];
    if (!colorID) {
      showNotification(`Màu sắc "${colorName}" không hợp lệ!`, "error");
      return;
    }
    const sizeRows = block.querySelectorAll(".size-qty");
    let hasQuantity = false;
    for (const row of sizeRows) {
      const quantity = parseInt(row.value) || 0;
      const sizeName = row.getAttribute("data-size-name");
      const sizeID = parseInt(row.getAttribute("data-size-id"));
      if (quantity > 0) {
        hasQuantity = true;
        variants.push({
          colorID: colorID,
          sizeID: sizeID,
          quantityInStock: quantity,
        });
      }
    }
    if (!hasQuantity) {
      showNotification(
        `Vui lòng nhập số lượng cho màu "${colorName}"!`,
        "error",
      );
      return;
    }
  }
  if (variants.length === 0) {
    showNotification("Vui lòng nhập số lượng cho ít nhất một size!", "error");
    return;
  }

  const productData = {
    productCode: productCode,
    productName: productName,
    categoryName: categoryName,
    brandName: brandName,
    supplierName: supplierName,
    material: material,
    description: description,
    purchasePrice: purchasePrice,
    sellingPrice: sellingPrice,
    variants: variants,
  };
  try {
    showLoading();
    const response = await fetch(`${API_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    const result = await response.json();
    if (!response.ok) {
      let errorMessage =
        result.message || result.title || `Lỗi ${response.status}`;
      if (result.errors) {
        const errors = Object.values(result.errors).flat();
        errorMessage = errors.join(", ");
      }
      throw new Error(errorMessage);
    }
    showNotification(
      `✅ Thêm sản phẩm thành công! (${variants.length} biến thể)`,
      "success",
    );
    closeAddProductModal();
    resetAddProductForm();
    currentPage = 1;
    await getProductsFromAPI();
  } catch (error) {
    console.error("Lỗi khi thêm sản phẩm:", error);
    showNotification(`❌ Thêm sản phẩm thất bại: ${error.message}`, "error");
  } finally {
    hideLoading();
  }
}

// ========== RESET FORM ==========
function resetAddProductForm() {
  document.getElementById("productCode").value = "";
  document.getElementById("productName").value = "";
  document.getElementById("categoryName").value = "";
  document.getElementById("brandName").value = "";
  document.getElementById("supplierName").value = "";
  document.getElementById("material").value = "";
  document.getElementById("description").value = "";
  document.getElementById("purchasePrice").value = 0;
  document.getElementById("sellingPrice").value = 0;
  if (typeof formatPurchasePrice === "function") {
    formatPurchasePrice(document.getElementById("purchasePrice"));
    formatSellingPrice(document.getElementById("sellingPrice"));
  }
  const container = document.getElementById("colorVariantsContainer");
  const blocks = container.querySelectorAll(".color-variant-block");
  for (let i = 1; i < blocks.length; i++) {
    blocks[i].remove();
  }
  const firstBlock = blocks[0];
  if (firstBlock) {
    const colorSelect = firstBlock.querySelector(".color-select");
    if (colorSelect) colorSelect.value = "";
    const quantityInputs = firstBlock.querySelectorAll(".size-qty");
    quantityInputs.forEach((input) => {
      input.value = 0;
    });
  }
  const sizeTypeSelect = document.getElementById("sizeTypeSelect");
  if (sizeTypeSelect) {
    sizeTypeSelect.value = "ao";
    if (typeof toggleSizeTables === "function") {
      toggleSizeTables();
    }
  }
}

// ========== ĐÓNG MODAL ==========
function closeAddProductModal() {
  const modal = document.getElementById("addProductModal");
  if (modal) {
    const bsModal = bootstrap.Modal.getInstance(modal);
    if (bsModal) {
      bsModal.hide();
    } else {
      modal.style.display = "none";
    }
  }
}

function resetAddProductForm() {
  document.getElementById("productCode").value = "";
  document.getElementById("productName").value = "";
  document.getElementById("categoryName").value = "";
  document.getElementById("brandName").value = "";
  document.getElementById("supplierName").value = "";
  document.getElementById("material").value = "";
  document.getElementById("description").value = "";
  const container = document.getElementById("colorVariantsContainer");
  const firstBlock = container.querySelector(".color-variant-block");
  while (container.children.length > 1) {
    container.removeChild(container.lastChild);
  }
  if (firstBlock) {
    const colorSelect = firstBlock.querySelector(".color-select");
    if (colorSelect) colorSelect.value = "";
    firstBlock
      .querySelectorAll(".size-qty")
      .forEach((input) => (input.value = 0));
    firstBlock
      .querySelectorAll(".size-price")
      .forEach((input) => (input.value = 0));
    firstBlock
      .querySelectorAll(".size-cost")
      .forEach((input) => (input.value = 0));
    const deleteBtn = firstBlock.querySelector(".btn-remove-color");
    if (deleteBtn) deleteBtn.style.display = "none";
  }
  colorVariantCount = 1;
}

async function editProduct(productId) {
  try {
    showLoading();
    const response = await fetch(`${API_URL}/${productId}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Không thể tải thông tin sản phẩm");
    }
    const product = result.data || result;
    currentEditProduct = product;
    document.getElementById("editProductID").value = product.productID;
    document.getElementById("editProductCode").value =
      product.productCode || "";
    document.getElementById("editProductName").value =
      product.productName || "";
    document.getElementById("editCategoryName").value =
      product.categoryName || "";
    document.getElementById("editBrandName").value = product.brandName || "";
    document.getElementById("editSupplierName").value =
      product.supplierName || "";
    document.getElementById("editMaterial").value = product.material || "";
    document.getElementById("editPurchasePrice").value =
      product.purchasePrice || 0;
    document.getElementById("editSellingPrice").value =
      product.sellingPrice || 0;
    document.getElementById("editDescription").value =
      product.description || "";
    const purchaseDisplay = document.querySelector(
      ".edit-purchase-price-display",
    );
    const sellingDisplay = document.querySelector(
      ".edit-selling-price-display",
    );
    if (purchaseDisplay)
      purchaseDisplay.textContent = formatPrice(product.purchasePrice || 0);
    if (sellingDisplay)
      sellingDisplay.textContent = formatPrice(product.sellingPrice || 0);
    editColorVariantsData = [];
    if (product.variants && product.variants.length > 0) {
      const colorMap = new Map();
      product.variants.forEach((v) => {
        if (!colorMap.has(v.colorID)) {
          colorMap.set(v.colorID, {
            colorID: v.colorID,
            colorName: v.colorName,
            colorCode: v.colorCode,
            sizes: [],
          });
        }
        colorMap.get(v.colorID).sizes.push({
          sizeID: v.sizeID,
          sizeName: v.sizeName,
          quantityInStock: v.quantityInStock,
          variantID: v.variantID,
        });
      });
      editColorVariantsData = Array.from(colorMap.values());
    }
    renderEditColorVariants();
    const modal = document.getElementById("editProductModal");
    if (modal) modal.style.display = "flex";
  } catch (error) {
    console.error("Lỗi:", error);
    showNotification(error.message, "error");
  } finally {
    hideLoading();
  }
}

// Render danh sách màu sắc trong modal sửa
function renderEditColorVariants() {
  const container = document.getElementById("editColorVariantsContainer");
  if (!container) return;

  const sizeType =
    document.querySelector("#editProductModal #sizeTypeSelect")?.value || "ao";

  if (editColorVariantsData.length === 0) {
    container.innerHTML = `
            <div class="color-variant-block">
                <div class="mb-2">
                    <label class="form-label mb-0">Màu sắc</label>
                    <select class="form-select color-select" onchange="updateEditColorByIndex(0, this.value)">
                        <option value="">Chọn màu</option>
                        <option value="Đỏ">Đỏ</option>
                        <option value="Xanh">Xanh</option>
                        <option value="Đen">Đen</option>
                        <option value="Trắng">Trắng</option>
                        <option value="Vàng">Vàng</option>
                        <option value="Hồng">Hồng</option>
                        <option value="Xám">Xám</option>
                        <option value="Tím">Tím</option>
                        <option value="Cam">Cam</option>
                        <option value="Nâu">Nâu</option>
                        <option value="Xanh lá">Xanh lá</option>
                    </select>
                    <button type="button" class="btn btn-danger btn-sm mt-2" onclick="removeEditColorVariant(this)" style="display: none;">🗑️ Xóa màu</button>
                </div>
                <div class="edit-size-table-container"></div>
            </div>
        `;
    const sizeContainer = container.querySelector(".edit-size-table-container");
    if (sizeContainer) {
      renderEditSizeTable(sizeContainer, sizeType);
    }
    return;
  }

  container.innerHTML = editColorVariantsData
    .map(
      (color, idx) => `
        <div class="color-variant-block" data-color-index="${idx}" data-color-id="${color.colorID}" data-color-name="${color.colorName}">
            <div class="mb-2">
                <label class="form-label mb-0">Màu sắc</label>
                <select class="form-select color-select" data-color-index="${idx}" onchange="updateEditColor(${idx}, this.value)">
                    <option value="">Chọn màu</option>
                    <option value="Đỏ" ${color.colorName === "Đỏ" ? "selected" : ""}>Đỏ</option>
                    <option value="Xanh" ${color.colorName === "Xanh" ? "selected" : ""}>Xanh</option>
                    <option value="Đen" ${color.colorName === "Đen" ? "selected" : ""}>Đen</option>
                    <option value="Trắng" ${color.colorName === "Trắng" ? "selected" : ""}>Trắng</option>
                    <option value="Vàng" ${color.colorName === "Vàng" ? "selected" : ""}>Vàng</option>
                    <option value="Hồng" ${color.colorName === "Hồng" ? "selected" : ""}>Hồng</option>
                    <option value="Xám" ${color.colorName === "Xám" ? "selected" : ""}>Xám</option>
                    <option value="Tím" ${color.colorName === "Tím" ? "selected" : ""}>Tím</option>
                    <option value="Cam" ${color.colorName === "Cam" ? "selected" : ""}>Cam</option>
                    <option value="Nâu" ${color.colorName === "Nâu" ? "selected" : ""}>Nâu</option>
                    <option value="Xanh lá" ${color.colorName === "Xanh lá" ? "selected" : ""}>Xanh lá</option>
                </select>
                <button type="button" class="btn btn-danger btn-sm mt-2" onclick="removeEditColorVariant(this)">🗑️ Xóa màu</button>
            </div>
            <div class="edit-size-table-container" data-color-index="${idx}"></div>
        </div>
    `,
    )
    .join("");
  editColorVariantsData.forEach((color, idx) => {
    const sizeContainer = document.querySelector(
      `.edit-size-table-container[data-color-index="${idx}"]`,
    );
    if (sizeContainer) {
      renderEditSizeTable(sizeContainer, sizeType, color.sizes || []);
    }
  });
}

// Thêm hàm xóa màu trong modal sửa
function removeEditColorVariant(button) {
  const block = button.closest(".color-variant-block");
  if (
    document.querySelectorAll(
      "#editColorVariantsContainer .color-variant-block",
    ).length > 1
  ) {
    block.remove();
    updateEditColorVariantsDataFromDOM();
  } else {
    showNotification("Phải có ít nhất một màu sắc", "warning");
  }
}

function renderEditSizeTable(container, sizeType, existingSizes = []) {
  if (!container) return;
  const sizeMap = new Map();
  if (existingSizes && existingSizes.length > 0) {
    existingSizes.forEach((size) => {
      sizeMap.set(size.sizeID, {
        quantity: size.quantityInStock || 0,
        variantID: size.variantID,
      });
    });
  }

  let html = "";

  if (sizeType === "ao") {
    const aoSizes = [
      { id: 1, name: "S" },
      { id: 2, name: "M" },
      { id: 3, name: "L" },
      { id: 4, name: "XL" },
      { id: 5, name: "XXL" },
      { id: 6, name: "XXXL" },
      { id: 7, name: "XXXXL" },
      { id: 8, name: "XXXXXL" },
    ];

    html = `
            <table class="table table-sm table-bordered">
                <thead class="table-light"><tr><th>Kích thước</th><th>Số lượng</th></tr></thead>
                <tbody>
                    ${aoSizes
                      .map(
                        (size) => `
                        <tr>
                            <td><strong>${size.name}</strong></td>
                            <td>
                                <input type="number" class="form-control form-control-sm size-qty" 
                                       data-size-id="${size.id}" 
                                       data-size-name="${size.name}"
                                       data-variant-id="${sizeMap.get(size.id)?.variantID || ""}"
                                       value="${sizeMap.get(size.id)?.quantity || 0}" 
                                       min="0" placeholder="SL">
                            </td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;
  } else if (sizeType === "quan") {
    const quanSizes = [
      { id: 9, name: "28" },
      { id: 10, name: "29" },
      { id: 11, name: "30" },
      { id: 12, name: "31" },
      { id: 13, name: "32" },
      { id: 14, name: "33" },
      { id: 15, name: "34" },
      { id: 16, name: "35" },
      { id: 17, name: "36" },
      { id: 18, name: "37" },
      { id: 19, name: "38" },
    ];

    html = `
            <table class="table table-sm table-bordered">
                <thead class="table-light"><tr><th>Kích thước</th><th>Số lượng</th></tr></thead>
                <tbody>
                    ${quanSizes
                      .map(
                        (size) => `
                        <tr>
                            <td><strong>${size.name}</strong></td>
                            <td>
                                <input type="number" class="form-control form-control-sm size-qty" 
                                       data-size-id="${size.id}" 
                                       data-size-name="${size.name}"
                                       data-variant-id="${sizeMap.get(size.id)?.variantID || ""}"
                                       value="${sizeMap.get(size.id)?.quantity || 0}" 
                                       min="0" placeholder="SL">
                            </td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;
  } else {
    const khacSizes = [
      { id: 20, name: "FreeSize" },
      { id: 21, name: "OneSize" },
    ];

    html = `
            <table class="table table-sm table-bordered">
                <thead class="table-light"><tr><th>Kích thước</th><th>Số lượng</th></tr></thead>
                <tbody>
                    ${khacSizes
                      .map(
                        (size) => `
                        <tr>
                            <td><strong>${size.name}</strong></td>
                            <td>
                                <input type="number" class="form-control form-control-sm size-qty" 
                                       data-size-id="${size.id}" 
                                       data-size-name="${size.name}"
                                       data-variant-id="${sizeMap.get(size.id)?.variantID || ""}"
                                       value="${sizeMap.get(size.id)?.quantity || 0}" 
                                       min="0" placeholder="SL">
                            </td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;
  }

  container.innerHTML = html;
}

// Thêm màu sắc mới trong modal sửa sản phẩm
function addEditColorVariant() {
  const container = document.getElementById("editColorVariantsContainer");
  if (!container) return;

  const sizeType =
    document.querySelector("#editProductModal #sizeTypeSelect")?.value || "ao";
  const newIndex = Date.now(); // Dùng timestamp làm index tạm thời

  const newColorBlock = document.createElement("div");
  newColorBlock.className = "color-variant-block";
  newColorBlock.setAttribute("data-color-index", newIndex);
  newColorBlock.innerHTML = `
        <div class="mb-2">
            <label class="form-label mb-0">Màu sắc</label>
            <select class="form-select color-select" onchange="updateNewEditColor(this)">
                <option value="">Chọn màu</option>
                <option value="Đỏ">Đỏ</option>
                <option value="Xanh">Xanh</option>
                <option value="Đen">Đen</option>
                <option value="Trắng">Trắng</option>
                <option value="Vàng">Vàng</option>
                <option value="Hồng">Hồng</option>
                <option value="Xám">Xám</option>
                <option value="Tím">Tím</option>
                <option value="Cam">Cam</option>
                <option value="Nâu">Nâu</option>
                <option value="Xanh lá">Xanh lá</option>
            </select>
            <button type="button" class="btn btn-danger btn-sm mt-2" onclick="removeEditColorVariant(this)">🗑️ Xóa màu</button>
        </div>
        <div class="edit-size-table-container"></div>
    `;

  container.appendChild(newColorBlock);

  // Render size table cho màu mới
  const sizeContainer = newColorBlock.querySelector(
    ".edit-size-table-container",
  );
  if (sizeContainer) {
    renderEditSizeTable(sizeContainer, sizeType);
  }

  // Cập nhật dữ liệu variants sau khi thêm
  updateEditColorVariantsDataFromDOM();
}

// Cập nhật màu sắc cho block mới
function updateNewEditColor(selectElement) {
  const colorName = selectElement.value;
  if (!colorName) return;

  const block = selectElement.closest(".color-variant-block");
  const colorID = getColorIdByName(colorName);

  // Cập nhật data attribute
  block.setAttribute("data-color-id", colorID);
  block.setAttribute("data-color-name", colorName);

  // Cập nhật dữ liệu variants
  updateEditColorVariantsDataFromDOM();
}

// Hàm xóa màu trong modal sửa
function removeEditColorVariant(button) {
  const block = button.closest(".color-variant-block");
  const container = document.getElementById("editColorVariantsContainer");
  const blocks = container.querySelectorAll(".color-variant-block");

  if (blocks.length > 1) {
    block.remove();
    updateEditColorVariantsDataFromDOM();
  } else {
    showNotification("Phải có ít nhất một màu sắc", "warning");
  }
}

// Cập nhật dữ liệu variants từ DOM
function updateEditColorVariantsDataFromDOM() {
  const blocks = document.querySelectorAll(
    "#editColorVariantsContainer .color-variant-block",
  );
  const newVariantsData = [];

  blocks.forEach((block) => {
    const colorSelect = block.querySelector(".color-select");
    const colorName = colorSelect?.value;
    if (!colorName) return;

    const colorID = getColorIdByName(colorName);
    const sizes = [];
    const sizeInputs = block.querySelectorAll(".size-qty");

    sizeInputs.forEach((input) => {
      const quantity = parseInt(input.value) || 0;
      const sizeID = parseInt(input.dataset.sizeId);
      const sizeName = input.dataset.sizeName;
      const variantID = input.dataset.variantId
        ? parseInt(input.dataset.variantId)
        : null;

      if (quantity > 0) {
        sizes.push({
          sizeID: sizeID,
          sizeName: sizeName,
          quantityInStock: quantity,
          variantID: variantID,
        });
      }
    });

    if (sizes.length > 0 || (colorName && blocks.length === 1)) {
      newVariantsData.push({
        colorID: colorID,
        colorName: colorName,
        sizes: sizes,
      });
    }
  });
  window.editColorVariantsData = newVariantsData;
}

function updateEditColor(index, colorName) {
  if (window.editColorVariantsData && window.editColorVariantsData[index]) {
    window.editColorVariantsData[index].colorName = colorName;
    window.editColorVariantsData[index].colorID = getColorIdByName(colorName);
  }
  const block = document.querySelector(
    `.color-variant-block[data-color-index="${index}"]`,
  );
  if (block) {
    block.setAttribute("data-color-name", colorName);
    block.setAttribute("data-color-id", getColorIdByName(colorName));
  }
  updateEditColorVariantsDataFromDOM();
}

function updateEditColorVariantsDataFromDOM() {
  const blocks = document.querySelectorAll(
    "#editColorVariantsContainer .color-variant-block",
  );
  editColorVariantsData = [];
  blocks.forEach((block) => {
    const colorSelect = block.querySelector(".color-select");
    const colorName = colorSelect?.value;
    if (!colorName) return;
    const colorID = getColorIdByName(colorName);
    const sizes = [];
    const sizeInputs = block.querySelectorAll(".size-qty");
    sizeInputs.forEach((input) => {
      const quantity = parseInt(input.value) || 0;
      const sizeID = parseInt(input.dataset.sizeId);
      const sizeName = input.dataset.sizeName;
      const variantID = input.dataset.variantId
        ? parseInt(input.dataset.variantId)
        : null;
      sizes.push({
        sizeID: sizeID,
        sizeName: sizeName,
        quantityInStock: quantity,
        variantID: variantID,
      });
    });

    editColorVariantsData.push({
      colorID: colorID,
      colorName: colorName,
      sizes: sizes.filter((s) => s.quantityInStock > 0),
    });
  });
}

// Cập nhật màu sắc khi thay đổi select
function updateEditColor(index, colorName) {
  if (editColorVariantsData[index]) {
    editColorVariantsData[index].colorName = colorName;
    editColorVariantsData[index].colorID = getColorIdByName(colorName);
  }
  renderEditColorVariants();
}

async function submitEditProduct() {
  const productId = document.getElementById("editProductID").value;
  const productName = document.getElementById("editProductName").value;

  if (!productName) {
    showNotification("Vui lòng nhập tên sản phẩm!", "error");
    return;
  }
  const variants = [];
  const colorBlocks = document.querySelectorAll(
    "#editColorVariantsContainer .color-variant-block",
  );
  colorBlocks.forEach((block) => {
    const colorSelect = block.querySelector(".color-select");
    const colorName = colorSelect?.value;
    if (!colorName) return;
    const colorID = getColorIdByName(colorName);
    const sizeInputs = block.querySelectorAll(".size-qty");
    sizeInputs.forEach((input) => {
      const quantity = parseInt(input.value) || 0;
      const sizeID = parseInt(input.dataset.sizeId);
      const variantID = input.dataset.variantId
        ? parseInt(input.dataset.variantId)
        : null;
      if (quantity > 0) {
        variants.push({
          variantID: variantID,
          colorID: colorID,
          sizeID: sizeID,
          quantityInStock: quantity,
        });
      }
    });
  });

  const productData = {
    productID: parseInt(productId),
    productName: productName,
    categoryName: document.getElementById("editCategoryName").value || null,
    brandName: document.getElementById("editBrandName").value || null,
    supplierName: document.getElementById("editSupplierName").value || null,
    material: document.getElementById("editMaterial").value || null,
    description: document.getElementById("editDescription").value || null,
    purchasePrice:
      parseFloat(document.getElementById("editPurchasePrice").value) || 0,
    sellingPrice:
      parseFloat(document.getElementById("editSellingPrice").value) || 0,
    status: "Đang bán",
    variants: variants,
  };

  try {
    showLoading();
    const response = await fetch(`${API_URL}/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.title || "Cập nhật thất bại");
    }

    showNotification("✅ Cập nhật sản phẩm thành công!", "success");
    closeEditProductModal();
    await getProductsFromAPI();
  } catch (error) {
    console.error("Lỗi:", error);
    showNotification(error.message, "error");
  } finally {
    hideLoading();
  }
}

function getColorIdByName(colorName) {
  const colorMap = {
    Đỏ: 1,
    Xanh: 2,
    Đen: 3,
    Trắng: 4,
    Vàng: 5,
    Hồng: 6,
    Xám: 7,
    Tím: 8,
    Cam: 9,
    Nâu: 10,
    "Xanh lá": 11,
    "Xanh dương": 12,
  };
  return colorMap[colorName] || 0;
}
// Đóng modal sửa
function closeEditProductModal() {
  const modal = document.getElementById("editProductModal");
  if (modal) modal.style.display = "none";
  currentEditProduct = null;
  editColorVariantsData = [];
}

// Format giá cho modal sửa
function formatEditPurchasePrice(input) {
  const value = parseFloat(input.value) || 0;
  const displaySpan = document.querySelector(".edit-purchase-price-display");
  if (displaySpan) displaySpan.textContent = formatPrice(value);
}

function formatEditSellingPrice(input) {
  const value = parseFloat(input.value) || 0;
  const displaySpan = document.querySelector(".edit-selling-price-display");
  if (displaySpan) displaySpan.textContent = formatPrice(value);
}

function viewProductDetail(productId) {
  showNotification("Chức năng đang được phát triển!", "info");
}

// ========== HIỂN THỊ BẢNG SIZE THEO LOẠI ==========
function toggleSizeTables() {
  const selectedType = document.getElementById("sizeTypeSelect").value;
  const colorBlocks = document.querySelectorAll(".color-variant-block");
  colorBlocks.forEach((block) => {
    const allTables = block.querySelectorAll(".size-quantity-table");
    allTables.forEach((table) => {
      table.style.display = "none";
    });
    const activeTable = block.querySelector(`.size-table-${selectedType}`);
    if (activeTable) {
      activeTable.style.display = "block";
    }
  });
}

// Export global functions
window.togglePurchasePrice = togglePurchasePrice;
window.handleAddToCart = handleAddToCart;
window.editProduct = editProduct;
window.viewProductDetail = viewProductDetail;
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

window.closeVariantModal = closeVariantModal;
window.selectSizeVariant = selectSizeVariant;
window.selectColorVariant = selectColorVariant;
window.confirmAddVariantToCart = confirmAddVariantToCart;

// <td class="td-custom size-cell">${sizeHtml}</td>
