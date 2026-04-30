-- Sử dụng database hiện có
CREATE DATABASE ClothingWarehouseBase;
USE ClothingWarehouseBase;
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
DROP TABLE IF EXISTS Colors;
-- ========== THÊM DỮ LIỆU MÀU SẮC ==========
INSERT INTO Colors (ColorName, ColorCode, SortOrder) VALUES
(N'Đỏ', '#FF0000', 1),
(N'Xanh', '#0000FF', 2),
(N'Đen', '#000000', 3),
(N'Trắng', '#FFFFFF', 4),
(N'Vàng', '#FFFF00', 5),
(N'Hồng', '#FFC0CB', 6),
(N'Xám', '#808080', 7),
(N'Tím', '#800080', 8),
(N'Cam', '#FFA500', 9),
(N'Nâu', '#8B4513', 10),
(N'Xanh lá', '#008000', 11);

ALTER TABLE ProductVariants ALTER COLUMN UpdatedDate DATETIME NULL;

-- 2.2. Bảng kích thước (Master)
CREATE TABLE Sizes (
    SizeID INT IDENTITY(1,1) PRIMARY KEY,
    SizeName NVARCHAR(20) NOT NULL UNIQUE,
    SortOrder INT DEFAULT 0,
    CreatedDate DATETIME DEFAULT GETDATE()
);

-- ========== THÊM DỮ LIỆU KÍCH THƯỚC ==========
INSERT INTO Sizes (SizeName, SortOrder) VALUES
('S', 1),
('M', 2),
('L', 3),
('XL', 4),
('XXL', 5),
('XXXL', 6),
('XXXXL', 7),
('XXXXXL', 8),
('28', 9),
('29', 10),
('30', 11),
('31', 12),
('32', 13),
('33', 14),
('34', 15),
('35', 16),
('36', 17),
('37', 18),
('38', 19),
('FreeSize', 20),
('OneSize', 21);

ALTER TABLE Products ALTER COLUMN CreatedDate DATETIME NULL;

-- 3. Bảng Products (CASCADE khi xóa Product)
-- ========== BẢNG SẢN PHẨM (CÓ SOFT DELETE) ==========
CREATE TABLE Products (
    ProductID INT IDENTITY(1,1) PRIMARY KEY,
    ProductCode NVARCHAR(50) NOT NULL UNIQUE,
    ProductName NVARCHAR(200) NOT NULL,
    SupplierName NVARCHAR(200) NULL,
    CategoryName NVARCHAR(100) NULL,
    PurchasePrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    SellingPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    Description NVARCHAR(MAX),
    BrandName NVARCHAR(100) NULL,
    Material NVARCHAR(100) NULL,
    Gender NVARCHAR(20) NULL,
    Status NVARCHAR(20) DEFAULT N'Đang bán',
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    IsDeleted BIT NOT NULL DEFAULT 0,
    DeletedAt DATETIME NULL
);

-- Tạo index cho IsDeleted để tăng hiệu suất truy vấn
CREATE INDEX IX_Products_IsDeleted ON Products(IsDeleted);
CREATE INDEX IX_Products_Status ON Products(Status);


