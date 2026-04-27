// ==================== invoice.js - Quản lý đơn hàng ====================

// ==================== CẤU HÌNH API ====================
const API_ORDERS_URL = "https://localhost:5001/api/orders";

// ==================== BIẾN TOÀN CỤC ====================
let ordersData = [];
let filteredOrders = [];
let currentPage = 1;
let pageSize = 10;
let totalCount = 0;
let totalPages = 1;
let currentFilterType = "month";
let currentDate = new Date();
let isLoading = false;
let currentFromDate = null;
let currentToDate = null;

// ==================== HELPER FUNCTIONS ====================

// Format tiền tệ
function formatCurrency(amount) {
  if (!amount && amount !== 0) return "0 ₫";
  return amount.toLocaleString("vi-VN") + " ₫";
}

// Format ngày tháng
function formatDate(dateString) {
  if (!dateString) return "--/--/----";
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN");
}

// Format ngày giờ
function formatDateTime(dateString) {
  if (!dateString) return "--/--/---- --:--";
  const date = new Date(dateString);
  return date.toLocaleString("vi-VN");
}

// Lấy class cho trạng thái
function getStatusClass(status) {
  const classMap = {
    "Hoàn thành": "status-completed",
    "Đang xử lý": "status-processing",
    "Đã hủy": "status-cancelled",
    "Chờ xác nhận": "status-pending",
    "Đang giao": "status-processing",
  };
  return classMap[status] || "status-pending";
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
    
    const style = document.createElement("style");
    style.textContent = `
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #03A9F4;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
  loadingDiv.style.display = "flex";
}

function hideLoading() {
  const loadingDiv = document.getElementById("loadingOverlay");
  if (loadingDiv) {
    loadingDiv.style.display = "none";
  }
}

// ==================== HIỂN THỊ THÔNG BÁO ====================
function showNotification(message, type = "info") {
  let notification = document.getElementById("notificationToast");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "notificationToast";
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

// ==================== GỌI API LẤY ĐƠN HÀNG ====================
async function getOrdersFromAPI() {
  try {
    showLoading();
    isLoading = true;
    
    // Lấy giá trị lọc
    const filterType = document.getElementById("filterType")?.value || "month";
    const selectedDateStr = document.getElementById("selectedDate")?.value || new Date().toISOString().split('T')[0];
    const selectedDate = new Date(selectedDateStr);
    
    // Xây dựng params
    const params = new URLSearchParams();
    params.append("pageNumber", currentPage.toString());
    params.append("pageSize", pageSize.toString());
    
    // Thêm bộ lọc thời gian
    let fromDate, toDate;
    if (filterType === "day") {
      fromDate = new Date(selectedDate);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(selectedDate);
      toDate.setHours(23, 59, 59, 999);
    } else if (filterType === "month") {
      fromDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      toDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      fromDate = new Date(selectedDate.getFullYear(), 0, 1);
      toDate = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    
    currentFromDate = fromDate.toISOString();
    currentToDate = toDate.toISOString();
    params.append("fromDate", currentFromDate);
    params.append("toDate", currentToDate);
    
    const url = `${API_ORDERS_URL}?${params.toString()}`;
    console.log("📦 Đang gọi API đơn hàng - Trang:", currentPage, "Size:", pageSize);
    console.log("🔗 URL:", url);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("✅ Dữ liệu từ API:", result);
    
    // Lấy dữ liệu từ API
    let ordersList = [];
    
    if (result.items && Array.isArray(result.items)) {
      ordersList = result.items;
      totalCount = result.totalCount || result.items.length;
      totalPages = result.totalPages || Math.ceil(totalCount / pageSize);
    } else if (result.data && Array.isArray(result.data)) {
      ordersList = result.data;
      totalCount = result.totalCount || result.data.length;
      totalPages = result.totalPages || Math.ceil(totalCount / pageSize);
    } else if (Array.isArray(result)) {
      ordersList = result;
      totalCount = result.length;
      totalPages = Math.ceil(totalCount / pageSize);
    } else {
      // Tìm mảng trong object
      for (let key in result) {
        if (Array.isArray(result[key])) {
          ordersList = result[key];
          totalCount = result.totalCount || result[key].length;
          totalPages = result.totalPages || Math.ceil(totalCount / pageSize);
          break;
        }
      }
    }
    
    console.log("📋 Số đơn hàng trang", currentPage, ":", ordersList.length);
    console.log("📊 Tổng số:", totalCount, "| Tổng số trang:", totalPages);
    
    // Chuyển đổi dữ liệu
    filteredOrders = ordersList.map(order => ({
      id: order.orderID || order.id,
      orderID: order.orderID || order.id,
      salesPerson: order.salesPerson || "Chưa phân công",
      quantity: order.orderDetails?.reduce((sum, item) => sum + item.quantity, 0) || 0,
      totalAmount: order.totalAmount || 0,
      orderStatus: order.orderStatus || "Đang xử lý",
      orderDate: order.orderDate || new Date().toISOString(),
      customerName: order.customerName || "Khách lẻ",
      customerPhone: order.customerPhone || "",
      customerEmail: order.customerEmail || "",
      customerAddress: order.customerAddress || "",
      paymentMethod: order.paymentMethod || "COD",
      discountAmount: order.discountAmount || 0,
      notes: order.notes || "",
      products: (order.orderDetails || []).map(item => ({
        code: item.productCode,
        name: item.productName,
        quantity: item.quantity,
        price: item.unitPrice,
        total: item.totalAmount || (item.unitPrice * item.quantity)
      })),
      expand: false
    }));
    
    updateDisplayDate();
    updateStats();
    renderTable();
    
  } catch (error) {
    console.error("❌ Lỗi khi gọi API:", error);
    showNotification(`Lỗi tải dữ liệu: ${error.message}`, "error");
    filteredOrders = [];
    totalCount = 0;
    totalPages = 1;
    renderTable();
  } finally {
    hideLoading();
    isLoading = false;
  }
}

// ==================== LỌC DỮ LIỆU THEO NGÀY ====================
function filterOrdersByDate() {
  currentPage = 1;
  getOrdersFromAPI();
}

// ==================== CẬP NHẬT HIỂN THỊ NGÀY ====================
function updateDisplayDate() {
  const filterType = document.getElementById("filterType")?.value || "month";
  const selectedDateStr = document.getElementById("selectedDate")?.value;
  if (!selectedDateStr) return;
  const date = new Date(selectedDateStr);
  const displaySpan = document.getElementById("displayDate");
  if (!displaySpan) return;

  if (filterType === "day") {
    displaySpan.textContent = `Ngày ${date.toLocaleDateString("vi-VN")}`;
  } else if (filterType === "month") {
    displaySpan.textContent = `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
  } else {
    displaySpan.textContent = `Năm ${date.getFullYear()}`;
  }
}

