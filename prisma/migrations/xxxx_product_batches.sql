-- Migración para tabla product_batches

CREATE TABLE product_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  productId INTEGER NOT NULL,
  batchCode TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  expiryDate DATE NOT NULL,
  FOREIGN KEY(productId) REFERENCES products(id)
);