INSERT INTO Products (ProductCode, ProductName, SupplierName, CategoryName, PurchasePrice, SellingPrice, Description, BrandName, Material, Gender, Status) VALUES
('SP001', N'Áo thun trắng cổ tròn', N'Công ty Thời trang ABC', N'Áo', 50000, 150000, N'Áo thun chất liệu cotton cao cấp, thoáng mát', N'Uniqlo', N'Cotton 100%', N'Unisex', N'Đang bán'),
('SP002', N'Quần jean nam rách gối', N'Công ty Jeans Việt', N'Quần', 180000, 450000, N'Quần jean phong cách Hàn Quốc, chất vải co giãn tốt', N'Levi', N'Denim 98%, Spandex 2%', N'Nam', N'Đang bán'),
('SP003', N'Áo sơ mi nam cổ đức', N'Công ty May mặc Việt Tiến', N'Áo', 120000, 350000, N'Áo sơ mi công sở cao cấp, không nhăn', N'Việt Tiến', N'Polyester 65%, Cotton 35%', N'Nam', N'Đang bán'),
('SP004', N'Váy liền hoa nhí', N'Công ty Thời trang Zara', N'Váy', 250000, 650000, N'Váy suông dài qua gối, hoạ tiết hoa nhí', N'Zara', N'Polyester 100%', N'Nữ', N'Đang bán'),
('SP005', N'Áo khoác bomber da', N'Công ty Thời trang Hàn Quốc', N'Áo khoác', 350000, 850000, N'Áo khoác bomber phong cách Hàn Quốc, da cao cấp', N'Zara', N'Da tổng hợp 100%', N'Unisex', N'Đang bán'),
('SP006', N'Áo len cổ lọ cao cấp', N'Công ty Dệt may Hà Nội', N'Áo len', 150000, 420000, N'Áo len ấm áp, chất len cao cấp không xù', N'Cocoon', N'Len Merino 70%, Cashmere 30%', N'Nữ', N'Đang bán'),
('SP007', N'Quần short kaki nam', N'Công ty May mặc Đức Giang', N'Quần', 90000, 220000, N'Quần short kaki nam mặc đi chơi, thoáng mát', N'Coolmate', N'Kaki 100%', N'Nam', N'Đang bán'),
('SP008', N'Áo thun thể thao chống nắng', N'Công ty Nike Việt Nam', N'Áo', 80000, 250000, N'Áo thun thể thao, chống nắng, co giãn tốt', N'Nike', N'Polyester 85%, Spandex 15%', N'Unisex', N'Đang bán');

-- 4. Bảng ProductVariants (CASCADE khi xóa Product)
CREATE TABLE ProductVariants (
    VariantID INT IDENTITY(1,1) PRIMARY KEY,
    ProductID INT NOT NULL,
    ColorID INT NOT NULL,
    SizeID INT NOT NULL,
    QuantityInStock INT NOT NULL DEFAULT 0,
    Status NVARCHAR(20) DEFAULT N'Đang bán',
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_ProductVariants_ProductID FOREIGN KEY (ProductID) 
        REFERENCES Products(ProductID) ON DELETE CASCADE,
    CONSTRAINT FK_ProductVariants_ColorID FOREIGN KEY (ColorID) 
        REFERENCES Colors(ColorID),
    CONSTRAINT FK_ProductVariants_SizeID FOREIGN KEY (SizeID) 
        REFERENCES Sizes(SizeID)
);
DROP TABLE IF EXISTS ProductVariants;


-- SP001: Áo thun trắng
INSERT INTO ProductVariants (ProductID, ColorID, SizeID, QuantityInStock, Status) VALUES
(8, 2, 1, 20, N'Đang bán'),
(8, 2, 2,  25, N'Đang bán'),
(8, 2, 3, 10, N'Đang bán'),
(8, 1, 2, 10, N'Đang bán');

-- SP002: Quần jean nam
INSERT INTO ProductVariants (ProductID, ColorID, SizeID, QuantityInStock, Status) VALUES
(8, 2, 1, 20, N'Đang bán'),
(8, 2, 2,  25, N'Đang bán'),
(8, 2, 3, 10, N'Đang bán'),
(8, 1, 2, 10, N'Đang bán');

-- SP003: Áo sơ mi nam
INSERT INTO ProductVariants (ProductID, ColorID, SizeID, QuantityInStock, Status) VALUES
(8, 2, 1, 20, N'Đang bán'),
(8, 2, 2,  25, N'Đang bán'),
(8, 2, 3, 10, N'Đang bán'),
(8, 1, 2, 10, N'Đang bán');

-- SP004: Váy liền hoa nhí
INSERT INTO ProductVariants (ProductID, ColorID, SizeID, QuantityInStock, Status) VALUES
(8, 2, 1, 20, N'Đang bán'),
(8, 2, 2,  25, N'Đang bán'),
(8, 2, 3, 10, N'Đang bán'),
(8, 1, 2, 10, N'Đang bán');

-- SP005: Áo khoác bomber
INSERT INTO ProductVariants (ProductID, ColorID, SizeID, QuantityInStock, Status) VALUES
(8, 2, 1, 20, N'Đang bán'),
(8, 2, 2,  25, N'Đang bán'),
(8, 2, 3, 10, N'Đang bán'),
(8, 1, 2, 10, N'Đang bán');

