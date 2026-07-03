USE twirl_boutique;

INSERT IGNORE INTO categories (id, name) VALUES
  (1, 'Kids'),
  (2, 'Toddler'),
  (3, 'Accessories'),
  (4, 'Dress-up sets');

INSERT IGNORE INTO products (id, sku, title, category_id, price_cents, description, stock_qty) VALUES
  (1, 'SKU-201', 'Rose fairy wings + wand', 1, 129900, 'Iridescent organza wings, satin ribbon wand, glitter-safe coating.', 18),
  (2, 'SKU-088', 'Princess ballgown tulle', 1, 219900, 'Pink champagne tulle layers with soft lining.', 6),
  (3, 'SKU-112', 'Lace masquerade mask', 3, 89900, 'Evening lace mask with satin ties.', 3),
  (4, 'SKU-305', 'Unicorn hoodie costume', 2, 114900, 'Soft fleece hoodie with horn and mane detail.', 14);
