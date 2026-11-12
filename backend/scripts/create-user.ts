// Creates a login account.
// Usage: npm run create-user -- someone@example.com "a-strong-password"
import { supabase } from "../src/lib/supabase.js";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run create-user -- <email> "<password>"');
    process.exit(1);
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip the confirmation email
  });

  if (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }
  console.log(`Created user ${data.user.email} (${data.user.id})`);
}

main();
