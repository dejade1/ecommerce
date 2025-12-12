/*
  Warnings:

  - You are about to drop the column `isAdmin` on the `User` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "note" TEXT,
    "userId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockAdjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "initialStock" INTEGER,
    "unit" TEXT NOT NULL,
    "image" TEXT,
    "rating" REAL NOT NULL DEFAULT 0,
    "category" TEXT,
    "sales" INTEGER NOT NULL DEFAULT 0,
    "dailySales" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("category", "createdAt", "description", "id", "image", "price", "rating", "stock", "title", "unit", "updatedAt") SELECT "category", "createdAt", "description", "id", "image", "price", "rating", "stock", "title", "unit", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_title_idx" ON "Product"("title");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_stock_idx" ON "Product"("stock");
CREATE INDEX "Product_sales_idx" ON "Product"("sales");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" DATETIME
);
INSERT INTO "new_User" ("createdAt", "email", "id", "lastLogin", "loyaltyPoints", "passwordHash", "role", "username") SELECT "createdAt", "email", "id", "lastLogin", "loyaltyPoints", "passwordHash", "role", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_loyaltyPoints_idx" ON "User"("loyaltyPoints");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "StockAdjustment_productId_timestamp_idx" ON "StockAdjustment"("productId", "timestamp");

-- CreateIndex
CREATE INDEX "StockAdjustment_timestamp_idx" ON "StockAdjustment"("timestamp");

-- CreateIndex
CREATE INDEX "StockAdjustment_adjustmentType_idx" ON "StockAdjustment"("adjustmentType");
