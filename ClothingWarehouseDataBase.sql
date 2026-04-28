-- Sử dụng database hiện có
CREATE DATABASE ClothingWarehouse;
USE ClothingWarehouse;
GO

-- ========== 2. TẠO BẢNG MỚI ==========

-- 2.1. Bảng màu sắc (Master)
CREATE TABLE Colors (
    ColorID INT IDENTITY(1,1) PRIMARY KEY,
    ColorName NVARCHAR(50) NOT NULL UNIQUE,
    ColorCode NVARCHAR(20) NULL,
    SortOrder INT DEFAULT 0,
    CreatedDate DATETIME DEFAULT GETDATE()
);
PRINT 'Đã tạo bảng Colors';

-- 2.2. Bảng kích thước (Master)
CREATE TABLE Sizes (
    SizeID INT IDENTITY(1,1) PRIMARY KEY,
    SizeName NVARCHAR(20) NOT NULL UNIQUE,
    SortOrder INT DEFAULT 0,
    CreatedDate DATETIME DEFAULT GETDATE()
);
PRINT 'Đã tạo bảng Sizes';

-- 2.3. Bảng sản phẩm (Thông tin chung, không chứa màu/size/số lượng)
CREATE TABLE Products (
    ProductID INT IDENTITY(1,1) PRIMARY KEY,
    ProductCode NVARCHAR(50) NOT NULL UNIQUE,
    ProductName NVARCHAR(200) NOT NULL,
    SupplierName NVARCHAR(200) NOT NULL,
    CategoryName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(MAX),
    BrandName NVARCHAR(100) NULL,
    Material NVARCHAR(100) NULL,
    Gender NVARCHAR(20) NULL,
    Status NVARCHAR(20) DEFAULT N'Đang bán',
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
);
PRINT 'Đã tạo bảng Products';

-- 2.4. Bảng biến thể sản phẩm (SKU - Quản lý số lượng theo màu + size)
CREATE TABLE ProductVariants (
    VariantID INT IDENTITY(1,1) PRIMARY KEY,
    ProductID INT NOT NULL,
    ColorID INT NOT NULL,
    SizeID INT NOT NULL,
    SKU NVARCHAR(100) NOT NULL UNIQUE,
    PurchasePrice DECIMAL(18,2) NOT NULL,
    SellingPrice DECIMAL(18,2) NOT NULL,
    QuantityInStock INT NOT NULL DEFAULT 0,
    Status NVARCHAR(20) DEFAULT N'Đang bán',
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_ProductVariants_ProductID FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
    CONSTRAINT FK_ProductVariants_ColorID FOREIGN KEY (ColorID) REFERENCES Colors(ColorID),
    CONSTRAINT FK_ProductVariants_SizeID FOREIGN KEY (SizeID) REFERENCES Sizes(SizeID)
);
PRINT 'Đã tạo bảng ProductVariants';

-- 2.5. Bảng đơn hàng
CREATE TABLE SalesOrders (
    OrderID INT IDENTITY(1,1) PRIMARY KEY,
    OrderDate DATETIME DEFAULT GETDATE(),
    TotalAmount DECIMAL(18,2) DEFAULT 0,
    PaymentMethod NVARCHAR(50) DEFAULT N'Tiền mặt',
    OrderStatus NVARCHAR(50) DEFAULT N'Hoàn thành',
    SalesPerson NVARCHAR(100) NULL,
    DiscountAmount DECIMAL(18,2) DEFAULT 0,
    Notes NVARCHAR(500) NULL
);
PRINT 'Đã tạo bảng SalesOrders';

-- 2.6. Bảng chi tiết đơn hàng (có VariantID)
CREATE TABLE SalesOrderDetails (
    OrderDetailID INT IDENTITY(1,1) PRIMARY KEY,
    OrderID INT NOT NULL,
    VariantID INT NOT NULL,
    ProductID INT NOT NULL,
    ProductCode NVARCHAR(50) NOT NULL,
    ProductName NVARCHAR(200) NOT NULL,
    ColorName NVARCHAR(50) NULL,
    SizeName NVARCHAR(20) NULL,
    Quantity INT NOT NULL CHECK (Quantity > 0),
    UnitPrice DECIMAL(18,2) NOT NULL,
    DiscountAmount DECIMAL(18,2) DEFAULT 0,
    TotalAmount DECIMAL(18,2) DEFAULT 0,
    
    CONSTRAINT FK_SalesOrderDetails_OrderID FOREIGN KEY (OrderID) REFERENCES SalesOrders(OrderID) ON DELETE CASCADE,
    CONSTRAINT FK_SalesOrderDetails_VariantID FOREIGN KEY (VariantID) REFERENCES ProductVariants(VariantID),
    CONSTRAINT FK_SalesOrderDetails_ProductID FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
);
PRINT 'Đã tạo bảng SalesOrderDetails';

