import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCategoriesWithTemplateCounts } from '@/lib/db/queries/select';
import { db } from '@/lib/db';
import { categoriesTable } from '@/lib/db/schema';

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin-auth')?.value === 'true';
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const categories = await getCategoriesWithTemplateCounts();
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const name = (body.name ?? '').trim();
    const slug = (body.slug ?? '').trim();
    const sequence = typeof body.sequence === 'number' ? body.sequence : 0;

    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
    }

    const [created] = await db
      .insert(categoriesTable)
      .values({ name, slug, sequence })
      .returning();

    return NextResponse.json({ success: true, category: created }, { status: 201 });
  } catch (error: any) {
    // Unique constraint violation
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'A category with that name or slug already exists' }, { status: 409 });
    }
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
