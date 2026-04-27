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