-- 2.7. Bảng lịch sử giá (Tuỳ chọn)
CREATE TABLE ProductPriceHistory (
    PriceID INT IDENTITY(1,1) PRIMARY KEY,
    VariantID INT NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    EffectiveDate DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_ProductPriceHistory_VariantID FOREIGN KEY (VariantID) REFERENCES ProductVariants(VariantID)
);
PRINT 'Đã tạo bảng ProductPriceHistory';
GO

-- ========== 3. THÊM DỮ LIỆU MẪU ==========

-- 3.1. Thêm dữ liệu vào bảng Colors
INSERT INTO Colors (ColorName, ColorCode, SortOrder) VALUES
(N'Đen', '#000000', 1),
(N'Trắng', '#FFFFFF', 2),
(N'Đỏ', '#FF0000', 3),
(N'Xanh dương', '#0000FF', 4),
(N'Xanh lá', '#00FF00', 5),
(N'Vàng', '#FFFF00', 6),
(N'Tím', '#800080', 7),
(N'Cam', '#FFA500', 8),
(N'Hồng', '#FFC0CB', 9),
(N'Xám', '#808080', 10),
(N'Nâu', '#8B4513', 11);
GO

-- 3.2. Thêm dữ liệu vào bảng Sizes
INSERT INTO Sizes (SizeName, SortOrder) VALUES
(N'S', 1),
(N'M', 2),
(N'L', 3),
(N'XL', 4),
(N'XXL', 5),
(N'FreeSize', 6);
GO

-- 3.3. Thêm dữ liệu vào bảng Products
INSERT INTO Products (ProductCode, ProductName, SupplierName, CategoryName, Description, BrandName, Material, Gender, Status) VALUES
(N'SP001', N'Áo thun trắng cổ tròn', N'Công ty Thời trang ABC', N'Áo', N'Áo thun chất liệu cotton cao cấp, thoáng mát', N'Uniqlo', N'Cotton 100%', N'Unisex', N'Đang bán'),
(N'SP002', N'Quần jean nam rách gối', N'Công ty B', N'Quần', NULL, N'Levis', NULL, N'Nam', N'Đang bán'),
(N'SP003', N'Áo khoác gió thể thao', N'Công ty Thể thao XYZ', N'Áo khoác', N'Áo khoác gió chống nước, thoáng khí', N'Adidas', N'Polyester 100%', N'Unisex', N'Đang bán'),
(N'SP004', N'Giày thể thao nam', N'Công ty Giày dép', N'Giày', N'Giày thể thao chạy bộ', N'Nike', N'Da tổng hợp', N'Nam', N'Đang bán'),
(N'SP005', N'Mũ lưỡi trai', N'Công ty Phụ kiện', N'Phụ kiện', N'Mũ lưỡi trai cao cấp', N'MLB', N'Vải bố', N'Unisex', N'Đang bán');
GO

-- 3.4. Thêm dữ liệu vào bảng ProductVariants
-- Lấy ID từ Colors và Sizes (giả sử Đen=1, Trắng=2, Đỏ=3, Xanh dương=4)
-- Giả sử S=1, M=2, L=3, XL=4, FreeSize=6

-- SP001: Áo thun trắng cổ tròn
INSERT INTO ProductVariants (ProductID, ColorID, SizeID, SKU, PurchasePrice, SellingPrice, QuantityInStock, Status) VALUES
(1, 3, 1, 'SP001-ĐỎ-S', 50000, 150000, 10, N'Đang bán'),
(1, 3, 2, 'SP001-ĐỎ-M', 50000, 150000, 15, N'Đang bán'),
(1, 3, 3, 'SP001-ĐỎ-L', 50000, 150000, 8, N'Đang bán'),
(1, 4, 2, 'SP001-XANH-M', 50000, 150000, 12, N'Đang bán'),
(1, 4, 3, 'SP001-XANH-L', 50000, 150000, 5, N'Đang bán');

