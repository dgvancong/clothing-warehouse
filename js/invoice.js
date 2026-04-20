// ==================== DỮ LIỆU MẪU ====================
let ordersData = [
  {
    id: 1001,
    salesPerson: "Nguyễn Văn A",
    quantity: 3,
    totalAmount: 1250000,
    orderStatus: "Hoàn thành",
    orderDate: "2026-04-21T10:30:00",
    customerName: "Trần Thị B",
    customerPhone: "0987654321",
    customerEmail: "tranb@email.com",
    customerAddress: "123 Đường Lê Lợi, Quận 1, TP.HCM",
    paymentMethod: "Chuyển khoản",
    discountAmount: 50000,
    notes: "Giao hàng giờ hành chính",
    products: [
      {
        code: "SP001",
        name: "Áo thun basic",
        quantity: 2,
        price: 250000,
        total: 500000,
      },
      {
        code: "SP002",
        name: "Quần jeans",
        quantity: 1,
        price: 750000,
        total: 750000,
      },
    ],
    expand: false,
  },
  {
    id: 1002,
    salesPerson: "Trần Thị C",
    quantity: 5,
    totalAmount: 2450000,
    orderStatus: "Đang xử lý",
    orderDate: "2026-04-20T14:15:00",
    customerName: "Lê Văn D",
    customerPhone: "0912345678",
    customerEmail: "levand@email.com",
    customerAddress: "456 Đường Nguyễn Huệ, Quận 3, TP.HCM",
    paymentMethod: "COD",
    discountAmount: 0,
    notes: "",
    products: [
      {
        code: "SP003",
        name: "Áo khoác gió",
        quantity: 1,
        price: 750000,
        total: 750000,
      },
      {
        code: "SP004",
        name: "Giày thể thao",
        quantity: 2,
        price: 550000,
        total: 1100000,
      },
      {
        code: "SP005",
        name: "Mũ lưỡi trai",
        quantity: 2,
        price: 150000,
        total: 300000,
      },
    ],
    expand: false,
  },
  {
    id: 1003,
    salesPerson: "Nguyễn Văn A",
    quantity: 2,
    totalAmount: 850000,
    orderStatus: "Hoàn thành",
    orderDate: "2026-04-19T09:45:00",
    customerName: "Phạm Thị E",
    customerPhone: "0978123456",
    customerEmail: "phame@email.com",
    customerAddress: "789 Đường Võ Văn Tần, Quận 10, TP.HCM",
    paymentMethod: "Chuyển khoản",
    discountAmount: 30000,
    notes: "Quà tặng kèm",
    products: [
      {
        code: "SP006",
        name: "Áo sơ mi trắng",
        quantity: 1,
        price: 350000,
        total: 350000,
      },
      {
        code: "SP007",
        name: "Quần short",
        quantity: 1,
        price: 220000,
        total: 220000,
      },
      {
        code: "SP008",
        name: "Áo len",
        quantity: 1,
        price: 450000,
        total: 450000,
      },
    ],
    expand: false,
  },
  {
    id: 1004,
    salesPerson: "Trần Thị C",
    quantity: 1,
    totalAmount: 1500000,
    orderStatus: "Đã hủy",
    orderDate: "2026-04-18T16:20:00",
    customerName: "Hoàng Văn F",
    customerPhone: "0934567890",
    customerEmail: "hoangf@email.com",
    customerAddress: "321 Đường Cách Mạng Tháng 8, Quận Tân Bình, TP.HCM",
    paymentMethod: "COD",
    discountAmount: 100000,
    notes: "Khách hủy đơn",
    products: [
      {
        code: "SP009",
        name: "Váy hoa",
        quantity: 1,
        price: 550000,
        total: 550000,
      },
      {
        code: "SP010",
        name: "Quần tây",
        quantity: 1,
        price: 450000,
        total: 450000,
      },
    ],
    expand: false,
  },
];

