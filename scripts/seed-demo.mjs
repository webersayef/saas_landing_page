// Seed a demo tenant: user + product + live page.
// Run: npm run seed   (login: demo@example.com / demo1234)
// Works in both backends: JSON file store, or Supabase when
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set in the environment.
import { createUser, getUserByEmail, createProduct, createPage, getPageBySlug, creditWallet } from '../lib/store.js';
import { hashPassword } from '../lib/passwords.js';
import { buildSections } from '../lib/templates.js';

if (await getUserByEmail('demo@example.com')) {
  console.log('Demo user already exists — login: demo@example.com / demo1234, page: /s/demo-shop');
  process.exit(0);
}
const user = await createUser({
  name: 'ডেমো বিক্রেতা',
  email: 'demo@example.com',
  shopName: 'ডেমো শপ',
  passwordHash: hashPassword('demo1234'),
});
await creditWallet(user.id, 1000, 'deposit', 'ডেমো ব্যালেন্স (seed)', null);
const product = await createProduct({
  userId: user.id, name: 'ডেমো প্রোডাক্ট', price: 1250, imageUrl: '',
});
if (!(await getPageBySlug('demo-shop'))) {
  await createPage({
    userId: user.id, title: 'ডেমো শপ', slug: 'demo-shop',
    templateId: 'classic-sales', productId: product.id,
    sections: buildSections('classic-sales', product),
  });
}
console.log('Seeded demo tenant.');
console.log('  Login : demo@example.com / demo1234');
console.log('  Page  : /s/demo-shop');
console.log('  Wallet: ৳1000 demo balance');