-- SP002: Quần jean nam rách gối
INSERT INTO ProductVariants (ProductID, ColorID, SizeID, SKU, PurchasePrice, SellingPrice, QuantityInStock, Status) VALUES
(2, 1, 1, 'SP002-ĐEN-S', 180000, 450000, 8, N'Đang bán'),
(2, 1, 2, 'SP002-ĐEN-M', 180000, 450000, 12, N'Đang bán'),
(2, 1, 3, 'SP002-ĐEN-L', 180000, 450000, 10, N'Đang bán'),
(2, 4, 1, 'SP002-XANH-S', 180000, 450000, 5, N'Đang bán');

-- SP003: Áo khoác gió thể thao
INSERT INTO ProductVariants (ProductID, ColorID, SizeID, SKU, PurchasePrice, SellingPrice, QuantityInStock, Status) VALUES
(3, 1, 1, 'SP003-ĐEN-S', 250000, 650000, 10, N'Đang bán'),
(3, 1, 2, 'SP003-ĐEN-M', 250000, 650000, 15, N'Đang bán'),
(3, 1, 3, 'SP003-ĐEN-L', 250000, 650000, 12, N'Đang bán'),
(3, 2, 2, 'SP003-TRẮNG-M', 250000, 650000, 8, N'Đang bán');

-- SP004: Giày thể thao nam
INSERT INTO ProductVariants (ProductID, ColorID, SizeID, SKU, PurchasePrice, SellingPrice, QuantityInStock, Status) VALUES
(4, 1, 1, 'SP004-ĐEN-39', 300000, 800000, 20, N'Đang bán'),
(4, 1, 2, 'SP004-ĐEN-40', 300000, 800000, 25, N'Đang bán'),
(4, 1, 3, 'SP004-ĐEN-41', 300000, 800000, 18, N'Đang bán'),
(4, 2, 2, 'SP004-TRẮNG-40', 300000, 800000, 15, N'Đang bán');

-- SP005: Mũ lưỡi trai (FreeSize)
INSERT INTO ProductVariants (ProductID, ColorID, SizeID, SKU, PurchasePrice, SellingPrice, QuantityInStock, Status) VALUES
(5, 1, 6, 'SP005-ĐEN-FREESIZE', 60000, 150000, 50, N'Đang bán'),
(5, 2, 6, 'SP005-TRẮNG-FREESIZE', 60000, 150000, 40, N'Đang bán'),
(5, 3, 6, 'SP005-ĐỎ-FREESIZE', 60000, 150000, 30, N'Đang bán');
GO

-- 3.5. Thêm dữ liệu vào bảng SalesOrders
INSERT INTO SalesOrders (OrderDate, TotalAmount, PaymentMethod, OrderStatus, SalesPerson, DiscountAmount, Notes) VALUES
(GETDATE(), 1250000, N'COD', N'Hoàn thành', N'Nguyễn Văn A', 0, N'Giao hàng giờ hành chính'),
(DATEADD(day, -1, GETDATE()), 2450000, N'Chuyển khoản', N'Hoàn thành', N'Trần Thị C', 50000, N''),
(DATEADD(day, -2, GETDATE()), 850000, N'COD', N'Đang xử lý', N'Nguyễn Văn A', 0, N''),
(DATEADD(day, -3, GETDATE()), 1500000, N'Chuyển khoản', N'Hoàn thành', N'Trần Thị C', 100000, N'Quà tặng kèm'),
(DATEADD(day, -5, GETDATE()), 3200000, N'COD', N'Đang xử lý', N'Nguyễn Văn A', 0, N'');
GO

-- 3.6. Thêm dữ liệu vào bảng SalesOrderDetails
-- Order 1
INSERT INTO SalesOrderDetails (OrderID, VariantID, ProductID, ProductCode, ProductName, ColorName, SizeName, Quantity, UnitPrice, DiscountAmount, TotalAmount) VALUES
(1, 1, 1, N'SP001', N'Áo thun trắng cổ tròn', N'Đỏ', N'S', 2, 150000, 0, 300000),
(1, 6, 2, N'SP002', N'Quần jean nam rách gối', N'Đen', N'S', 1, 450000, 0, 450000),
(1, 11, 3, N'SP003', N'Áo khoác gió thể thao', N'Đen', N'S', 1, 650000, 0, 650000);

