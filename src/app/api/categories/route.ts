import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categoriesTable } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const categories = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        sequence: categoriesTable.sequence,
      })
      .from(categoriesTable)
      .orderBy(asc(categoriesTable.sequence), asc(categoriesTable.name));

    return NextResponse.json({ 
      success: true, 
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        sequence: cat.sequence ?? 0,
      }))
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