// ==================== CẬP NHẬT THỐNG KÊ ====================
function updateStats() {
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const totalQuantity = filteredOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);
  const orderCount = filteredOrders.length;
  const completedOrders = filteredOrders.filter(o => o.orderStatus === 'Hoàn thành').length;
  const completionRate = orderCount > 0 ? (completedOrders / orderCount * 100) : 0;
  const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
  const totalRevenueEl = document.getElementById("totalRevenue");
  const totalQuantityEl = document.getElementById("totalQuantity");
  const orderCountEl = document.getElementById("orderCount");
  const completionRateEl = document.getElementById("completionRate");
  const completedOrdersEl = document.getElementById("completedOrders");
  const avgOrderValueEl = document.getElementById("avgOrderValue");
  const orderCountBadgeEl = document.getElementById("orderCountBadge");
  if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(totalRevenue);
  if (totalQuantityEl) totalQuantityEl.textContent = totalQuantity.toLocaleString();
  if (orderCountEl) orderCountEl.textContent = totalCount; // Dùng totalCount từ API
  if (completionRateEl) completionRateEl.textContent = Math.round(completionRate) + '%';
  if (completedOrdersEl) completedOrdersEl.textContent = `${completedOrders}/${filteredOrders.length} đơn`;
  if (avgOrderValueEl) {
    avgOrderValueEl.innerHTML = `TB: ${formatCurrency(avgOrderValue)}/đơn`;
  }
  if (orderCountBadgeEl) orderCountBadgeEl.textContent = totalCount + ' đơn';
}

// ==================== TOGGLE EXPAND ====================
function toggleExpand(orderId) {
  const order = filteredOrders.find((o) => o.id === orderId || o.orderID === orderId);
  if (order) {
    order.expand = !order.expand;
    renderTable();
  }
}

