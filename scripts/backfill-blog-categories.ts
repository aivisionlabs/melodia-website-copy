/**
 * Backfill blog post categories based on slug + title patterns.
 *
 * Categories:
 *   how-to      — AI music how-to guides
 *   birthday    — birthday songs, gifts, milestone ages
 *   mothers-day — Mother's Day gifts & songs
 *   devotional  — bhajans, puja, spiritual occasions
 *   general     — everything else (default)
 *
 * Run:
 *   npx tsx -r dotenv/config scripts/backfill-blog-categories.ts dotenv_config_path=.env.local
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { blogPostsTable } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

type Category = 'how-to' | 'birthday' | 'mothers-day' | 'devotional' | 'general';

function classify(slug: string, title: string): Category {
  const s = slug.toLowerCase();
  const t = title.toLowerCase();

  // Devotional — check first to avoid "birthday-ganesh" false-matching birthday
  const devotionalTerms = [
    'bhajan', 'devotional', 'pooja', 'puja', 'navratri', 'ganesh', 'krishna',
    'vishnu', 'hanuman', 'shiv', 'mahadev', 'shivaratri', 'lakshmi', 'radha',
    'sai-baba', 'sai baba', 'guru-purnima', 'guru purnima', 'griha-pravesh',
    'griha pravesh', 'morning-prayer', 'morning prayer', 'suprabhatam',
    'saraswati', 'basant-panchami', 'basant panchami', 'mata-ki', 'mata ki',
    'temple', 'ram-navami', 'ram navami', 'janmashtami', 'holi-own-lyrics',
    'jai bajrang', 'bajrang bali',
  ];
  if (devotionalTerms.some((term) => s.includes(term) || t.includes(term))) {
    return 'devotional';
  }

  // Mother's Day
  const mothersDayTerms = [
    'mothers-day', "mother's day", 'mothers day', '-maa', ' maa',
    'nani', 'dadi', 'nurse-mom', 'teacher-mom', 'stepmom', 'pet-mom',
    'dog-to-mom',
  ];
  if (mothersDayTerms.some((term) => s.includes(term) || t.includes(term))) {
    return 'mothers-day';
  }

  // Birthday
  const birthdayTerms = [
    'birthday', 'saalgirah', 'bday', 'janmadin',
  ];
  if (birthdayTerms.some((term) => s.includes(term) || t.includes(term))) {
    return 'birthday';
  }

  // How-to guides
  const howToTerms = [
    'how-to', 'how to', 'step-by-step', 'guide', 'ai-song', 'ai song',
    'make-an-ai', 'make an ai',
  ];
  if (howToTerms.some((term) => s.includes(term) || t.includes(term))) {
    return 'how-to';
  }

  return 'general';
}

async function run() {
  console.log('Fetching all blog posts…');
  const posts = await db
    .select({ id: blogPostsTable.id, slug: blogPostsTable.slug, title: blogPostsTable.title, category: blogPostsTable.category })
    .from(blogPostsTable);

  console.log(`Found ${posts.length} posts. Classifying…\n`);

  const updates: { id: number; from: string; to: Category }[] = [];

  for (const post of posts) {
    const newCat = classify(post.slug, post.title);
    if (newCat !== post.category) {
      updates.push({ id: post.id, from: post.category, to: newCat });
    }
  }

  if (updates.length === 0) {
    console.log('All posts already have correct categories. Nothing to update.');
    process.exit(0);
  }

  console.log(`Updating ${updates.length} posts:\n`);
  for (const u of updates) {
    console.log(`  [${u.id}] ${u.from} → ${u.to}`);
    await db
      .update(blogPostsTable)
      .set({ category: u.to })
      .where(eq(blogPostsTable.id, u.id));
  }

  console.log('\nDone. Summary by category:');
  const final = await db.select({ category: blogPostsTable.category }).from(blogPostsTable);
  const counts = final.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});
  for (const [cat, count] of Object.entries(counts).sort()) {
    console.log(`  ${cat.padEnd(14)} ${count} posts`);
  }
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
