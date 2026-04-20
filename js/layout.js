 const sidebarCol = document.getElementById('sidebarCol');
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    const brandText = document.getElementById('brandTextLogo');
    const allNavLinks = document.querySelectorAll('.nav-link-custom');
    
    // Kiểm tra trạng thái đã lưu (tùy chọn - lưu vào localStorage)
    let isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    
    // Hàm cập nhật trạng thái sidebar
    function setSidebarState(collapsed) {
        if (collapsed) {
            // Thu gọn sidebar
            sidebarCol.classList.add('collapsed');
            sidebarCol.style.width = '80px';
            
            // Ẩn text trong logo
            if (brandText) brandText.style.display = 'none';
            
            // Ẩn text trong tất cả menu items
            allNavLinks.forEach(link => {
                const span = link.querySelector('span');
                if (span) span.style.display = 'none';
                // Thêm tooltip để hiển thị text khi hover
                const text = span ? span.innerText : '';
                link.setAttribute('data-tooltip', text);
            });
        } else {
            // Mở rộng sidebar
            sidebarCol.classList.remove('collapsed');
            sidebarCol.style.width = '250px';
            
            // Hiện text trong logo
            if (brandText) brandText.style.display = 'inline';
            
            // Hiện text trong tất cả menu items
            allNavLinks.forEach(link => {
                const span = link.querySelector('span');
                if (span) span.style.display = 'inline';
                link.removeAttribute('data-tooltip');
            });
        }
        isCollapsed = collapsed;
        localStorage.setItem('sidebarCollapsed', collapsed);
    }
    
    // Khởi tạo trạng thái ban đầu
    setSidebarState(isCollapsed);
    
    // Sự kiện click vào nút toggle
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            setSidebarState(!isCollapsed);
        });
    }
    
    // Optional: Thêm CSS động cho tooltip khi sidebar thu gọn
    const style = document.createElement('style');
    style.textContent = `
        /* Style cho sidebar khi thu gọn */
        .sidebar-col.collapsed .nav-link-custom {
            justify-content: center;
            padding: 10px 0;
            position: relative;
        }
        
        .sidebar-col.collapsed .nav-link-custom img {
            margin: 0;
        }
        
        .sidebar-col.collapsed .logo {
            justify-content: center;
        }
        
        /* Tooltip khi hover vào menu item khi sidebar thu gọn */
        .sidebar-col.collapsed .nav-link-custom[data-tooltip]:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            left: 70px;
            top: 50%;
            transform: translateY(-50%);
            background: #1e293b;
            color: white;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            pointer-events: none;
            animation: fadeIn 0.15s ease;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-50%) translateX(-5px);
            }
            to {
                opacity: 1;
                transform: translateY(-50%) translateX(0);
            }
        }
        
        /* Transition mượt mà */
        .sidebar-col {
            transition: width 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        }
        
        .sidebar-col .nav-link-custom span,
        .sidebar-col .logo span {
            transition: opacity 0.2s, display 0.2s;
        }
    `;
    document.head.appendChild(style);