// ==================== RENDER TABLE ====================
function renderTable() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;
  
  const paginatedData = filteredOrders;

  if (paginatedData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5 text-muted">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;">
            <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" stroke-linecap="round"/>
          </svg>
          Không có đơn hàng nào
        <\/td>
      <\/tr>
    `;
    updatePaginationInfo(0, 0, totalCount, currentPage, totalPages);
    return;
  }

  tbody.innerHTML = "";

  paginatedData.forEach((order) => {
    const orderId = order.id || order.orderID;
    const mainRow = document.createElement("tr");
    mainRow.innerHTML = `
      <td class="text-center">
        <div class="btn-expand" onclick="toggleExpand(${orderId})" style="cursor: pointer;">
          ${order.expand ? 
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="1.5"><path d="M12 8v8M8 12h8" stroke-linecap="round"/></svg>' : 
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="1.5"><path d="M12 8v8M8 12h8" stroke-linecap="round"/></svg>'
          }
        </div>
      <\/td>
      <td class="fw-semibold">#${orderId}<\/td>
      <td>${order.salesPerson || "Chưa phân công"}<\/td>
      <td>${order.quantity || 0}<\/td>
      <td class="text-primary fw-semibold">${formatCurrency(order.totalAmount)}<\/td>
      <td><span class="status-badge ${getStatusClass(order.orderStatus)}"><span class="status-dot"></span>${order.orderStatus}</span><\/td>
      <td>${formatDate(order.orderDate)}<\/td>
    `;
    tbody.appendChild(mainRow);

    // Expand row
    if (order.expand) {
      const expandRow = document.createElement("tr");
      expandRow.className = "expand-detail-row";

      let productsHtml = "";
      if (order.products && order.products.length > 0) {
        order.products.forEach((product, idx) => {
          productsHtml += `
            <tr>
              <td class="text-center">${idx + 1}<\/td>
              <td>${product.code || "-"}<\/td>
              <td>${product.name}<\/td>
              <td class="text-center">${product.quantity}<\/td>
              <td class="text-end">${formatCurrency(product.price)}<\/td>
              <td class="text-end text-primary fw-semibold">${formatCurrency(product.total)}<\/td>
            <\/tr>
          `;
        });
      }

      expandRow.innerHTML = `
        <td colspan="7" class="p-0">
          <div class="expand-content p-4 bg-light">
            <div class="row">
              <div class="col-md-4 mb-3">
                <div class="card h-100 border-0 shadow-sm">
                  <div class="card-header bg-white fw-semibold">👤 Thông tin khách hàng</div>
                  <div class="card-body">
                    <p class="mb-2"><strong>Họ tên:</strong> ${order.customerName || "Khách lẻ"}</p>
                    <p class="mb-2"><strong>Số điện thoại:</strong> ${order.customerPhone || "Chưa cập nhật"}</p>
                    <p class="mb-2"><strong>Email:</strong> ${order.customerEmail || "Chưa cập nhật"}</p>
                    <p class="mb-0"><strong>Địa chỉ:</strong> ${order.customerAddress || "Chưa cập nhật"}</p>
                  </div>
                </div>
              </div>
              <div class="col-md-4 mb-3">
                <div class="card h-100 border-0 shadow-sm">
                  <div class="card-header bg-white fw-semibold">📋 Thông tin đơn hàng</div>
                  <div class="card-body">
                    <p class="mb-2"><strong>Mã đơn:</strong> #${orderId}</p>
                    <p class="mb-2"><strong>Ngày đặt:</strong> ${formatDateTime(order.orderDate)}</p>
                    <p class="mb-2"><strong>Nhân viên:</strong> ${order.salesPerson || "Chưa phân công"}</p>
                    <p class="mb-2"><strong>Trạng thái:</strong> <span class="status-badge ${getStatusClass(order.orderStatus)}"><span class="status-dot"></span>${order.orderStatus}</span></p>
                    <p class="mb-0"><strong>Tổng sản phẩm:</strong> ${order.quantity || 0}</p>
                    ${order.notes ? `<p class="mb-0 mt-2"><strong>Ghi chú:</strong> ${order.notes}</p>` : ""}
                  </div>
                </div>
              </div>
              <div class="col-md-4 mb-3">
                <div class="card h-100 border-0 shadow-sm">
                  <div class="card-header bg-white fw-semibold">💳 Thanh toán</div>
                  <div class="card-body">
                    <p class="mb-2"><strong>Phương thức:</strong> ${order.paymentMethod || "COD"}</p>
                    <p class="mb-2"><strong>Tạm tính:</strong> ${formatCurrency((order.totalAmount || 0) + (order.discountAmount || 0))}</p>
                    ${order.discountAmount > 0 ? `<p class="mb-2"><strong>Giảm giá:</strong> ${formatCurrency(order.discountAmount)}</p>` : ""}
                    <p class="mb-0"><strong>Tổng tiền:</strong> <span class="text-danger fw-bold">${formatCurrency(order.totalAmount)}</span></p>
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-3">
              <h6 class="fw-semibold mb-3">📦 Danh sách sản phẩm</h6>
              <div class="table-responsive">
                <table class="table table-sm table-bordered bg-white">
                  <thead class="table-light">
                    <tr>
                      <th>#</th>
                      <th>Mã SP</th>
                      <th>Tên sản phẩm</th>
                      <th class="text-center">Số lượng</th>
                      <th class="text-end">Đơn giá</th>
                      <th class="text-end">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${productsHtml}
                    <tr class="table-light fw-semibold">
                      <td colspan="5" class="text-end">Giảm giá:<\/td>
                      <td class="text-end text-danger">${formatCurrency(order.discountAmount || 0)}<\/td>
                    <\/tr>
                    <tr class="table-light fw-semibold">
                      <td colspan="5" class="text-end">Tổng cộng:<\/td>
                      <td class="text-end text-danger">${formatCurrency(order.totalAmount)}<\/td>
                    <\/tr>
                  </tbody>
                <\/table>
              </div>
            </div>
            <div class="mt-3 text-muted small">
              🕐 Hóa đơn được tạo lúc ${formatDateTime(order.orderDate)}
            </div>
          </div>
        <\/td>
      `;
      tbody.appendChild(expandRow);
    }
  });

  const displayStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const displayEnd = Math.min(currentPage * pageSize, totalCount);
  updatePaginationInfo(displayStart, displayEnd, totalCount, currentPage, totalPages);
}

// ==================== CẬP NHẬT PHÂN TRANG ====================
function updatePaginationInfo(start, end, total, currentPage, totalPages) {
  const startSpan = document.getElementById("startCount");
  const endSpan = document.getElementById("endCount");
  const totalSpan = document.getElementById("totalOrdersCount");
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

// ==================== PAGINATION HANDLERS ====================
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    getOrdersFromAPI();
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    getOrdersFromAPI();
  }
}

function changePageSize() {
  pageSize = parseInt(document.getElementById("pageSizeSelect").value);
  currentPage = 1;
  getOrdersFromAPI();
}

// ==================== EXPORT EXCEL ====================
function exportToExcel() {
  let csvContent = "Mã đơn,Nhân viên,Số lượng,Tổng tiền,Trạng thái,Ngày đặt,Khách hàng,SĐT,Email,Địa chỉ\n";
  filteredOrders.forEach((order) => {
    csvContent += `${order.id || order.orderID},${order.salesPerson},${order.quantity},${order.totalAmount},${order.orderStatus},${order.orderDate},${order.customerName},${order.customerPhone || ""},${order.customerEmail || ""},${order.customerAddress || ""}\n`;
  });
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `don_hang_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  showNotification("✅ Xuất file Excel thành công!", "success");
}

// ==================== KHỞI TẠO ====================
document.addEventListener("DOMContentLoaded", function () {
  const filterType = document.getElementById("filterType");
  const selectedDate = document.getElementById("selectedDate");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageSizeSelect = document.getElementById("pageSizeSelect");
  const exportExcelBtn = document.getElementById("exportExcelBtn");

  if (filterType) filterType.addEventListener("change", filterOrdersByDate);
  if (selectedDate) {
    selectedDate.addEventListener("change", filterOrdersByDate);
    const today = new Date().toISOString().split('T')[0];
    selectedDate.value = today;
  }
  if (prevPageBtn) prevPageBtn.addEventListener("click", prevPage);
  if (nextPageBtn) nextPageBtn.addEventListener("click", nextPage);
  if (pageSizeSelect) pageSizeSelect.addEventListener("change", changePageSize);
  if (exportExcelBtn) exportExcelBtn.addEventListener("click", exportToExcel);

  // Gọi API lấy dữ liệu
  getOrdersFromAPI();
});

// Export global functions
window.toggleExpand = toggleExpand;
window.prevPage = prevPage;
window.nextPage = nextPage;