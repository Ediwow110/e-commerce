# Admin CRUD Frontend

The admin side now has interactive CRUD UI for:

- Products
- Product variants
- Categories / collections
- Inventory
- Orders
- Customers
- Promos / discounts
- Wishlist insights
- Reviews
- Reports
- Payments
- Shipping
- Content blocks
- Admin users / roles
- Store settings

The current UI works in frontend state when `VITE_API_URL` is not configured. When the backend is running, connect the API routes under `/api/admin/*` and replace the local state persistence with real requests.

Admin effects included:

- Animated admin page entrance
- Animated CRUD header shine
- Sidebar hover shine
- Table row hover motion
- Toast notifications
- Inline edit transitions