-- Order 2
INSERT INTO SalesOrderDetails (OrderID, VariantID, ProductID, ProductCode, ProductName, ColorName, SizeName, Quantity, UnitPrice, DiscountAmount, TotalAmount) VALUES
(2, 2, 1, N'SP001', N'Áo thun trắng cổ tròn', N'Đỏ', N'M', 3, 150000, 0, 450000),
(2, 7, 2, N'SP002', N'Quần jean nam rách gối', N'Đen', N'M', 2, 450000, 0, 900000),
(2, 12, 3, N'SP003', N'Áo khoác gió thể thao', N'Đen', N'M', 1, 650000, 0, 650000);

-- Order 3
INSERT INTO SalesOrderDetails (OrderID, VariantID, ProductID, ProductCode, ProductName, ColorName, SizeName, Quantity, UnitPrice, DiscountAmount, TotalAmount) VALUES
(3, 3, 1, N'SP001', N'Áo thun trắng cổ tròn', N'Đỏ', N'L', 2, 150000, 0, 300000),
(3, 16, 4, N'SP004', N'Giày thể thao nam', N'Đen', N'39', 1, 800000, 0, 800000);

-- Order 4
INSERT INTO SalesOrderDetails (OrderID, VariantID, ProductID, ProductCode, ProductName, ColorName, SizeName, Quantity, UnitPrice, DiscountAmount, TotalAmount) VALUES
(4, 19, 5, N'SP005', N'Mũ lưỡi trai', N'Đen', N'FreeSize', 5, 150000, 0, 750000),
(4, 20, 5, N'SP005', N'Mũ lưỡi trai', N'Trắng', N'FreeSize', 3, 150000, 0, 450000);

-- Order 5
INSERT INTO SalesOrderDetails (OrderID, VariantID, ProductID, ProductCode, ProductName, ColorName, SizeName, Quantity, UnitPrice, DiscountAmount, TotalAmount) VALUES
(5, 4, 1, N'SP001', N'Áo thun trắng cổ tròn', N'Xanh', N'M', 2, 150000, 0, 300000),
(5, 13, 3, N'SP003', N'Áo khoác gió thể thao', N'Đen', N'M', 2, 650000, 0, 1300000),
(5, 17, 4, N'SP004', N'Giày thể thao nam', N'Đen', N'40', 1, 800000, 0, 800000);
GO

-- 3.7. Thêm dữ liệu vào bảng ProductPriceHistory (lịch sử giá)
INSERT INTO ProductPriceHistory (VariantID, Price, EffectiveDate) VALUES
(1, 150000, DATEADD(month, -3, GETDATE())),
(1, 160000, DATEADD(month, -2, GETDATE())),
(1, 150000, DATEADD(month, -1, GETDATE())),
(6, 450000, DATEADD(month, -6, GETDATE())),
(6, 480000, DATEADD(month, -3, GETDATE())),
(6, 450000, DATEADD(month, -1, GETDATE()));
GO

-- ========== 4. KIỂM TRA DỮ LIỆU ==========

PRINT '=== KIỂM TRA DỮ LIỆU ===';

-- Kiểm tra bảng Colors
SELECT COUNT(*) AS ColorCount FROM Colors;

-- Kiểm tra bảng Sizes
SELECT COUNT(*) AS SizeCount FROM Sizes;

-- Kiểm tra bảng Products
SELECT COUNT(*) AS ProductCount FROM Products;

-- Kiểm tra bảng ProductVariants
SELECT COUNT(*) AS VariantCount FROM ProductVariants;

-- Kiểm tra bảng SalesOrders
SELECT COUNT(*) AS OrderCount FROM SalesOrders;

-- Kiểm tra bảng SalesOrderDetails
SELECT COUNT(*) AS OrderDetailCount FROM SalesOrderDetails;

-- Kiểm tra bảng ProductPriceHistory
SELECT COUNT(*) AS PriceHistoryCount FROM ProductPriceHistory;

PRINT '===== DONE =====';
GO