// ==================== BIẾN TOÀN CỤC ====================
let filteredOrders = [...ordersData];
let currentPage = 1;
let pageSize = 10;
let currentFilterType = "month";
let currentDate = new Date();

// ==================== HELPER FUNCTIONS ====================
function formatCurrency(amount) {
  return amount.toLocaleString("vi-VN") + " ₫";
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN");
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("vi-VN");
}

function getStatusTag(status) {
  const statusMap = {
    "Hoàn thành": "success",
    "Đang xử lý": "processing",
    "Đã hủy": "error",
  };
  return statusMap[status] || "default";
}

function getStatusClass(status) {
  const classMap = {
    "Hoàn thành": "status-completed",
    "Đang xử lý": "status-processing",
    "Đã hủy": "status-cancelled",
  };
  return classMap[status] || "status-pending";
}

// ==================== LỌC DỮ LIỆU ====================
function filterOrdersByDate() {
  const filterType = document.getElementById("filterType").value;
  const selectedDateStr = document.getElementById("selectedDate").value;
  const selectedDate = new Date(selectedDateStr);

  filteredOrders = ordersData.filter((order) => {
    const orderDate = new Date(order.orderDate);
    if (filterType === "day") {
      return orderDate.toDateString() === selectedDate.toDateString();
    } else if (filterType === "month") {
      return (
        orderDate.getMonth() === selectedDate.getMonth() &&
        orderDate.getFullYear() === selectedDate.getFullYear()
      );
    } else {
      return orderDate.getFullYear() === selectedDate.getFullYear();
    }
  });

  currentPage = 1;
  updateDisplayDate();
  updateStats();
  renderTable();
}

function updateDisplayDate() {
  const filterType = document.getElementById("filterType").value;
  const selectedDateStr = document.getElementById("selectedDate").value;
  const date = new Date(selectedDateStr);
  const displaySpan = document.getElementById("displayDate");

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
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalQuantity = filteredOrders.reduce((sum, order) => sum + order.quantity, 0);
    const orderCount = filteredOrders.length;
    const completedOrders = filteredOrders.filter(o => o.orderStatus === 'Hoàn thành').length;
    const completionRate = orderCount > 0 ? (completedOrders / orderCount * 100) : 0;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
    
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('totalQuantity').textContent = totalQuantity.toLocaleString();
    document.getElementById('orderCount').textContent = orderCount;
    document.getElementById('completionRate').textContent = Math.round(completionRate) + '%';
    document.getElementById('completedOrders').textContent = `${completedOrders}/${orderCount} đơn`;
    document.getElementById('avgOrderValue').innerHTML = `
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 2px;">
            <path d="M18 20V10M12 20V4M6 20v-6" stroke-linecap="round"/>
        </svg>
        TB: ${formatCurrency(avgOrderValue)}/đơn
    `;
    document.getElementById('orderCountBadge').textContent = orderCount + ' đơn';
}
// ==================== TOGGLE EXPAND ====================
function toggleExpand(orderId) {
  const order = filteredOrders.find((o) => o.id === orderId);
  if (order) {
    order.expand = !order.expand;
    renderTable();
  }
}

