import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const BUCKET = 'game-assets'

/** Converte string para slug de arquivo — sem caracteres especiais */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // tudo que não é alfanum → hífen
    .replace(/^-|-$/g, '')         // remove hífens nas bordas
}

/**
 * Monta o caminho no Storage baseado em category, key e field.
 *
 * Estrutura final no bucket:
 *   sprites/
 *     robots/{slug-da-collection}/idle.png
 *     robots/{slug-da-collection}/active.png
 *     robots/{slug-da-collection}/low.png
 *     robots/{slug-da-collection}/icon.png   ← imageUrl estático
 *     equipment/{EFFECT_TYPE}.png
 *     base-upgrades/{EFFECT_TYPE}.png
 *     parts/{CATEGORY_OR_NAME}.png
 *     consumables/{REPAIR_KIT_25}.png
 *     lootboxes/{LOOTBOX_TYPE}.png
 */
function buildStoragePath(
  category: string,
  key: string,
  field: 'image' | 'idle' | 'active' | 'low',
  ext: string,
): string {
  const keySlug = slugify(key)

  switch (category) {
    case 'robot':
      // Robôs têm subpasta por coleção + arquivo por estado
      return `sprites/robots/${keySlug}/${field}.${ext}`

    case 'equipment':
      return `sprites/equipment/${keySlug}.${ext}`

    case 'baseUpgrade':
      return `sprites/base-upgrades/${keySlug}.${ext}`

    case 'part':
      return `sprites/parts/${keySlug}.${ext}`

    case 'consumable':
      return `sprites/consumables/${keySlug}.${ext}`

    case 'lootbox':
      return `sprites/lootboxes/${keySlug}.${ext}`

    case 'lootbox-opening':
      // Clipe animado (WebP/GIF) da caixa caindo + abrindo, usado no LootboxOpeningAnimation
      return `animations/lootbox-opening/${keySlug}.${ext}`

    default:
      return `sprites/misc/${keySlug}-${field}.${ext}`
  }
}

/**
 * POST /api/admin/item-visuals/upload
 * Body: multipart/form-data
 *   file     File    — PNG ou WebP
 *   category string  — categoria do item
 *   key      string  — chave de lookup
 *   field    string  — 'image' | 'idle' | 'active' | 'low'
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file     = form.get('file')     as File   | null
  const category = form.get('category') as string | null
  const key      = form.get('key')      as string | null
  const field    = (form.get('field')   as string | null) ?? 'image'

  if (!file || !category || !key) {
    return NextResponse.json({ error: 'file, category and key are required.' }, { status: 400 })
  }

  // Valida tipo MIME
  const allowedMimes = ['image/png', 'image/webp', 'image/gif', 'image/jpeg']
  if (!allowedMimes.includes(file.type)) {
    return NextResponse.json({ error: `Invalid file type: ${file.type}. Use PNG, WebP or GIF.` }, { status: 400 })
  }

  // Valida tamanho (máx 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 })
  }

  // Extensão do arquivo
  const extMap: Record<string, string> = {
    'image/png':  'png',
    'image/webp': 'webp',
    'image/gif':  'gif',
    'image/jpeg': 'jpg',
  }
  const ext  = extMap[file.type] ?? 'png'
  const path = buildStoragePath(category, key, field as 'image' | 'idle' | 'active' | 'low', ext)

  // Upload para Supabase Storage — upsert: true sobrescreve se já existir
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType:  file.type,
      upsert:       true,         // substitui sem erro se já existir
      cacheControl: '31536000',   // 1 ano de cache no CDN
    })

  if (error) {
    console.error('[upload] Supabase Storage error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Monta URL pública
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl, path })
}
