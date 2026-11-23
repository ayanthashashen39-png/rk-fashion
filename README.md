# RK FASHION store + admin

Deploy: push this folder to GitHub → Netlify "Import project" (or `netlify deploy --prod`).
Netlify → Site settings → Environment variables → add `ADMIN_PASSWORD` → redeploy.
Store: /   Admin: /admin/

Admin: Dashboard, Products (sizes, stock, sale price, many photos), Categories, Orders, Settings (banner, hero, logo, WhatsApp number, currency).
Customers place orders (no online payment). Orders appear in Admin → Orders.

Password: set `ADMIN_PASSWORD` in Netlify for the first login. After that you can change it in Admin → Settings → Change password.
Forgot the password? In Netlify add `ADMIN_PASSWORD_RESET` = `yes` (and `ADMIN_PASSWORD`), redeploy, log in with `ADMIN_PASSWORD`, then delete `ADMIN_PASSWORD_RESET` and set a new password in Settings.