// ==================== RENDER TABLE ====================
function renderTable() {
  const tbody = document.getElementById("ordersTableBody");
  const total = filteredOrders.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const paginatedData = filteredOrders.slice(start, end);

  if (paginatedData.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;">
                        <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" stroke-linecap="round"/>
                    </svg>
                    Không có đơn hàng nào
                </td>
            </tr>
        `;
    updatePaginationInfo(0, 0, total, currentPage, totalPages);
    return;
  }

  tbody.innerHTML = "";

  paginatedData.forEach((order) => {
    // Main row
    const mainRow = document.createElement("tr");
    mainRow.innerHTML = `
            <td class="text-center">
                <div class="btn-expand" onclick="toggleExpand(${order.id})">
                    ${
                      order.expand
                        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="1.5"><path d="M12 8v8M8 12h8" stroke-linecap="round"/></svg>'
                        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="1.5"><path d="M12 8v8M8 12h8" stroke-linecap="round"/></svg>'
                    }
                </div>
            </td>
            <td class="fw-semibold">#${order.id}</td>
            <td>${order.salesPerson || "Chưa phân công"}</td>
            <td>${order.quantity}</td>
            <td class="text-primary fw-semibold">${formatCurrency(order.totalAmount)}</td>
            <td><span class="status-badge ${getStatusClass(order.orderStatus)}"><span class="status-dot"></span>${order.orderStatus}</span></td>
            <td>${formatDate(order.orderDate)}</td>
        `;
    tbody.appendChild(mainRow);

    // Expand row
    if (order.expand) {
      const expandRow = document.createElement("tr");
      expandRow.className = "expand-detail-row";

      let productsHtml = "";
      order.products.forEach((product, idx) => {
        productsHtml += `
                    <tr>
                        <td class="text-center">${idx + 1}</td>
                        <td>${product.code || "-"}</td>
                        <td>${product.name}</td>
                        <td class="text-center">${product.quantity}</td>
                        <td class="text-end">${formatCurrency(product.price)}</td>
                        <td class="text-end text-primary fw-semibold">${formatCurrency(product.total)}</td>
                    </tr>
                `;
      });

      expandRow.innerHTML = `
                <td colspan="7" class="p-0">
                    <div class="expand-content p-4 bg-light">
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <div class="card h-100 border-0 shadow-sm">
                                    <div class="card-header bg-white fw-semibold">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="1.5" style="display: inline; margin-right: 8px;">
                                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke-linecap="round"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                        Thông tin khách hàng
                                    </div>
                                    <div class="card-body">
                                        <p class="mb-2"><strong>Họ tên:</strong> ${order.customerName}</p>
                                        <p class="mb-2"><strong>Số điện thoại:</strong> ${order.customerPhone || "Chưa cập nhật"}</p>
                                        <p class="mb-2"><strong>Email:</strong> ${order.customerEmail || "Chưa cập nhật"}</p>
                                        <p class="mb-0"><strong>Địa chỉ:</strong> ${order.customerAddress || "Chưa cập nhật"}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4 mb-3">
                                <div class="card h-100 border-0 shadow-sm">
                                    <div class="card-header bg-white fw-semibold">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="1.5" style="display: inline; margin-right: 8px;">
                                            <path d="M4 4h16v2.172a2 2 0 01-.586 1.414l-5.828 5.828a2 2 0 00-.586 1.414V20l-4-2v-6.172a2 2 0 00-.586-1.414L4.586 7.586A2 2 0 014 6.172V4z" stroke-linecap="round"/>
                                        </svg>
                                        Thông tin đơn hàng
                                    </div>
                                    <div class="card-body">
                                        <p class="mb-2"><strong>Mã đơn:</strong> #${order.id}</p>
                                        <p class="mb-2"><strong>Ngày đặt:</strong> ${formatDateTime(order.orderDate)}</p>
                                        <p class="mb-2"><strong>Nhân viên:</strong> ${order.salesPerson || "Chưa phân công"}</p>
                                        <p class="mb-2"><strong>Trạng thái:</strong> <span class="status-badge ${getStatusClass(order.orderStatus)}"><span class="status-dot"></span>${order.orderStatus}</span></p>
                                        <p class="mb-0"><strong>Tổng sản phẩm:</strong> ${order.quantity}</p>
                                        ${order.notes ? `<p class="mb-0 mt-2"><strong>Ghi chú:</strong> ${order.notes}</p>` : ""}
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4 mb-3">
                                <div class="card h-100 border-0 shadow-sm">
                                    <div class="card-header bg-white fw-semibold">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="1.5" style="display: inline; margin-right: 8px;">
                                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                            <line x1="1" y1="10" x2="23" y2="10"/>
                                        </svg>
                                        Thanh toán
                                    </div>
                                    <div class="card-body">
                                        <p class="mb-2"><strong>Phương thức:</strong> ${order.paymentMethod || "COD"}</p>
                                        <p class="mb-2"><strong>Tạm tính:</strong> ${formatCurrency(order.totalAmount + order.discountAmount)}</p>
                                        ${order.discountAmount > 0 ? `<p class="mb-2"><strong>Giảm giá:</strong> ${formatCurrency(order.discountAmount)}</p>` : ""}
                                        <p class="mb-0"><strong>Tổng tiền:</strong> <span class="text-danger fw-bold">${formatCurrency(order.totalAmount)}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <h6 class="fw-semibold mb-3">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="1.5" style="display: inline; margin-right: 8px;">
                                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" stroke-linecap="round"/>
                                </svg>
                                Danh sách sản phẩm
                            </h6>
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
                                            <td colspan="5" class="text-end">Giảm giá:</td>
                                            <td class="text-end text-danger">${formatCurrency(order.discountAmount)}</td>
                                        </tr>
                                        <tr class="table-light fw-semibold">
                                            <td colspan="5" class="text-end">Tổng cộng:</td>
                                            <td class="text-end text-danger">${formatCurrency(order.totalAmount)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="mt-3 text-muted small">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display: inline; margin-right: 4px;">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14" stroke-linecap="round"/>
                            </svg>
                            Hóa đơn được tạo lúc ${formatDateTime(order.orderDate)}
                        </div>
                    </div>
                </td>
            `;
      tbody.appendChild(expandRow);
    }
  });

  const displayStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const displayEnd = Math.min(currentPage * pageSize, total);
  updatePaginationInfo(
    displayStart,
    displayEnd,
    total,
    currentPage,
    totalPages,
  );
}

function updatePaginationInfo(start, end, total, currentPage, totalPages) {
  document.getElementById("startCount").textContent = start;
  document.getElementById("endCount").textContent = end;
  document.getElementById("totalOrdersCount").textContent = total;
  document.getElementById("currentPage").textContent = currentPage;
  document.getElementById("totalPages").textContent = totalPages || 1;
  document.getElementById("prevPage").disabled = currentPage <= 1;
  document.getElementById("nextPage").disabled = currentPage >= totalPages;
}

// ==================== PAGINATION ====================
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
}

function nextPage() {
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
}

function changePageSize() {
  pageSize = parseInt(document.getElementById("pageSizeSelect").value);
  currentPage = 1;
  renderTable();
}

// ==================== EXPORT EXCEL ====================
function exportToExcel() {
  let csvContent =
    "Mã đơn,Nhân viên,Số lượng,Tổng tiền,Trạng thái,Ngày đặt,Khách hàng,SĐT,Email,Địa chỉ\n";
  filteredOrders.forEach((order) => {
    csvContent += `${order.id},${order.salesPerson},${order.quantity},${order.totalAmount},${order.orderStatus},${order.orderDate},${order.customerName},${order.customerPhone},${order.customerEmail},${order.customerAddress}\n`;
  });
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "don_hang.csv";
  link.click();
}

// ==================== KHỞI TẠO ====================
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("filterType")
    .addEventListener("change", filterOrdersByDate);
  document
    .getElementById("selectedDate")
    .addEventListener("change", filterOrdersByDate);
  document.getElementById("prevPage").addEventListener("click", prevPage);
  document.getElementById("nextPage").addEventListener("click", nextPage);
  document
    .getElementById("pageSizeSelect")
    .addEventListener("change", changePageSize);
  document
    .getElementById("exportExcelBtn")
    .addEventListener("click", exportToExcel);

  filterOrdersByDate();
});

// Export global functions
window.toggleExpand = toggleExpand;
window.prevPage = prevPage;
window.nextPage = nextPage;