-- SP006: Áo len cổ lọ
INSERT INTO ProductVariants (ProductID, ColorID, SizeID, QuantityInStock, Status) VALUES
(8, 2, 1, 20, N'Đang bán'),
(8, 2, 2,  25, N'Đang bán'),
(8, 2, 3, 10, N'Đang bán'),
(8, 1, 2, 10, N'Đang bán');

-- SP007: Quần short kaki
INSERT INTO ProductVariants (ProductID, ColorID, SizeID, QuantityInStock, Status) VALUES
(8, 2, 1, 20, N'Đang bán'),
(8, 2, 2,  25, N'Đang bán'),
(8, 2, 3, 10, N'Đang bán'),
(8, 1, 2, 10, N'Đang bán');

-- SP008: Áo thun thể thao
INSERT INTO ProductVariants (ProductID, ColorID, SizeID, QuantityInStock, Status) VALUES
(8, 2, 1, 20, N'Đang bán'),
(8, 2, 2,  25, N'Đang bán'),
(8, 2, 3, 10, N'Đang bán'),
(8, 1, 2, 10, N'Đang bán');

-- 5. Bảng SalesOrders
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
INSERT INTO SalesOrders (OrderDate, TotalAmount, PaymentMethod, OrderStatus, SalesPerson, DiscountAmount, Notes) VALUES
(GETDATE(), 450000, N'Chuyển khoản', N'Hoàn thành', N'Nguyễn Văn A', 0, N'Giao hàng giờ hành chính'),
(GETDATE(), 750000, N'Tiền mặt', N'Hoàn thành', N'Trần Thị B', 50000, N'Giao hàng buổi sáng'),
(GETDATE(), 1200000, N'Chuyển khoản', N'Đang xử lý', N'Nguyễn Văn A', 0, NULL);

DROP TABLE IF EXISTS SalesOrders;


-- 6. Bảng SalesOrderDetails (CASCADE khi xóa Order, khi xóa Variant, khi xóa Product)
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
    
    CONSTRAINT FK_SalesOrderDetails_OrderID FOREIGN KEY (OrderID) 
        REFERENCES SalesOrders(OrderID) ON DELETE CASCADE,
    CONSTRAINT FK_SalesOrderDetails_VariantID FOREIGN KEY (VariantID) 
        REFERENCES ProductVariants(VariantID),
    CONSTRAINT FK_SalesOrderDetails_ProductID FOREIGN KEY (ProductID) 
        REFERENCES Products(ProductID)
);

-- Đơn hàng 1
INSERT INTO SalesOrderDetails (OrderID, VariantID, ProductID, ProductCode, ProductName, ColorName, SizeName, Quantity, UnitPrice, DiscountAmount, TotalAmount) VALUES
(1, 1, 1, 'SP001', N'Áo thun trắng cổ tròn', N'Đỏ', N'S', 2, 150000, 0, 300000),
(1, 8, 2, 'SP002', N'Quần jean nam rách gối', N'Đen', N'30', 1, 450000, 0, 450000);

-- Đơn hàng 2
INSERT INTO SalesOrderDetails (OrderID, VariantID, ProductID, ProductCode, ProductName, ColorName, SizeName, Quantity, UnitPrice, DiscountAmount, TotalAmount) VALUES
(2, 4, 1, 'SP001', N'Áo thun trắng cổ tròn', N'Xanh', N'S', 1, 150000, 0, 150000),
(2, 10, 3, 'SP003', N'Áo sơ mi nam cổ đức', N'Xanh', N'M', 1, 350000, 0, 350000),
(2, 14, 4, 'SP004', N'Váy liền hoa nhí', N'Hồng', N'M', 1, 650000, 50000, 600000);

-- Đơn hàng 3
INSERT INTO SalesOrderDetails (OrderID, VariantID, ProductID, ProductCode, ProductName, ColorName, SizeName, Quantity, UnitPrice, DiscountAmount, TotalAmount) VALUES
(3, 19, 6, 'SP006', N'Áo len cổ lọ cao cấp', N'Xám', N'M', 2, 420000, 0, 840000),
(3, 22, 7, 'SP007', N'Quần short kaki nam', N'Đen', N'30', 1, 220000, 0, 220000);